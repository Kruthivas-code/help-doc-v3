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