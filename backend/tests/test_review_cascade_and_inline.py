"""Backend tests for iteration 17: cascade multi-select assignments (per-page rows),
inline review page data needs (verdicts/comments), and owner-gating regressions."""
import os
import pytest
import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
base = os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")
if not base:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base.rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "test_cascade_reviewer@emergent.sh"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def project(client):
    r = client.get(f"{API}/public/default-project")
    assert r.status_code == 200, r.text
    d = r.json()
    return d["project"]["id"], d["config"]


@pytest.fixture(scope="module")
def created(client, project):
    ids = []
    yield ids
    pid, _ = project
    for aid in ids:
        client.delete(f"{API}/projects/{pid}/assignments/{aid}")


# --- config / cascade math -------------------------------------------------
def tab_pages(config, tab_label):
    tabs = config.get("navigation", {}).get("tabs", [])
    tab = next(t for t in tabs if t["label"] == tab_label)
    pages = []

    def collect(g):
        for p in g.get("pages", []) or []:
            pages.append(p if isinstance(p, str) else p.get("page"))
        for gg in g.get("groups", []) or []:
            collect(gg)

    for g in tab.get("groups", []) or []:
        collect(g)
    return [p for p in pages if p]


def test_learn_the_basics_has_18_pages(project):
    _, config = project
    pages = tab_pages(config, "Learn the Basics")
    assert len(pages) == 18, f"expected 18 pages, got {len(pages)}: {pages}"
    assert len(set(pages)) == 18, "duplicate slugs in tab"


def test_learn_the_basics_group_breakdown(project):
    _, config = project
    tabs = config["navigation"]["tabs"]
    tab = next(t for t in tabs if t["label"] == "Learn the Basics")
    counts = {}
    for g in tab["groups"]:
        pages = []

        def collect(gg):
            for p in gg.get("pages", []) or []:
                pages.append(p if isinstance(p, str) else p.get("page"))
            for x in gg.get("groups", []) or []:
                collect(x)

        collect(g)
        counts[g["group"]] = len(pages)
    assert counts.get("Get Started") == 7, counts
    assert counts.get("Grow Your App") == 9, counts
    assert counts.get("Reference") == 2, counts


# --- per-page assignment creation (what cascade Assign does) ---------------
def test_cascade_creates_one_assignment_per_page(client, project, created):
    pid, config = project
    pages = tab_pages(config, "Learn the Basics")
    for slug in pages:
        r = client.post(f"{API}/projects/{pid}/assignments", json={
            "scope_type": "page", "scope_id": slug,
            "scope_label": slug, "assignee_email": TEST_EMAIL,
        })
        assert r.status_code == 200, f"{slug}: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert "_id" not in body
        assert body["assignee_email"] == TEST_EMAIL
        assert body["scope_type"] == "page"
        assert body["slugs"] == [slug]
        created.append(body["id"])

    lst = client.get(f"{API}/projects/{pid}/assignments")
    assert lst.status_code == 200
    rows = [a for a in lst.json()["assignments"] if a["assignee_email"] == TEST_EMAIL]
    assert len(rows) == len(pages) == 18
    assert {a["scope_id"] for a in rows} == set(pages)
    assert all(a["status"] == "in_review" for a in rows)


def test_assignment_delete_removes_rows(client, project):
    pid, _ = project
    r = client.post(f"{API}/projects/{pid}/assignments", json={
        "scope_type": "page", "scope_id": "talk-it-through",
        "scope_label": "TEST_del", "assignee_email": "test_del_cascade@emergent.sh",
    })
    assert r.status_code == 200
    aid = r.json()["id"]
    d = client.delete(f"{API}/projects/{pid}/assignments/{aid}")
    assert d.status_code == 200
    rows = client.get(f"{API}/projects/{pid}/assignments").json()["assignments"]
    assert aid not in [a["id"] for a in rows]


# --- inline review page: verdicts -----------------------------------------
def test_verdict_upsert_and_read(client, project):
    pid, _ = project
    for v in ["Approve", "Request changes"]:
        r = client.post(f"{API}/projects/{pid}/verdicts", json={"doc_slug": "talk-it-through", "verdict": v})
        assert r.status_code == 200, r.text
        g = client.get(f"{API}/projects/{pid}/verdicts", params={"doc_slug": "talk-it-through"})
        assert g.status_code == 200
        mine = [x for x in g.json()["verdicts"] if x["reviewer_email"] == "dev@local"]
        assert len(mine) == 1, f"verdict not upserted: {mine}"
        assert mine[0]["verdict"] == v
        assert "_id" not in mine[0]


# --- inline review page: anchored comments --------------------------------
def test_anchored_comment_lifecycle(client, project):
    pid, _ = project
    r = client.post(f"{API}/projects/{pid}/comments", json={
        "doc_slug": "talk-it-through", "body": "TEST_ anchored comment",
        "anchor_text": "Talk it through",
    })
    assert r.status_code == 200, r.text
    c = r.json()
    assert c["anchor_text"] == "Talk it through"
    assert c["resolved"] is False
    assert "_id" not in c
    cid = c["id"]

    g = client.get(f"{API}/projects/{pid}/comments", params={"doc_slug": "talk-it-through"})
    got = next(x for x in g.json()["comments"] if x["id"] == cid)
    assert got["anchor_text"] == "Talk it through"

    assert client.post(f"{API}/projects/{pid}/comments/{cid}/resolve").status_code == 200
    g = client.get(f"{API}/projects/{pid}/comments", params={"doc_slug": "talk-it-through"})
    assert next(x for x in g.json()["comments"] if x["id"] == cid)["resolved"] is True
    assert client.post(f"{API}/projects/{pid}/comments/{cid}/reopen").status_code == 200
    g = client.get(f"{API}/projects/{pid}/comments", params={"doc_slug": "talk-it-through"})
    assert next(x for x in g.json()["comments"] if x["id"] == cid)["resolved"] is False
    assert client.delete(f"{API}/projects/{pid}/comments/{cid}").status_code == 200


# --- regressions ----------------------------------------------------------
def test_owner_endpoints_200_for_dev_owner(client, project):
    pid, _ = project
    assert client.get(f"{API}/roles/me").json()["is_owner"] is True
    ke = client.get(f"{API}/projects/{pid}/known-emails")
    assert ke.status_code == 200, ke.text
    assert isinstance(ke.json()["emails"], list)
    for path in ["review/progress", "review/inbox"]:
        assert client.get(f"{API}/projects/{pid}/{path}").status_code == 200


def test_done_gate_blocks_with_open_comment(client, project):
    pid, _ = project
    a = client.post(f"{API}/projects/{pid}/assignments", json={
        "scope_type": "page", "scope_id": "talk-it-through",
        "scope_label": "TEST_gate", "assignee_email": "test_gate_cascade@emergent.sh",
    })
    assert a.status_code == 200
    aid = a.json()["id"]
    c = client.post(f"{API}/projects/{pid}/comments", json={
        "doc_slug": "talk-it-through", "body": "TEST_ open blocker"})
    cid = c.json()["id"]
    try:
        r = client.put(f"{API}/projects/{pid}/assignments/{aid}", json={"status": "done"})
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"
        assert "open comment" in r.json()["detail"].lower()
        client.post(f"{API}/projects/{pid}/comments/{cid}/resolve")
        r2 = client.put(f"{API}/projects/{pid}/assignments/{aid}", json={"status": "done"})
        assert r2.status_code == 200, r2.text
    finally:
        client.delete(f"{API}/projects/{pid}/comments/{cid}")
        client.delete(f"{API}/projects/{pid}/assignments/{aid}")


def test_review_page_slug_resolvable(client, project):
    pid, _ = project
    docs = client.get(f"{API}/projects/{pid}/documents")
    assert docs.status_code == 200
    slugs = [d["slug"] for d in docs.json()]
    assert "talk-it-through" in slugs
