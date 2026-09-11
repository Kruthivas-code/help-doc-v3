# Phase 0 — SEO / AI-discoverability / Media audit (preview: mdx-editor-staging)

Measured against the preview URL + code + preview DB. Live help.emergent.sh NOT touched.

## 0.1 Prod vs main
Cannot safely diff deployed prod code without triggering build/deploy; skipped by design.
Preview runs current main via webpack dev server.

## 0.2 Prerender (read-only, not run)
- `frontend/scripts/prerender.js` EXISTS and IS wired into the production build:
  `"build": "craco build && (node scripts/prerender.js || echo 'prerender skipped')"`.
- NOT run by `start` (craco start = dev server) — so it cannot be observed on preview.
- Routes: reads slugs dynamically from `/api/public/default-project` (documents list) →
  covers all published pages, plus `/` last. Not a hardcoded list.
- Writes ONE file per route: `build/<slug>/index.html` (+ `build/index.html`). Puppeteer
  snapshots fully-rendered HTML incl. per-page meta.
- Non-fatal: skips gracefully if build/index.html or puppeteer missing (would silently
  no-op and fall back to SPA shell).

## 0.3 Endpoint failures (confirmed on preview)
| URL | expected | actual | responsible |
|---|---|---|---|
| /llms.txt | text/plain | **text/html (SPA)** | k8s ingress routes non-/api → React dev server; backend route shadowed |
| /llms-full.txt | text/plain | text/html | same |
| /how-credits-work-basics.md | text/markdown | text/html | no .md route; SPA catch-all |
| /definitely-not-a-page-xyz | 404 | **200** | dev server always serves index.html |
| og:image / twitter:image | absolute https | **relative** `/api/public/files/...` | PublicDocs.jsx uses `config.logo_*_url` verbatim |
| sidebar nav | `<a href>` | **55 `<button>`, 0 `<a>`** | PublicDocs `SidebarLink` renders `<button onClick>` |
Note: backend already serves correct text at `/api/seo/llms.txt`, `/api/seo/llms-full.txt`.

## 0.4 Caching
- HTML: `cache-control: no-store, no-cache, must-revalidate` — set by the **webpack dev
  server** (CRA/craco) in preview; in prod it's the hosting/CDN layer. NOT our app code.
  We do not control it in preview; A6 = prepare only, apply at deploy.
- Assets `/api/public/files/`: `public, max-age=31536000, immutable` — already correct.

## 0.5 Media pipeline
- a) Images stored in Emergent Object Storage (Tigris) via storage_service; served by
  `serve_public_file`. Upload did **no** resize/re-encode/strip/compression.
- b) Transformation available but unused: asset endpoint ignored `?w`/`?format`/`?q`.
  Plan decision: transform in OUR backend (Pillow 12.2 present), not Cloudflare.
- c) **No max upload size** — a 15 MB PNG was stored as-is.
- d) Editor did **not** require alt text.
- e) Video: YouTube/Loom/Video MDX components exist in DocContent but iframe loads on
  render (not click-to-load); no editor "Add video" button in visual/markdown toolbars.
- f) Inventory: logo_light/dark + favicon point at `_legacy/migrated/*.png` (the 604 KB /
  120x120 offenders on prod; on preview they **404** → broken images). Markdown content
  images across all 126 docs: **0**. So the only live offenders are logo + favicon.

## 0.6 robots.txt AI policy (verbatim, DO NOT CHANGE)
Preview `/robots.txt` is served by the **Cloudflare/edge layer**, not our app — it returns
a Content-Signal block: `search=yes, ai-train=no, use=reference` with
`User-agent: GPTBot Disallow: /`, ClaudeBot, Google-Extended, CCBot (+5 more) Disallow: /.
Our own `frontend/public/robots.txt` and backend `_robots_body` already allow AI crawlers,
but the edge overrides them. Change is a go-live (Prompt 2) decision: allow GPTBot +
ClaudeBot. Recorded only; unchanged this round.
