# Restructure the Rest of the Docs — Credit Estimate & Plan

## The question you asked first
How many credits would it take to rework the remaining existing docs into the new
"Learn the Basics" beginner style, based on what this last batch used — so the budget
isn't exhausted again.

---

## What this last session actually used
- It produced **7 article passes**: 6 new Rail 2 articles + 1 full regeneration of "Keep it safe".
- Combined output was ~28,600 characters. Estimated token usage across all 7 calls:
  roughly **~24K input tokens + ~7K output tokens** (plus a few trivial test pings, negligible).
- At current Claude Sonnet pricing (~$3 per million input tokens, ~$15 per million output),
  that is roughly **$0.15–$0.25 of raw model usage for the whole session** — about
  **$0.02–$0.04 per article**.

## Estimate for the full restructure
- The "rest of the docs" is approximately **~103 pages** across 6 tabs
  (Build, Mobile Apps, Integrations, Troubleshooting, Data/Trust/Support, Wingman).
- Restructuring each page feeds its **current content back in as the source** (so no facts are
  invented) plus the style instructions, which makes the input a little larger than a
  from-scratch article. Estimate **~5K input + ~2K output tokens per page ≈ $0.045/page**.
- **Full run ≈ $5–$10 of raw model usage** (~$0.05–$0.10 per page × ~103 pages).

## Why the "726" number was so alarming — and why this is much smaller
- 726 was the **cumulative lifetime spend** on the *inherited* key across everything it ever
  did: the original 107-doc bulk generation, the in-app AI writing assistant, and repeated
  testing — not the cost of the recent articles.
- Pure article/doc generation is a small slice of that. The $5–$10 estimate above is a small
  fraction of 726, so a full restructure should not, on its own, come close to exhausting a
  topped-up budget.

## Honest caveat on precision
- The exact credit delta on the Green Leaf key this session was **not captured as a number**
  (only that calls succeed). The figures above are **token-based estimates** using public
  Claude pricing. The Universal Key may bill with a markup, so the real credit draw could be
  **somewhat higher** than the raw-dollar figures.

## Recommended safeguard: a measured pilot
Before committing to all ~103 pages:
1. Note the current key balance.
2. Restructure a **pilot batch of 5 pages**.
3. Read the exact balance change from the Universal Key dashboard.
4. Multiply by ~20 for the full set.

This converts the estimate into a firm number and gives a hard budget guardrail. It costs only
about $0.25–$0.50 (est.) to probe.

---

## What the restructure work itself would do
- Rewrite each existing page into the same friendly Learn-the-Basics shape (outcome intro →
  scannable sections → callouts/steps → "Next up" link) **while preserving every existing fact
  and all reference depth**.
- **Same anti-hallucination rule as Learn the Basics:** only facts already present in each
  page's current content are used; anything unverifiable becomes a clearly-marked
  `Draft - needs review` placeholder. Nothing new is invented.
- **Slugs, URLs, and navigation stay unchanged** — only the content/structure of each page changes.
- **Reversible:** each original is backed up before it is overwritten, so any page can be restored.
- Run **tab by tab**, so each batch can be reviewed before the next begins.

## Assumptions (change these if wrong)
- Scope = all ~103 existing pages outside "Learn the Basics" (not a subset).
- The goal is a structural/tonal rewrite that keeps full reference depth — not a light
  reformat, and not a second "beginner-only" copy of each page.
- Existing pages are updated in place; links and nav are left alone.

## Out of scope
- Filling the `Draft - needs review` placeholders with real screenshots / verified product details.
- Re-enabling Google admin auth (tracked separately).

---

## Decision point
- **Option A** — Approve the pilot first: restructure 5 pages, report the exact measured credit
  cost, then decide on the full run. (Recommended.)
- **Option B** — Approve the full ~103-page run now at the estimated **$5–$10 (raw model) /
  possibly a bit more in credit units**.
