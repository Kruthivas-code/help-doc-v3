# Fact-check of the two review documents + proposed fixes

## 1. Are the documents true? Short answer: mostly yes, with two important corrections.

The reviewer clearly measured the real production site and the findings are largely
accurate. But some of the *diagnoses* are framed in a way that would send us fixing the
wrong thing. Here is the item-by-item verdict against what the code actually does today.

### Claims that are TRUE
- **Production doc pages serve an empty shell** ("You need to enable JavaScript…") with no
  article text in the raw HTML. Correct — the site is a client-rendered SPA, so a crawler
  that doesn't run JavaScript sees nothing.
- **AI crawlers (GPTBot, ClaudeBot, PerplexityBot) can't see the content.** Correct, and it
  follows directly from the point above. This is the single most valuable thing to fix.
- **`og:image` / `twitter:image` is a relative path.** Correct. The code emits whatever is
  stored as the logo/favicon, and that value is a relative `/api/public/files/…` path. It
  is never converted to an absolute URL, so link previews break on Slack/Twitter/LinkedIn.
- **No per-page `.md` endpoint.** Correct — it does not exist. AI tools that prefer markdown
  get nothing.
- **`/llms.txt` returns the HTML shell in production.** Effectively correct. A proper
  `llms.txt` generator *does* exist on the backend, but the public `/llms.txt` address is
  being routed to the SPA instead of to that generator, so visitors get HTML.
- **Unknown URLs return HTTP 200 instead of 404 (soft 404).** Correct — an SPA answers every
  path with the same shell.
- **`robots.txt` and `sitemap.xml` exist and are basically right.** Correct — and slightly
  better than the reviewer credited: robots.txt already names and welcomes the AI crawlers.
- **Speed / TTFB / no edge caching / Cloudflare passthrough.** Cannot be verified from the
  code (it's a hosting/CDN setting), but the description is consistent and plausible.

### Claims that need CORRECTION (the reviewer got the symptom right but the cause wrong)
- **"Canonical is hardcoded to the homepage on every page."** This is the one to be careful
  about. The application code sets a correct, per-page canonical (each page points to its own
  URL). It is **not** hardcoded to the homepage anywhere. What the reviewer saw in raw HTML is
  a *side effect*: in production, every route is being served the homepage's snapshot, so it
  inherits the homepage's title and canonical. So the fix is **not** a one-line canonical edit
  (that code is already correct) — it's making each route actually serve its own snapshot.
- **"The prerender step isn't running."** A build-time prerender step exists and is wired into
  the production build. The real question is whether its per-page output is actually *served*
  in production, or whether the hosting is rewriting every route back to the homepage file.
  That distinction changes where the fix has to happen (see the crux below).

### Net verdict
The documents are trustworthy as a description of what's wrong on the live site. The
"stay in-house, the fixes are bounded" conclusion is reasonable. The only load-bearing
correction: the headline "canonical bug" is really a "prerendered pages aren't being served
per-route in production" problem, and that has a partly-infrastructure cause.

## 2. Rationale behind the original design decisions (what you asked about)
- **SPA + build-time snapshot instead of true server-side rendering.** The site was built as
  a standard single-page app and SEO was bolted on by snapshotting each page with a headless
  browser after the build. Rationale: keep the architecture simple and the hosting cheap,
  avoid moving to a server-rendered framework. Trade-off: it only works if the host serves the
  per-page snapshot files — which is exactly the fragile point that broke in production.
- **Per-page SEO owned entirely in the app (titles, canonical, structured data).** Deliberate,
  and correctly implemented — canonical, Open Graph, Twitter, and JSON-LD are all generated
  per page. The gap is purely that this only becomes visible once JavaScript runs.
- **A small script in the page shell that hand-serves `robots.txt`/`sitemap.xml`.** A workaround
  so those two files don't return the SPA shell. It was never extended to `llms.txt`, which is
  why that one leaks HTML.
- **`og:image` taken straight from the configured logo.** A convenience default. Reasonable as
  a starting point, but it inherited the relative-path bug because it was never made absolute.
- **No `.md` endpoints / no MCP server.** Not a decision — simply not built yet.

## 3. What I propose to do (for your approval)

### Group A — code fixes I can make and prove in the preview now
1. Make `og:image` / `twitter:image` / structured-data image absolute URLs.
2. Add a per-page `.md` endpoint that returns the raw article markdown.
3. Make `/llms.txt` (and `/llms-full.txt`) reliably return real text, not the SPA shell.
4. Serve a proper "not found" experience for unknown pages instead of a silent 200.
5. Verify locally that the build snapshots each page with its own title, description,
   canonical and article text — proving the mechanism itself is sound.

### Group B — the crux, which can only be *confirmed* on the live site
6. Whether production actually serves each page's snapshot (or rewrites every route to the
   homepage, which is what's producing the "empty HTML + homepage canonical" symptom) is a
   hosting/routing question. I can prepare the code and the check, but confirming and, if
   needed, correcting the production routing/CDN caching requires a deploy and a look at the
   live environment — it cannot be proven in the preview.

### Group C — optional additions the reviewer recommends (only if you want them)
7. An MCP server for the docs (lets developers plug your docs into Claude/Cursor/ChatGPT).
8. A "Was this page helpful?" prompt at the bottom of each page.

## 4. Decisions I need from you
- **a.** Confirm the direction: fix in-house (the reviewer's own recommendation), not move to
  Mintlify. If you're leaning Mintlify instead, say so and I'll stop here.
- **b.** Scope for now: do Group A only, or Group A + the Group C extras (MCP, feedback prompt)?
- **c.** The crux (item 6) needs a production deploy to verify and possibly a hosting/CDN
  change. Are you okay with me preparing the code now and confirming it against the live site
  via a deploy afterwards? (This is the only way to prove the highest-impact fix actually
  landed.)

## 5. Assumptions (chosen unless you object)
- The stored logo/favicon paths are relative (matches what the reviewer observed); the
  absolute-URL base comes from the existing site-URL configuration.
- "Fix in-house" is the intended direction, since both documents conclude that.
- The MCP server and feedback prompt are treated as optional and left out unless you pick them.
