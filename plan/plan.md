# Docs SEO, Discoverability & Media Optimization — Plan (Preview round)

## What this is

The uploaded guide ("agent-prompts.md") is a two-part program based on an external audit of
the docs site:

- **Prompt 1** — SEO, AI-discoverability and media fixes done entirely in the **preview**
  environment. Nothing is built for production, deployed, or published. The docs stay in
  review and do not become publicly searchable.
- **Prompt 2** — the go-live sequence (production build, redirect map, robots policy,
  live verification). The guide says to **hold this until the docs review is finished**.

**This plan covers Prompt 1 only.** Prompt 2 is deferred by design and is summarized at the
end so you know what is coming and what decisions it will need.

## Objective

Make the documentation properly discoverable by search engines and AI tools, and make it
fast, by fixing the concrete gaps the audit found — while guaranteeing the live site
(help.emergent.sh) is not touched and the in-review docs do not go public.

## Already handled (will be re-confirmed, not rebuilt)

The audit notes these are already correct in the current build and need only a read-only
re-check, not work: per-page canonical tags, TechArticle + BreadcrumbList structured data,
and per-page meta descriptions. Asset caching (the year-long cache on files) is also already
correct and will be left alone.

Page counts in the guide (e.g. "122 pages") come from a 9 Sep measurement and may be stale;
everything will be driven off the current content store, not a hardcoded number.

---

## Part 1 — Audit first (read-only, no changes)

A findings report is produced before any change, covering: the prerender wiring (inspected,
not run), the endpoints that currently misbehave (`/llms.txt`, `/llms-full.txt`, `.md`
pages, unknown-URL handling), where the "no-cache" HTML header comes from and whether it is
ours to change, the robots.txt AI-crawler policy (recorded), and a full media inventory —
every image across all pages with its real size vs displayed size, ranked by wasted bytes.
The known headline is a 604 KB logo shown at 96×40 on every page.

## Part 2 — Fixes (preview, each proven against a real preview URL)

1. **Absolute image URLs** in link-preview tags (og:image, twitter:image) and structured
   data, so links pasted into Slack / LinkedIn / X render a preview. Populate the empty
   site description or confirm the per-page one always wins.
2. **Per-page raw Markdown endpoints** (`/<slug>.md`) returning the article body as
   markdown — useful to AI tools and developers.
3. **`/llms.txt` and `/llms-full.txt`** served correctly as plain text (an index of all
   pages, and the full concatenated text) instead of the app shell.
4. **Real 404s** for unknown URLs, with a helpful not-found page (search + popular links).
5. **Sidebar becomes real links** — the navigation currently renders as buttons, so search
   engines can't follow it and users can't Cmd-click / copy-link / open-in-new-tab. Every
   entry becomes a genuine `<a href>` while keeping the instant in-app navigation.
6. **Prepare** the HTML caching change so pages can be CDN-cached with revalidation — but
   **not apply it** (applied at go-live). If that header turns out to be controlled by the
   hosting/CDN layer rather than our app, the plan will say so and what would be needed;
   this may not be fully resolvable until deploy.
7. **Media optimization:**
   - Replace the oversized logo (and a second oversized icon) with small, correctly-sized
     WebP assets — cuts roughly a third of the weight off every page.
   - Add an **image transformation layer** so the store can serve resized/re-encoded
     variants on request (e.g. width + WebP), with results cached; unknown parameters fall
     back to the original instead of erroring.
   - Serve modern formats by content negotiation with the correct `Vary: Accept` header so
     the CDN never serves an unsupported format to a client that can't display it.
   - Emit responsive images (srcset) so phones download smaller files than retina desktops.
   - Add width/height (or aspect-ratio) to every image to stop layout shift, plus lazy
     loading below the fold.
   - Add ETag to asset responses for cheaper revalidation.
   - **Click-to-zoom (lightbox)** on content images (keyboard-dismissable, respects
     reduced-motion), with an optional caption.
   - **Compress on upload** — re-encode and strip metadata server-side, enforce a maximum
     upload size, reject/warn on anything absurd.
   - **Require alt text** in the editor for content images, with an explicit "decorative"
     checkbox for intentionally-empty alt.
   - Fix the preview-only broken legacy images so preview reflects reality.

## Part 3 — Additions this round

- **"Was this helpful?"** control on each article, with optional free text, stored so pages
  that score badly can be reported on.
- **Friendly "Add video" in the editor + click-to-load in the reader.**
  Today: YouTube embedding already exists in some editor components but is not exposed in
  the visual editor actually in use, there is no Loom support, no video button in the
  Markdown editor, and embedded videos load their iframe on page load (a hidden video still
  costs bandwidth). This round: add a clear **"Add video"** toolbar button offering
  **YouTube and Loom** via a paste-the-URL dialog, store it as a standard embed, and render
  it in the reader as **click-to-load** — a lightweight thumbnail/placeholder that only
  loads the player when the reader clicks. So an unwatched video costs almost nothing.

---

## Decisions — now settled

1. **MCP docs server → separate later round.** Not built this round; the SEO/media work is
   not held up by it.
2. **Video → external embeds now (YouTube + Loom), click-to-load, with friendly editor
   buttons.** Self-hosted video pipeline (uploads, poster frames, MP4/WebM, size caps) is
   **not** in this round.
3. **Light/dark screenshot variants → skipped** this round.
4. **Upload limits → default:** silently compress images up to ~5 MB; reject anything
   larger with a clear message.
5. **AI-crawler policy → allow GPTBot and ClaudeBot.** Recorded now; the robots.txt file is
   **not changed in this preview round** (nothing goes public yet) — the change is applied
   as part of the go-live sequence so training/citation crawlers can reach the docs once
   they are live.

## Assumptions (push back if wrong)

- **Preview only this round.** No production build, deploy, publish, or redirect work now;
  docs stay private and in review.
- **Image transformation runs in our own backend** (resize/re-encode with cached
  derivatives), not via the platform-managed Cloudflare account, which isn't ours to
  reconfigure. If you have Cloudflare Images access you'd rather use, say so.
- **Counts and page lists come from the live content store**, not the guide's stale numbers.

---

## Explicitly out of scope this round

- **MCP docs server** (its own round).
- **Self-hosted video pipeline** (uploads, poster frames, transcoding, size caps).
- **Light/dark screenshot variants.**
- **The entire Prompt 2 go-live sequence:** production build with per-page prerendered HTML
  and its verification; the 301 redirect map from old/legacy URLs to new slugs; applying
  the prepared HTML caching change; applying the agreed robots.txt policy (allow GPTBot /
  ClaudeBot); and live verification + Search Console submission. Planned as a separate
  go-live round once the docs review is approved.

## What "done" looks like for this round

Every fix is proven against a real preview URL (status, headers, body) — not by reading
code. Media items show before/after page weight, the transformation endpoint returning a
resized WebP with `Vary: Accept`, and the worst-offender image list each resolved or
explicitly deferred. Video embeds are click-to-load (no player loaded until clicked). The
live site is provably untouched and the docs remain non-public.
