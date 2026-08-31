"""Review Mode backend regression tests: roles, publish gate, content gate,
assignments (done-gating on unresolved comments), comments, verdicts, inbox, progress.
Auth is bypassed (DISABLE_AUTH=true) -> dev@local acts as Owner."""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def pid(client):
    r = client.get(f"{API}/public/default-project", timeout=60)
    assert r.status_code == 200, r.text
    return r.json()["project"]["id"]


@pytest.fixture(scope="session")
def docs(client, pid):
    r = client.get(f"{API}/projects/{pid}/documents", timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) > 0
    return data


def public_slugs(client):
    r = client.get(f"{API}/public/default-project", timeout=60)
    assert r.status_code == 200
    return [d["slug"] for d in r.json().get("documents", [])]


# ---------------- Roles ----------------
class TestRoles:
    def test_roles_me_is_owner(self, client):
        r = client.get(f"{API}/roles/me", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "owner" and d["is_owner"] is True
        assert d["email"] == "dev@local"

    def test_auth_me_role(self, client):
        r = client.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "owner" and d["is_owner"] is True

    def test_no_mongo_id_leak(self, client, pid):
        r = client.get(f"{API}/projects/{pid}/assignments", timeout=30)
        assert r.status_code == 200
        for a in r.json()["assignments"]:
            assert "_id" not in a


# ---------------- Publish gate + content gate ----------------
class TestPublishGate:
    def test_docs_default_in_review(self, docs):
        statuses = {d.get("status") for d in docs}
        assert statuses.issubset({"in_review", "draft", "published"}), statuses

    def test_publish_then_public_then_takedown(self, client, pid, docs):
        target = next((d for d in docs if d["slug"] == "talk-it-through"), docs[0])
        slug = target["slug"]
        # self-heal from a previous aborted run
        if slug in public_slugs(client):
            client.post(f"{API}/projects/{pid}/documents/{target['id']}/unpublish", timeout=60)
        assert slug not in public_slugs(client), "slug already published before test"

        r = client.post(f"{API}/projects/{pid}/documents/{target['id']}/publish", timeout=60)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "published"

        # GET verifies persistence
        g = client.get(f"{API}/projects/{pid}/documents/{target['id']}", timeout=30)
        assert g.status_code == 200
        assert g.json()["status"] == "published"

        # content gate: public list now includes slug
        assert slug in public_slugs(client)

        # seo sitemap should include it too (only published pages)
        sm = client.get(f"{API}/seo/sitemap.xml", timeout=60)
        assert sm.status_code == 200, sm.text
        assert slug in sm.text, "published slug missing from /api/seo/sitemap.xml"

        # take down
        r = client.post(f"{API}/projects/{pid}/documents/{target['id']}/unpublish", timeout=60)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "in_review"
        g = client.get(f"{API}/projects/{pid}/documents/{target['id']}", timeout=30)
        assert g.json()["status"] == "in_review"
        assert slug not in public_slugs(client)

    def test_publish_unknown_doc_404(self, client, pid):
        r = client.post(f"{API}/projects/{pid}/documents/{uuid.uuid4()}/publish", timeout=30)
        assert r.status_code == 404, r.text


# ---------------- Assignments + comment gating ----------------
class TestAssignments:
    created = {"assignments": [], "comments": []}

    @classmethod
    def teardown_class(cls):
        s = requests.Session()
        r = s.get(f"{API}/public/default-project", timeout=60)
        p = r.json()["project"]["id"]
        for cid in cls.created["comments"]:
            s.delete(f"{API}/projects/{p}/comments/{cid}", timeout=30)
        for aid in cls.created["assignments"]:
            s.delete(f"{API}/projects/{p}/assignments/{aid}", timeout=30)

    def test_assignment_lifecycle_with_comment_gate(self, client, pid, docs):
        target = next((d for d in docs if d["slug"] == "talk-it-through"), docs[0])
        payload = {"scope_type": "page", "scope_id": target["slug"],
                   "scope_label": "TEST_scope", "assignee_email": "TEST_reviewer@example.com"}
        r = client.post(f"{API}/projects/{pid}/assignments", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        a = r.json()
        self.created["assignments"].append(a["id"])
        assert a["status"] == "in_review"
        assert a["slugs"] == [target["slug"]]
        assert a["assignee_email"] == "test_reviewer@example.com"

        # persisted
        lst = client.get(f"{API}/projects/{pid}/assignments", timeout=30).json()["assignments"]
        assert any(x["id"] == a["id"] for x in lst)

        # add unresolved comment on the scope page
        c = client.post(f"{API}/projects/{pid}/comments",
                        json={"doc_slug": target["slug"], "body": "TEST_blocking comment"}, timeout=60)
        assert c.status_code == 200, c.text
        cid = c.json()["id"]
        self.created["comments"].append(cid)
        assert c.json()["resolved"] is False

        # mark done must be blocked
        r = client.put(f"{API}/projects/{pid}/assignments/{a['id']}", json={"status": "done"}, timeout=30)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        assert "open comment" in r.json().get("detail", "").lower()

        # status unchanged
        lst = client.get(f"{API}/projects/{pid}/assignments", timeout=30).json()["assignments"]
        assert next(x for x in lst if x["id"] == a["id"])["status"] == "in_review"

        # resolve comment -> done allowed
        r = client.post(f"{API}/projects/{pid}/comments/{cid}/resolve", timeout=30)
        assert r.status_code == 200, r.text
        r = client.put(f"{API}/projects/{pid}/assignments/{a['id']}", json={"status": "done"}, timeout=30)
        assert r.status_code == 200, r.text
        lst = client.get(f"{API}/projects/{pid}/assignments", timeout=30).json()["assignments"]
        assert next(x for x in lst if x["id"] == a["id"])["status"] == "done"

        # delegate
        r = client.post(f"{API}/projects/{pid}/assignments/{a['id']}/delegate",
                        json={"email": "TEST_other@example.com"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["assignee_email"] == "test_other@example.com"

    def test_update_unknown_assignment_404(self, client, pid):
        r = client.put(f"{API}/projects/{pid}/assignments/{uuid.uuid4()}",
                       json={"status": "done"}, timeout=30)
        assert r.status_code == 404


# ---------------- Comments / verdicts / inbox / progress ----------------
class TestCommentsInbox:
    def test_comment_crud_and_inbox(self, client, pid, docs):
        slug = docs[0]["slug"]
        c = client.post(f"{API}/projects/{pid}/comments",
                        json={"doc_slug": slug, "body": "TEST_inbox comment"}, timeout=60)
        assert c.status_code == 200, c.text
        cid = c.json()["id"]
        try:
            lst = client.get(f"{API}/projects/{pid}/comments", params={"doc_slug": slug}, timeout=30)
            assert lst.status_code == 200
            assert any(x["id"] == cid for x in lst.json()["comments"])

            ib = client.get(f"{API}/projects/{pid}/review/inbox", timeout=30)
            assert ib.status_code == 200, ib.text
            data = ib.json()
            assert any(x["id"] == cid for x in data["comments"])
            assert data["open"] >= 1
        finally:
            d = client.delete(f"{API}/projects/{pid}/comments/{cid}", timeout=30)
            assert d.status_code == 200
        lst = client.get(f"{API}/projects/{pid}/comments", params={"doc_slug": slug}, timeout=30)
        assert not any(x["id"] == cid for x in lst.json()["comments"])

    def test_verdict_upsert(self, client, pid, docs):
        slug = docs[0]["slug"]
        r = client.post(f"{API}/projects/{pid}/verdicts", json={"doc_slug": slug, "verdict": "Outdated"}, timeout=30)
        assert r.status_code == 200, r.text
        v = client.get(f"{API}/projects/{pid}/verdicts", params={"doc_slug": slug}, timeout=30).json()["verdicts"]
        mine = [x for x in v if x["reviewer_email"] == "dev@local"]
        assert mine and mine[0]["verdict"] == "Outdated"

    def test_progress(self, client, pid):
        r = client.get(f"{API}/projects/{pid}/review/progress", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "docs_by_status" in d and "assignments_by_status" in d
        assert sum(d["docs_by_status"].values()) > 0

    def test_transcribe_unavailable(self, client, pid):
        r = client.post(f"{API}/projects/{pid}/comments/{uuid.uuid4()}/transcribe", timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "unavailable"


# ---------------- Document delete (bug-fix support endpoint) ----------------
class TestDocumentDelete:
    def test_create_and_delete_document(self, client, pid):
        sl = f"test-del-{uuid.uuid4().hex[:8]}"
        r = client.post(f"{API}/projects/{pid}/documents",
                        json={"title": "TEST_Delete Me", "slug": sl, "content": "# tmp"}, timeout=60)
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        assert r.json()["slug"] == sl

        g = client.get(f"{API}/projects/{pid}/documents/{did}", timeout=30)
        assert g.status_code == 200 and g.json()["title"] == "TEST_Delete Me"

        d = client.delete(f"{API}/projects/{pid}/documents/{did}", timeout=60)
        assert d.status_code == 200, d.text

        g = client.get(f"{API}/projects/{pid}/documents/{did}", timeout=30)
        assert g.status_code == 404
