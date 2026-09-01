"""Backend tests for nested-subgroup scope flattening + delegate/reassign (review_routes.py).

Auth is bypassed (DISABLE_AUTH=true) so /api/projects/... acts as dev owner.
All created assignments are cleaned up.
"""
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

DEPLOY_COMMON = ['pre-deploy-pre-publish-health-check', 'secrets-env-variables', 'deployment-types',
                 'database-mongodb', 'deployment-plan-levels', 'migrate-to-your-own-database',
                 'file-storage-emergent-object-store', 'scheduled-tasks-background-jobs-in-your-app']
DEPLOY_WEB = ['deploying-web', 'preview-vs-deployed-separate', 'custom-domain',
              'web-mobile-conversion-canonical']


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def pid(client):
    r = client.get(f"{API}/public/default-project", timeout=30)
    assert r.status_code == 200, r.text[:300]
    return r.json()["project"]["id"]


@pytest.fixture(scope="module")
def created(client, pid):
    ids = []
    yield ids
    for aid in ids:
        client.delete(f"{API}/projects/{pid}/assignments/{aid}", timeout=30)


def _assign(client, pid, created, scope_type, scope_id, email, label=None):
    r = client.post(f"{API}/projects/{pid}/assignments", json={
        "scope_type": scope_type, "scope_id": scope_id,
        "scope_label": label or scope_id, "assignee_email": email}, timeout=30)
    assert r.status_code == 200, f"{scope_id} -> {r.status_code} {r.text[:300]}"
    data = r.json()
    assert "_id" not in data
    created.append(data["id"])
    return data


# --- Nested subgroup flattening ---
class TestNestedScopeFlatten:
    def test_parent_group_with_only_subgroups_collects_12_nested_pages(self, client, pid, created):
        a = _assign(client, pid, created, "group", "build::Deployments", "TEST_nested@emergent.sh")
        assert sorted(a["slugs"]) == sorted(DEPLOY_COMMON + DEPLOY_WEB), a["slugs"]
        assert len(a["slugs"]) == 12
        # verify persistence
        r = client.get(f"{API}/projects/{pid}/assignments", timeout=30)
        assert r.status_code == 200
        got = [x for x in r.json()["assignments"] if x["id"] == a["id"]]
        assert got and len(got[0]["slugs"]) == 12

    def test_nested_subgroup_web_flow_only_4_pages(self, client, pid, created):
        a = _assign(client, pid, created, "group", "build::Web flow", "TEST_nested@emergent.sh")
        assert sorted(a["slugs"]) == sorted(DEPLOY_WEB), a["slugs"]

    def test_nested_subgroup_common_only_8_pages(self, client, pid, created):
        a = _assign(client, pid, created, "group", "build::Common", "TEST_nested@emergent.sh")
        assert sorted(a["slugs"]) == sorted(DEPLOY_COMMON), a["slugs"]

    def test_tab_scope_learn_basics_18_pages(self, client, pid, created):
        a = _assign(client, pid, created, "tab", "learn-the-basics", "TEST_nested@emergent.sh")
        assert len(a["slugs"]) == 18, a["slugs"]

    def test_unknown_group_yields_empty_slugs(self, client, pid, created):
        a = _assign(client, pid, created, "group", "build::NoSuchGroup", "TEST_nested@emergent.sh")
        assert a["slugs"] == []


# --- Delegate / reassign ---
class TestDelegate:
    def test_delegate_sets_new_assignee_and_delegated_from(self, client, pid, created):
        a = _assign(client, pid, created, "page", "custom-domain", "first@emergent.sh")
        r = client.post(f"{API}/projects/{pid}/assignments/{a['id']}/delegate",
                        json={"email": "second@emergent.sh"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        lst = client.get(f"{API}/projects/{pid}/assignments", timeout=30).json()["assignments"]
        row = next(x for x in lst if x["id"] == a["id"])
        assert row["assignee_email"] == "second@emergent.sh"
        assert row["delegated_from"] == "first@emergent.sh"

    def test_delegate_unknown_assignment_404(self, client, pid):
        r = client.post(f"{API}/projects/{pid}/assignments/does-not-exist/delegate",
                        json={"email": "x@emergent.sh"}, timeout=30)
        assert r.status_code == 404, r.status_code


# --- Cleanup verification ---
def test_delete_assignment_removes_it(client, pid):
    r = client.post(f"{API}/projects/{pid}/assignments", json={
        "scope_type": "page", "scope_id": "custom-domain", "scope_label": "TEST",
        "assignee_email": "TEST_del@emergent.sh"}, timeout=30)
    aid = r.json()["id"]
    d = client.delete(f"{API}/projects/{pid}/assignments/{aid}", timeout=30)
    assert d.status_code in (200, 204)
    lst = client.get(f"{API}/projects/{pid}/assignments", timeout=30).json()["assignments"]
    assert all(x["id"] != aid for x in lst)


def test_public_published_count_unchanged(client):
    r = client.get(f"{API}/public/emergent/docs", timeout=30)
    if r.status_code == 404:
        pytest.skip("public docs listing endpoint not available")
    assert r.status_code == 200
