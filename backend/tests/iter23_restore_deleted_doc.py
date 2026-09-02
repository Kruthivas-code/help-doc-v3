"""Restore the 'what-is-emergent' document + nav entry deleted by the reviewer-privilege probe.

The DELETE /projects/{pid}/documents/{docId} endpoint has NO owner gate, so a reviewer
session deleted the doc (and the endpoint pruned its slug from navigation).
Restored from the snapshot in /app/test_reports/iter23_state.json.
Fields not captured in the snapshot (order/icon/description) are reconstructed:
Build tab -> Introduction group, first page.
"""
import os, asyncio, json, datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
PID = 'd901b4ab-a271-4aff-b63a-bf92d73b9bb0'
st = json.load(open('/app/test_reports/iter23_state.json'))['other_doc']


async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    if await db.documents.count_documents({'id': st['id']}) == 0:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        await db.documents.insert_one({
            'id': st['id'], 'project_id': PID, 'title': st['title'], 'slug': st['slug'],
            'content': st['content'], 'order': 0, 'parent_id': None, 'icon': 'book',
            'description': st['title'], 'created_at': now, 'updated_at': now,
            'published_at': None, 'published_content': None, 'published_title': None,
            'status': 'in_review',
        })
        print('document restored')

    cfg = await db.project_configs.find_one({'project_id': PID})
    nav = cfg['navigation']
    if st['slug'] not in json.dumps(nav):
        for t in nav['tabs']:
            if t['label'].lower().startswith('build'):
                for g in t['groups']:
                    if g.get('group') == 'Introduction':
                        g['pages'].insert(0, {'page': st['slug'], 'title': st['title'], 'icon': 'book'})
        await db.project_configs.update_one({'project_id': PID}, {'$set': {'navigation': nav}})
        print('nav entry restored')

    print('docs:', await db.documents.count_documents({'project_id': PID}))
    print('nav has slug:', st['slug'] in json.dumps((await db.project_configs.find_one({'project_id': PID}))['navigation']))


asyncio.run(main())
