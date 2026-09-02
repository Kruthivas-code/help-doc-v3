"""Iteration 23 setup: create OWNER + REVIEWER sessions in Mongo, snapshot docs."""
import os, asyncio, datetime, uuid, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
PID = 'd901b4ab-a271-4aff-b63a-bf92d73b9bb0'


async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    exp = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()
    out = {}

    # OWNER identity
    ouid = 'qa-owner-' + uuid.uuid4().hex[:8]
    otok = 'qa_sess_' + uuid.uuid4().hex[:12]
    await db.users.update_one({'email': 'owner.qa@emergent.sh'},
                              {'$set': {'user_id': ouid, 'email': 'owner.qa@emergent.sh',
                                        'name': 'QA Owner', 'role': 'owner'}}, upsert=True)
    await db.owner_invites.update_one({'email': 'owner.qa@emergent.sh'},
                                      {'$set': {'email': 'owner.qa@emergent.sh', 'invited_by': 'qa'}}, upsert=True)
    await db.user_sessions.insert_one({'user_id': ouid, 'session_token': otok,
                                       'expires_at': exp, 'created_at': exp})
    out['owner_token'] = otok

    # REVIEWER identity (vishal.k - has 18 assignments)
    ruid = 'qa-rev-' + uuid.uuid4().hex[:8]
    rtok = 'qa_sess_' + uuid.uuid4().hex[:12]
    await db.users.update_one({'email': 'vishal.k@emergent.sh'},
                              {'$set': {'user_id': ruid, 'email': 'vishal.k@emergent.sh',
                                        'name': 'Vishal K', 'role': 'member'}}, upsert=True)
    await db.user_sessions.insert_one({'user_id': ruid, 'session_token': rtok,
                                       'expires_at': exp, 'created_at': exp})
    out['reviewer_token'] = rtok

    # Docs: assigned page + a non-assigned page
    assigned = await db.documents.find_one({'project_id': PID, 'slug': 'put-your-app-live'}, {'_id': 0})
    out['assigned_doc'] = {'id': assigned['id'], 'slug': assigned['slug'],
                           'title': assigned['title'], 'content': assigned['content']}

    # find slugs assigned to vishal
    slugs = set()
    async for a in db.assignments.find({'project_id': PID, 'assignee_email': 'vishal.k@emergent.sh'}):
        slugs.update(a.get('slugs') or [])
    out['assigned_slug_count'] = len(slugs)

    other = await db.documents.find_one({'project_id': PID, 'slug': {'$nin': list(slugs)}}, {'_id': 0})
    out['other_doc'] = {'id': other['id'], 'slug': other['slug'], 'title': other['title'],
                        'content': other['content']}

    out['counts'] = {
        'assignments': await db.assignments.count_documents({'project_id': PID}),
        'published': await db.documents.count_documents({'project_id': PID, 'status': 'published'}),
        'owner_invites': await db.owner_invites.count_documents({}),
        'reviewer_marked': await db.documents.count_documents({'reviewer_edited_by': {'$ne': None}}),
    }
    with open('/app/test_reports/iter23_state.json', 'w') as f:
        json.dump(out, f, indent=1)
    print(json.dumps({k: v for k, v in out.items() if k not in ('assigned_doc', 'other_doc')}, indent=1))
    print('assigned_doc', out['assigned_doc']['id'], len(out['assigned_doc']['content']))
    print('other_doc', out['other_doc']['slug'], out['other_doc']['id'])


asyncio.run(main())
