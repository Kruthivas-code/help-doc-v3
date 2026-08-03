"""Apply generated docs + navigation tree to MongoDB for the Emergent project.
Wipes existing documents for the project and rebuilds them + the navigation config."""
import asyncio, json, os, uuid, re
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

HERE = os.path.dirname(__file__)
load_dotenv(os.path.join(HERE, "..", ".env"))

TAB_ICON = {
    "Build": "blocks",
    "Integrations": "puzzle",
    "Troubleshooting": "wrench",
    "Data, Trust & Support": "shield",
    "Wingman": "robot",
    "Changelog": "scroll",
}

KW = [
    (["what is a job", "job", "project"], "folder"),
    (["prompt window", "which prompt"], "message"),
    (["model", "e1", "e2", "e3", "maxx"], "brain"),
    (["preview", "iterat"], "eye"),
    (["debug", "test"], "bug"),
    (["rollback"], "refresh"),
    (["fork"], "git-branch"),
    (["context", "infinite chat"], "brain"),
    (["clone"], "git-merge"),
    (["universal", "llm key"], "key"),
    (["secret", "env variable"], "lock"),
    (["database", "mongo"], "database"),
    (["domain", "dns"], "globe"),
    (["file storage", "object store"], "folder-open"),
    (["schedule", "background job", "cron"], "clock"),
    (["health check"], "shield-check"),
    (["deploy"], "rocket"),
    (["bundle", "package name", "app id"], "package"),
    (["publish", "stores"], "rocket"),
    (["monetis", "purchase", "subscription", "payment", "billing", "pricing", "refund", "cancel"], "tag"),
    (["credit"], "gauge"),
    (["referral", "partner"], "users"),
    (["streak", "reward"], "star"),
    (["enterprise"], "building"),
    (["agent", "wingman"], "robot"),
    (["stripe", "razorpay", "paypal", "paddle", "paystack", "lemon"], "tag"),
    (["supabase", "firebase", "auth0", "clerk", "pinecone", "auth", "login", "account", "security"], "lock"),
    (["openai", "claude", "gemini", "ai media", "media generation"], "sparkles"),
    (["slack", "twilio", "resend", "sendgrid", "email", "mail", "channel", "support", "help", "community"], "mail"),
    (["giphy", "elevenlabs", "image", "video", "audio", "cloudinary", "figma"], "image"),
    (["notion", "airtable", "shopify", "google suite"], "layout-grid"),
    (["github", "git"], "git-branch"),
    (["mcp", "connector", "integration", "catalogue"], "puzzle"),
    (["design"], "palette"),
    (["missing functionality"], "puzzle"),
    (["slow", "crash", "cold", "pipeline"], "gauge"),
    (["glossary"], "book-open"),
    (["faq"], "help-circle"),
    (["privacy", "leak", "trust", "takedown", "moderation"], "shield"),
    (["ownership", "backup"], "database"),
    (["mobile"], "layers"),
    (["expo", "eas", "keystore", "signing", "pem", "p8"], "key"),
    (["workspace", "tour"], "layout"),
    (["team", "role", "permission", "collab"], "users"),
    (["what is emergent", "apps you can build", "chat-to-deployment", "mental model"], "lightbulb"),
    (["first build", "walkthrough", "getting started", "starting"], "rocket"),
    (["universal"], "key"),
    (["conversion"], "refresh"),
    (["changelog"], "scroll"),
    (["best practice"], "list-checks"),
]


def icon_for(title):
    t = title.lower()
    for keys, ic in KW:
        for k in keys:
            if k in t:
                return ic
    return "file-text"


async def main():
    tabs = json.load(open(os.path.join(HERE, "tree.json")))
    gen = json.load(open(os.path.join(HERE, "generated.json")))

    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    project = await db.projects.find_one({"name": "Emergent"}, {"_id": 0})
    pid = project["id"]

    now = datetime.now(timezone.utc).isoformat()
    docs = []
    order = 0
    nav_tabs = []
    missing = []

    def make_page_entry(page):
        nonlocal order
        slug = page["slug"]
        g = gen.get(slug)
        if not g or not g.get("content"):
            missing.append(slug)
            content = f"## {page['title']}\n\n_Content coming soon._"
            desc = page.get("brief", "")[:180] or page["title"]
        else:
            content = g["content"]; desc = g.get("description") or page["title"]
        ic = icon_for(page["title"])
        docs.append({
            "id": str(uuid.uuid4()), "project_id": pid,
            "title": page["title"], "slug": slug, "content": content,
            "order": order, "parent_id": None, "icon": ic,
            "description": desc, "created_at": now, "updated_at": now,
        })
        order += 1
        return {"page": slug, "title": page["title"], "icon": ic}

    for t in tabs:
        groups = []
        for s in t["sections"]:
            grp = {"group": s["label"], "pages": [], "groups": []}
            for p in s["pages"]:
                grp["pages"].append(make_page_entry(p))
            for ss in s["subsections"]:
                sub = {"group": ss["label"], "pages": []}
                for p in ss["pages"]:
                    sub["pages"].append(make_page_entry(p))
                grp["groups"].append(sub)
            groups.append(grp)
        nav_tabs.append({
            "id": re.sub(r"[^a-z0-9]+", "-", t["label"].lower()).strip("-"),
            "label": t["label"], "icon": TAB_ICON.get(t["label"], "book-open"),
            "groups": groups,
        })

    # Wipe + insert documents
    await db.documents.delete_many({"project_id": pid})
    if docs:
        await db.documents.insert_many(docs)

    # Update navigation config
    await db.project_configs.update_one(
        {"project_id": pid},
        {"$set": {"navigation": {"tabs": nav_tabs}, "top_nav_enabled": True, "updated_at": now}},
    )
    print(f"Inserted {len(docs)} documents across {len(nav_tabs)} tabs.")
    if missing:
        print(f"WARNING: {len(missing)} pages had no generated content: {missing}")


if __name__ == "__main__":
    asyncio.run(main())
