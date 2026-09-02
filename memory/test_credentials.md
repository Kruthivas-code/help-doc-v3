# Test Credentials & Access

## Authentication: REAL Emergent Google OAuth (as of June 2026)
The `DISABLE_AUTH` bypass has been REMOVED (`DISABLE_AUTH=false` in /app/backend/.env).
Admin/review surfaces (`/admin/*`, `/review/*`) now REQUIRE a real @emergent.sh Google login.
There are NO passwords (Google OAuth). Access is gated to `@emergent.sh` emails only
(enforced in `POST /api/auth/session`, server.py ~line 332).

### Roles
- Owner (seeded, pre-authorized): **sarang@emergent.sh** — via `owner_invites` collection.
  On first Google login the account is auto-granted the `owner` role.
- Any other @emergent.sh login starts as a normal **reviewer** (role: member). An owner can
  promote them in the Review Console / via `POST /api/roles/promote`.

### To log in (real)
Go to `/admin` → "Continue with Google" → redirects to
`https://auth.emergentagent.com/?redirect=<origin>/admin/dashboard` → returns with
`#session_id=...` → AuthCallback exchanges it → lands on `/admin/dashboard`.

### For automated testing (no real Google needed)
Create a session directly in Mongo (DB_NAME from /app/backend/.env), then use the token as
`Authorization: Bearer <token>` or a `session_token` cookie. Full steps in `/app/auth_testing.md`.
Example (owner):
```
python3 - <<'PY'
import os,asyncio,datetime,uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv; load_dotenv('/app/backend/.env')
async def main():
    db=AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    uid='qa-owner-'+uuid.uuid4().hex[:8]; tok='qa_sess_'+uuid.uuid4().hex[:12]
    await db.users.update_one({'email':'sarang@emergent.sh'},{'$set':{'user_id':uid,'email':'sarang@emergent.sh','name':'Sarang','role':'owner'}},upsert=True)
    exp=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=1)).isoformat()
    await db.user_sessions.insert_one({'user_id':uid,'session_token':tok,'expires_at':exp,'created_at':exp})
    print('TOKEN',tok)
asyncio.run(main())
PY
```
For a REVIEWER test identity use role:'member' and a different @emergent.sh email.
ALWAYS delete test sessions/users after testing:
`db.user_sessions.delete_many({session_token:/^qa_sess_/})`.

## Project / data
- Single project "Emergent": id `d901b4ab-a271-4aff-b63a-bf92d73b9bb0`, 121 docs (0 published).
- Real reviewer in data: `vishal.k@emergent.sh` (18 page assignments).
