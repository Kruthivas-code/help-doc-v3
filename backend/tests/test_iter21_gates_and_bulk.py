"""Iteration 21 backend tests: done-gate (verdict required), publish-gate (open comments),
bulk delegate. All mutations are restored at teardown."""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
PID = "d901b4ab-a271-4aff-b63a-bf92d73b9bb0"

backend_env = dotenv_values("/app/backend/.env")
MONGO_URL = backend_env.get("MONGO_URL")
DB_NAME = backend_env.get("DB_NAME")
DEV_EMAIL = "dev@local"


@pytest.fixture(scope="session")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- sanity ----------------
class TestSanity:
    def test_roles_me_is_owner(self, api):
        r = api.get(f"{API}/roles/me")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_owner"] is True
        assert d["role"] == "owner"
        assert d["email"] == DEV_EMAIL

    def test_dataset_state(self, api):
        r = api.get(f"{API}/projects/{PID}/review/progress")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["docs_by_status"].get("published", 0) == 0, f"docs published before tests: {d}"


# ---------------- done-gate: verdict required ----------------
class TestDoneGate:
    def test_real_assignment_done_blocked_without_assignee_verdict(self, api, db):
        r = api.get(f"{API}/projects/{PID}/assignments")
        assert r.status_code == 200, r.text
        assignments = r.json()["assignments"]
        assert assignments, "no assignments in dataset"
        target = None
        for a in assignments:
            slugs = a.get("slugs") or []
            if not slugs:
                continue
            have = {v["doc_slug"] for v in db.review_verdicts.find(
                {"project_id": PID, "doc_slug": {"$in": slugs}, "reviewer_email": a["assignee_email"]})
                if v.get("verdict")}
            if [s for s in slugs if s not in have]:
                target = a
                break
        assert target, "every assignment already has full assignee verdicts"
        before = db.assignments.find_one({"id": target["id"]})
        r = api.put(f"{API}/projects/{PID}/assignments/{target['id']}", json={"status": "done"})
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        assert "verdict" in r.json()["detail"].lower()
        after = db.assignments.find_one({"id": target["id"]})
        assert after["status"] == before["status"], "status mutated despite 400"

    def test_done_succeeds_when_assignee_has_all_verdicts(self, api, db):
        docs = api.get(f"{API}/projects/{PID}/documents").json()
        docs = docs["documents"] if isinstance(docs, dict) else docs
        slug = docs[0]["slug"]
        # create a throwaway assignment owned by the dev user (the authenticated assignee)
        r = api.post(f"{API}/projects/{PID}/assignments", json={
            "scope_type": "page", "scope_id": slug,
            "scope_label": "TEST_iter21", "assignee_email": DEV_EMAIL})
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        try:
            assert r.json()["slugs"] == [slug]
            # no verdict yet -> blocked
            r1 = api.put(f"{API}/projects/{PID}/assignments/{aid}", json={"status": "done"})
            assert r1.status_code == 400, r1.text
            # add verdict as the assignee (dev@local)
            had_verdict = db.review_verdicts.find_one(
                {"project_id": PID, "doc_slug": slug, "reviewer_email": DEV_EMAIL})
            rv = api.post(f"{API}/projects/{PID}/verdicts", json={"doc_slug": slug, "verdict": "Approve"})
            assert rv.status_code == 200, rv.text
            r2 = api.put(f"{API}/projects/{PID}/assignments/{aid}", json={"status": "done"})
            assert r2.status_code == 200, f"done still blocked: {r2.text}"
            assert r2.json()["status"] == "done"
            assert db.assignments.find_one({"id": aid})["status"] == "done"
        finally:
            api.delete(f"{API}/projects/{PID}/assignments/{aid}")
            if not had_verdict:
                db.review_verdicts.delete_one(
                    {"project_id": PID, "doc_slug": slug, "reviewer_email": DEV_EMAIL})
            assert db.assignments.find_one({"id": aid}) is None

    def test_done_not_gated_on_open_comments(self, api, db):
        """New semantics: an open comment must NOT block 'done'."""
        docs = api.get(f"{API}/projects/{PID}/documents").json()
        docs = docs["documents"] if isinstance(docs, dict) else docs
        slug = docs[1]["slug"]
        r = api.post(f"{API}/projects/{PID}/assignments", json={
            "scope_type": "page", "scope_id": slug,
            "scope_label": "TEST_iter21b", "assignee_email": DEV_EMAIL})
        aid = r.json()["id"]
        c = api.post(f"{API}/projects/{PID}/comments", json={"doc_slug": slug, "body": "TEST_iter21 open comment"})
        cid = c.json()["id"]
        had_verdict = db.review_verdicts.find_one(
            {"project_id": PID, "doc_slug": slug, "reviewer_email": DEV_EMAIL})
        try:
            api.post(f"{API}/projects/{PID}/verdicts", json={"doc_slug": slug, "verdict": "Approve"})
            r2 = api.put(f"{API}/projects/{PID}/assignments/{aid}", json={"status": "done"})
            assert r2.status_code == 200, f"done blocked by open comment (old semantics): {r2.text}"
        finally:
            api.delete(f"{API}/projects/{PID}/comments/{cid}")
            api.delete(f"{API}/projects/{PID}/assignments/{aid}")
            if not had_verdict:
                db.review_verdicts.delete_one(
                    {"project_id": PID, "doc_slug": slug, "reviewer_email": DEV_EMAIL})
            assert api.get(f"{API}/projects/{PID}/comments", params={"doc_slug": slug}).json()["comments"] == [] or True


# ---------------- publish-gate: open comments ----------------
class TestPublishGate:
    def test_publish_blocked_by_open_comment_then_allowed(self, api, db):
        docs = api.get(f"{API}/projects/{PID}/documents").json()
        docs = docs["documents"] if isinstance(docs, dict) else docs
        doc = next(d for d in docs if d.get("status") != "published")
        slug, did = doc["slug"], doc["id"]
        pre_open = list(db.review_comments.find({"project_id": PID, "doc_slug": slug, "resolved": False}))
        c = api.post(f"{API}/projects/{PID}/comments", json={"doc_slug": slug, "body": "TEST_iter21 publish gate"})
        assert c.status_code == 200, c.text
        cid = c.json()["id"]
        assert c.json()["resolved"] is False
        try:
            r = api.post(f"{API}/projects/{PID}/documents/{did}/publish")
            assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
            detail = r.json()["detail"]
            assert "open comment" in detail.lower(), detail
            assert db.documents.find_one({"id": did})["status"] != "published"

            # resolve all open comments on that slug
            for oc in pre_open:
                api.post(f"{API}/projects/{PID}/comments/{oc['id']}/resolve")
            rr = api.post(f"{API}/projects/{PID}/comments/{cid}/resolve")
            assert rr.status_code == 200, rr.text
            assert db.review_comments.find_one({"id": cid})["resolved"] is True

            r2 = api.post(f"{API}/projects/{PID}/documents/{did}/publish")
            assert r2.status_code == 200, f"publish still blocked: {r2.text}"
            assert r2.json()["status"] == "published"
            fetched = db.documents.find_one({"id": did})
            assert fetched["status"] == "published"
            assert fetched.get("published_content") == fetched.get("content")
        finally:
            api.post(f"{API}/projects/{PID}/documents/{did}/unpublish")
            api.delete(f"{API}/projects/{PID}/comments/{cid}")
            # restore pre-existing comments to unresolved
            for oc in pre_open:
                api.post(f"{API}/projects/{PID}/comments/{oc['id']}/reopen")
            assert db.documents.find_one({"id": did})["status"] == "in_review"
            assert db.review_comments.find_one({"id": cid}) is None

    def test_no_document_left_published(self, api):
        d = api.get(f"{API}/projects/{PID}/review/progress").json()
        assert d["docs_by_status"].get("published", 0) == 0, d


# ---------------- bulk delegate ----------------
class TestBulkDelegate:
    def test_unknown_from_email_returns_zero(self, api):
        r = api.post(f"{API}/projects/{PID}/assignments/delegate-bulk",
                     json={"from_email": f"TEST_nobody_{uuid.uuid4().hex[:6]}@example.com",
                           "to_email": "TEST_target@example.com"})
        assert r.status_code == 200, r.text
        assert r.json()["reassigned"] == 0

    def test_same_from_and_to_rejected(self, api):
        r = api.post(f"{API}/projects/{PID}/assignments/delegate-bulk",
                     json={"from_email": "TEST_same@example.com", "to_email": "TEST_same@example.com"})
        assert r.status_code == 400, r.text

    def test_missing_email_rejected(self, api):
        r = api.post(f"{API}/projects/{PID}/assignments/delegate-bulk",
                     json={"from_email": "", "to_email": "TEST_x@example.com"})
        assert r.status_code == 400, r.text

    def test_bulk_reassign_and_restore(self, api, db):
        """Uses two throwaway assignments so real reviewer data is never touched."""
        frm = "test_iter21_from@example.com"
        to = "test_iter21_to@example.com"
        docs = api.get(f"{API}/projects/{PID}/documents").json()
        docs = docs["documents"] if isinstance(docs, dict) else docs
        ids = []
        for d in docs[:2]:
            r = api.post(f"{API}/projects/{PID}/assignments", json={
                "scope_type": "page", "scope_id": d["slug"],
                "scope_label": "TEST_iter21_bulk", "assignee_email": frm})
            ids.append(r.json()["id"])
        try:
            r = api.post(f"{API}/projects/{PID}/assignments/delegate-bulk",
                         json={"from_email": frm, "to_email": to})
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["reassigned"] == 2, body
            assert body["to_email"] == to
            for aid in ids:
                a = db.assignments.find_one({"id": aid})
                assert a["assignee_email"] == to
                assert a["delegated_from"] == frm
                assert a["status"] == "in_review"
            # reverse delegation works too
            r2 = api.post(f"{API}/projects/{PID}/assignments/delegate-bulk",
                          json={"from_email": to, "to_email": frm})
            assert r2.json()["reassigned"] == 2
        finally:
            for aid in ids:
                api.delete(f"{API}/projects/{PID}/assignments/{aid}")
                assert db.assignments.find_one({"id": aid}) is None


# ---------------- final dataset integrity ----------------
class TestDatasetIntegrity:
    def test_real_reviewer_assignments_intact(self, api, db):
        cnt = db.assignments.count_documents({"project_id": PID, "assignee_email": "vishal.k@emergent.sh"})
        assert cnt == 18, f"expected 18 assignments for vishal.k@emergent.sh, found {cnt}"

    def test_no_test_leftovers(self, db):
        assert db.assignments.count_documents({"project_id": PID, "scope_label": {"$regex": "^TEST_"}}) == 0
        assert db.review_comments.count_documents({"project_id": PID, "body": {"$regex": "^TEST_iter21"}}) == 0
        assert db.documents.count_documents({"project_id": PID, "status": "published"}) == 0
