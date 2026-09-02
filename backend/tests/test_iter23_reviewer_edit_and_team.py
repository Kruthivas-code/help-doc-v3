"""Iteration 23 backend tests: reviewer inline-edit authz + marker, roles/promote (Team tab), role-based auth.

Uses sessions created by /app/backend/tests/iter23_setup.py (state in /app/test_reports/iter23_state.json).
Cleanup of edited content is done by fixtures (content restored, reviewer marker cleared).
"""
import json
import os
import subprocess

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
PID = "d901b4ab-a271-4aff-b63a-bf92d73b9bb0"
STATE_FILE = "/app/test_reports/iter23_state.json"


@pytest.fixture(scope="session")
def state():
    if not os.path.exists(STATE_FILE):
        subprocess.run(["python", "/app/backend/tests/iter23_setup.py"], check=True, cwd="/app/backend")
    with open(STATE_FILE) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def owner(state):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {state['owner_token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def reviewer(state):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {state['reviewer_token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def restore_docs(state, request):
    """After the module, restore original content + clear reviewer markers via Mongo."""
    yield
    subprocess.run(["python", "/app/backend/tests/iter23_cleanup.py", "--docs-only"], cwd="/app/backend")


# ---------------- AUTH / SESSION ----------------
class TestAuth:
    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401, r.text

    def test_me_owner(self, owner):
        r = owner.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == "owner.qa@emergent.sh"
        assert d["role"] == "owner"
        assert "_id" not in d

    def test_me_reviewer(self, reviewer):
        r = reviewer.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == "vishal.k@emergent.sh"
        assert d["role"] == "member"

    def test_roles_me(self, reviewer, owner):
        assert reviewer.get(f"{API}/roles/me").json()["is_owner"] is False
        assert owner.get(f"{API}/roles/me").json()["is_owner"] is True

    def test_reviewer_cannot_list_owners(self, reviewer):
        r = reviewer.get(f"{API}/roles/owners")
        assert r.status_code == 403, r.text

    def test_reviewer_assignments_scoped(self, reviewer):
        r = reviewer.get(f"{API}/projects/{PID}/assignments")
        assert r.status_code == 200, r.text
        data = r.json()["assignments"]
        assert all(a["assignee_email"] == "vishal.k@emergent.sh" for a in data)
        slugs = {s for a in data for s in a.get("slugs", [])}
        assert len(slugs) == 18, f"expected 18 assigned pages, got {len(slugs)}"


# ---------------- REVIEWER EDIT: authz + marker ----------------
class TestReviewerEdit:
    def test_reviewer_edit_assigned_page_stamps_marker(self, reviewer, state):
        doc = state["assigned_doc"]
        new_content = doc["content"] + "\n\n<!-- TEST_iter23 reviewer edit -->\n"
        r = reviewer.put(f"{API}/projects/{PID}/documents/{doc['id']}", json={"content": new_content})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["content"] == new_content
        assert d["reviewer_edited_by"] == "vishal.k@emergent.sh"
        assert d.get("reviewer_edited_at")
        # GET verifies persistence
        g = reviewer.get(f"{API}/projects/{PID}/documents/{doc['id']}")
        assert g.status_code == 200, g.text
        gd = g.json()
        assert gd["content"] == new_content
        assert gd["reviewer_edited_by"] == "vishal.k@emergent.sh"
        assert gd["status"] != "published"

    def test_reviewer_edit_unassigned_page_forbidden(self, reviewer, state):
        other = state["other_doc"]
        r = reviewer.put(f"{API}/projects/{PID}/documents/{other['id']}",
                         json={"content": other["content"] + "\nTEST_iter23 should not persist"})
        assert r.status_code == 403, r.text
        assert "assigned to you" in r.json().get("detail", "")
        # content untouched
        g = requests.get(f"{API}/projects/{PID}/documents/{other['id']}",
                         headers={"Authorization": r.request.headers["Authorization"]})
        assert g.json()["content"] == other["content"]

    def test_reviewer_cannot_change_status_field(self, reviewer, state):
        """Reviewer PUT must ignore non-content fields (e.g. status)."""
        doc = state["assigned_doc"]
        before = reviewer.get(f"{API}/projects/{PID}/documents/{doc['id']}").json()
        r = reviewer.put(f"{API}/projects/{PID}/documents/{doc['id']}",
                         json={"content": before["content"], "status": "published"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == before["status"] != "published"

    def test_owner_edit_clears_reviewer_marker(self, owner, state):
        doc = state["assigned_doc"]
        new_content = doc["content"] + "\n\n<!-- TEST_iter23 owner edit -->\n"
        r = owner.put(f"{API}/projects/{PID}/documents/{doc['id']}", json={"content": new_content})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["content"] == new_content
        assert d["reviewer_edited_by"] is None
        assert d["reviewer_edited_at"] is None
        g = owner.get(f"{API}/projects/{PID}/documents/{doc['id']}").json()
        assert g["reviewer_edited_by"] is None

    def test_owner_can_edit_any_page(self, owner, state):
        other = state["other_doc"]
        r = owner.put(f"{API}/projects/{PID}/documents/{other['id']}",
                      json={"content": other["content"] + "\n\n<!-- TEST_iter23 -->\n"})
        assert r.status_code == 200, r.text
        # restore immediately
        r2 = owner.put(f"{API}/projects/{PID}/documents/{other['id']}", json={"content": other["content"]})
        assert r2.status_code == 200
        assert r2.json()["content"] == other["content"]


# ---------------- ROLES / PROMOTE (Team tab) ----------------
class TestRolesPromote:
    def test_owners_list_contains_seed(self, owner):
        r = owner.get(f"{API}/roles/owners")
        assert r.status_code == 200, r.text
        emails = [o["email"] for o in r.json()["owners"]]
        assert "sarang@emergent.sh" in emails
        assert all("_id" not in o for o in r.json()["owners"])

    def test_known_emails_owner_only(self, owner, reviewer):
        r = owner.get(f"{API}/projects/{PID}/known-emails")
        assert r.status_code == 200, r.text
        assert "vishal.k@emergent.sh" in r.json()["emails"]
        assert reviewer.get(f"{API}/projects/{PID}/known-emails").status_code == 403

    def test_reviewer_cannot_promote(self, reviewer):
        r = reviewer.post(f"{API}/roles/promote", json={"email": "qa.promote.test@emergent.sh"})
        assert r.status_code == 403, r.text

    def test_owner_promote_adds_owner(self, owner):
        email = "qa.promote.test@emergent.sh"
        r = owner.post(f"{API}/roles/promote", json={"email": email})
        assert r.status_code == 200, r.text
        emails = [o["email"] for o in owner.get(f"{API}/roles/owners").json()["owners"]]
        assert email in emails
        # cleanup handled by iter23_cleanup.py


# ---------------- PUBLISH GATE untouched ----------------
class TestPublishUnchanged:
    def test_reviewer_cannot_publish(self, reviewer, state):
        r = reviewer.post(f"{API}/projects/{PID}/documents/{state['assigned_doc']['id']}/publish")
        assert r.status_code == 403, r.text

    def test_no_published_docs(self, owner):
        r = owner.get(f"{API}/projects/{PID}/documents")
        assert r.status_code == 200, r.text
        docs = r.json()
        assert len(docs) == 121, f"expected 121 docs, got {len(docs)}"
        assert [d["id"] for d in docs if d.get("status") == "published"] == []
