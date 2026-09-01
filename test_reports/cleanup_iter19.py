"""Cleanup test data created during iteration 19 frontend testing."""
import os
import requests
from dotenv import dotenv_values

env = dotenv_values("/app/frontend/.env")
BASE = env["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"

pid = requests.get(f"{API}/public/default-project").json()["project"]["id"]
print("pid:", pid)

# 1. delete assignments for alice@emergent.sh / bob@emergent.sh
rows = requests.get(f"{API}/projects/{pid}/assignments").json()
rows = rows if isinstance(rows, list) else rows.get("assignments", [])
print("total assignments:", len(rows))
for a in rows:
    if a.get("assignee_email") in ("TEST_darkqa@emergent.sh", "test_darkqa@emergent.sh"):
        r = requests.delete(f"{API}/projects/{pid}/assignments/{a['id']}")
        print("deleted assignment", a["assignee_email"], a.get("scope_label"), r.status_code)

# 2. delete TEST comments on what-is-emergent
cm = requests.get(f"{API}/projects/{pid}/comments", params={"doc_slug": "what-is-emergent"}).json()
for c in cm.get("comments", []):
    if "TEST_" in (c.get("body") or ""):
        r = requests.delete(f"{API}/projects/{pid}/comments/{c['id']}")
        print("deleted comment", c["id"], r.status_code)

# 3. verdicts (no DELETE endpoint) -> pymongo
try:
    from pymongo import MongoClient
    benv = dotenv_values("/app/backend/.env")
    cl = MongoClient(benv["MONGO_URL"])
    db = cl[benv["DB_NAME"]]
    res = db.review_verdicts.delete_many({"doc_slug": "what-is-emergent", "reviewer_email": "dev@local"})
    print("deleted verdicts:", res.deleted_count)
except Exception as e:  # noqa: BLE001
    print("verdict cleanup failed:", e)

# 4. verify final state
rows = requests.get(f"{API}/projects/{pid}/assignments").json()
rows = rows if isinstance(rows, list) else rows.get("assignments", [])
print("remaining assignments:", len(rows), "emails:", sorted({a.get("assignee_email") for a in rows}))
cm = requests.get(f"{API}/projects/{pid}/comments", params={"doc_slug": "what-is-emergent"}).json()
print("remaining comments on what-is-emergent:", len(cm.get("comments", [])))
vd = requests.get(f"{API}/projects/{pid}/verdicts", params={"doc_slug": "what-is-emergent"}).json()
print("remaining verdicts:", len(vd.get("verdicts", [])))
docs = requests.get(f"{API}/projects/{pid}/documents").json()
print("published docs:", sum(1 for d in docs if d.get("status") == "published"))
