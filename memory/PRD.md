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
- Configurable navigation structure (Mintlify-style)
- Device preview toggle (desktop/tablet/mobile)
- GitHub OAuth integration for import/export
- Manual version control with named snapshots

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

**Previously Completed work**