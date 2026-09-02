"""Iteration 24: retest of the iteration-23 CRITICAL owner-gate fixes.

Modules covered:
  * require_owner() on POST /projects/{pid}/documents, DELETE /projects/{pid}/documents/{id},
    PUT /projects/{pid}/config  -> must be 403 for role=member (reviewer).
  * Owner regression on the same three endpoints.
  * Reviewer content edit on an ASSIGNED page must still work (200 + reviewer_edited_by).
Sessions come from /app/test_reports/iter23_state.json (run iter23_setup.py first).
"""
import json
import os

import pytest
import requests
from dotenv import dotenv_values

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"
PID = "d901b4ab-a271-4aff-b63a-bf92d73b9bb0"


@pytest.fixture(scope="module")
def st():
    with open("/app/test_reports/iter23_state.json") as f:
        return json.load(f)


def _sess(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def rev(st):
    return _sess(st["reviewer_token"])


@pytest.fixture(scope="module")
def own(st):
    return _sess(st["owner_token"])


# ---------- sanity: identities ----------
def test_identities(rev, own):
    r = rev.get(f"{API}/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "member"
    o = own.get(f"{API}/auth/me")
    assert o.status_code == 200, o.text
    assert o.json()["role"] == "owner"
    assert requests.get(f"{API}/auth/me").status_code == 401


# ---------- SECURITY FIX ----------
def test_reviewer_create_document_403(rev, own):
    r = rev.post(f"{API}/projects/{PID}/documents",
                 json={"title": "TEST_iter24 probe", "slug": "test-iter24-probe", "content": "probe"})
    if r.status_code in (200, 201):
        own.delete(f"{API}/projects/{PID}/documents/{r.json().get('id')}")
        pytest.fail("reviewer CREATED a document (owner gate missing)")
    assert r.status_code == 403, f"{r.status_code}: {r.text[:200]}"
    assert "Owner access required" in r.text


def test_reviewer_delete_document_403_and_doc_intact(rev, own):
    """Owner creates a throwaway doc; reviewer DELETE must 403 and the doc must survive."""
    c = own.post(f"{API}/projects/{PID}/documents",
                 json={"title": "TEST_iter24 throwaway", "slug": "test-iter24-throwaway", "content": "x"})
    assert c.status_code in (200, 201), c.text
    did = c.json()["id"]
    try:
        r = rev.delete(f"{API}/projects/{PID}/documents/{did}")
        assert r.status_code == 403, f"reviewer DELETED a document (status {r.status_code})"
        assert "Owner access required" in r.text
        # doc still there
        g = own.get(f"{API}/projects/{PID}/documents/{did}")
        assert g.status_code == 200
        assert g.json()["slug"] == "test-iter24-throwaway"
    finally:
        d = own.delete(f"{API}/projects/{PID}/documents/{did}")
        assert d.status_code in (200, 204), d.text


def test_reviewer_config_write_403(rev, own):
    cfg = own.get(f"{API}/projects/{PID}/config")
    assert cfg.status_code == 200, cfg.text
    cfg = cfg.json()
    payload = {k: v for k, v in cfg.items()
               if k in ("navigation", "theme", "name", "logo", "favicon", "colors", "settings")}
    r = rev.put(f"{API}/projects/{PID}/config", json=payload)
    assert r.status_code == 403, f"reviewer wrote project config (status {r.status_code})"
    assert "Owner access required" in r.text


def test_reviewer_version_restore_blocked(rev, st):
    r = rev.post(f"{API}/projects/{PID}/documents/{st['assigned_doc']['id']}/restore",
                 json={"version_id": "nope"})
    assert r.status_code in (403, 404), f"unexpected {r.status_code}: {r.text[:200]}"


# ---------- OWNER REGRESSION ----------
def test_owner_create_config_delete_roundtrip(own):
    # snapshot config
    before = own.get(f"{API}/projects/{PID}/config")
    assert before.status_code == 200, before.text
    before_json = before.json()
    nav_before = json.dumps(before_json.get("navigation"), sort_keys=True)

    # CREATE
    c = own.post(f"{API}/projects/{PID}/documents",
                 json={"title": "TEST_iter24 owner doc", "slug": "test-iter24-owner-doc", "content": "hello"})
    assert c.status_code in (200, 201), c.text
    did = c.json()["id"]
    assert c.json()["slug"] == "test-iter24-owner-doc"

    try:
        # GET verifies persistence
        g = own.get(f"{API}/projects/{PID}/documents/{did}")
        assert g.status_code == 200
        assert g.json()["content"] == "hello"

        # PUT config as no-op with CURRENT navigation
        payload = {k: v for k, v in before_json.items()
                   if k in ("navigation", "theme", "name", "logo", "favicon", "colors", "settings")}
        p = own.put(f"{API}/projects/{PID}/config", json=payload)
        assert p.status_code == 200, f"owner config PUT failed {p.status_code}: {p.text[:300]}"

        after = own.get(f"{API}/projects/{PID}/config").json()
        assert json.dumps(after.get("navigation"), sort_keys=True) == nav_before, "navigation mutated by no-op PUT"
    finally:
        d = own.delete(f"{API}/projects/{PID}/documents/{did}")
        assert d.status_code in (200, 204), d.text
    # verify removal
    assert own.get(f"{API}/projects/{PID}/documents/{did}").status_code == 404


def test_doc_counts_unchanged(own):
    docs = own.get(f"{API}/projects/{PID}/documents")
    assert docs.status_code == 200
    body = docs.json()
    items = body if isinstance(body, list) else body.get("documents", [])
    assert len(items) == 121, f"expected 121 docs, got {len(items)}"
    assert not [d for d in items if d.get("status") == "published"], "published docs found"
    assert not [d for d in items if str(d.get("slug", "")).startswith("test-iter24")], "throwaway doc left behind"


# ---------- REVIEWER CONTENT EDIT (no regression) ----------
def test_reviewer_edit_assigned_doc(rev, own, st):
    doc = st["assigned_doc"]
    new_content = doc["content"] + "\n\n<!-- TEST_iter24 reviewer edit -->\n"
    r = rev.put(f"{API}/projects/{PID}/documents/{doc['id']}", json={"content": new_content})
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    assert r.json()["reviewer_edited_by"] == "vishal.k@emergent.sh"

    g = own.get(f"{API}/projects/{PID}/documents/{doc['id']}")
    assert g.status_code == 200
    assert g.json()["content"] == new_content

    # restore original + clear marker via owner PUT
    rest = own.put(f"{API}/projects/{PID}/documents/{doc['id']}", json={"content": doc["content"]})
    assert rest.status_code == 200, rest.text
    final = own.get(f"{API}/projects/{PID}/documents/{doc['id']}").json()
    assert final["content"] == doc["content"]
    assert not final.get("reviewer_edited_by")


def test_reviewer_edit_unassigned_doc_403(rev, own, st):
    other = st["other_doc"]
    r = rev.put(f"{API}/projects/{PID}/documents/{other['id']}", json={"content": "hack"})
    assert r.status_code == 403, f"unexpected {r.status_code}"
    g = own.get(f"{API}/projects/{PID}/documents/{other['id']}").json()
    assert g["content"] == other["content"]


def test_reviewer_assignments_scoped(rev):
    r = rev.get(f"{API}/projects/{PID}/assignments")
    assert r.status_code == 200, r.text
    body = r.json()
    items = body if isinstance(body, list) else body.get("assignments", [])
    slugs = set()
    for a in items:
        assert a.get("assignee_email") == "vishal.k@emergent.sh"
        slugs.update(a.get("slugs") or [])
    assert len(slugs) == 18, f"expected 18 assigned slugs, got {len(slugs)}"


def test_reviewer_owner_only_role_endpoints(rev, own):
    assert rev.get(f"{API}/projects/{PID}/known-emails").status_code == 403
    assert rev.get(f"{API}/roles/owners").status_code == 403
    o = own.get(f"{API}/roles/owners")
    assert o.status_code == 200
    assert "sarang@emergent.sh" in json.dumps(o.json())
    assert "_id" not in json.dumps(o.json())
    assert rev.post(f"{API}/roles/promote", json={"email": "qa.promote.test@emergent.sh"}).status_code == 403
