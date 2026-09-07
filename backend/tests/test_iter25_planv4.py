"""Iteration 25 - Plan v4 regression: permissions reversal (Part 5), owner-gate messaging,
soft delete/trash (Part 4), threaded comments + @mentions (Part 2), activity log (Part 3),
assigned-by, known-emails open to any signed-in user.

Assumes iter23_setup.py has been run and iter23_state.json exists.
Runs against REACT_APP_BACKEND_URL from /app/frontend/.env.
"""
import os
import json
import re
import uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
PID = 'd901b4ab-a271-4aff-b63a-bf92d73b9bb0'

with open('/app/test_reports/iter23_state.json') as f:
    STATE = json.load(f)

OWNER_TOKEN = STATE['owner_token']
REVIEWER_TOKEN = STATE['reviewer_token']
ASSIGNED_DOC = STATE['assigned_doc']       # slug=put-your-app-live, assigned to vishal.k
OTHER_DOC = STATE['other_doc']             # slug=pre-deploy-pre-publish-health-check (NOT assigned)


def hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- Auth gate ----------
class TestAuthGate:
    def test_no_token_401_on_protected(self):
        # /auth/me is 401
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/activity")
        assert r.status_code == 401
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/assignments")
        assert r.status_code == 401
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/trash")
        assert r.status_code == 401

    def test_owner_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=hdr(OWNER_TOKEN))
        assert r.status_code == 200
        assert r.json().get('role') == 'owner'

    def test_reviewer_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=hdr(REVIEWER_TOKEN))
        assert r.status_code == 200
        assert r.json().get('role') == 'member'


# ---------- Part 5 permissions (reversal): reviewer can now edit/create/resolve/comment ----------
class TestReviewerPermissionsPart5:
    def test_reviewer_can_edit_any_document(self):
        """Reviewer PUT on a NON-assigned doc should now succeed (open to any signed-in)."""
        did = OTHER_DOC['id']
        original = OTHER_DOC['content']
        marker = f"\n<!-- iter25 reviewer edit {uuid.uuid4().hex[:6]} -->"
        r = requests.put(
            f"{BASE_URL}/api/projects/{PID}/documents/{did}",
            headers=hdr(REVIEWER_TOKEN),
            json={"content": original + marker})
        assert r.status_code == 200, r.text
        # Restore content
        rr = requests.put(
            f"{BASE_URL}/api/projects/{PID}/documents/{did}",
            headers=hdr(OWNER_TOKEN),
            json={"content": original})
        assert rr.status_code == 200

    def test_reviewer_can_create_and_delete_page(self):
        slug = f"qa-iter25-{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/projects/{PID}/documents",
            headers=hdr(REVIEWER_TOKEN),
            json={"title": "QA iter25", "slug": slug, "content": "hello"})
        assert r.status_code == 200, r.text
        did = r.json()['id']
        # Reviewer can delete a non-published page (soft delete)
        d = requests.delete(f"{BASE_URL}/api/projects/{PID}/documents/{did}", headers=hdr(REVIEWER_TOKEN))
        assert d.status_code == 200
        assert "Trash" in d.json().get('message', '')
        # Purge for cleanup
        requests.delete(f"{BASE_URL}/api/projects/{PID}/trash/{did}", headers=hdr(OWNER_TOKEN))

    def test_reviewer_can_comment_and_resolve(self):
        slug = OTHER_DOC['slug']
        r = requests.post(
            f"{BASE_URL}/api/projects/{PID}/comments",
            headers=hdr(REVIEWER_TOKEN),
            json={"doc_slug": slug, "body": "iter25 top-level"})
        assert r.status_code == 200, r.text
        cid = r.json()['id']
        # Anyone (reviewer) can resolve
        rr = requests.post(f"{BASE_URL}/api/projects/{PID}/comments/{cid}/resolve",
                           headers=hdr(REVIEWER_TOKEN))
        assert rr.status_code == 200
        # Cleanup: delete comment as owner
        requests.delete(f"{BASE_URL}/api/projects/{PID}/comments/{cid}", headers=hdr(OWNER_TOKEN))


# ---------- Owner-only actions + owner-gate messaging ----------
class TestOwnerOnlyGates:
    def _expect_owner_msg(self, resp, extra=None):
        assert resp.status_code == 403, resp.text
        detail = resp.json().get('detail', '')
        assert "Please contact" in detail, f"missing contact in: {detail}"
        assert "sarang@emergent.sh" in detail, f"sarang not listed in: {detail}"
        if extra:
            assert extra in detail

    def test_reviewer_cannot_publish(self):
        did = OTHER_DOC['id']
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/documents/{did}/publish",
                          headers=hdr(REVIEWER_TOKEN))
        self._expect_owner_msg(r)

    def test_reviewer_cannot_unpublish(self):
        did = OTHER_DOC['id']
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/documents/{did}/unpublish",
                          headers=hdr(REVIEWER_TOKEN))
        self._expect_owner_msg(r)

    def test_reviewer_cannot_create_assignment(self):
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/assignments",
                          headers=hdr(REVIEWER_TOKEN),
                          json={"scope_type": "page", "scope_id": "put-your-app-live",
                                "assignee_email": "qa.other@emergent.sh"})
        self._expect_owner_msg(r)

    def test_reviewer_cannot_get_activity(self):
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/activity", headers=hdr(REVIEWER_TOKEN))
        self._expect_owner_msg(r)

    def test_reviewer_delete_published_gives_publish_msg(self):
        """A non-owner trying to delete a PUBLISHED page should get the special message."""
        # Create a temporary doc, publish as owner, then try to delete as reviewer
        slug = f"qa-iter25-pub-{uuid.uuid4().hex[:6]}"
        c = requests.post(f"{BASE_URL}/api/projects/{PID}/documents", headers=hdr(OWNER_TOKEN),
                          json={"title": "QA published", "slug": slug, "content": "x"})
        assert c.status_code == 200
        did = c.json()['id']
        try:
            p = requests.post(f"{BASE_URL}/api/projects/{PID}/documents/{did}/publish",
                              headers=hdr(OWNER_TOKEN))
            assert p.status_code == 200, p.text
            r = requests.delete(f"{BASE_URL}/api/projects/{PID}/documents/{did}",
                                headers=hdr(REVIEWER_TOKEN))
            assert r.status_code == 403, r.text
            detail = r.json().get('detail', '')
            assert "published" in detail.lower()
            assert "sarang@emergent.sh" in detail
        finally:
            # Unpublish and hard delete for cleanup (to keep published_count = 0)
            requests.post(f"{BASE_URL}/api/projects/{PID}/documents/{did}/unpublish",
                          headers=hdr(OWNER_TOKEN))
            d = requests.delete(f"{BASE_URL}/api/projects/{PID}/documents/{did}",
                                headers=hdr(OWNER_TOKEN))
            # purge from trash
            requests.delete(f"{BASE_URL}/api/projects/{PID}/trash/{did}", headers=hdr(OWNER_TOKEN))


# ---------- Verdict gating (assigned reviewer only, non-owner) ----------
class TestVerdictGating:
    def test_reviewer_verdict_on_assigned_ok(self):
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/verdicts",
                          headers=hdr(REVIEWER_TOKEN),
                          json={"doc_slug": ASSIGNED_DOC['slug'], "verdict": "looks_good"})
        assert r.status_code == 200, r.text

    def test_reviewer_verdict_on_unassigned_403(self):
        # Ensure reviewer is NOT assigned to OTHER_DOC's slug
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/verdicts",
                          headers=hdr(REVIEWER_TOKEN),
                          json={"doc_slug": OTHER_DOC['slug'], "verdict": "looks_good"})
        assert r.status_code == 403, r.text
        assert "assigned" in r.json().get('detail', '').lower()

    def test_owner_verdict_on_any_ok(self):
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/verdicts",
                          headers=hdr(OWNER_TOKEN),
                          json={"doc_slug": OTHER_DOC['slug'], "verdict": "looks_good"})
        assert r.status_code == 200, r.text


# ---------- Soft delete / Trash (Part 4) ----------
class TestSoftDeleteTrash:
    def test_soft_delete_restore_purge_flow(self):
        # Create as reviewer
        slug = f"qa-trash-{uuid.uuid4().hex[:6]}"
        c = requests.post(f"{BASE_URL}/api/projects/{PID}/documents", headers=hdr(REVIEWER_TOKEN),
                          json={"title": "QA trash", "slug": slug, "content": "trash me"})
        assert c.status_code == 200
        did = c.json()['id']

        # Delete (soft)
        d = requests.delete(f"{BASE_URL}/api/projects/{PID}/documents/{did}", headers=hdr(REVIEWER_TOKEN))
        assert d.status_code == 200
        assert d.json().get('message') == "Document moved to Trash"

        # Not in docs list
        docs = requests.get(f"{BASE_URL}/api/projects/{PID}/documents", headers=hdr(OWNER_TOKEN)).json()
        assert not any(x['id'] == did for x in docs)

        # In trash list with days_left=90 and deleted_by_name
        t = requests.get(f"{BASE_URL}/api/projects/{PID}/trash", headers=hdr(OWNER_TOKEN)).json()
        entry = next((x for x in t.get('trash', []) if x['id'] == did), None)
        assert entry is not None, f"not in trash: {t}"
        assert entry.get('days_left') == 90
        assert entry.get('deleted_by_name') in ("Vishal K", "vishal.k@emergent.sh")

        # Not in public docs
        proj = requests.get(f"{BASE_URL}/api/public/default-project").json()
        pub_slugs = [d.get('slug') for d in (proj.get('documents') or [])]
        assert slug not in pub_slugs

        # Not in sitemap
        sm = requests.get(f"{BASE_URL}/api/seo/sitemap.xml").text
        assert slug not in sm

        # Restore
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/documents/{did}/restore-page",
                          headers=hdr(REVIEWER_TOKEN))
        assert r.status_code == 200, r.text

        # Should be back in docs
        docs = requests.get(f"{BASE_URL}/api/projects/{PID}/documents", headers=hdr(OWNER_TOKEN)).json()
        assert any(x['id'] == did for x in docs)

        # Delete again + permanent purge for cleanup
        requests.delete(f"{BASE_URL}/api/projects/{PID}/documents/{did}", headers=hdr(OWNER_TOKEN))
        pr = requests.delete(f"{BASE_URL}/api/projects/{PID}/trash/{did}", headers=hdr(OWNER_TOKEN))
        assert pr.status_code == 200


# ---------- Comment threads + mentions (Part 2) ----------
class TestCommentsPart2:
    def test_thread_reply_and_mentions_stored(self):
        slug = OTHER_DOC['slug']
        top = requests.post(f"{BASE_URL}/api/projects/{PID}/comments", headers=hdr(REVIEWER_TOKEN),
                            json={"doc_slug": slug, "body": "root", "mentions": ["Sarang@Emergent.sh"]})
        assert top.status_code == 200
        top_id = top.json()['id']
        assert top.json().get('mentions') == ["sarang@emergent.sh"], top.json()

        reply = requests.post(f"{BASE_URL}/api/projects/{PID}/comments", headers=hdr(OWNER_TOKEN),
                              json={"doc_slug": slug, "body": "reply", "parent_id": top_id})
        assert reply.status_code == 200
        assert reply.json().get('parent_id') == top_id

        # GET list contains both with parent_id set correctly
        lst = requests.get(f"{BASE_URL}/api/projects/{PID}/comments?doc_slug={slug}",
                           headers=hdr(REVIEWER_TOKEN)).json()
        comments = {c['id']: c for c in lst.get('comments', [])}
        assert top_id in comments
        assert comments[reply.json()['id']]['parent_id'] == top_id

        # Cleanup
        for cid in (reply.json()['id'], top_id):
            requests.delete(f"{BASE_URL}/api/projects/{PID}/comments/{cid}", headers=hdr(OWNER_TOKEN))

    def test_known_emails_open_to_reviewer(self):
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/known-emails", headers=hdr(REVIEWER_TOKEN))
        assert r.status_code == 200, r.text
        emails = r.json().get('emails', [])
        assert isinstance(emails, list) and len(emails) > 0
        assert any(e.endswith('@emergent.sh') for e in emails)


# ---------- Activity log (Part 3) ----------
class TestActivityLog:
    def test_activity_owner_only(self):
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/activity", headers=hdr(OWNER_TOKEN))
        assert r.status_code == 200, r.text
        body = r.json()
        assert 'activity' in body and 'people' in body
        # newest-first
        ts = [a.get('created_at') for a in body['activity'] if a.get('created_at')]
        assert ts == sorted(ts, reverse=True)

    def test_activity_person_filter(self):
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/activity?person=vishal.k@emergent.sh",
                         headers=hdr(OWNER_TOKEN))
        assert r.status_code == 200
        for a in r.json().get('activity', []):
            assert a.get('actor_email') == 'vishal.k@emergent.sh'

    def test_page_activity_open_to_any_signed_in(self):
        r = requests.get(f"{BASE_URL}/api/projects/{PID}/activity/page/mdx-editor-staging",
                         headers=hdr(REVIEWER_TOKEN))
        assert r.status_code == 200
        assert 'activity' in r.json()

    def test_edit_creates_activity_entry(self):
        # Do a reviewer edit then assert an 'edited' entry exists for that slug
        did = OTHER_DOC['id']
        original = OTHER_DOC['content']
        marker = f"\n<!-- iter25 activity {uuid.uuid4().hex[:6]} -->"
        r = requests.put(f"{BASE_URL}/api/projects/{PID}/documents/{did}",
                         headers=hdr(REVIEWER_TOKEN), json={"content": original + marker})
        assert r.status_code == 200
        try:
            a = requests.get(f"{BASE_URL}/api/projects/{PID}/activity/page/{OTHER_DOC['slug']}",
                             headers=hdr(OWNER_TOKEN)).json()
            assert any(x.get('action') == 'edited' and x.get('actor_email') == 'vishal.k@emergent.sh'
                       for x in a.get('activity', [])), a
        finally:
            requests.put(f"{BASE_URL}/api/projects/{PID}/documents/{did}",
                         headers=hdr(OWNER_TOKEN), json={"content": original})


# ---------- Assigned-by ----------
class TestAssignedBy:
    def test_assignment_stores_assigned_by_name(self):
        slug = ASSIGNED_DOC['slug']
        r = requests.post(f"{BASE_URL}/api/projects/{PID}/assignments", headers=hdr(OWNER_TOKEN),
                          json={"scope_type": "page", "scope_id": slug, "scope_label": slug,
                                "assignee_email": "qa.other@emergent.sh"})
        assert r.status_code == 200, r.text
        a = r.json()
        assert a.get('assigned_by_name') in ("QA Owner", "owner.qa@emergent.sh")
        aid = a['id']
        # Appears in list assignments
        lst = requests.get(f"{BASE_URL}/api/projects/{PID}/assignments", headers=hdr(OWNER_TOKEN)).json()
        found = next((x for x in lst.get('assignments', []) if x['id'] == aid), None)
        assert found is not None
        assert found.get('assigned_by_name') in ("QA Owner", "owner.qa@emergent.sh")
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{PID}/assignments/{aid}", headers=hdr(OWNER_TOKEN))
