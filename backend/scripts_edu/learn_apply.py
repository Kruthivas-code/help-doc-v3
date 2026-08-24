"""Apply the new 'Learn the Basics' tab (Rail 1 - Get Started, 7 articles) to Mongo.
ADDITIVE + idempotent: does NOT touch the existing 103 docs. Re-running replaces only these 7
docs and re-inserts the tab at position 0."""
import asyncio, json, os, uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

HERE = os.path.dirname(__file__)
load_dotenv(os.path.join(HERE, "..", ".env"))
PAGES = os.path.join(HERE, "learn_pages")

# order matters (Rail 1). (slug, icon)
ORDER = [
    ("start-with-your-idea", "lightbulb"),
    ("talk-it-through", "message"),
    ("watch-your-app-come-alive", "eye"),
    ("make-it-yours", "palette"),
    ("try-it-before-you-share-it", "check-circle"),
    ("put-your-app-live", "rocket"),
    ("share-it-with-the-world", "send"),
]
TAB_ID = "learn-the-basics"
TAB_LABEL = "Learn the Basics"
TAB_ICON = "compass"
GROUP_LABEL = "Get Started"


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    proj = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = proj["id"]
    now = datetime.now(timezone.utc).isoformat()
    slugs = [s for s, _ in ORDER]

    # idempotent: wipe just these 7 docs
    await db.documents.delete_many({"project_id": pid, "slug": {"$in": slugs}})

    # order after existing max
    last = await db.documents.find({"project_id": pid}, {"order": 1}).sort("order", -1).limit(1).to_list(1)
    base = (last[0]["order"] + 1) if last else 0

    docs, pages_nav = [], []
    for i, (slug, icon) in enumerate(ORDER):
        g = json.load(open(os.path.join(PAGES, f"{slug}.json")))
        docs.append({
            "id": str(uuid.uuid4()), "project_id": pid,
            "title": g["title"], "slug": slug, "content": g["content"],
            "order": base + i, "parent_id": None, "icon": icon,
            "description": g["description"], "created_at": now, "updated_at": now,
        })
        pages_nav.append({"page": slug, "title": g["title"], "icon": icon})

    await db.documents.insert_many(docs)

    cfg = await db.project_configs.find_one({"project_id": pid})
    tabs = cfg["navigation"]["tabs"]
    tabs = [t for t in tabs if t.get("id") != TAB_ID]  # idempotent
    new_tab = {"id": TAB_ID, "label": TAB_LABEL, "icon": TAB_ICON,
               "groups": [{"group": GROUP_LABEL, "pages": pages_nav, "groups": []}]}
    tabs.insert(0, new_tab)
    await db.project_configs.update_one(
        {"project_id": pid},
        {"$set": {"navigation.tabs": tabs, "updated_at": now}},
    )
    print(f"Inserted {len(docs)} docs. Tabs now: {[t['label'] for t in tabs]}")


if __name__ == "__main__":
    asyncio.run(main())
