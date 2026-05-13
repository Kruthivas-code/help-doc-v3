"""
Emergent Object Storage (Tigris-backed) service.

Lightweight wrapper around the managed object storage API. Uses the
EMERGENT_LLM_KEY for auth and a session-scoped storage_key cached at
module level.

Surface:
    init_storage()       -> get/cache the storage_key (lazy)
    put_object(path, data, content_type) -> {"path": "...", "size": int, "etag": "..."}
    get_object(path)     -> (bytes, content_type)
    public_url(path)     -> the URL the platform serves the object at
                            (a backend-proxied path; the storage itself has
                            no presigned URLs).
"""
from __future__ import annotations
import logging
import os
import requests

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "emergent-docs"

_storage_key: str | None = None


def _emergent_key() -> str:
    """Read the key at call-time so .env loaded by the host app is honored."""
    return os.environ.get("EMERGENT_LLM_KEY", "")


def init_storage(force: bool = False) -> str | None:
    """Initialize once at startup; subsequent calls are no-ops."""
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    key = _emergent_key()
    if not key:
        logger.warning("EMERGENT_LLM_KEY missing — object storage disabled.")
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": key},
            timeout=30,
        )
        resp.raise_for_status()
        _storage_key = resp.json().get("storage_key")
        logger.info("Object storage initialized.")
        return _storage_key
    except Exception as exc:
        logger.error(f"Object storage init failed: {exc}")
        return None


def _require_key() -> str:
    key = init_storage()
    if not key:
        raise RuntimeError("Object storage not initialized")
    return key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload bytes. Path must NOT start with a slash."""
    key = _require_key()
    if path.startswith("/"):
        path = path.lstrip("/")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    # If the session key expired, re-init once and retry
    if resp.status_code == 403:
        init_storage(force=True)
        key = _require_key()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    """Fetch bytes + content-type for a stored path."""
    key = _require_key()
    if path.startswith("/"):
        path = path.lstrip("/")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        init_storage(force=True)
        key = _require_key()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def build_path(project_id: str, folder: str, filename: str) -> str:
    """Canonical app-prefixed storage path."""
    folder = (folder or "/").strip("/")
    parts = [APP_NAME, project_id]
    if folder:
        parts.append(folder)
    parts.append(filename)
    return "/".join(parts)


def public_url(path: str, request_base: str | None = None) -> str:
    """Return the URL clients should use. Backend-proxied — no direct CDN."""
    base = (request_base or os.environ.get("PUBLIC_BACKEND_URL") or "").rstrip("/")
    if not base:
        return f"/api/public/files/{path}"
    return f"{base}/api/public/files/{path}"
