"""
Backend regression tests after Supabase -> Tigris storage migration.

Coverage:
- /api/public/files/{path:path}: migrated images served (HTTP 200, correct content-type)
- /api/public/files/{path:path}: 404 for non-existent paths
- /api/public/default-project: returns project + config + documents, no ObjectId leakage,
  all image/logo URLs are proxied via /api/public/files/... (no supabase.co)
- /api/projects/{id}/assets POST: requires auth (401 without token)
- /api/auth/me: returns 401 unauthenticated (no regression)
- /api/generator/markdown: returns 401 unauthenticated, confirming no 500 from
  storage_service init side-effects on import.
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cms-admin-3.preview.emergentagent.com").rstrip("/")

# Paths supplied by main agent — known to be migrated to Tigris
MIGRATED_PATHS = [
    "emergent-docs/_legacy/migrated/c235383804a944e1b4bc4f80435e9f6e.avif",
    "emergent-docs/_legacy/migrated/b0c28e2e8aa24fdabcf286939154ddd6.avif",
    "emergent-docs/_legacy/migrated/62ae643c287e4e4bab5476d6c4571e2e.avif",
    "emergent-docs/_legacy/migrated/fb42e03639d44d6d93912ab18c817ceb.avif",
    "emergent-docs/_legacy/migrated/201afda57c9543988414513a397ba13f.gif",
    "emergent-docs/_legacy/migrated/15dbf00d62e2403ba770ce3dd951d4de.avif",
    "emergent-docs/_legacy/migrated/918791cccef848a1983b679ad773011c.avif",
    "emergent-docs/_legacy/migrated/bff407098c7d4241b4f1bdc2daf20d24.avif",
]


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


# ===== Public file proxy from Tigris =====
class TestPublicFileProxy:
    @pytest.mark.parametrize("path", MIGRATED_PATHS)
    def test_migrated_image_served(self, session, path):
        url = f"{BASE_URL}/api/public/files/{path}"
        r = session.get(url, timeout=60)
        assert r.status_code == 200, f"{path} -> {r.status_code} body={r.text[:200]}"
        assert len(r.content) > 0, f"Empty body for {path}"
        ctype = r.headers.get("Content-Type", "")
        # Should be an image content-type for migrated assets
        assert ctype.startswith("image/") or "octet-stream" in ctype, f"Unexpected content-type {ctype}"
        # Note: backend sets `Cache-Control: public, max-age=31536000, immutable` but the
        # ingress in this preview env rewrites it to no-store. We don't assert it here.

    def test_nonexistent_path_returns_404(self, session):
        bogus = "emergent-docs/_legacy/migrated/this-file-does-not-exist-xyz123.avif"
        url = f"{BASE_URL}/api/public/files/{bogus}"
        r = session.get(url, timeout=30)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"
        body = r.json()
        assert body.get("detail") == "File not found"

    def test_nonexistent_random_path_returns_404(self, session):
        url = f"{BASE_URL}/api/public/files/nope/nope/{os.urandom(8).hex()}.png"
        r = session.get(url, timeout=30)
        assert r.status_code == 404


# ===== Public default project =====
class TestPublicDefaultProject:
    @pytest.fixture(scope="class")
    def payload(self, session):
        r = session.get(f"{BASE_URL}/api/public/default-project", timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        return r.json()

    def test_top_level_keys(self, payload):
        assert "project" in payload
        assert "config" in payload
        assert "documents" in payload
        assert isinstance(payload["documents"], list)

    def test_documents_count(self, payload):
        # Main agent reports 53 documents
        docs = payload["documents"]
        assert len(docs) >= 50, f"Expected ~53 documents, got {len(docs)}"

    def test_no_objectid_leakage(self, payload):
        """No raw _id keys should leak in project, config, or documents."""
        assert "_id" not in payload.get("project", {}), "_id leaked in project"
        assert "_id" not in payload.get("config", {}), "_id leaked in config"
        for i, doc in enumerate(payload["documents"]):
            assert "_id" not in doc, f"_id leaked in documents[{i}]"

    def test_no_supabase_storage_urls_anywhere(self, payload):
        """All image/logo URLs must have been migrated off Supabase Storage CDN.

        Migration scope is Supabase Storage URLs (pattern: *.supabase.co/storage/v1/...).
        We do NOT flag incidental prose mentions of 'supabase.com' in document text.
        """
        import json
        blob = json.dumps(payload)
        # Supabase Storage CDN pattern (subdomain.supabase.co/storage/)
        assert ".supabase.co/storage" not in blob, "Found Supabase Storage CDN URL in response"
        assert "supabase.in/storage" not in blob, "Found Supabase Storage CDN URL in response"

    def test_config_logo_urls_proxied(self, payload):
        """Logo URLs in config should point to /api/public/files/... (proxied)."""
        cfg = payload.get("config") or {}
        for key in ("logo_light_url", "logo_dark_url", "favicon_url"):
            val = cfg.get(key)
            if val:  # only if set
                assert "/api/public/files/" in val or val.startswith("/") or val.startswith("data:"), (
                    f"{key} not proxied: {val}"
                )
                assert "supabase" not in val, f"{key} still on supabase: {val}"

    def test_document_image_urls_not_on_supabase_storage(self, payload):
        """Inline image URLs (markdown) in documents must not reference Supabase Storage CDN.

        Only flags URLs matching Supabase Storage CDN pattern (*.supabase.co/storage/v1/...).
        Markdown image syntax is ![alt](url) — we extract those specifically.
        """
        img_re = re.compile(r"!\[[^\]]*\]\(([^)\s]+)", re.IGNORECASE)
        for i, doc in enumerate(payload["documents"]):
            content = doc.get("content") or ""
            for url in img_re.findall(content):
                assert ".supabase.co/storage" not in url, (
                    f"documents[{i}] image still on Supabase Storage: {url}"
                )


# ===== Auth gating =====
class TestAuthGating:
    def test_auth_me_unauthenticated(self, session):
        r = session.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_upload_asset_requires_auth(self, session):
        # Sends a tiny multipart file without auth — should be 401
        files = {"file": ("tiny.txt", b"hello", "text/plain")}
        data = {"folder": "/"}
        r = session.post(
            f"{BASE_URL}/api/projects/some-project-id/assets",
            files=files,
            data=data,
            timeout=20,
        )
        assert r.status_code == 401, f"Expected 401 unauth, got {r.status_code} body={r.text[:200]}"

    def test_upload_asset_with_bad_token(self, session):
        files = {"file": ("tiny.txt", b"hello", "text/plain")}
        data = {"folder": "/"}
        r = session.post(
            f"{BASE_URL}/api/projects/some-project-id/assets",
            files=files,
            data=data,
            headers={"Authorization": "Bearer invalid-token-xyz"},
            timeout=20,
        )
        # Should still fail auth (401), not crash with 500
        assert r.status_code == 401, f"Expected 401 invalid token, got {r.status_code}"


# ===== AI generator (smoke test — no auth -> 401, NOT 500) =====
class TestGeneratorSmoke:
    def test_generator_markdown_requires_auth_not_500(self, session):
        """If storage_service init crashed on import, we'd see 500. Confirm 401 instead."""
        r = session.post(
            f"{BASE_URL}/api/generator/markdown",
            json={"raw_input": "hello world quick test", "style": "documentation"},
            timeout=20,
        )
        assert r.status_code == 401, f"Expected 401 (no auth), got {r.status_code} body={r.text[:300]}"

    def test_generator_markdown_bad_token_not_500(self, session):
        r = session.post(
            f"{BASE_URL}/api/generator/markdown",
            json={"raw_input": "x", "style": "documentation"},
            headers={"Authorization": "Bearer invalid"},
            timeout=20,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"


# ===== Health =====
class TestHealth:
    def test_health_or_root(self, session):
        # Confirm backend is reachable
        for path in ("/api/health", "/api/"):
            r = session.get(f"{BASE_URL}{path}", timeout=15)
            if r.status_code == 200:
                return
        pytest.skip("No health endpoint reachable")
