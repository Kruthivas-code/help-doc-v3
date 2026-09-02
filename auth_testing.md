# Auth-Gated App Testing Playbook (Emergent Google Auth)

This app uses Emergent-managed Google OAuth, restricted to @emergent.sh emails.
Backend: FastAPI at /api. Session via httpOnly `session_token` cookie OR `Authorization: Bearer <token>`.
`owner_invites` pre-authorizes owner role (seed: sarang@emergent.sh). Roles: member | owner.

## Step 1: Create Test User & Session (Mongo)
Use DB_NAME from /app/backend/.env. Example:
```
mongosh --eval "
use('<DB_NAME>');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, email: 'qa.reviewer@emergent.sh', name: 'QA Reviewer', role: 'member', created_at: new Date() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now()+7*24*60*60*1000), created_at: new Date() });
print('Session token: ' + sessionToken); print('User ID: ' + userId);
"
```
For an OWNER test identity, set role:'owner' (or insert owner_invites {email}).

## Step 2: Test Backend API
```
API=<REACT_APP_BACKEND_URL from /app/frontend/.env>
curl -s "$API/api/auth/me" -H "Authorization: Bearer <SESSION_TOKEN>"      # -> user JSON
curl -s "$API/api/auth/me"                                                  # -> 401 (unauthenticated)
curl -s "$API/api/projects/<pid>/assignments" -H "Authorization: Bearer <SESSION_TOKEN>"
```

## Step 3: Browser Testing (Playwright)
```
await page.context.add_cookies([{ "name":"session_token","value":"<SESSION_TOKEN>","domain":"<preview-host>","path":"/","httpOnly":true,"secure":true,"sameSite":"None" }])
await page.goto("<preview-url>/admin/dashboard")
```
A non-owner session must land on Review Console -> only the "My Reviews" tab.

## Clean up
```
mongosh --eval "use('<DB_NAME>'); db.users.deleteMany({email:/qa\.reviewer|test\.user/}); db.user_sessions.deleteMany({session_token:/test_session/});"
```

## Notes
- Do NOT store passwords (Google OAuth has none).
- Frontend login: AdminLogin "Continue with Google" -> https://auth.emergentagent.com/?redirect=<origin>/admin/dashboard
- After Google, lands at <redirect>#session_id=... -> AuthCallback POSTs /api/auth/session -> sets cookie -> /admin/dashboard.
- @emergent.sh gate is enforced in POST /api/auth/session (403 otherwise).
