# "Learn the Basics" — plain-language rewrite & content additions

Goal: make the first tab ("Learn the Basics", 18 pages) fully understandable to non-technical
readers, and fold a few missing beginner topics into existing pages — **no new pages, no new
standalone sections**. Everything stays grounded in what the product actually does (no invented
features).

---

## Part A — Plain-language cleanup (approved)

Reword technical terms wherever they appear:

| Term today | Rewrite as |
|---|---|
| UX / UI | "how your app looks and feels" |
| deploy / publish / "put live" | "making it live" |
| environment variable / secret | "a private key for your service" |
| iterate | left as-is |

Define-then-reuse rule (first time the term appears **on a page**, use the plain phrase with the
term in brackets; after that the short term is fine):
- **API** → first mention: "a connection to another service (API)"; later: "API".
- **schema / database** → first mention: "where your app stores its information (database)"; later: "database".

Wording only — page meaning and structure stay the same.

---

## Part B — Content folded into existing pages (no new pages/sections)

### B1 + B3 — Starting from a rough idea (use plan mode, not an outside AI)
One combined theme. Teaches: you don't need a perfect request to begin. Start from a rough idea and
use the product's **plan mode** to turn it into a clear plan before building — plan mode has the full
context of your app, so it shapes a better plan than writing the request in one shot.
- **Do NOT suggest using an outside AI to write the prompt.** Point readers to plan mode instead.
- Explains the flow plainly: describe your rough idea → plan mode asks questions and proposes a plan
  → you approve → it builds.
- **Placement: split across both** — a short line in **"Talk it through (free)"** pointing to plan
  mode for shaping an idea, and the fuller paragraph in **"Write prompts that work"**.

### B2 — Copy-paste prompt starters
A few ready-made example prompts a beginner can copy and adapt (e.g. common app types). **Folded
into the existing "Write prompts that work" page** as examples — no new page, no separate section.

### B5 — "A recap of what was built for you" (PENDING — user reviewing)
Intent: a couple of plain sentences orienting the reader to the summary the assistant prints after a
build round ("here's what I made / changed; open your app to try it"). Not a feature, just
orientation. **Open question:** include it or drop it, and if included, place in "Watch your app
come alive" (default) or "Try it before you share it". Awaiting user decision.

### B6 — Costs at a glance (approved)
Short plain-words cost intro folded into the existing **"How credits work"** page.

---

## Not included
- **B4 — "What you can and can't ask for (yet)"**: excluded — boundary not clear enough yet.

---

## Grounding / guardrails
- Use only facts already in the reviewed docs; no invented features or claims.
- Keep additions short and woven into existing pages (no new headings that read as new sections).

## To confirm before building
1. B5 — include it? If yes, which page (default "Watch your app come alive")?
2. Everything else (A, B1+B3 split, B2 in "Write prompts that work", B6 in "How credits work") — good?

## Noted separately (not part of this rewrite)
- The nav sidebar shows "Deployments 0" with no visible pages — its pages sit in nested subgroups
  (Common / Web flow) that the sidebar isn't rendering. Separate bug fix, handled outside this plan.
