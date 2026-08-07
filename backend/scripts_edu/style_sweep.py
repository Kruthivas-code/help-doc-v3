import os, asyncio, re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

PAIRS = [
    ('seamlessly','smoothly'), ('seamless','smooth'),
    ('leveraging','using'), ('leverages','uses'), ('leveraged','used'), ('leverage','use'),
    ('in order to','to'),
    ('streamlines','simplifies'), ('streamlined','simplified'), ('streamline','simplify'),
    ('dive into','explore'),
]

def preserve_case(src, repl):
    return repl[:1].upper() + repl[1:] if src[:1].isupper() else repl

def apply_words(text):
    for src, repl in PAIRS:
        text = re.sub(r'(?<![A-Za-z])' + re.escape(src) + r'(?![A-Za-z])',
                      lambda m: preserve_case(m.group(0), repl), text, flags=re.I)
    return text

def unbold(text):
    def inl(m):
        inner = m.group(1)
        return inner if (' ' in inner) else m.group(0)
    text = re.sub(r'\*\*([^*\n|]{50,}?)\*\*', inl, text)
    out = []
    fl = re.compile(r'^(\s*(?:[-*]\s+)?)\*\*([^*|\n]+?)\*\*(\s*)$')
    for line in text.split('\n'):
        m = fl.match(line)
        if m and ' ' in m.group(2) and len(m.group(2)) > 30:
            out.append(f"{m.group(1)}{m.group(2)}{m.group(3)}")
        else:
            out.append(line)
    return '\n'.join(out)

async def main():
    c = AsyncIOMotorClient(os.environ['MONGO_URL']); db = c[os.environ['DB_NAME']]
    p = await db.projects.find_one({'name': 'Emergent'}, {'_id': 0, 'id': 1}); pid = p['id']
    docs = await db.documents.find({'project_id': pid}).to_list(500)
    changed = 0; bold_before = 0; bold_after = 0; pipe_delta = 0
    for d in docs:
        content = d['content']
        pipes0 = content.count('|'); b0 = content.count('**')
        nc = unbold(apply_words(content))
        nt = apply_words(d.get('title') or ''); ndsc = apply_words(d.get('description') or '')
        upd = {}
        if nc != content: upd['content'] = nc
        if nt != (d.get('title') or ''): upd['title'] = nt
        if ndsc != (d.get('description') or ''): upd['description'] = ndsc
        if upd:
            if 'content' in upd:
                bold_before += b0; bold_after += nc.count('**'); pipe_delta += abs(nc.count('|') - pipes0)
            await db.documents.update_one({'id': d['id']}, {'$set': upd}); changed += 1
    print('docs changed:', changed)
    print('bold markers: before', bold_before, '-> after', bold_after, '| pipe delta (0 = tables intact):', pipe_delta)
    docs2 = await db.documents.find({'project_id': pid}, {'_id': 0, 'content': 1}).to_list(500)
    allc = ' '.join(x['content'] for x in docs2)
    for w in ['seamless', 'leverage', 'in order to', 'dive into', 'streamline']:
        print('remaining', w, ':', len(re.findall(r'(?<![A-Za-z])' + re.escape(w) + r'(?![A-Za-z])', allc, re.I)))

asyncio.run(main())
