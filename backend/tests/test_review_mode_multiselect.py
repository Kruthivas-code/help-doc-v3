"""Review Mode: multi-select assignments, tab-qualified group scopes, inline-review comments (anchor_text)."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "test_multi_reviewer@emergent.sh"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def pid(client):
    r = client.get(f"{API}/public/default-project", timeout=30)
    assert r.status_code == 200, r.text[:300]
    return r.json()["project"]["id"]


@pytest.fixture(scope="session")
def created(client, pid):
    ids = {"assignments": [], "comments": []}
    yield ids
    for aid in ids["assignments"]:
        client.delete(f"{API}/projects/{pid}/assignments/{aid}", timeout=30)
    for cid in ids["comments"]:
        client.delete(f"{API}/projects/{pid}/comments/{cid}", timeout=30)


# ---------------- Roles / basics ----------------
class TestRoles:
    def test_roles_me_is_dev_owner(self, client):
        r = client.get(f"{API}/roles/me", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["is_owner"] is True
        assert d["role"] == "owner"
        assert d["email"] == "dev@local"

    def test_known_emails(self, client, pid):
        r = client.get(f"{API}/projects/{pid}/known-emails", timeout=30)
        assert r.status_code == 200
        emails = r.json()["emails"]
        assert isinstance(emails, list)
        assert all("@" in e and e == e.lower() for e in emails)
        assert emails == sorted(emails)


# ---------------- Multi-select assignment (N separate POSTs, one action in UI) ----------------
class TestMultiSelectAssignment:
    def test_create_three_assignments_different_types(self, client, pid, created):
        payloads = [
            {"scope_type": "tab", "scope_id": "wingman", "scope_label": "Wingman", "assignee_email": TEST_EMAIL},
            {"scope_type": "group", "scope_id": "learn-the-basics::Reference",
             "scope_label": "Learn the Basics > Reference", "assignee_email": TEST_EMAIL},
            {"scope_type": "page", "scope_id": "talk-it-through", "scope_label": "Talk it through",
             "assignee_email": TEST_EMAIL},
        ]
        for p in payloads:
            r = client.post(f"{API}/projects/{pid}/assignments", json=p, timeout=30)
            assert r.status_code == 200, r.text[:300]
            a = r.json()
            assert "_id" not in a
            assert a["assignee_email"] == TEST_EMAIL
            assert a["scope_type"] == p["scope_type"]
            assert a["status"] == "in_review"
            assert isinstance(a["slugs"], list) and len(a["slugs"]) > 0
            created["assignments"].append(a["id"])

        # Verify persistence: 3 assignments for the same email in the list endpoint
        r = client.get(f"{API}/projects/{pid}/assignments", timeout=30)
        assert r.status_code == 200
        mine = [a for a in r.json()["assignments"] if a["assignee_email"] == TEST_EMAIL]
        assert len(mine) >= 3
        assert {a["scope_type"] for a in mine} >= {"tab", "group", "page"}

    def test_group_scope_is_tab_qualified(self, client, pid, created):
        """learn-the-basics::Reference must resolve ONLY to that tab's Reference pages."""
        r = client.post(f"{API}/projects/{pid}/assignments", json={
            "scope_type": "group", "scope_id": "learn-the-basics::Reference",
            "scope_label": "Learn the Basics > Reference", "assignee_email": TEST_EMAIL}, timeout=30)
        assert r.status_code == 200
        a = r.json()
        created["assignments"].append(a["id"])
        assert sorted(a["slugs"]) == sorted(["how-credits-work-basics", "get-your-first-users"]), a["slugs"]
        for leaked in ("glossary-of-emergent-terms", "faqs"):
            assert leaked not in a["slugs"]

    def test_group_scope_other_tab_same_name(self, client, pid, created):
        r = client.post(f"{API}/projects/{pid}/assignments", json={
            "scope_type": "group", "scope_id": "troubleshooting::Reference",
            "scope_label": "Troubleshooting > Reference", "assignee_email": TEST_EMAIL}, timeout=30)
        assert r.status_code == 200
        a = r.json()
        created["assignments"].append(a["id"])
        assert sorted(a["slugs"]) == sorted(["glossary-of-emergent-terms", "faqs"]), a["slugs"]

    def test_tab_scope_flattens_all_pages(self, client, pid, created):
        r = client.post(f"{API}/projects/{pid}/assignments", json={
            "scope_type": "tab", "scope_id": "wingman", "scope_label": "Wingman",
            "assignee_email": TEST_EMAIL}, timeout=30)
        assert r.status_code == 200
        a = r.json()
        created["assignments"].append(a["id"])
        assert "what-is-wingman" in a["slugs"]
        assert len(a["slugs"]) == 4

    def test_delete_assignment_removes_it(self, client, pid):
        r = client.post(f"{API}/projects/{pid}/assignments", json={
            "scope_type": "page", "scope_id": "talk-it-through", "scope_label": "TEST_del",
            "assignee_email": TEST_EMAIL}, timeout=30)
        aid = r.json()["id"]
        d = client.delete(f"{API}/projects/{pid}/assignments/{aid}", timeout=30)
        assert d.status_code == 200
        lst = client.get(f"{API}/projects/{pid}/assignments", timeout=30).json()["assignments"]
        assert aid not in [x["id"] for x in lst]


# ---------------- Done-gate regression ----------------
class TestDoneGate:
    def test_done_blocked_by_open_comment_then_allowed(self, client, pid, created):
        ar = client.post(f"{API}/projects/{pid}/assignments", json={
            "scope_type": "page", "scope_id": "talk-it-through", "scope_label": "TEST_gate",
            "assignee_email": TEST_EMAIL}, timeout=30)
        aid = ar.json()["id"]
        created["assignments"].append(aid)

        cr = client.post(f"{API}/projects/{pid}/comments", json={
            "doc_slug": "talk-it-through", "body": "TEST_ gate comment",
            "anchor_text": "some quoted passage"}, timeout=30)
        assert cr.status_code == 200
        cid = cr.json()["id"]
        created["comments"].append(cid)

        blocked = client.put(f"{API}/projects/{pid}/assignments/{aid}", json={"status": "done"}, timeout=30)
        assert blocked.status_code == 400
        assert "open comment" in blocked.json()["detail"]

        assert client.post(f"{API}/projects/{pid}/comments/{cid}/resolve", timeout=30).status_code == 200
        ok = client.put(f"{API}/projects/{pid}/assignments/{aid}", json={"status": "done"}, timeout=30)
        assert ok.status_code == 200
        assert ok.json()["status"] == "done"


# ---------------- Comments with anchor_text (inline review view) ----------------
class TestAnchoredComments:
    def test_create_comment_with_anchor_and_persist(self, client, pid, created):
        anchor = "TEST_anchor selected passage"
        r = client.post(f"{API}/projects/{pid}/comments", json={
            "doc_slug": "talk-it-through", "body": "TEST_ anchored body", "anchor_text": anchor}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        c = r.json()
        created["comments"].append(c["id"])
        assert c["anchor_text"] == anchor
        assert c["resolved"] is False
        assert c["author_email"] == "dev@local"
        assert "_id" not in c

        got = client.get(f"{API}/projects/{pid}/comments", params={"doc_slug": "talk-it-through"}, timeout=30)
        assert got.status_code == 200
        match = [x for x in got.json()["comments"] if x["id"] == c["id"]]
        assert len(match) == 1
        assert match[0]["anchor_text"] == anchor

    def test_resolve_and_reopen(self, client, pid, created):
        c = client.post(f"{API}/projects/{pid}/comments", json={
            "doc_slug": "talk-it-through", "body": "TEST_ resolve me"}, timeout=30).json()
        created["comments"].append(c["id"])
        assert client.post(f"{API}/projects/{pid}/comments/{c['id']}/resolve", timeout=30).status_code == 200
        cur = [x for x in client.get(f"{API}/projects/{pid}/comments",
                                    params={"doc_slug": "talk-it-through"}, timeout=30).json()["comments"]
               if x["id"] == c["id"]][0]
        assert cur["resolved"] is True
        assert client.post(f"{API}/projects/{pid}/comments/{c['id']}/reopen", timeout=30).status_code == 200
        cur = [x for x in client.get(f"{API}/projects/{pid}/comments",
                                    params={"doc_slug": "talk-it-through"}, timeout=30).json()["comments"]
               if x["id"] == c["id"]][0]
        assert cur["resolved"] is False

    def test_delete_comment(self, client, pid):
        c = client.post(f"{API}/projects/{pid}/comments", json={
            "doc_slug": "talk-it-through", "body": "TEST_ delete me"}, timeout=30).json()
        assert client.delete(f"{API}/projects/{pid}/comments/{c['id']}", timeout=30).status_code == 200
        assert client.delete(f"{API}/projects/{pid}/comments/{c['id']}", timeout=30).status_code == 404


# ---------------- Console support endpoints ----------------
class TestConsoleEndpoints:
    def test_inbox_and_progress(self, client, pid):
        i = client.get(f"{API}/projects/{pid}/review/inbox", timeout=30)
        assert i.status_code == 200
        assert set(["comments", "unread", "open", "total"]).issubset(i.json().keys())
        p = client.get(f"{API}/projects/{pid}/review/progress", timeout=30)
        assert p.status_code == 200
        assert "docs_by_status" in p.json()

    def test_documents_list_has_slugs(self, client, pid):
        r = client.get(f"{API}/projects/{pid}/documents", timeout=30)
        assert r.status_code == 200
        docs = r.json()
        assert any(d["slug"] == "talk-it-through" for d in docs)
        assert all("_id" not in d for d in docs)

    def test_verdict_upsert(self, client, pid):
        r = client.post(f"{API}/projects/{pid}/verdicts", json={
            "doc_slug": "talk-it-through", "verdict": "approved"}, timeout=30)
        assert r.status_code == 200 and r.json()["verdict"] == "approved"
        v = client.get(f"{API}/projects/{pid}/verdicts", params={"doc_slug": "talk-it-through"}, timeout=30)
        assert v.status_code == 200
        assert any(x["verdict"] == "approved" for x in v.json()["verdicts"])
