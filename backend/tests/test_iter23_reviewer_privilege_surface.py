"""Iteration 23 extra: privilege-surface probes for a REVIEWER (non-owner) session.

Verifies whether non-owner sessions can perform owner-level mutations reachable from the
full editor UI (which reviewers can now open via 'Full editor' on the review page).
Probes are idempotent / self-cleaning.
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


@pytest.fixture(scope="module")
def rev(st):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {st['reviewer_token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def own(st):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {st['owner_token']}", "Content-Type": "application/json"})
    return s


def test_reviewer_config_write(rev, own):
    """Reviewer should NOT be able to rewrite project navigation/config (owner surface)."""
    cfg = own.get(f"{API}/projects/{PID}/config").json()
    payload = {k: v for k, v in cfg.items() if k in ("navigation", "theme", "name", "logo", "favicon", "colors", "settings")}
    r = rev.put(f"{API}/projects/{PID}/config", json=payload)
    assert r.status_code == 403, f"reviewer could write project config (status {r.status_code})"


def test_reviewer_create_document(rev, own):
    r = rev.post(f"{API}/projects/{PID}/documents",
                 json={"title": "TEST_iter23 probe", "slug": "test-iter23-probe", "content": "probe"})
    if r.status_code in (200, 201):
        did = r.json().get("id")
        own.delete(f"{API}/projects/{PID}/documents/{did}")  # cleanup
        pytest.fail("reviewer was able to CREATE a document (should be owner-only)")
    assert r.status_code == 403, f"unexpected status {r.status_code}: {r.text[:200]}"


def test_reviewer_delete_document(rev, own):
    """NON-DESTRUCTIVE: owner creates a throwaway doc, reviewer tries to delete it.

    WARNING for future runs: DELETE /documents/{id} currently has NO owner gate, so a
    reviewer session CAN delete real docs. Never point this probe at a real document.
    """
    c = own.post(f"{API}/projects/{PID}/documents",
                 json={"title": "TEST_iter23 throwaway", "slug": "test-iter23-throwaway", "content": "x"})
    assert c.status_code in (200, 201), c.text
    did = c.json()["id"]
    try:
        r = rev.delete(f"{API}/projects/{PID}/documents/{did}")
        assert r.status_code == 403, f"reviewer was able to DELETE a document (status {r.status_code})"
    finally:
        own.delete(f"{API}/projects/{PID}/documents/{did}")


def test_reviewer_version_restore(rev, st):
    r = rev.post(f"{API}/projects/{PID}/documents/{st['assigned_doc']['id']}/restore", json={"version_id": "nope"})
    assert r.status_code in (403, 404), f"unexpected status {r.status_code}"
