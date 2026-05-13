#!/usr/bin/env python3
"""
One-time migration: copy images from Supabase Storage to Emergent Object
Storage (Tigris) and rewrite URLs in MongoDB.

Usage:
    cd /app/backend && python migrate_supabase_to_tigris.py [--dry-run]

What it does:
  1. Scans `documents.content` and `assets.url` for legacy Supabase URLs
     (https://*.supabase.co/storage/v1/object/public/...).
  2. For each unique URL: downloads from Supabase, uploads to Tigris under
     `emergent-docs/migrated/<uuid>.<ext>`, and records a `migration_map`
     entry in MongoDB for idempotency.
  3. String-replaces every occurrence of the old URL with the new one in
     both `documents.content` and `assets.url`.

The script is idempotent — re-running it skips URLs already in
`migration_map`.

Requires SUPABASE_URL + SUPABASE_KEY in env *only* to download existing
images. After migration runs successfully you can remove those vars.
"""
from __future__ import annotations
import argparse
import asyncio
import mimetypes
import os
import re
import sys
import uuid
from pathlib import Path

# Make sibling imports work when run as a script
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
import requests
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

from storage_service import put_object, build_path, public_url, init_storage

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PUBLIC_BACKEND_URL = os.environ.get("PUBLIC_BACKEND_URL") or os.environ.get(
    "REACT_APP_BACKEND_URL", ""
)

SUPABASE_RE = re.compile(
    r"https?://[a-zA-Z0-9-]+\.supabase\.co/storage/v1/object/public/[^\s\"'<>)]+"
)


def collect_urls(text: str) -> set[str]:
    return set(SUPABASE_RE.findall(text or ""))


async def main(dry_run: bool = False):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    map_coll = db["migration_map"]

    if not dry_run:
        init_storage()

    # 1. Collect all unique Supabase URLs across documents.content & assets.url
    urls: set[str] = set()
    async for doc in db.documents.find({}, {"content": 1}):
        urls.update(collect_urls(doc.get("content") or ""))
    async for asset in db.assets.find({"url": {"$regex": "supabase.co"}}, {"url": 1}):
        urls.add(asset["url"])

    print(f"Found {len(urls)} unique Supabase URLs")
    if not urls:
        return

    # 2. Skip already-migrated
    existing = {m["old_url"]: m["new_url"] async for m in map_coll.find()}
    todo = [u for u in urls if u not in existing]
    print(f"  Already migrated: {len(existing)}")
    print(f"  Pending: {len(todo)}")

    # 3. Migrate
    url_map = dict(existing)
    for i, old_url in enumerate(todo, 1):
        try:
            resp = requests.get(old_url, timeout=60)
            resp.raise_for_status()
            data = resp.content
            content_type = resp.headers.get("Content-Type") or "application/octet-stream"
            ext = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ""
            if not ext:
                # fall back to path suffix
                path_part = old_url.split("?", 1)[0]
                ext = Path(path_part).suffix
            filename = f"{uuid.uuid4().hex}{ext}"
            storage_path = build_path("_legacy", "migrated", filename)

            new_url = public_url(storage_path, request_base=PUBLIC_BACKEND_URL)

            if dry_run:
                print(f"  [{i}/{len(todo)}] DRY  {old_url[:60]}... -> {new_url}")
            else:
                put_object(storage_path, data, content_type)
                await map_coll.insert_one({
                    "old_url": old_url,
                    "new_url": new_url,
                    "storage_path": storage_path,
                    "size": len(data),
                })
                print(f"  [{i}/{len(todo)}] OK   {len(data):>8}B  {old_url[:50]}...")
            url_map[old_url] = new_url
        except Exception as exc:
            print(f"  [{i}/{len(todo)}] FAIL {old_url[:60]}: {exc}")

    if dry_run:
        print("\n[dry-run] no MongoDB writes performed.")
        return

    # 4. String-replace URLs in document content and asset rows
    print("\nRewriting URLs in MongoDB...")
    doc_updates = 0
    async for doc in db.documents.find({"content": {"$regex": "supabase.co"}}, {"_id": 1, "content": 1}):
        new_content = doc["content"]
        for old, new in url_map.items():
            if old in new_content:
                new_content = new_content.replace(old, new)
        if new_content != doc["content"]:
            await db.documents.update_one({"_id": doc["_id"]}, {"$set": {"content": new_content}})
            doc_updates += 1
    print(f"  documents updated: {doc_updates}")

    asset_updates = 0
    async for asset in db.assets.find({"url": {"$regex": "supabase.co"}}, {"_id": 1, "url": 1}):
        new_url = url_map.get(asset["url"])
        if new_url:
            await db.assets.update_one(
                {"_id": asset["_id"]},
                {"$set": {"url": new_url}},
            )
            asset_updates += 1
    print(f"  assets updated: {asset_updates}")
    print("Migration complete.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
