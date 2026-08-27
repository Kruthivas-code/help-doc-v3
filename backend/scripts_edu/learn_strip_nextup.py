"""Remove the redundant in-content 'Next up / Continue the path' CardGroup from all docs
(the footer Prev/Next nav already provides this). Idempotent."""
import asyncio, os, re
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

# match a whole CardGroup whose single Card is the "Next up" card
PATTERN = re.compile(r'\n*<CardGroup[^>]*>\s*<Card[^>]*title="Next up"[^>]*>.*?</Card>\s*</CardGroup>\s*', re.S)


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    proj = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = proj["id"]
    now = datetime.now(timezone.utc).isoformat()
    cur = db.documents.find({"project_id": pid}, {"_id": 0, "id": 1, "slug": 1, "content": 1})
    changed = 0
    async for d in cur:
        new = PATTERN.sub("\n", d["content"]).rstrip() + "\n"
        if new != d["content"]:
            await db.documents.update_one({"id": d["id"]}, {"$set": {"content": new, "updated_at": now}})
            changed += 1
            print("stripped", d["slug"])
    print(f"done, {changed} docs updated")


if __name__ == "__main__":
    asyncio.run(main())
