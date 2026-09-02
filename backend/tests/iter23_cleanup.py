"""Iteration 23 cleanup: restore doc content, clear reviewer markers, drop test owners/sessions/users."""
import os, sys, asyncio, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
PID = 'd901b4ab-a271-4aff-b63a-bf92d73b9bb0'
DOCS_ONLY = '--docs-only' in sys.argv


async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    with open('/app/test_reports/iter23_state.json') as f:
        st = json.load(f)

    for key in ('assigned_doc', 'other_doc'):
        d = st[key]
        await db.documents.update_one({'id': d['id']}, {'$set': {
            'title': d['title'], 'content': d['content'],
            'reviewer_edited_by': None, 'reviewer_edited_at': None}})
    await db.documents.update_many({'reviewer_edited_by': {'$ne': None}},
                                   {'$set': {'reviewer_edited_by': None, 'reviewer_edited_at': None}})
    print('docs restored')

    if not DOCS_ONLY:
        await db.owner_invites.delete_many({'email': {'$ne': 'sarang@emergent.sh'}})
        await db.user_sessions.delete_many({'session_token': {'$regex': '^qa_sess_'}})
        await db.users.delete_many({'email': {'$in': ['owner.qa@emergent.sh', 'qa.promote.test@emergent.sh']}})
        await db.users.update_many({'email': 'vishal.k@emergent.sh'}, {'$set': {'role': 'member'}})
        await db.users.update_many({'email': 'qa.promote.test@emergent.sh'}, {'$set': {'role': 'member'}})
        print('owner_invites', await db.owner_invites.count_documents({}))
        print('sessions_left', await db.user_sessions.count_documents({'session_token': {'$regex': '^qa_sess_'}}))

    print('assignments', await db.assignments.count_documents({'project_id': PID}))
    print('published', await db.documents.count_documents({'project_id': PID, 'status': 'published'}))
    print('reviewer_marked', await db.documents.count_documents({'reviewer_edited_by': {'$ne': None}}))


asyncio.run(main())
