"""Apply Rail 2 ('Grow Your App', 9) + Reference (2) to the existing 'Learn the Basics' tab.
ADDITIVE + idempotent: does NOT touch the 103 existing docs nor the Rail 1 'Get Started' group.
Re-running replaces only these 11 docs and the two new groups."""
import asyncio, json, os, uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(HERE, "..", ".env"))
PAGES = os.path.join(HERE, "learn_pages2")
TAB_ID = "learn-the-basics"

GROW = [
    ("get-paid", "credit-card"),
    ("connect-your-tools", "plug"),
    ("use-your-own-web-address", "globe"),
    ("get-found-on-google", "search"),
    ("keep-it-safe", "shield"),
    ("write-prompts-that-work", "pencil"),
    ("when-something-breaks", "wrench"),
    ("add-login-user-accounts", "log-in"),
    ("checkpoints-undo-anything", "history"),
]
REFERENCE = [
    ("how-credits-work-basics", "coins"),
    ("get-your-first-users", "users"),
]
GROUPS = [("Grow Your App", GROW), ("Reference", REFERENCE)]


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    proj = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = proj["id"]
    now = datetime.now(timezone.utc).isoformat()

    all_slugs = [s for _, items in GROUPS for s, _ in items]
    await db.documents.delete_many({"project_id": pid, "slug": {"$in": all_slugs}})

    last = await db.documents.find({"project_id": pid}, {"order": 1}).sort("order", -1).limit(1).to_list(1)
    base = (last[0]["order"] + 1) if last else 0

    docs, nav_groups = [], []
    i = 0
    for group_label, items in GROUPS:
        pages_nav = []
        for slug, icon in items:
            g = json.load(open(os.path.join(PAGES, f"{slug}.json")))
            docs.append({
                "id": str(uuid.uuid4()), "project_id": pid,
                "title": g["title"], "slug": slug, "content": g["content"],
                "order": base + i, "parent_id": None, "icon": icon,
                "description": g["description"], "created_at": now, "updated_at": now,
            })
            pages_nav.append({"page": slug, "title": g["title"], "icon": icon})
            i += 1
        nav_groups.append({"group": group_label, "pages": pages_nav, "groups": []})

    await db.documents.insert_many(docs)

    cfg = await db.project_configs.find_one({"project_id": pid})
    tabs = cfg["navigation"]["tabs"]
    tab = next(t for t in tabs if t.get("id") == TAB_ID)
    # keep any group not being (re)added (i.e. the Rail 1 'Get Started' group); idempotent for ours
    new_group_labels = {g["group"] for g in nav_groups}
    tab["groups"] = [g for g in tab["groups"] if g["group"] not in new_group_labels] + nav_groups

    await db.project_configs.update_one(
        {"project_id": pid},
        {"$set": {"navigation.tabs": tabs, "updated_at": now}},
    )
    print(f"Inserted {len(docs)} docs.")
    print("Learn the Basics groups now:", [g["group"] + f" ({len(g['pages'])})" for g in tab["groups"]])


if __name__ == "__main__":
    asyncio.run(main())
