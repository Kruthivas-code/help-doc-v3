# DocuMint - Emergent Documentation Platform

## Original Problem Statement
Build a Mintlify-class documentation platform for **Emergent's Documentation** with:
- MDX-like authoring format with custom components
- AST-based parsing pipeline (remark/rehype) - NOT regex
- Build-time validations for broken links, heading hierarchy, component props
- Concept graph navigation
- Client-side search with FlexSearch
- Google OAuth authentication
- AI-powered documentation generation
- WYSIWYG editor with bi-directional HTML/Markdown sync

## Completed work — June 2026 (Admin entry cleanup + Review Console role UX)
Verified by testing_agent **iteration_21** (backend 13/13, frontend 100%; dataset restored: 0 published, 18 vishal.k assignments, 0 stray verdicts/comments).
**Context clarified with user:** there is only ONE project ("Emergent", id d901b4ab…, 121 docs). The old ~50-page docs the user referenced = the LIVE production site (help.emergent.sh); this 121-page preview is the newer, not-yet-published version (0 published → deploying now would show nothing until an Owner publishes).
- **Admin entry → Dashboard first**: `AdminLogin.jsx` + `App.js` auth callback now redirect to `/admin/dashboard` (was `/admin/edit` which jumped straight into the editor).
- **Project card → Editor**: Dashboard project card now opens `/admin/editor/<id>` (modern editor), not the legacy `/admin/docs` view. Card refactored from `<button>` to `role="button"` div so it can hold a nested **"View public docs ↗"** link (`view-public-docs-<id>`, opens `/` in a new tab).
- **Removed "New project"** (button + create dialog + `createProject`) — internal single-project tool, served no purpose. Delete-project kept.
- **DELETED legacy DocsView**: removed `DocsView.jsx`, its `/admin/docs/:projectId(/:docSlug)` routes in `App.js`, the import, and the barrel export. It was the app's ORIGINAL post-login doc browser (first commit) — a flat list + Edit/Delete, fully superseded by the public reader site (reading) and the Editor nav-tree (editing). `/admin/docs/*` now falls through to `/`.
- **Review Console role-based UI** (`ReviewConsole.jsx`): reviewers (non-owner) land on the **Assignments ("My Reviews")** tab only — Overview/Inbox/Publish are owner-only (default tab set to 'assignments' for non-owners). Owner-only **"Preview as reviewer"** toggle (`toggle-view-as-reviewer`, dev aid while auth is bypassed; shows reviewer layout on owner data — flagged with a 'preview' badge) — remove/retire when real login is on.
- **New-assignment scope list is now HIERARCHICAL**: Tab → Section → its Pages, indented via `depth` (Tab/Sec/Pg chips), pages folded under their section (was: all pages flat after all tabs+sections). Cascade-select + indeterminate preserved.
- **Owner has "New assignment"; reviewers see "Delegate" instead** — plus a **Bulk delegate** panel (`bulk-delegate-panel`) available to BOTH: owner sees per-reviewer rows ("Delegate all N of X's reviews →"), reviewer sees their own queue. New backend `POST /assignments/delegate-bulk {from_email,to_email}` (owner, or reviewer delegating own; `is_owner`/assignee authz).
- **Gate semantics CHANGED**: `PUT /assignments/{id}` status=done now requires the **assignee's verdict on every slug** (no longer comment-gated). `POST /documents/{id}/publish` is now **blocked while the page has unresolved comments**. (Note: verdicts are POSTed as the logged-in user, so only the assignee can satisfy the done-gate; owner force-close would need delegate/delete — intentional per spec.)

## Completed work — June 2026 (Reviewer side-nav, progress, page-delegate, GO-LIVE auth)
Verified: testing_agent **iteration_22** (side-nav/progress/nudge 100%), plus self-tests (curl + Playwright + snapshot/restore) for page-delegate and the auth cutover.

- **Reviewer Side-Nav** (`ReviewPage.jsx`): left rail listing ONLY the pages assigned to that reviewer (`?reviewer=<email>` from console chips, else logged-in user). Current page highlighted; header + footer prev/next move through the queue in order.
- **Progress bar**: "X of N reviewed" (`review-progress-*`) — reviewed = pages with a verdict by that reviewer; live-increments and turns the side-nav item emerald when a verdict is set.
- **Verdict nudge**: leaving a page with no verdict (next/prev/side-nav/back) opens a modal — "Stay and leave a verdict" (scrolls to verdict rail) or "Review later, continue". With a verdict, navigation is direct.
- **Reviewer page-level Delegate** (`ReviewConsole.jsx` + backend `POST /assignments/delegate-pages`): reviewers get a "Delegate pages" panel mirroring the owner's New-assignment picker — hierarchical Tab→Section→Page checkboxes over THEIR queue, Select all / filter, choose **all / several / one**, pick target email, Delegate. Backend splits multi-page assignments and merges delegated pages into a single "Delegated pages" assignment for the target (`delegated_from` set). Owners still have per-reviewer mass-delegate + New assignment.
- **GO-LIVE: real Emergent Google OAuth re-enabled** — `DISABLE_AUTH=false`. `/admin/*` and `/review/*` require @emergent.sh Google login. Owner seed: **sarang@emergent.sh** (owner_invites). Login button redirects to `auth.emergentagent.com/?redirect=<origin>/admin/dashboard`; AuthProvider skips /me when a callback hash is present. The **"Preview as reviewer" dev toggle was retired**. Verified: 401 on protected endpoints unauth, login page renders, unauth routes bounce to login, owner session shows the Owner console.

## Completed work — June 2026 (Reviewer inline editing + Team/promote + security hardening)
Verified: testing_agent **iteration_23** (features 100%, surfaced 3 missing owner gates) → **iteration_24** (gate fixes 100%, backend 11/11) + self-tests.

- **Reviewer inline editing** (`ReviewPage.jsx`): on `/review/:slug`, reviewers (on their assigned pages) and owners get an **Edit** button → inline markdown/MDX textarea + title, **Save draft**; plus **Full editor** button → `/admin/editor/<pid>/<docId>`. Reviewer edits keep the page's current status and stamp `reviewer_edited_by`; the Publish tab shows an **"Edited by reviewer"** badge (cleared when an owner edits or publishes).
- **Backend edit authz** (`server.py update_document`): non-owner @emergent.sh (reviewers) may only edit **content/title/icon/description of pages assigned to them** (403 otherwise); owners edit anything and clear the reviewer marker. Added `reviewer_edited_by/at` to the Document model; `publish_doc` clears them.
- **Team tab** (`ReviewConsole.jsx`, owner-only): lists current Owners + known reviewers, each with one-click **"Make owner"** (`POST /roles/promote`). Reviewers don't see the Team tab.
- **SECURITY (critical, found in iter23 / fixed in iter24)**: `is_admin()` treats any @emergent.sh as admin, so reviewers previously could create/delete docs and rewrite nav. Added `require_owner()` gate to **POST /documents, DELETE /documents/{id}, PUT /config** (reviewers → 403; owners → 200). Editor UI hides owner-only controls for non-owners (New Tab, Configurations, Version History, Export all, Unlinked-docs cleanup); remaining nav mutations 403 with a toast.

## Completed work — June 2026 (Verdict gating + full-nav side-nav toggle)
Self-verified (curl + Playwright; data restored).
- **Verdicts gated** (`review_routes.py set_verdict`): a non-owner can only set a verdict on a page **assigned to them** (403 otherwise); owners unrestricted.
- **Comments stay open**: any logged-in @emergent.sh user can comment on any page (unchanged, by request).
- **ReviewPage side-nav = full navigation + toggle** (`ReviewPage.jsx`): the rail now lists the **entire nav** (121 pages, grouped by tab), with a top **"Only my assigned pages"** toggle that is **ON by default** (so default behavior is unchanged — assigned-only). Progress bar + prev/next follow the visible list; assigned pages render with a stronger marker. Verified: toggle ON → 18 items ("N / 18"); OFF → 121 items ("N / 121").

## Completed work — June 2026 (Assignment picker assigned/unassigned filter + Overview auto-refresh)
- **Assignment scope picker** (`ReviewConsole.jsx`): added an **Unassigned / Assigned / All** segmented control (default **Unassigned**) so already-assigned pages no longer clutter the New-assignment list; assigned pages show a green **"→ reviewer@…"** badge. Counts shown per view. (verified: with full coverage, Unassigned→"No unassigned pages"; Assigned→121 rows w/ badges)
- **Overview stale numbers fixed**: added a `useEffect` that re-fetches `/review/progress` whenever `assignments` changes, so Overview updates without a manual refresh.
- Data note: workspace currently has 121 assignments (full page coverage), up from 52 — leftover from automated test runs; harmless, can be reset on request.

## Plan v4 execution — June 2026 (IN PROGRESS — Part 5 done, Parts 1–4 pending)
**Part 5 (permission model) — DONE & verified (curl):** reversed the earlier lockdown. Now only **publish/unpublish/republish are owner-gated**; everything else (create/delete page, edit content, edit nav/config) is **unrestricted** for any signed-in @emergent.sh user. Removed `require_owner` from create_document/delete_document/PUT config; removed the reviewer-assigned-page edit restriction in `update_document` (non-owner edits still stamp `reviewer_edited_by`; published content still can't go live without an owner republish). Reverted the Editor UI hiding (New Tab, Configurations, Version History, Export, Unlinked section, nav-tree readOnly). **Kept:** verdicts remain assigned-reviewer-only. Verified: reviewer edit any page→200, resolve comment→200, publish→403.
**Part 2 (partial) — DONE:** comment **resolve/reopen is now open to anyone** (removed owner gate, backend + ReviewPage UI).

**BLOCKED — Part 1 (emails):** integration_expert could NOT verify a no-key Emergent-managed email module; pod probe found **no email env credential and no `emergentintegrations.email` module**. Real email delivery needs the Emergent Integration Agent to provision the module/credential first. NOT implemented (no fabricated sender).

**STILL PENDING (not started):** Part 2 (threaded replies + @mention autocomplete + notifications), Part 3 (activity log + per-page history + "assigned by" label), Part 4 (delete confirmations + 90-day page trash/restore + delete tracker).

## Status note — June 2026 (open / next)
- ⚠️ ~~Authz audit~~ SUPERSEDED by Plan v4 Part 5 (locks intentionally removed; safety moves to Part 4 confirmations/restore).
- ⚠️ **Authz audit (obsolete)** (the "route-level owner dependency" item): project create/update/**delete**, asset upload/delete, and document version restore/delete are still reachable by any @emergent.sh reviewer (only create/delete *document* + PUT /config were locked). Convert owner-only routes to a `Depends(require_owner)` dependency and lock these down.
- Known non-blocking: initial 2-3 auth 401 retries per protected load (cosmetic); reviewer full-editor tree still lists all 121 (edits gated).
- Backlog: split Editor.jsx (1459 lines); confirm public sidebar nested subgroups render; voice comments / notifications deferred.

## Status note — June 2026 (earlier partial turn)
- **B5 DONE**: "watch-your-app-come-alive" now includes a short plain recap-of-what-was-built orientation (grounded, no new heading). Pages remain `in_review`.

## Completed work — June 2026 (Learn the Basics — plain-language rewrite)
- Rewrote all 18 first-tab pages for non-technical readers via a grounded LLM pass (`scripts_edu/learn_rewrite.py`): "UX/UI"→"how your app looks and feels", "deploy/publish/put live"→"making it live", "environment variable/secret"→"a private key for your service", define-then-reuse for API ("a connection to another service (API)") and database ("where your app stores its information (database)"). Real product control names (the **Deploy** button, **Environment Variables** panel, doc-link titles) intentionally preserved for accuracy.
- Content folded into existing pages (no new pages/sections): B1+B3 plan-mode-from-a-rough-idea (short line in "Talk it through" + fuller paragraph in "Write prompts that work"; explicitly points to plan mode, NOT an outside AI); B2 copy-paste starter prompts inside "Write prompts that work"; B6 "costs at a glance" intro inside "How credits work".
- Verified rendering via inline review view (grounded, plain, additions present). B4 excluded per plan. **B5 (recap-of-what-was-built) still PENDING user decision** — not added.
- Pages remain `in_review` (edits are not public until published).

## Completed work — June 2026 (Review Mode — Phase 2d: nested scopes + reassign confirm)
- **Nested subgroup scopes**: assignment scope picker (frontend `scopeOptions`/`descendants`) and backend `flatten_scope_slugs` now RECURSE into nested subgroups. Fixes "Build › Deployments shows 0 pages" — its 'Common' (8) and 'Web flow' (4) subgroups now appear as indented sub-sections and the Deployments section cascade-selects all 12 nested pages. (The Deployments group was never broken in the public/editor nav — pages are nested; this was the Review Console scope list only.)
- **Reassign confirmation**: delegate now prompts for the new email, blocks same-email, and shows a `window.confirm` referencing the previous assignee before reassigning.
- Verified by testing_agent iteration_20 (backend 8/8 pytest incl. build::Deployments->12, Web flow->4, Common->8, learn-the-basics->18; frontend nested options + cascade + confirm dialog). 100%.
- PENDING USER APPROVAL: Tab-1 ("Learn the Basics") plain-language rewrite (remove jargon: UX/UI/API/MVP/schema/stack/deploy/endpoint/OAuth/webhook/env-var/iterate) + new beginner topics incl. "bring a prompt from ChatGPT/other AI to Emergent". Topic list proposed to user; awaiting go-ahead before editing content.

## Completed work — June 2026 (Review Mode — Phase 2c: Dark mode + contrast + discoverability)
- **Contrast fix**: inline Review page was white-on-white in dark theme because the Review pages hardcoded a light background while `DocContent` renders per-theme (white) text. Both `ReviewPage.jsx` and `ReviewConsole.jsx` now fully support light/dark (measured contrast: dark body ~13:1, headings ~19:1; light ~19:1) with a **theme toggle** (data-testid `theme-toggle`) in each header.
- **Publish link fix**: Publish-tab page title now opens the inline review page `/review/<slug>` (data-testid `publish-title-<id>`) instead of the admin editor.
- **Reviewer filter ("My Reviews")**: Assignments tab has an email filter (`assign-reviewer-filter`) to preview any reviewer's queue while auth is bypassed; once real login is on, non-owners auto-see only their own (server-side `mine` filter). NOTE: a true org-wide address book needs a Google Workspace Directory integration (OAuth does not expose it); the email autocomplete is a best-effort suggestion list.
- Verified across testing_agent iterations 18 & 19 (all 4 user items pass; dark-mode contrast HIGH bugs fixed, re-measured via computed WCAG contrast). Pre-existing `vishal.k@emergent.sh` assignments in DB are the user's own test data — left intact.

## Completed work — June 2026 (Review Mode — Phase 2b: Discoverability + cascade)
- Inline Review View (`/review/:slug`) is now reachable directly: the Publish-tab per-row **"Review page ↗"** button and the assignment **page chips** navigate straight to it, and the inline page now carries **verdict chips** (so it's the full review surface: read + highlight-pin comments + verdict + resolve/reopen).
- Multi-select assignment now **cascades**: checking a Tab selects all its sections + pages; checking a Section selects its pages (selected-count reflects page count). Partial selections render an **indeterminate** checkbox.
- Verified by testing_agent iteration_17 — backend 23/23, frontend 100% (cascade select/deselect, per-page assign, chip + publish-tab nav to inline view, verdict save+persist, anchored comment, resolve/reopen, toggle off). Minor a11y/testid polish applied after.

## Completed work — June 2026 (Review Mode — Phase 2: Inline Review + Multi-assign)

**Inline Review View (`/review/:slug`, `ReviewPage.jsx`)**
- Read-only render of a page (reuses `DocContent`) with a **Review toggle**. While ON, selecting any text shows a floating **Comment** button that pins a comment to that exact passage (`anchor_text`). A comments rail lists all comments (with the pinned quote); Owners can Resolve/Reopen inline. Reachable from the console drawer's "Open full page ↗" link. Verified by testing_agent (iteration_16).

**Multi-select assignment + email autocomplete**
- Assignments tab now has a filterable **checkbox list** of all tabs/sections/pages — select many and assign them all to ONE email in a single action (multi POST via `Promise.allSettled`, partial-failure reported). Email field uses a `<datalist>` of **known emails** (`GET /projects/{pid}/known-emails` — users who logged in + owner_invites + prior assignees; NOT a live Emergent workspace directory, which OAuth does not expose).
- Backend hardening from test review: `POST /assignments` and `/known-emails` are now **owner-gated**; `PUT /assignments/{id}` and `/delegate` restricted to Owner or the assignee.

**Verification**: testing_agent iteration_16 — backend 14/14 (incl. tab-qualified group scopes, multi-assign, done-gate, anchored comments), frontend 100% of tested flows. Follow-up authz + partial-failure + test-id fixes applied and curl-verified (owner endpoints 200).

**Still FAST-FOLLOW**: voice comments + transcription; GET-doc-by-slug perf (inline view currently loads full doc list); resolved/open filter on the review rail; batch-assign endpoint. Next: re-enable Google OAuth (`DISABLE_AUTH`) before real reviewers.



**Content gate (Draft → In review → Published)**
- `Document` gained `status` (draft|in_review|published) + `published_content`/`published_title`/`published_at`. Public `/public/default-project`, `/public/projects/{slug}`, `sitemap.xml` and `llms.txt` now serve ONLY published pages (from the published snapshot). New docs default to `draft`.
- Rollout migration (`scripts_edu/review_migrate.py`): all 121 docs set to `in_review` → nothing is public until an Owner publishes (per plan; this workspace is not the real user site).

**Roles (Owner)**
- `User.role` (member|owner). `owner_invites` collection pre-authorizes emails before first login; applied on OAuth session + startup seed. First Owner seeded: `sarang@emergent.sh`. Dev auth-bypass user is Owner (for testing). Only Owner can publish/unpublish/promote (`require_owner` pattern per integration playbook).
- Endpoints: `/roles/me`, `/roles/owners`, `/roles/promote`.

**Publish gate + Editor UI**
- `POST /projects/{pid}/documents/{id}/publish|unpublish` (owner-gated). Editor now has **Save draft** vs **Publish** vs **Take down** (owner-only), a status pill, and an **Unpublished changes** badge.

**Assignments / Comments / Verdicts / Inbox (`review_routes.py`)**
- Assignments at tab/group/page scope (group scope is TAB-QUALIFIED as `tabId::group` to avoid duplicate-name collisions); `mine` filter, delegate (trail kept), status not_started→in_review→done. **Done is gated on all scope comments resolved.**
- Comments (page-level or `anchor_text` highlight; `audio_url` field ready for voice), resolve/reopen (owner resolves), read tracking. Verdicts upserted per (doc, reviewer). Owner **Review Inbox** (unread badge) + **progress** rollup.
- `ReviewConsole.jsx` at `/admin/review` (linked from Dashboard): Overview, Assignments, Review Inbox (unread badge clears on view), Publish tabs + a per-doc verdict/comment drawer.

**Bug fixed**
- Editor delete no longer redirects to the legacy `/admin/docs/<pid>` view — both the sidebar trash and the PageMetaDialog delete stay in the editor and jump to a sibling page. Backend `delete_document` now also **prunes the deleted slug from navigation config** (no dangling "missing" entries). Verified by testing_agent (iteration_14) + curl.
- Note: the "Deployments" group showing 0 pages was a red herring — its pages live in nested subgroups ("Common", "Web flow") and render fine; no relink needed.

**Verification**: testing_agent iteration_14 — backend 13/13 pass; delete-redirect fix verified for BOTH entry points; publish gate, content gate, Review Console (assignments incl. done-gate, inbox resolve, publish/takedown) all pass. Follow-up fixes (tab-qualified group scope, nav prune on delete, inbox-badge clear, stale-closure deps) applied and curl-verified.

**FAST-FOLLOW (not built this phase)**: voice comments recording + manual transcription (transcribe endpoint returns `unavailable`); reviewer highlight-to-pin comments on the public reading view with a Review toggle (console drawer covers verdict+text comments for now); reviewer-only UX needs real member login (currently auth-bypassed to Owner). Re-enable Google OAuth (`DISABLE_AUTH`) before real reviewers use it.


- **Footer Prev/Next scoped to tab** (`PublicDocs.jsx` ~L749-767): prev/next now computed within the tab that contains the current doc (flatten that tab's group pages in order). No Previous on a tab's first page, no Next on its last page, never crosses tabs. Fixes bug where the first Learn page showed "Previous → Custom & MCP integrations" (a different tab).
- **Removed redundant in-content "Next up / Continue the path" CardGroup** from all 14 docs that had it (`scripts_edu/learn_strip_nextup.py`, idempotent) — the footer Next already covers this. 95 legitimate CardGroups untouched.
- Verified by testing_agent (`/app/test_reports/iteration_13.json`): 6/6 nav scenarios pass.
- KNOWN pre-existing (unrelated) issue surfaced by test: header logo 404 (`/api/public/files/emergent-docs/_legacy/migrated/e9c10f…png`) — leftover from Supabase→Tigris migration; needs the logo asset re-uploaded.

## Completed work — June 2026 (Learn the Basics — Rail 2 finished)
- **Unblocked LLM budget**: The forked job was inheriting a cross-org ancestor's Universal LLM Key (budget capped at 726.0). Swapped `EMERGENT_LLM_KEY` in `/app/backend/.env` to the user's "Green Leaf" project key; verified a live Claude Sonnet call succeeds.
- **Generated remaining 6 Rail 2 articles** via `scripts_edu/learn_generate2.py` (resumable): `write-prompts-that-work`, `when-something-breaks`, `checkpoints-undo-anything`, `add-login-user-accounts`, `keep-it-safe`, `connect-your-tools`.
- **QA / anti-hallucination pass** (`scripts_edu/learn_fix2.py` + `learn_regen_keepsafe.py`), grounded against real source docs:
  - `connect-your-tools`: removed fabricated "300+ integrations via OAuth" / "hundreds of tools" (source = "a curated set").
  - `add-login-user-accounts`: removed invented session durations ("weeks", "90 days") — source states no duration.
  - `keep-it-safe`: fully regenerated — first pass drifted into mobile/Expo-Go testing; now correctly focused on data safety (Env panel secrets, what the AI sees, login for private data, pre-launch checklist), grounded in data-privacy/data-leakage/account-security docs. Also fixed a broken `/using-logs-debugging` link.
  - `checkpoints-undo-anything` & `write-prompts-that-work`: verified fully grounded, no changes.
- **Applied to MongoDB** via `scripts_edu/learn_apply2.py` (additive + idempotent). "Learn the Basics" tab now has 3 groups: **Get Started (7)**, **Grow Your App (9)**, **Reference (2)** = 18 articles. Total docs: 121.
- **Verified rendering** with headless Puppeteer (dev SPA needs ~9s to hydrate; the standard screenshot tool's 10s networkidle timeout shows a false spinner — not a real bug). All groups, breadcrumbs, TOC, callouts and placeholders render correctly.
- NOTE: The remaining unverified/placeholder content is intentionally marked with `<Callout type="warning" title="Draft - needs review">` and "Screenshot/Video coming soon" info callouts.

- Configurable navigation structure (Mintlify-style)
- Device preview toggle (desktop/tablet/mobile)
- GitHub OAuth integration for import/export
- Manual version control with named snapshots


## Admin Editor Authoring UX Improvements (June 2026)
Goal (user): "check how easy it is to make a page look nice with all the components and if we can improve there" + QoL for the /admin editor.
- **Component insertion fixes** (`SlashCommands.jsx`): the `Accordion/FAQ` command now inserts a proper `<AccordionGroup><Accordion title="...">` block (previously inserted raw `<details>/<summary>` HTML that didn't match the styled component). Added a new `Columns` command inserting `<Columns cols={2}>` with `<Card>` children (matches `parser.js`).
- **Visible "Insert" button** (`Editor.jsx`): a header toolbar button (`data-testid="insert-component-btn"`) opens a shadcn Popover listing all component commands grouped by category — so admins don't need to memorize the `/` shortcut. `COMMANDS` is now exported from `SlashCommands.jsx`; inserts at cursor via `insertAtCursor`, and image/gif/color items route through `handleSlashAction`.
- **QoL** (`Editor.jsx` + `App.js`): replaced all native `alert()` popups with `sonner` toasts (`<Toaster/>` mounted in `App.js` via `AppToaster`, theme-synced). Added an "Unsaved changes" amber badge (`isDirty` via `savedSnapshot`) and a `beforeunload` warning to prevent silent data loss.
- Verified: testing_agent frontend pass 9/9 scenarios (iteration_12.json), zero bugs. Restored the "What is Emergent?" doc that the test run had modified.
- **Auth still BYPASSED** (`DISABLE_AUTH=true`) per user request (f) — re-enable Google OAuth later before the milestone ships.

## "Learn the Basics" tab — Rail 1 / Get Started (June 2026) — AWAITING USER REVIEW
Beginner outcome-oriented learning path (Replit Learn / Lovable style), added as the FIRST tab. Additive: the existing 103 reference docs were NOT touched.
- **Source of truth = existing reviewed docs (grounded generation, NOT thin-air).** New pipeline `scripts_edu/learn_generate.py` pulls the real content of relevant existing docs from Mongo and feeds it to Claude Sonnet 4.5 (Universal Key) as the ONLY factual source; anything the source doesn't cover is emitted as a `<Callout type="warning" title="Draft - needs review">` placeholder. `learn_fix.py` corrected unverified claims; `learn_apply.py` inserts docs + prepends the tab (idempotent).
- **7 Get Started articles** (slug/icon): start-with-your-idea(lightbulb), talk-it-through(message), watch-your-app-come-alive(eye), make-it-yours(palette), try-it-before-you-share-it(check-circle), put-your-app-live(rocket), share-it-with-the-world(send). Tab id `learn-the-basics`, one group "Get Started", tab icon `compass`.
- **QA / grounding audit done.** Verified grounded: 50 credits/month deploy cost, ~15 min first deploy, Redeploy/Replace, emergent.app URL, 24/7, Expo Go, Universal Key, "explain the plan first", Maxx 2-4x credits. FIXED fabrications: removed "Node" (absent from all sources); softened the "planning/discussing is FREE" premise in talk-it-through + watch-your-app-come-alive (NOT stated in any existing doc — flagged with a Draft callout for product confirmation).
- **Known placeholders (need product input):** talk-it-through "is it free" premise; make-it-yours copy-paste prompt library + ✨enhance; share-it-with-the-world visit analytics + feedback flow; all screenshots + the 6 videos ("Video/Screenshot coming soon" callouts).
- **How the ORIGINAL 103 were made (for the record):** offline `scripts_edu/` pipeline (build_tree.py→generate.py→apply.py) from `gaps.csv` briefs via Claude — NOT the /admin CMS generator, NOT a Claude Project/KB. apply.py WIPED old docs. Prose came from Claude's own knowledge steered by short CSV briefs (no external corpus) — hence the new grounded approach.
- **Pending:** Rail 2 "Grow Your App" (9 articles) + 2 reference pages (How credits work, Get your first users) — build after user approves Rail 1 tone/quality.


## Project Export to JSON (June 2026)
Articles are stored in MongoDB (`documents` collection), not as files. Added a full-project export:
- **Backend** (`server.py`): `GET /api/projects/{project_id}/export` returns a single downloadable JSON (`Content-Disposition: attachment`, filename `{slug}-export-{YYYYMMDD}.json`) containing `export_version`, `exported_at`, `project`, `config` (incl. navigation), and all `documents` (with raw MDX `content`). Verified: 103 docs + nav config.
- **Frontend** (`Editor.jsx`): "Export all" header button (`data-testid="export-all-btn"`) downloads the JSON via axios blob (carries auth header), with sonner success/error toasts.
- One-time link (auth bypassed): `/api/projects/{projectId}/export`.


## Public Docs Redesign — Replit-style (June 2026)
Goal: match https://docs.replit.com/help/overview look & feel while keeping the blue brand (#1588FC), light-default theme, both modes polished.
Implemented in `/app/frontend/src/pages/PublicDocs.jsx`:
- **Secondary tab bar** under the header (`SecondaryTabBar`): horizontal top-level tabs with optional monochrome icon, brand-blue underline on active tab, horizontal scroll (`no-scrollbar`). Shown only when >1 tab.
- **Sidebar scoped to active tab** (`LeftSidebar` now takes a single `activeTab`); groups collapsible, each page link renders a monochrome lucide icon via `getIcon` + brand-blue active state with left indicator bar.
- **Active tab derivation**: computed from the tab containing `selectedDoc`; clicking a tab navigates to that tab's first available doc (`handleTabSelect`).
- **Layout offsets**: `--header-h` (logo-driven) + `--nav-h` (header + 48px tab bar) CSS vars set from parent; sidebar/TOC/main offset by `--nav-h`.
- Self-tested via screenshots: light, dark, and tab-switch all verified working.

## Full Content Rebuild from CSV Blueprint (June 2026)
Source: user-provided "User Education Gaps Tracker.csv" (219 rows) → complete new IA + AI-generated prose.
- **Navigation rebuilt into 6 tabs**: Build (54 pages), Integrations (34), Troubleshooting (8), Data, Trust & Support (6), Wingman (4), Changelog (1). Replaces the old 6 tabs.
- **107 documentation pages** generated with Claude Sonnet (Universal Key) from the CSV briefs; type-aware output (Comparison→tables, FAQ→AccordionGroup, Guide→Steps, Warning→Callout), cross-page relative links, per-page + per-tab lucide icons.
- Pipeline in `/app/backend/scripts_edu/`: `build_tree.py` (CSV→tree.json), `generate.py` (per-page Claude gen → gen_pages/*.json, sharded multi-process for parallelism, resumable), `apply.py` (wipes old docs, inserts 107 new Documents + writes navigation config to project_configs for the "Emergent" project).
- **Renderer fixes** (needed for generated content): `parser.js` now extracts shorthand callouts `<Note>/<Info>/<Tip>/<Warning>/<Caution>/<Error>/<Danger>/<Success>` (previously only `<Callout type=...>` rendered); `DocContent.jsx` enables `rehype-raw` so `<br>` inside table cells renders as line breaks; detection regex updated.
- Verified: content scan (no raw-tag leaks; all placeholder `<...>` tokens are inside code fences so rehype-raw is safe) + testing_agent frontend pass (~95%, retest_needed:false, zero functional bugs).
- Known non-blocking: `GET /api/auth/me` 401 console noise on public pages (pre-existing global admin-session check in App.js).

## Changelog removed + SEO/SSR hardening (June 2026)
- **Removed the Changelog tab** — now 5 tabs (Build, Integrations, Troubleshooting, Data Trust & Support, Wingman), 106 docs.
- **AI / LLM discoverability**: `robots.txt` now explicitly allows AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Amazonbot, Meta-ExternalAgent, etc.). Added `llms.txt` (curated index) + `llms-full.txt` (full content) per the llmstxt.org standard — served at both `/api/seo/*` and root `/llms.txt`, `/llms-full.txt`, generated dynamically from nav + documents (`_build_llms_txt` in server.py).
- **SEO meta cleanup**: removed the duplicate static SEO tags from `public/index.html` so react-helmet-async is the single source (no more double `<meta description>` / canonical). Added `REACT_APP_SITE_URL=https://help.emergent.sh`; `PublicDocs.jsx` now uses `SITE_ORIGIN` for canonical / og:url / JSON-LD (absolute prod URLs, not localhost).
- **Build-time prerendering (SSR-equivalent)**: react-snap is incompatible with React 19, so wrote a custom Puppeteer prerender at `frontend/scripts/prerender.js`. It boots the built SPA on a local static server, snapshots fully-rendered HTML (content + per-page meta + JSON-LD) for every doc route into `build/<slug>/index.html`, so non-JS crawlers get real content. Hardened: blocks analytics (PostHog), `domcontentloaded` + `data-prerender-ready` selector wait, 35s hard per-route timeout, non-fatal. Wired into `yarn build`: `craco build && (node scripts/prerender.js || echo 'prerender skipped')`. Verified full run: 105/105 pages, ~3 min, clean exit. Requires puppeteer (devDependency, pinned `23.11.1` for Node 20) + a Chromium at `/usr/bin/chromium`.
- **Renderer fix**: `<Tab title="...">` now accepted as an alias for `<Tab label="...">` (parser + validator) — fixed spurious "Validation Warnings" on 17 integration pages.
- **Mobile Apps promoted to its own top-level tab** (2nd position, after Build; icon `rocket`) — 11 pages moved out of the Build tab's "Mobile Apps" group into a standalone tab, since users had many mobile-specific questions. Now 6 tabs: Build, Mobile Apps, Integrations, Troubleshooting, Data Trust & Support, Wingman.

## Mobile optimization — Replit-clean (June 2026)
- **Secondary tab bar hidden on mobile** (`hidden lg:block`); on mobile the tabs now live at the top of the hamburger drawer (Replit-style clean header). `LeftSidebar` gained a `lg:hidden` tab switcher (`data-testid="mobile-tab-*"`).
- **Responsive layout offsets**: added `:root` defaults `--header-h:56px` / `--nav-h:104px` in index.css; sidebar/main now use `top-[var(--header-h)] lg:top-[var(--nav-h)]` and `pt-[var(--header-h)] lg:pt-[var(--nav-h)]` so mobile content sits below just the header (no tab-bar gap) while desktop keeps the tab-bar offset.
- **Fixed horizontal overflow on mobile**: code blocks inside `<Steps>` pushed the page to ~597px on a 390px screen. Added `min-w-0` to the Step flex row + description so code scrolls internally; body now == viewport width. Verified on code-heavy pages (bodyScroll 390 == win 390).
- **Step readability**: removed the forced faint `!text-zinc-400` + `italic` on step descriptions (low contrast in both themes) → now `text-zinc-600 dark:text-zinc-400`, upright and readable.
- Verified via screenshots at 390px (mobile) and 1440px (desktop) — both correct, no regressions.

## Content trims per user review (June 2026)
- **Removed** the "Template — fullstack vs base python (advanced)" page entirely (nav + document). Docs now 103 pages.
- **Removed the internal "Development" deployment type** (ephemeral chat-iteration deploys the agent auto-commits to) from `/deployment-types` - page now documents only Preview + Production (card group cols 3->2, comparison-table column dropped, env-vars wording updated). Kept all other legitimate "ephemeral" mentions (ephemeral filesystem for uploads, ephemeral workspaces backup advice) as they are user-facing.
- **Removed all em dashes** from every document (content, title, description) + config site fields - 575 occurrences across 92 pages replaced with spaced hyphens, double spaces collapsed, 0 remaining. Verified rendering is clean.
- **Fixed low-contrast accordion/dropdown text**: `Accordion.jsx` content forced `!text-zinc-400` (light) / `!text-zinc-600` (dark) - both illegible. Changed to `text-zinc-700` (light) / `text-zinc-300` (dark) for p/ul/ol/li, strong to zinc-900/zinc-100. Verified on FAQ page in both themes.
- **Contrast sweep**: audited all public reading components. Only Steps + Accordion were broken (fixed). Bumped Card description dark text zinc-400->zinc-300 for consistency. Body/lists/headings/tables/blockquotes are full-contrast (foreground) or AA-passing; captions (zinc-500) pass AA.
- **Style sweep (AI-tells)**: `scripts_edu/style_sweep.py` removed AI-tell words across all docs - seamless->smooth, seamlessly->smoothly, leverage(+forms)->use, "in order to"->"to", streamline(+forms)->simplify, "dive into"->explore (0 remaining; delve/utilize/robust were already absent). Unbolded 62 full-sentence over-emphasis spans (2000->1876 bold markers) while keeping term/label bolds; table pipes unchanged (0 delta = tables intact). Case preserved. 46 docs changed.

## Design System (Feb 2026 — Full UX Overhaul)
- **Typography**: Geist (headings, font-heading), Inter (body, font-sans), JetBrains Mono (code)
- **Palette**: zinc neutrals + brand `#1588FC`; light-first with `html.dark` toggle
- **Tokens**: HSL-based shadcn variables in `/app/frontend/src/index.css`; Tailwind extended in `tailwind.config.js`
- **Signature device**: 10px / 0.3em uppercase eyebrow labels (`.eyebrow`) above every section heading
- **Micro-interactions**: `.btn-press`, `.card-lift`, `.fade-up` (cubic-bezier 0.16,1,0.3,1)
- **Theme**: `ThemeProvider` in `/app/frontend/src/contexts/ThemeContext.jsx`; `<ThemeToggle compact />` from `/app/frontend/src/components/ui/theme-toggle.jsx`
- **Layout archetypes**: public docs use sticky translucent header + 240px left sidebar + 240px right TOC; admin uses sticky header + max-w-[1400px] gridded console

## Application Structure
- **/** - Public documentation page (shows Emergent docs directly)
- **/admin** - Admin login page
- **/admin/dashboard** - Project management (protected)
- **/admin/editor/:projectId/:docId** - Document editor (protected)
- **/admin/generator** - AI doc generation (protected)

## Supported Mintlify Components
- `<Steps>` / `<Step>` - Step-by-step guides
- `<CardGroup>` / `<Card>` - Card grids with icons, colors, links
- `<Columns cols={n}>` - Responsive column layouts (1-4 columns) with Cards or iframes
- `<Tabs>` / `<Tab>` - Tabbed content
- `<Accordion>` / `<AccordionItem>` - Collapsible sections
- `<Callout type="info|warning|error|success">` - Callout boxes
- `<YouTube id="..." />` - YouTube embeds
- `<Loom id="..." />` - Loom embeds
- `<Video src="..." />` - Video embeds
- `<Figure src="..." />` - Image figures
- `<iframe>` - Direct iframe embeds (including inside Columns)

## Features Implemented
1. ✅ MDX-like authoring with custom components
2. ✅ AST-based parsing with remark/rehype
3. ✅ Document validation system
4. ✅ Client-side FlexSearch (⌘K)
5. ✅ Google OAuth authentication via Emergent
6. ✅ AI documentation generation via Emergent LLM Key
7. ✅ Mintlify-style UI/UX design
8. ✅ WYSIWYG editor with bi-directional content sync
9. ✅ Configurable navigation structure
10. ✅ Device preview toggle in editor
11. ✅ Dark mode only (light mode removed)
12. ✅ GitHub OAuth integration (partial)
13. ✅ Manual version control (named snapshots with restore)
14. ✅ Media embeds (Images, GIFs, YouTube, Loom, Video)
15. ✅ AI Mintlify markdown converter
16. ✅ Image picker UI for media embeds
17. ✅ Auto-create documents when adding pages in navigation config
18. ✅ **Columns layout component** - Responsive grid for cards and iframes
19. ✅ **Card with color prop support** - Custom icon colors
20. ✅ **Iframe embeds inside Columns** - YouTube thumbnails in grid layouts
21. ✅ **Sync All Missing Pages** - Bulk create documents for all nav pages
22. ✅ **Modal-Based Document Linking** - Link unlinked docs to navigation via popup modal
23. ✅ **Hierarchical Editor Sidebar** - Documents shown in navigation structure tree
24. ✅ **Document Deletion** - Delete documents from editor sidebar with confirmation
25. ✅ **Complete Navigation Structure** - Full 5-tab navigation with 44 linked pages matching reference design

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Tiptap (WYSIWYG)
- **Backend**: FastAPI, MongoDB
- **Auth**: Emergent Google OAuth, GitHub OAuth (partial)
- **AI**: Emergent LLM Key (Claude Sonnet for markdown gen)
- **Storage**: Emergent-managed Tigris Object Storage via Universal Key (migrated from Supabase Feb 2026)

## Key API Endpoints
- `GET /api/public/default-project` - Fetch default project for public site
- `POST /api/mintlify/convert` - AI-powered markdown conversion
- `GET /api/images/search` - Stock image search
- `GET /api/auth/me` - Authentication check
- `POST /api/projects/{id}/documents` - Create document

## Configuration Panel Features
- **Site Details**: Name, slug, description
- **Branding & Logo**: Logo upload, favicon
- **Theme & Colors**: Primary accent color, background pattern
- **Layout Options**: TOC, search, top nav toggles
- **Top Navigation**: External links, tabs
- **Sidebar Navigation**: 
  - Multi-level groups and pages
  - Auto-create documents on page add
  - **"Sync Pages" button** - Creates all missing documents at once

## Known Issues
- **Frontend Dev Server**: `babel-loader` crash prevents hot-reloading (workaround: build + serve)
- **GitHub OAuth**: Needs client credentials to complete testing
- **Missing Page UI**: Clicking nav links for non-existent docs does nothing (should show placeholder)

## Upcoming Tasks
- Complete GitHub OAuth flow with credentials
- Verify Drag-and-Drop navigation reorder feature (P1 — user verification pending)
- Sync "Deleting Your Account" content into production admin (P1 — user action; preview DB is updated)

## Completed work — Feb 13, 2026 (Sidebar nav full editor)
- The admin left-sidebar nav tree is now a **self-contained editor**. Every action that used to require opening the lower-left Configurations panel is now inline:
  - **`+ New Tab`** button at the top of the tree.
  - **Per-tab `+`** button → creates a new folder/group inside the tab.
  - **Per-group `+`** button → creates a new Untitled document and links it under the group; navigates straight into the editor.
  - **3-dots menu** on every Tab and Group with Rename / Delete (delete uses a `confirm` with clear copy that documents themselves stay intact).
  - **Inline rename** on tab and group labels (double-click or via Rename menu) with Enter to commit / Esc to cancel.
- New `onCreatePage` flow in `Editor.jsx`: POST `/projects/:pid/documents` → append slug into the chosen group → save config → jump into the new doc.
- "Made with Emergent" badge re-skinned as a theme-aware frosted pill (CSS-only, light & dark variants).

## Completed work — Feb 13, 2026 (Admin Editor overhaul)
- **Search icon** removed from the admin sidebar Navigation header.
- **Images & Media** panel and **GitHub Sync** panel + button **fully removed**:
  - Frontend: deleted `MediaPanel.jsx`, `GitHubPanel.jsx`, removed sidebar buttons, removed imports/state.
  - Backend: deleted all 6 GitHub routes (`/api/github/auth`, `/callback`, `/projects/:id/github/{sync,link,info}`) and GitHubAccount/GitHubLinkRequest models. Removed `base64` import + GitHub OAuth env vars.
- **Drag-and-drop navigation** (full hierarchy: Tabs > Groups > Pages) via new `EditorNavTree.jsx` using `@dnd-kit`. Reorders persist immediately to `project_configs.navigation`.
- **Per-page metadata popup** via new `PageMetaDialog.jsx`, opened from a 3-dots button next to every page in the sidebar. Edits title, slug, icon, description; includes a Delete-with-confirm flow. Slug renames auto-mirror into the navigation config to keep links intact.
- Added `description` field to `Document` model (and Create/Update variants) — used by the metadata dialog and available for SEO/nav previews.
- **Writing Assistant** replaces the old Mintlify Helper:
  - New slide-over panel `WritingAssistant.jsx` with 3 modes: **Tweak** (rewrite whole doc or selected text), **New Page** (raw notes → markdown → auto-create + link to chosen nav group), **Chat** (free-form Q&A).
  - 6 one-click quick-tweak actions (Improve, Expand, Shorten, Simpler language, Add examples, Add callouts) + free-form custom instruction.
  - New backend endpoint `POST /api/assistant/tweak` (Claude Sonnet 4.5 via Universal Key). Existing `/api/generator/markdown` is reused for New Page mode.
  - Deleted `MintlifyAIHelper.jsx`.
- Backend regression: **23/23 tests pass** (`/app/backend/tests/test_assistant_tweak_and_github_removal.py`).

## Completed work — Feb 13, 2026 (Code block + monochrome polish)
## Completed work — Feb 13, 2026 (Monochrome icons + Hex picker)
- **Removed all blue/colored backgrounds from icon badges**: `Card` (Cards.jsx) and `Step` number circles (Steps.jsx) now use solid black-on-white in light mode and solid white-on-black in dark mode. The `color` prop on `<Card>` is intentionally ignored.
- Step connecting line desaturated to neutral zinc (was `bg-brand/20`).
- **Hex color picker** added to authoring tools:
  - WYSIWYG (TipTap): new Palette button in the toolbar — opens the native OS color picker and inserts the picked hex (uppercase) at the cursor as plain text.
  - Markdown view: `/color` slash command opens the same picker via a hidden `<input type="color">` and inserts the hex at the previous cursor position.

## Completed work — Feb 13, 2026 (Supabase → Tigris migration)
- Resumed failed migration: re-downloaded last image from Supabase and uploaded to Tigris successfully
- Discovered 3 additional logo URLs in `project_configs` collection that the original script missed; migrated them
- All 11 unique Supabase URLs (7 doc images + 3 logos + 1 already-migrated) are now in Tigris (`emergent-docs/_legacy/migrated/`)
- Stripped Supabase from codebase: removed `if not supabase:` dead check (server.py:913), removed `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_KEY` from `backend/.env`, removed `@supabase/supabase-js` from `frontend/package.json`
- Deleted one-time `migrate_supabase_to_tigris.py` script (migration table preserved in `migration_map` collection for audit)
- Updated `upload_asset` docstring to mention Tigris instead of Supabase
- Backend regression: 22/22 tests pass (`/app/backend/tests/test_storage_migration.py`)
- Frontend smoke: home + `/plans-and-credits` render 0 broken images, 0 Supabase URLs

## Future/Backlog
- Full GitHub "Docs-as-Code" integration
- Interactive code blocks with sandbox
- Drag-and-drop navigation reordering (for existing pages)
- Landing page CTA cards
- "Page not found" UI placeholder for missing documents
- Fix `babel-loader` crash to restore hot-reloading dev server

**Completed work in this session (January 22, 2025)**
- **Mobile Nav Icon in Header**: Moved the mobile navigation hamburger menu from a floating button at the bottom-right to the top header, positioned to the right of the CTA buttons. This follows standard mobile UX patterns.

## Completed work — June 10, 2026 (SEO hardening)
- **Dynamic sitemap**: `/api/seo/sitemap.xml` and root `/sitemap.xml` rebuilt to derive base URL (env `PUBLIC_SITE_URL`, default `https://help.emergent.sh`), include homepage + all doc slugs with `lastmod`, served with `application/xml`. Removed duplicate/triplicated SEO route definitions in `server.py` (consolidated into `_robots_body` / `_build_sitemap` helpers).
- **Static fallbacks**: `frontend/public/sitemap.xml` is now a `<sitemapindex>` delegating to the always-fresh `/api/seo/sitemap.xml` (never goes stale). `frontend/public/robots.txt` disallows `/admin`, points to both sitemaps.
- **robots.txt**: backend + static both emit `Disallow: /admin` and `Sitemap:` directives. (Preview domain prepends Cloudflare-managed content-signals block, then appends our rules.)
- **Per-page meta** (`PublicDocs.jsx` via react-helmet-async): dynamic title, description (prefers doc `description`), canonical, `robots` meta, Open Graph (type article/website), Twitter card, `article:modified/published_time`, og/twitter image fallback chain.
- **Structured data (JSON-LD)**: `TechArticle` (with publisher/logo) on docs, `WebSite` on homepage, `BreadcrumbList` from nav tree.
- **index.html**: site-level default description, OG, Twitter, canonical, keywords, author — visible to no-JS social scrapers (per-page values overridden at runtime by Helmet for JS-capable crawlers like Google).
- Regression: `/app/backend/tests/test_seo.py` — 3/3 pass.
- **Note**: Full per-page previews for no-JS social scrapers (Twitter/FB/LinkedIn/Slack) require SSR/prerendering, which is not feasible on the current SPA + ingress setup; site-level OG defaults are the pragmatic fallback. Google (renders JS) sees full per-page meta.

## Completed work — June 10, 2026 (Remove missing/orphan nav pages)
- **Bug**: Nav entries whose backing document doesn't exist ("missing" pages) had no delete/remove control — only linked docs got a 3-dot menu in `EditorNavTree.jsx`. Users couldn't clean up orphan nav slugs.
- **Fix**: Added a trash button on `SortablePage` when `isMissing`, wired a new `onRemovePage(tabPath, slug)` handler through SortableTab → SortableGroup → SortablePage → top-level `EditorNavTree`. It filters the slug out of that group's `pages` and persists via `onSaveNavConfig` (PUT /config). Does NOT touch any document (there is none).
- Unlinked *documents* already have a delete button (Trash2) in `Editor.jsx` "Unlinked Documents" section — confirmed present in current code; if not visible on production, prod build is stale and needs a redeploy.
- Verified via seeded admin session + throwaway project with a missing page: button renders with red "missing" label, click removes the entry from the tree and persists (`pages: ['real-page']`).

## Completed work — June 10, 2026 (Fix: hidden delete buttons / clipped sidebar action controls)
- **Root cause**: Radix `ScrollArea` wraps its content in a `display:table` div, which defeats `min-w-0` flex-shrinking. Long doc titles pushed the row wider than the `w-72` (288px) sidebar, so the right-side action controls (unlinked-doc trash buttons, "Delete All", and nav-tree page 3-dot menus) rendered ~25px outside the sidebar and got clipped by `overflow-hidden`. User reported "no delete button" — controls existed in DOM but were off-screen.
- **Fix**: Scoped the Editor sidebar `ScrollArea` to force the Radix viewport inner wrapper to `display:block` via `[&_[data-radix-scroll-area-viewport]>div]:!block` (in `Editor.jsx`). Titles now truncate and all action buttons render inside the sidebar. Verified by measurement (button `right=271 ≤ sidebar 288`, insideSidebar:true) + screenshot showing trash icons on all unlinked docs, "Delete All", and page 3-dot menus.
- Requires redeploy to reach production.

**Previously Completed work**
## 2026-06 — Part 2 (threading + mentions) & published-delete guard
- Threaded comment replies on review page: comments carry `parent_id`; replies nest under parent. Reply box per comment.
- @mention autocomplete from known people (owners, reviewers, prior commenters); `/known-emails` now open to any signed-in user. Mentions stored on comment; highlighted in body.
- Published pages: only owners can delete. Non-owner delete returns 403 listing owner emails to contact ("Please contact: <emails>"). Editor surfaces this detail as a toast.
- Comment creation/resolution remain open to all signed-in @emergent.sh users; verdicts still assigned-reviewer-gated; publish/unpublish/republish still owner-only.
- Emails (Part 1) PARKED per user. Parts 3 (activity/history) and 4 (trash/restore, confirmations) still pending.

## 2026-06 — Part 3 (Activity log + page history) & Part 4 (Safe deletes)
- Activity log: durable `activity_log` collection. Emitted on assigned, delegated, edited, commented, replied, resolved, published, unpublished, deleted, restored, purged, verdict.
- Owner-only global Activity tab in Review Console (newest-first timeline, filter by person). GET /projects/{pid}/activity (owner) + /activity/page/{slug} (any signed-in).
- Per-page History panel on the review page (data-testid page-history-*).
- Assignments now store assigned_by_name; "assigned by <name>" shown on assignment rows.
- Safe deletes: page delete is now SOFT (deleted_at/deleted_by/trash_nav), 90-day retention, lazy purge on trash read. Excluded from editor list, public docs, sitemap, review progress via {"deleted_at": None} filter.
- Editor Trash panel (sidebar): list trashed pages, Restore (re-inserts nav placement) and Delete forever (confirm). Endpoints: GET /trash, POST /documents/{id}/restore-page, DELETE /trash/{id}.
- Confirmations: version restore now confirms (overwrites current); version delete + page delete already confirm.
- Owner-gate messaging: ensure_owner (review routes) + published-page delete now return "Only an owner can do this. Please contact: <owner emails>". Editor surfaces detail via toast.
- Part 1 emails still PARKED per user.

## 2026-06 — Reviewer link, list ordering & one-assignee-per-page
- Deep-link after login: ProtectedRoute stores intended path; AuthCallback returns the user there (so a shared /admin/review or /review/<slug> link lands them on the right page after Google login). OAuth redirect URL unchanged (/admin/dashboard).
- My Reviews list now sorted by navigation/doc order (pageOrder from scopeOptions) to match the delegate picker; delegate panel stays on top.
- ONE ASSIGNEE PER PAGE invariant: added _unassign_slugs() in review_routes; applied in create_assignment, delegate_assignment, delegate_bulk (delegate_pages already moved). Re-assigning a page moves it off the previous reviewer; re-assigning to the same person is idempotent (count unchanged).
- One-time data cleanup: newest assignment wins per slug; 32 duplicate assignment docs removed. Result: all 121 pages assigned to exactly one reviewer, 0 double-assignments. Counts — vishal.k=18, sarang=19, amol=34, karthikraghuram=23, vinish=11, tejas=9, akash=4, mihir=3.
- Note: 'How the agent runs (workflow & stop reasons)' (slug how-the-agent-runs-workflow-stop-reasons) exists and is in nav; earlier 'can't find it' was the list-order mismatch, now fixed.

## 2026-06 — Data & Trust section rebuild + FAQ expansion (from customer artifacts)
- Rebuilt the "Data, Trust & Support" tab -> "Data & Trust" section to the Curriculum Map structure: 12 new pages (privacy-gdpr-overview, data-processing-agreement, sub-processors, where-your-data-is-stored, ai-model-training, data-isolation-leakage, deletion-retention, data-subject-rights, security-breach-audit, special-category-data, regulators-supervisory-authorities, your-data-ownership). Removed superseded data-privacy & data-leakage; your-data-ownership rewritten. All created status=in_review (nothing published). Support group unchanged.
- Content sourced from KB_privacy_answer_sheet.md approved answers + Curriculum Map briefs. Conservative per user: stated only approved facts, cited DPA sections, linked canonical pages (app.emergent.sh/dpa, /subprocessors, /privacy-policy, emergent.trust.site), routed specifics to privacy@emergent.sh.
- OMITTED all "Yet to Publish"/BLOCKED items (C1-C15): certification status, exact erasure/backup day-numbers, encryption cipher specifics, Service-Data-training nuance, object-storage-cannot-delete, sub-processor objection-scope, ad vendors/MiniMax/DPDP/EU-US DPF/security-questionnaire specifics, EU-migration pricing, and the in-app analytics/PostHog script (Q24/Q25).
- FAQ (slug 'faqs'): appended "Common questions by topic" section covering ALL 39 FAQ Master questions, grouped by category (Prompting, Models, Credits, Plans, Prompt windows, Mobile, Web<->Mobile, Custom domain, Changing name, Deployment, GitHub, Integrations, Security & privacy, Platform). 42 -> 81 accordions.
- Verified: MDX renders (Callout/Note/CardGroup/Steps/AccordionGroup), nav group has 12 pages in order, all 39 master Qs present.

## 2026-06 — Placeholder "Draft - needs review" stub cleanup (Learn the Basics)
- Removed all "needs product confirmation before publishing" / "Draft - needs review" placeholder stubs (originated from the original 121-doc pass, NOT from user-uploaded files).
- share-it-with-the-world: deleted empty "Watching visits and collecting feedback" section.
- write-prompts-that-work: deleted empty "copy-paste library"; stripped draft callout on "Use specific examples".
- connect-your-tools: deleted empty "Advanced: MCP" section.
- when-something-breaks: deleted empty draft section.
- add-login-user-accounts: stripped "other OAuth providers" callout.
- get-found-on-google: stripped 4 draft callouts (real content remained).
- get-your-first-users: was ~90% placeholder; rewrote with real, grounded content (pre-launch checklist, where to share, asking for feedback, turning feedback into prompts via the agent) — no invented analytics/feedback features. Project-wide placeholder count now 0.
- NOT touched: the word "placeholder" appears in 8 other docs (figma-design-to-code, paddle, ai-media-generation, etc.) but as legitimate wording, not stubs.

## 2026-06 — Visual editor renders inline markdown inside MDX components
- Fixed TipTapWYSIWYG.jsx: markdown (bold, links, inline code) inside <Callout>/<Step>/<Tip>/<Note>/<Warning>/<Info> now renders in Visual mode to match the reader (previously showed raw **text** / [text](url) because marked passes component blocks through as raw HTML).
- Load path: renderMdxInline() pre-parses inner markdown of these prose components before marked.parse. Regex uses a (?=[\s/>]) lookahead so 'Step' no longer mis-matches 'Steps'.
- Save path: replaced turndown.keep for components with a single recursive 'mdxComponents' rule covering all MDX tags (Callout/Card/CardGroup/Columns/Steps/Step/Tabs/Tab/Accordion/AccordionGroup/AccordionItem/Note/Warning/Tip/Info) — children convert back to markdown, wrapper+attrs preserved. Verified round-trip: **bold**, [links](url), nested <Steps><Step title="..."> all preserved; no raw <strong>/<a> leaks.
- Verified live in Visual editor on put-your-app-live: links + bold render, zero literal ** or ](.

## 2026-06 — Wingman revised content (4 uploaded files) + created MCP & Integrations pages
- User uploaded 4 revised Wingman source files (what-is-wingman, channels, custom-mcp, integrations-and-tasks), saved to /app/memory/wingman/. Priority rule: reviewer akash = expert (highest), file content = next best.
- CONFLICT flagged & resolved: what-is-wingman.md and channels.md list iMessage as a channel, but akash said remove iMessage → kept akash's ruling; Channels page stays Web/Telegram/WhatsApp only.
- Rewrote custom-mcp-integrations (in_review) from mcp.md: first-party (Wingman-managed) vs custom third-party MCP servers, hosted-HTTP/Streamable only (no stdio/local), secure credential flow, permissions. This resolved akash's last open comment (#9 "Try connecting an MCP to Wingman"). akash unresolved comments now = 0.
- Repurposed the trashed 'integrations-scheduled-tasks' slug (it was the wrong-content Channels duplicate) as the real 'Wingman Integrations & Tasks' page from integrations-tasks.md: 300+ integrations, Composio OAuth flow, available-integrations table, scheduled tasks, paused/auto-resume, deleting a Wingman. Restored (deleted_at cleared) + re-added to Wingman nav.
- Wingman nav now: what-is-wingman, channels-web-telegram-whatsapp-imessage-slack, custom-mcp-integrations, integrations-scheduled-tasks. Both new pages status=in_review (not published), plain markdown (no MDX components).
- NOT applied without confirmation: what-is-wingman.md additions (phone calls, getwingman.com/app-store access, SOC2/GDPR/ISO 27001 billing&security line — certifications flagged unverified earlier). Left what-is-wingman page as-is pending user go-ahead.

## 2026-06 — Editor nav tree now renders nested subgroups (Deployments fix)
- Bug: full editor sidebar (EditorNavTree.jsx) showed "Deployments" group with count 0 and no pages, though review console + public docs rendered it fine.
- Root cause: nav config's Build>Deployments group uses a 2-level nesting — empty top-level `pages: []` plus `groups: [{group:'Common', pages:[8]}, {group:'Web flow', pages:[4]}]`. EditorNavTree only read `group.pages`, never recursing into `group.groups`. (Only Deployments uses nested subgroups project-wide — verified.)
- Fix (EditorNavTree.jsx): SortableGroup now (a) counts totalCount = own pages + all subgroup pages for the badge, and (b) renders each nested subgroup as a labeled sub-section with its own drag-sortable page list. Added handleSubPagesReorder + handleRemoveSubPage handlers (mirror the flat ones, one level deeper) threaded SortableTab→SortableGroup. Reuses SortablePage rows so select/open-meta/reorder/remove-missing all work in subgroups.
- Verified in editor (owner session): Deployments shows 12, Common(8) + Web flow(4) subgroups with all pages (Deployment types, Deploying (web), Custom domain, Database (MongoDB), etc.) clickable.

## 2026-06 — Nav consistency sweep (editor / review console / public docs)
- Ground truth from nav config (recursive): 7 tabs, 130 referenced pages (Learn the Basics 18, Build 40, Mobile Apps 11, Integrations 34, Troubleshooting 8, Data/Trust/Support 15, Wingman 4). 0 missing docs, 0 duplicate slugs, 0 orphan live docs. Deployments is the ONLY nested (subgroup) group.
- Review console: consistent — scopeOptions uses recursive walk() and collect() into g.groups. ReviewPage side-nav: consistent — recursive walk() into g.groups. Editor: fixed previously (EditorNavTree recurses).
- Public docs: sidebar RENDER already recursed (GroupSection→group.groups), BUT 5 helpers flattened only g.pages and skipped subgroups → real bugs for the 12 Deployment pages: prev/next (tabSlugs omitted them → no prev/next + gap in Build sequence), active-tab detection (opening a Deployment page loaded wrong tab sidebar), breadcrumb (page + search), getFirstNavDoc, handleTabSelect.
- Fix (PublicDocs.jsx): added module-level recursive helpers collectGroupSlugs / groupHasSlug / findGroupLabel and used them in all 5 helpers. Frontend compiles clean; PublicDocs mounts with no page errors. NOTE: public endpoint currently serves 0 docs (nothing published — full set is in_review), so live public verification of a Deployment page pending a publish.

## 2026-06 — Fact-check pass applied (docs-vs-kb-differences-20260909.md)
- Source of truth: uploaded report saved at /app/memory/factcheck.md (335 findings). Applied to the 111 in-scope docs (matched by slug). Excluded 19: Wingman(4), privacy/GDPR(12), support/account(3) — untouched. Nothing published; all docs stay in_review.
- Method: pipeline /app/memory/factcheck_pipeline.py — deterministic global regex for domains/emails (.emergent.run/.app/.build/.dev→.host, emergent.ai→emergent.sh, all support/sales/billing→support@emergent.sh, partners@→partners.emergent.sh) + per-doc LLM pass (claude-sonnet-4-6 via EMERGENT_LLM_KEY) that received ONLY that doc's findings + Appendix A + strict rules. 17 docs rewritten, ~90 patched, 5 clean docs got global-only. Resume file: factcheck_done.txt. 111/111 processed, 0 failures.
- Rules enforced: [C]=correct, [S]=adjust/caveat, [U]=leave verbatim + prepend `[NEEDS-REVIEW: unverified — PM/support to confirm]`; compliance/privacy sentences left verbatim + compliance flag; redeploy billing = "free of charge" + flag; ownership = "cannot be transferred" + flag; object-store deletion = not supported; no invented specifics.
- Result: 170 NEEDS-REVIEW flags across 77 docs (147 unverified, 12 compliance, 10 redeploy-billing, 1 ownership). Consolidated checklist: /app/memory/needs_review_checklist.md. Verified: 130 docs still in_review, 0 leftover bad domains/emails in-scope, MDX renders (spot-checked understanding-models rewrite in review reader — <Tip>/table render, no errors). Manually removed a stale "Transfer ownership ✓" table row in team-roles that contradicted the ruling.
- NOTE: corrections are LLM-applied from a self-contained report and are intended for human PM review (that's what the flags are for). Nothing is live.

## 2026-06 — Fact-check SECOND PASS (docs-vs-kb-remaining-20260910.md) + Support pulled in-scope
- Applied the residual 31 issues across ~23 docs from /app/memory/remaining.md via /app/memory/factcheck_pass2.py (hand-curated per-doc findings + LLM patch, claude-sonnet-4-6). 23/23 done, 0 failures. Still nothing published; all in_review.
- Fixes: Replace=blue-green-across-jobs (database-mongodb), shared Atlas cluster (database-data-on-mobile), Auto-HITL auto-answers (how-the-agent-runs), Claude Haiku/Sonnet 200K context (claude), code editor on all plans incl Free (missing-functionality), no "Enterprise" deploy tier + PDB from Launch (app-slow-crashing), MCP tool-lists-cache + custom-agents 4-step-wizard (glossary), rollback erases/preview-only/no History-panel (checkpoints), auto-recharge min-5-not-default (universal-llm-key), Paystack agent-scaffolds-verification, Paddle drop PHP SDK, Airtable Add-tile not Connect/validate, remove Sentry (connect-your-tools), soften Plan-mode exclusions (write-prompts), no 50-credit renewal takedown (faqs). Localhost→cloud-preview reworded (paystack/paypal/google-auth). talk-it-through: removed "(free)" from title, H1, and nav label.
- New flags added: "up to 3 rollback" cap flagged in the-chat-to-deployment-flow, deployment-types, glossary, faqs (KB sources disagree; product to settle). Plus unverified flags for E-3-sub-agent + media-cost (how-the-agent-runs), push 3-5x stat, referral lifetime-cap wording, deployment-plan intermediate specs.
- USER REQUEST honoured: Support content pulled in-scope even though support/account docs are on a separate track. Ran the deterministic email/domain fix on account-security-login, getting-help-support-community, app-takedown — account-security-login's "Team seats and billing" callout now shows support@emergent.sh (was support@emergent.dev). Verified in review reader.
- State now: 130 docs in_review, 0 leftover bad domains/emails anywhere (in-scope AND the 3 support/account docs), 182 NEEDS-REVIEW flags total. Regenerated /app/memory/needs_review_checklist.md.

## 2026-06 — Review Console/Page UX: Publish tab restructure + comments/edit-box
- Publish tab (ReviewConsole.jsx) rebuilt to follow the SAME nav tree as Assignments (scopeOptions + descendants): TAB/SEC badges, indentation, nav order. Added bulk publish — per-row checkboxes, "Publish selected (n)" / "Take down selected", and per-tab/section "Publish all (n)" (only counts non-published pages). bulkPublish() fires publish/unpublish in parallel + optimistic status update.
- BUG FIX (Wingman "done" not reflecting): the flat Publish list never showed assignment status. Added reviewDoneByPage (slug->true when any assignment status==='done') and a green "✓ Reviewed" pill per page. Verified: 4 done Wingman assignments now render Reviewed pills in Publish.
- ReviewPage.jsx: inline reviewer edit textarea now min-h-[70vh] + resize-y (was rows=24, too short) to match reader height. Comments rail now max-h-[calc(100vh-16rem)] overflow-y-auto (scrollable). Comment cards with a pinned text selection are clickable — scrollToAnchor() finds the anchor_text in [data-testid=review-content], selects/highlights it, and smooth-scrolls it into center; action buttons (resolve/reopen/reply) stopPropagation so they don't trigger the jump.
- Verified: frontend compiles clean; Publish tree + Wingman Reviewed pills confirmed via screenshot (REVIEWED_COUNT=4). Nothing published in the process.

## 2026-06 — Publishing & editing workflow in Review Console (Plan Part B)
- Open in editor: added on every Publish-tab row (data-testid open-editor-{id}) and on the ReviewPage header — navigates to /admin/editor/{pid}/{docId} (route already supports :docId, no Editor change).
- Publish-tab filter (default All): All / In review / Published / Needs update. pageMatchesFilter + group headers hide when no visible children.
- "Unpublished changes" marker + Republish: needsUpdate(d) = published && content !== published_content. Amber "Unpublished changes" pill + green Republish button (publishDoc(d,true)); bulkPublish publish-branch now also re-publishes needs-update pages; publishDoc/bulkPublish now update published_content/published_title locally so the flag clears. Verified end-to-end via a temp scenario (reverted after).
- Page-level Done (reworked from per-assignment): doneByPage = a 'Looks correct' verdict (from assigned reviewer OR an owner) AND no open comments (openByPage from inbox.comments). Publish "Reviewed" pill + reviewer assignment card now show this ("x/y done" / "Done"); the manual "Mark done"/"Reopen" buttons were removed (setAssignmentStatus retained but unused). ReviewConsole now fetches /verdicts. ReviewPage progress counts 'Looks correct' verdicts. NOTE: because Done is now verdict-driven, the 4 Wingman pages that were assignment-"done" will only show Reviewed once they have a 'Looks correct' verdict.
- Clarity: Take down tooltip ("returns to In review, removes from public site"); publish blocked-state shows "N open" rose pill + disabled Publish/Republish with tooltip when open comments exist.
- Data cleanup: deleted 2 fully-orphaned assignments (mihir 'Data privacy'→data-privacy, 'Data leakage'→data-leakage; verified their slugs resolve to no live doc). Now 130 assignments / 130 docs.
- Unchanged: publishing owner-only + manual; resolve-comments-before-publish gate; public frozen-copy model. FYI the 4 Wingman docs are currently published (user action, pre-existing this task).

## 2026-06 — Renamed Build "How credits work" -> "Managing credit usage" (slug too)
- The Build > Credits, Plans & Billing page (slug how-credits-work) renamed: title "Managing credit usage", slug "managing-credit-usage". The separate Learn the Basics > Reference page (how-credits-work-basics, title "How credits work") is unchanged.
- Cascaded: doc slug+title; nav entry (page+title, icon gauge kept); 1 assignment slug+scope_label; 11 docs' content cross-links (/how-credits-work -> /managing-credit-usage) via regex excluding -basics; verdicts/comments/activity (none existed). 0 stray refs remain. Verified renamed page loads at /review/managing-credit-usage, basics page intact.

## 2026-06 — MIS management dashboard + supporting changes (approved plan)
- NEW MIS tab in Review Console (/admin/review), FIRST tab, open to ALL signed-in users (not owner-gated). Backend endpoint GET /projects/{pid}/mis?include_seed= aggregates from documents/assignments/verdicts/comments. Read-only snapshot with Refresh + "data as of" timestamp (not real-time).
  - Sections built: A) reviewer table (assigned/done/%/7 verdicts split/done-w/o-verdict/comments made+resolved/overdue) + CSV export; B) funnel cards (total/assigned/done/published/no-verdict); C) throughput mini-bars (Looks-correct per day); D) comments health (per-page open/total chips, ≥3 open = hot/rose, clickable to /review/slug); E) exceptions (done-without-verdict, wrong-info, looks-correct-with-open-bot-comment, duplicate-titles). Person filter + seed/test toggle (seed = non-@emergent.sh or dev@local, excluded by default).
  - Page-level Done = latest verdict 'Looks correct' + no open comments. legacy looks_good normalized to 'Looks correct'.
  - PARTIAL vs plan: reviewer-table numbers are not yet individually click-through to drill-down lists (CSV + section lists provided instead); medians (hrs to first action / to done) and aging buckets not yet computed. Noted as follow-ups.
- Mark done REINSTATED: manual Mark done/Reopen button back on each assignment card; backend update_assignment records done_at and no longer requires a verdict (Done and verdict independent). Auto-switch (page-level Done) still drives Publish "Reviewed" pill + MIS.
- NEEDS-REVIEW -> comments: one-time conversion done — 182 markers deduped by (page id + marker text) to 91 Docs-bot comments (author docs-bot@emergent.sh) across 76 pages; markers stripped from bodies (0 remain); logged as Docs-bot edits. update_document now has an idempotent save-hook that auto-converts any future markers. Effect: those 76 pages are publish-blocked until Docs-bot comments resolved (by design).
- Due dates: all 130 assignments set due_date=2026-09-14; create_assignment defaults new ones to it. Overdue = today past that date.
- Cascade delete: soft-delete (trash) AND permanent purge now remove the page from assignments (delete assignment when it becomes empty) — prevents orphans.
- Review Inbox comments now clickable: open /review/<slug>?focus=<anchor>; ReviewPage honors ?focus= to scroll+highlight the pinned text.
- Verified: MIS endpoint via curl (7 reviewers, funnel 130/130/4/4/126) and MIS tab via screenshot (all sections render, no page errors). Nothing published.

## 2026-06 — Editor: open-to-first-page + toolbar reconciliation
- BUG FIX: opening the full editor from the dashboard (/admin/editor/{projectId}, no docId) showed a blank "Untitled" page. fetchProjectData now, when there is no docId, finds the first navigation page (recursing tabs>groups>subgroups) that maps to a live doc and navigate(..., {replace:true}) to /admin/editor/{projectId}/{docId}. Falls back to documents[0].
- TOOLBAR reconciled (was different between markdown/visual and overflowed on written pages): Assist / Insert / Add Image now render in ALL view modes (disabled + greyed with "Switch to Markdown or Split to use" tooltip in Visual). Copy link + Export all moved into an always-present "⋯" (MoreHorizontal) overflow Popover so they never get cut off by the page title/status badges. Same toolbar button set now shows in Markdown and Visual.
- Verified via screenshots: dashboard editor opens on "Start with your idea" (not Untitled); Markdown & Visual toolbars match; no page errors.

## 2026-06 — Data & Trust restructured 12 -> 8 pages (IA only, verbatim bodies)
- Final 8 (in nav order): privacy-gdpr-overview, data-processing-agreement, where-your-data-is-stored (retitled "Where your data is stored & who processes it", Sub-processors merged), ai-model-training, deletion-retention, controller-responsibilities (NEW; Data subject rights + Special category data + Regulators merged), security-breach-audit, your-data-ownership (trimmed body linking to Save-to-GitHub + Database MongoDB).
- Bodies inserted verbatim from user-supplied .md (where/controller/ownership). Op3: "Keep it safe" lacked Secrets-manager + .env git-ignore coverage, so the supplied secrets appendix was APPENDED; data-isolation-leakage retired.
- Deleted (to Trash, recoverable): sub-processors, data-subject-rights, special-category-data, regulators-supervisory-authorities, data-isolation-leakage. Assignments on them removed; verdicts deleted (0 existed); comments kept (0 existed).
- Internal links repointed map (sub-processors->where, DSR/special/regulators->controller-responsibilities, isolation->ai-model-training): 0 live docs actually referenced the old slugs, so no link edits needed.
- Op-4 verification: Save-to-GitHub target has the plan gate (True) and database-mongodb has export/Mongo-URL detail (True) — trim safe, no fuller bullet retained.
- All 8 stay in_review; nothing published. Verified via DB (8 live pages, nav = 8 in order).

## 2026-06-11 — MIS metric fix + Data & Trust render check
- MIS reviewer "Resolved" now = comments the reviewer RAISED that are now closed (was: comments they clicked resolve on). Backend `review_routes.py` cresolved keyed by author_email of resolved comments. Column relabeled Raised/Resolved with tooltips; CSV header updated. Verified akash@emergent.sh: 15 raised / 15 resolved.
- Render-checked new/merged Data & Trust pages (controller-responsibilities, where-your-data-is-stored, keep-it-safe, your-data-ownership) in review reader via temporary DISABLE_AUTH bypass (reverted to false after). MDX (Callout/Note/Warning/Step/Tip), inline code, bold, links all render cleanly. All remain in_review.

## 2026-06-11 — SEO / AI-discoverability / Media optimization (Prompt 1, preview-only)
Approved plan (Prompt 1). Nothing published/deployed; docs stay in review. Prompt 2 (go-live) deferred. Audit: /app/memory/seo_media_audit.md.

Implemented & verified (testing agent iter26: 11/11 backend, all UI flows PASS):
- A1 Absolute og:image/twitter:image + JSON-LD image (SITE_ORIGIN prefix); site_description populated. PublicDocs.jsx.
- A2 Per-page raw markdown: /<slug>.md + /api/seo/pages/{slug}.md (text/markdown, published only, 404 unknown). server.py.
- A3 /llms.txt + /llms-full.txt served text/plain at root via frontend/src/setupProxy.js (bridges to /api/seo/*).
- A4 Real 404s: setupProxy returns 404 + helpful not-found HTML (search + popular links) for unknown doc routes; app routes (/admin,/review) and valid slugs pass through.
- A5 Sidebar entries now real <a href="/slug"> (SidebarLink), Cmd/Ctrl/middle-click opens new tab, plain click stays SPA. data-testid preserved.
- A6 HTML caching: NOT ours in preview — edge/Cloudflare forces no-store (backend sends public,max-age). Prepare/apply at deploy. Documented only.
- A7.1 Logo/favicon replaced: 604KB favicon->5.6KB, 25KB logo->3.5KB WebP (192-240px). Uploaded to store, config updated. Fixes A7.12 broken preview assets (only logo/favicon referenced; 0 markdown content images).
- A7.2/3/6 Image transform layer in serve_public_file: ?w/?width, ?format/?fm (webp/jpeg/png), ?q; Accept content-negotiation; Vary: Accept; ETag + 304; unknown params degrade to original; in-memory derivative cache (Pillow).
- A7.4/5/7 DocImage (components/docs/Media.jsx): srcset via transform, decoding=async, lazy, aspect-ratio on load (no CLS), click-to-zoom lightbox (Esc/backdrop close, reduced-motion aware, caption).
- A7.9 Upload compression + 5MB cap (reject >5MB with message; re-encode/strip metadata, cap width 2400).
- A7.10 Editor image insert requires alt text + "decorative" checkbox (ImagePickerModal); Insert disabled until satisfied.
- A7.11 Video: external YouTube+Loom only (per decision). Editor "Add video" dialog (paste URL) inserts <YouTube/Loom id=.../>; reader renders CLICK-TO-LOAD (0 iframes until clicked). Media.jsx + Editor.jsx. Self-hosted video pipeline NOT built.
- 2.2 "Was this helpful?" widget per article (Yes/No + optional comment) -> POST /api/projects/{pid}/feedback; owner report GET /api/projects/{pid}/feedback/summary.
- R1 robots.txt AI policy recorded (edge Content-Signal blocks GPTBot/ClaudeBot); NOT changed this round (allow at go-live).

Out of scope this round (as agreed): MCP docs server (2.1), self-hosted video pipeline, light/dark screenshot variants (A7.8), entire Prompt 2 go-live (prod prerender + verification, 301 redirect map, apply HTML cache header, apply robots allow, Search Console).

Note: setupProxy.js and DISABLE_AUTH bypass are preview-only. Prod serves SEO routes via build prerender + hosting layer (Prompt 2).

## 2026-06-11 — Bulk Alt Audit (publish gate) + credits link fix
- Bulk Alt Audit: publish is now blocked for any page with images missing alt text.
  - Backend gate: publish_doc (review_routes.py) → 400 with "N image(s) ... missing alt text" (after the open-comments check). Helper count_images_missing_alt: flags ![](url) empty-alt markdown and <Figure>/<img> tags with NO alt= attribute; an explicit alt="" is treated as decorative and allowed.
  - Publish tab (ReviewConsole.jsx): rose "N missing alt" badge + Publish/Republish disabled with tooltip; mirrors backend via countMissingAlt. Verified E2E (badge + disabled + 400).
- Fixed stale link text on how-credits-work-basics: "[How credits work](/managing-credit-usage)" → "[Managing credit usage](/managing-credit-usage)". (Note: same stale text still exists on other pages linking to /managing-credit-usage — see finish note.)
