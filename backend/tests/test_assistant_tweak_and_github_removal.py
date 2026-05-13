"""
Backend regression for iteration 10:
- GitHub routes are gone (return 404)
- New POST /api/assistant/tweak endpoint (auth, validation, success path)
- Document model accepts 'description' field on update + persists
- Existing endpoints still work (default-project, file proxy, generator/markdown, auth/me)
"""

import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import pytest
import requests

# Allow importing backend modules to seed admin session directly in Mongo
sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv("/app/backend/.env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env file
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture(scope="session")
def admin_session():
    """Seed an emergent.sh admin user + session_token directly in Mongo."""
    async def _seed():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        user_id = f"TEST_admin_{uuid.uuid4().hex[:8]}"
        email = f"test-admin-{uuid.uuid4().hex[:8]}@emergent.sh"
        token = f"TEST_session_{uuid.uuid4().hex}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": "Test Admin",
            "picture": None,
            "created_at": datetime.now(timezone.utc),
        })
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": token,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=2),
            "created_at": datetime.now(timezone.utc),
        })
        client.close()
        return user_id, email, token

    user_id, email, token = asyncio.get_event_loop().run_until_complete(_seed())
    yield {"user_id": user_id, "email": email, "token": token}

    # teardown
    async def _cleanup():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.user_sessions.delete_many({"user_id": user_id})
        await db.users.delete_many({"user_id": user_id})
        client.close()

    asyncio.get_event_loop().run_until_complete(_cleanup())


@pytest.fixture(scope="session")
def auth_headers(admin_session):
    return {"Authorization": f"Bearer {admin_session['token']}"}


@pytest.fixture(scope="session")
def default_project_data():
    r = requests.get(f"{BASE_URL}/api/public/default-project", timeout=15)
    assert r.status_code == 200, f"public/default-project failed: {r.status_code} {r.text[:200]}"
    return r.json()


# -----------------------------------------------------------------------------
# 1. GitHub routes are GONE (all should return 404)
# -----------------------------------------------------------------------------

class TestGithubRoutesRemoved:
    """Every github route should now return 404."""

    @pytest.mark.parametrize("method,path", [
        ("GET", "/api/github/auth"),
        ("GET", "/api/github/callback"),
        ("POST", "/api/projects/some-project-id/github/sync"),
        ("POST", "/api/projects/some-project-id/github/link"),
        ("GET", "/api/projects/some-project-id/github/info"),
        ("DELETE", "/api/projects/some-project-id/github/link"),
    ])
    def test_github_route_404(self, method, path):
        r = requests.request(method, f"{BASE_URL}{path}", timeout=10)
        assert r.status_code == 404, (
            f"{method} {path} expected 404, got {r.status_code}: {r.text[:200]}"
        )


# -----------------------------------------------------------------------------
# 2. POST /api/assistant/tweak
# -----------------------------------------------------------------------------

class TestAssistantTweak:
    URL = None  # set in setup

    def setup_method(self):
        self.URL = f"{BASE_URL}/api/assistant/tweak"

    # ---- auth ----
    def test_tweak_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={"instruction": "x", "markdown": "y"},
            timeout=10,
        )
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:200]}"

    def test_tweak_invalid_bearer(self):
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={"instruction": "x", "markdown": "y"},
            headers={"Authorization": "Bearer not-a-real-token"},
            timeout=10,
        )
        assert r.status_code == 401

    # ---- request validation ----
    def test_tweak_missing_instruction_field(self, auth_headers):
        """Missing 'instruction' key -> 422 (Pydantic)"""
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={"markdown": "hello"},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 422

    def test_tweak_missing_markdown_field(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={"instruction": "rewrite"},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 422

    def test_tweak_empty_instruction_value(self, auth_headers):
        """instruction='' -> 400 (server-side strip check)"""
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={"instruction": "   ", "markdown": "hello world"},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 400
        assert "instruction" in r.text.lower()

    def test_tweak_empty_markdown_value(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={"instruction": "make it shorter", "markdown": "   "},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 400
        assert "markdown" in r.text.lower()

    def test_tweak_markdown_too_large(self, auth_headers):
        big = "x" * 40001
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={"instruction": "shorten", "markdown": big},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 400
        assert "max" in r.text.lower() or "large" in r.text.lower()

    # ---- success paths (LLM call) ----
    def test_tweak_success_full_markdown(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={
                "instruction": "Reply with the single word OK only.",
                "markdown": "hello",
            },
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:500]}"
        data = r.json()
        assert "markdown" in data and isinstance(data["markdown"], str)
        assert len(data["markdown"]) > 0
        assert "applied_to_selection" in data
        assert data["applied_to_selection"] is False

    def test_tweak_success_with_selection(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/assistant/tweak",
            json={
                "instruction": "Reply with the single word DONE only.",
                "markdown": "the bigger doc context",
                "selection": "a small slice",
            },
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:500]}"
        data = r.json()
        assert "markdown" in data and isinstance(data["markdown"], str)
        assert data.get("applied_to_selection") is True


# -----------------------------------------------------------------------------
# 3. Document.description field round-trip
# -----------------------------------------------------------------------------

class TestDocumentDescriptionField:
    def test_put_document_description_persists(self, auth_headers, default_project_data):
        project_id = default_project_data["project"]["id"]
        docs = default_project_data["documents"]
        assert docs, "default project should have documents"
        doc = docs[0]
        doc_id = doc["id"]
        original_description = doc.get("description")

        new_desc = f"TEST_desc_{uuid.uuid4().hex[:8]}"
        try:
            r = requests.put(
                f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}",
                json={"description": new_desc},
                headers=auth_headers,
                timeout=15,
            )
            assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text[:300]}"
            updated = r.json()
            assert updated.get("description") == new_desc
            assert updated["id"] == doc_id

            # Verify persistence via GET
            r2 = requests.get(
                f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}",
                headers=auth_headers,
                timeout=15,
            )
            assert r2.status_code == 200
            fetched = r2.json()
            assert fetched.get("description") == new_desc
        finally:
            # restore original description (None or value)
            restore_payload = {"description": original_description if original_description is not None else ""}
            requests.put(
                f"{BASE_URL}/api/projects/{project_id}/documents/{doc_id}",
                json=restore_payload,
                headers=auth_headers,
                timeout=15,
            )


# -----------------------------------------------------------------------------
# 4. Regression on existing endpoints
# -----------------------------------------------------------------------------

class TestExistingEndpointsRegression:
    def test_public_default_project_shape(self, default_project_data):
        data = default_project_data
        assert "project" in data
        assert "config" in data
        assert "documents" in data
        assert isinstance(data["documents"], list)
        assert len(data["documents"]) >= 50, f"expected >=50 docs, got {len(data['documents'])}"

    def test_public_default_project_nav_tabs(self, default_project_data):
        config = default_project_data.get("config") or {}
        # nav tabs may be under different keys; check common ones
        nav_tabs = (
            config.get("nav_tabs")
            or config.get("navigation")
            or config.get("tabs")
            or []
        )
        # Soft assertion - print actual value if mismatch
        if isinstance(nav_tabs, list):
            assert len(nav_tabs) >= 1, f"nav tabs should be present, got {nav_tabs}"

    def test_public_file_proxy_serves_image(self, default_project_data):
        """Find a /api/public/files/ URL in the default project response and verify it 200s."""
        import re, json
        body = json.dumps(default_project_data)
        m = re.search(r"/api/public/files/[A-Za-z0-9_\-./]+", body)
        assert m, "expected at least one /api/public/files/ URL in default project payload"
        path = m.group(0)
        r = requests.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200, f"file proxy returned {r.status_code} for {path}"
        ctype = r.headers.get("content-type", "")
        assert ctype.startswith("image/") or ctype.startswith("application/"), f"unexpected content-type: {ctype}"

    def test_generator_markdown_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/generator/markdown",
            json={"raw_input": "hello"},
            timeout=10,
        )
        assert r.status_code == 401

    def test_generator_markdown_success(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/generator/markdown",
            json={"raw_input": "Reply with the single word OK.", "style": "documentation"},
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert "markdown" in data and isinstance(data["markdown"], str)
        assert len(data["markdown"]) > 0

    def test_auth_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 401

    def test_auth_me_with_seeded_token(self, auth_headers, admin_session):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        # /auth/me returns the user
        assert data.get("email") == admin_session["email"]
