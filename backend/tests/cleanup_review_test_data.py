"""One-off cleanup of QA-created review artifacts (assignments/comments/verdicts)."""
import asyncio
import os

from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

env = dotenv_values("/app/backend/.env")
MONGO_URL = os.environ.get("MONGO_URL") or env["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME") or env["DB_NAME"]

TEST_EMAILS = ["test_multi_reviewer@emergent.sh", "test_ui_multi@emergent.sh"]


async def main():
    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]
    r1 = await db.assignments.delete_many({"assignee_email": {"$in": TEST_EMAILS}})
    r2 = await db.review_comments.delete_many({"body": {"$regex": "^TEST_"}})
    r3 = await db.review_verdicts.delete_many({"reviewer_email": "dev@local", "doc_slug": "talk-it-through"})
    print("deleted assignments:", r1.deleted_count)
    print("deleted TEST_ comments:", r2.deleted_count)
    print("deleted dev verdicts:", r3.deleted_count)
    print("remaining assignments:", await db.assignments.count_documents({}))
    print("remaining comments:", await db.review_comments.count_documents({}))
    print("remaining verdicts:", await db.review_verdicts.count_documents({}))
    print("published docs:", await db.documents.count_documents({"status": "published"}))
    print("in_review docs:", await db.documents.count_documents({"status": "in_review"}))
    print("draft docs:", await db.documents.count_documents({"status": "draft"}))


asyncio.run(main())
