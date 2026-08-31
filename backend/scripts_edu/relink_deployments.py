"""Relink orphaned deployment pages into the empty 'Deployments' group (Build tab)."""
import asyncio, os
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

# Ordered candidate pages that belong in Deployments
CANDIDATES = [
    "deployment-types", "deployment-plan-levels", "deploying-web",
    "preview-vs-deployed-separate", "pre-deploy-pre-publish-health-check", "custom-domain",
]

async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    p = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = p["id"]
    cfg = await db.project_configs.find_one({"project_id": pid})
    tabs = cfg["navigation"]["tabs"]

    def slug_of(pp): return pp.get("page") if isinstance(pp, dict) else pp

    # collect all currently-linked slugs
    linked = set()
    def walk(g):
        for pp in g.get("pages", []):
            s = slug_of(pp)
            if s: linked.add(s.lower())
        for sg in g.get("groups", []): walk(sg)
    for t in tabs:
        for g in t.get("groups", []): walk(g)

    docs = {d["slug"]: d async for d in db.documents.find({"project_id": pid}, {"_id": 0, "slug": 1, "title": 1, "icon": 1})}
    to_add = [s for s in CANDIDATES if s in docs and s.lower() not in linked]

    for t in tabs:
        for g in t.get("groups", []):
            if g.get("group") == "Deployments":
                new_pages = [{"page": s, "title": docs[s]["title"], "icon": docs[s].get("icon")} for s in to_add]
                g["pages"] = (g.get("pages") or []) + new_pages
                print(f"Deployments group: added {to_add}; now {len(g['pages'])} pages")
    await db.project_configs.update_one({"project_id": pid},
        {"$set": {"navigation.tabs": tabs, "updated_at": datetime.now(timezone.utc).isoformat()}})
    print("done")

if __name__ == "__main__":
    asyncio.run(main())
