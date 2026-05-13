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
- **AI**: Emergent LLM Key (GPT-4o)
- **Storage**: Supabase for media assets

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

## Future/Backlog
- Full GitHub "Docs-as-Code" integration
- Interactive code blocks with sandbox
- Drag-and-drop navigation reordering (for existing pages)
- Landing page CTA cards
- "Page not found" UI placeholder for missing documents
- Fix `babel-loader` crash to restore hot-reloading dev server

**Completed work in this session (January 22, 2025)**
- **Mobile Nav Icon in Header**: Moved the mobile navigation hamburger menu from a floating button at the bottom-right to the top header, positioned to the right of the CTA buttons. This follows standard mobile UX patterns.

**Previously Completed work**