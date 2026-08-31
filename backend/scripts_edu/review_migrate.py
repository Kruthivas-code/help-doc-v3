"""Rollout migration for Review Mode:
- Every existing document starts in 'in_review' (nothing public until an Owner publishes).
- published_content/published_title/published_at cleared.
Idempotent-ish: only sets status when missing or not already published-managed."""
import asyncio, os
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    proj = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = proj["id"]
    now = datetime.now(timezone.utc).isoformat()
    res = await db.documents.update_many(
        {"project_id": pid},
        {"$set": {"status": "in_review", "published_content": None,
                  "published_title": None, "published_at": None, "updated_at": now}})
    total = await db.documents.count_documents({"project_id": pid})
    counts = {}
    async for d in db.documents.find({"project_id": pid}, {"_id": 0, "status": 1}):
        counts[d.get("status")] = counts.get(d.get("status"), 0) + 1
    print(f"Updated {res.modified_count}/{total} docs. Status counts: {counts}")


if __name__ == "__main__":
    asyncio.run(main())
