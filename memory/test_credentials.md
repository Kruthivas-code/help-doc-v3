# Test Credentials

## Admin / Editor / Review Console
- Auth is currently BYPASSED via `DISABLE_AUTH=true` in `/app/backend/.env`.
- Visiting any `/admin/*` route (e.g. `/admin/dashboard`, `/admin/editor/<pid>`, `/admin/review`) auto-authenticates as the dev **Owner**:
  - email: `dev@local`
  - role: `owner` (can publish, assign, promote)

## Seeded Owner (real login, once OAuth is re-enabled)
- `sarang@emergent.sh` is pre-authorized as **owner** (via `owner_invites`); becomes owner automatically on first Google login.
- Real login is Emergent Google OAuth restricted to `@emergent.sh` emails.

## Notes
- To test reviewer (non-owner) flows you must re-enable OAuth (remove `DISABLE_AUTH`) and log in with a non-owner `@emergent.sh` account.
- Preview URL: value of `REACT_APP_BACKEND_URL` in `/app/frontend/.env`.
