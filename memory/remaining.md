# Docs vs KB — second-pass check (what's still left)

**Date:** 2026-09-10 · **Checked:** `emergent-export-20260910.json` (the corrected export) against the KB, re-running the same in-scope review. Scope unchanged: Wingman (096–099), privacy/GDPR (118–129), and support/account/takedown (093–095) remain out of this pass.

## Headline

**The correction pass worked.** The first pass found ~335 in-scope findings; this pass finds **31 residual issues across 22 docs**. Every systemic error is resolved corpus-wide:

- ✅ **Domains** — no `.emergent.run/.app/.build/.dev`, `emergent.ai`, or `api.emergentagi.com` remain in any in-scope doc (the two survivors are in out-of-scope docs 093/094, correctly untouched).
- ✅ **Emails** — `support@emergent.sh` throughout in-scope docs; no `.ai/.dev/.build` or invented `sales@/billing@/partners@`.
- ✅ **Markers** — 170 visible `[NEEDS-REVIEW: ...]` tags inserted; **no HTML comments anywhere** (they won't be stripped).
- ✅ **Disputed facts** — ownership "cannot be transferred" and redeploys "free of charge" applied consistently, each carrying its `[NEEDS-REVIEW]` flag.
- ✅ **The big rewrites landed** — prompt-windows (005), streaks (045), regional pricing (046, ~20× error fixed), Universal Key (016), mobile Expo/EAS model (029–037), Pull-from-GitHub (084), deployment types (019/026) all verify clean on their core facts.
- ✅ **Out-of-scope untouched, clean docs untouched** — the 24 unchanged docs are exactly the out-of-scope set plus the 5 previously-clean docs.

What remains are **individual residual errors**, not systemic ones. They fall into three buckets. Give this list back to the editor for a targeted second pass — most are one-line fixes.

---

## Bucket 1 — Still factually wrong (fix the text)

These contradict the KB and are stated as fact.

| Doc | Claim | Correct fact (KB) |
|---|---|---|
| **020 database-mongodb** | "Replace tears down the entire production environment and rebuilds it" | Replace is a zero-downtime blue-green swap **across two jobs** (fork job1→job2, traffic switches, old torn down). Docs 019 & 026 already say this correctly — 020 is the outlier. |
| **031 database-data-on-mobile** | "Each app gets a **dedicated** MongoDB cluster"; fork = "cloned cluster" | Default is a **shared** Atlas cluster (dedicated is a paid upgrade); each app gets its own DB on shared infra. |
| **050 how-the-agent-runs** | Auto-HITL "pauses and shows a highlighted question; answer it and the workflow resumes" | In autonomous runs Auto-HITL **auto-answers** (`ask_human` → "assume default and continue"); it does **not** pause for the user. |
| **068 claude** | Haiku 4.5 (and Sonnet 4.6) context = "up to 1M tokens" | Haiku 4.5 is **200K**; standard Sonnet 4.6 is 200K (only a separate "Sonnet 4.6 1M" variant hits 1M). Fable/Opus 5/Sonnet 5 at 1M are correct. |
| **086 missing-functionality** | "the code editor / file tree is a **paid-plan** feature" (twice) | The VS Code editor / code viewing is on **all plans including Free**; only GitHub **push** needs Standard+. |
| **090 app-slow-crashing** | PDB table invents an "**Enterprise**" deployment tier; "use Starter tier or higher" for PDB | Deployment tiers are Starter/Launch/Grow/Scale/Elite (no "Enterprise"); PDB `minAvailable=1` starts at **Launch (Tier 1)**, Free has no PDB. |
| **091 glossary** | "MCP tool **results** cached 5 minutes" | It's the tool **lists** that cache 5 min (`MCP_TOOLS_CACHE_TTL`), not results. |
| **091 glossary** | Custom agents "configured **via MCP servers** in Manage Agents" | Custom agents use a **4-step wizard** (system prompt, tools, sub-agents); MCP servers are a separate thing. ("Pro-only" and the Manage Agents location are correct.) |
| **101 talk-it-through** | Title still reads "Talk it through **(free)**" | The body was corrected (all agent turns bill per-token) but the title still advertises discussion as free — remove "(free)". |
| **115 checkpoints-undo-anything** | "roll forward again"; a "**History panel**" of snapshots | Rollback **erases everything forward**, is preview-only, has no roll-forward and no "Before rollback" snapshot; it lives on the **per-message chat timeline**, not a sidebar History panel. This is the exact error that its sibling doc 113 got fixed — 115 was missed. |

## Bucket 2 — Invented specific stated as fact, needs a `[NEEDS-REVIEW]` flag (or removal)

Not necessarily wrong, but unverifiable from the KB and presented as fact without a marker — the editor should either flag or cut, per the agreed rule.

| Doc | Unflagged invented specific |
|---|---|
| **002 the-chat-to-deployment-flow** | "revert to one of **up to 3** recent deployments via Republish" (see cross-doc note below) |
| **019 deployment-types** | "Rollback — up to **3** previous production images" as a hard cap (see note) |
| **021 deployment-plan-levels** | Scale "2 vCPU / 8 GB" + intermediate credit values stated flat while the doc's own note hedges the middle tiers as "not published" (be consistent — flag or drop the unhedged ones) |
| **016 the-universal-llm-key** | auto-recharge "**default trigger of 5 credits**" — 5 is the configurable *minimum*, not a default threshold |
| **035 push-notifications** | "Users who tap a notification convert at **3–5×** the rate…" — invented statistic |
| **044 referrals-partners** | cap "20 referrals / $200 **per billing period**" — KB cap is a **total/lifetime** cap, not per-period; also referee "must not have held a paid plan" (invented) and referee reward timed to "upgrade" (KB: on signup) |
| **050 how-the-agent-runs** | E-3 "runs **E-1 as a sub-agent** internally"; media "**5–20 credits per asset**" — neither in KB (note: the adjacent web-search cost figure *is* flagged, so these were just missed) |
| **056 paystack** | "Emergent **validates** the `x-paystack-signature` **automatically**" — KB: the agent scaffolds verification in your code; contradicts the doc's own "always verify" line |
| **058 paddle** | offers a **PHP** SDK option — supported backends are Python/FastAPI and Next.js only (Razorpay doc handles this right by flagging non-supported stacks) |
| **081 airtable** | invented connect UI: "click **Connect** → Emergent tests the token → green 'Connected' checkmark" — KB shows tiles with an **Add** button, no live validation/connected state |
| **108 connect-your-tools** | lists **Sentry** as an available integration — not in the KB catalog (Google Analytics, in the same group, is) |
| **112 write-prompts-that-work** | "Plan mode unavailable in **Brainstorm, E3, and E4**" — KB only says Plan Mode is feature-flagged/rolling out; that specific exclusion list isn't stated |
| **092 faqs** | "if **under 50 credits at renewal** your balance can go negative and the app may be taken down" — no such threshold; real rule is a deployment charge taking an already-≤0 balance negative |

## Bucket 3 — "localhost / local dev" leftovers

Emergent has no local dev environment (it's a cloud preview at `{slug}.preview.emergentagent.com`). These docs still reference localhost/local servers:

- **056 paystack** — "webhooks can't reach local development servers unless you tunnel"
- **057 paypal** — prerequisite "your app deployed or running **locally** in Emergent"
- **061 google-auth** — lists `http://localhost:3000/api/auth/callback/google` "(for local testing)" as an Emergent dev redirect URI

*(These are borderline — a user doing genuine off-platform local dev could hit localhost — but as written they describe the Emergent dev/preview target, which is wrong. Reword to the cloud preview URL or flag.)*

---

## One cross-doc call to make: the "up to 3 rollback" claim

The "**up to 3** previous deployments/images" figure appears in **002, 019, 091, and 092**. The reviewers split on it: one found a specific KB passage (deployment/deploying-your-app.md) saying rollback is **not** capped at 3 — "3" is just how many versions show before a "View more" link expands the full list — while another treated "up to 3 images" as fine. **Someone with product knowledge should settle this once**, then apply the answer to all four docs (either correct the cap, or flag it). Right now the docs assert it as a hard limit, which at least one KB source contradicts.

---

## Bottom line

The export went from **not publishable** (~335 in-scope findings, multiple fully-fabricated docs) to **nearly clean** (31 residual issues, no systemic errors, no fabricated docs). Nothing here blocks the whole set — these are targeted, mostly one-line fixes plus the ~170 human-review flags already in place. Recommended next step: hand this list to the editor for a short second pass, then route the `[NEEDS-REVIEW]` flags (including the "up to 3 rollback" question) to a PM/support reviewer.

*Method: the 106 corrected in-scope docs were re-checked against the KB by nine independent review passes, each asked to confirm prior corrections landed and to catch new or residual errors. `[NEEDS-REVIEW: ...]` markers were treated as legitimate (not errors); the two agreed rulings (ownership non-transferable; redeploys free) were treated as correct where applied.*
