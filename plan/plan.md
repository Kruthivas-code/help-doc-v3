# Plan — Correct the docs from the fact-check report

## Objective
Apply the corrections in `docs-vs-kb-differences-20260909.md` to our documentation. The report is
treated as the single source of truth: no outside knowledge of Emergent is used for any fact it
covers. Every edit is saved as **draft / in-review only — nothing is published or pushed live**, so a
human approves before anything goes public.

## Scope
**In scope:** the 111 documents the report covers (roughly docs 000–092 and 100–117), matched to our
project **by slug**.

**Explicitly NOT touched** (the report says these are reviewed on a separate track):
- Wingman docs (096–099)
- Privacy / data-protection / GDPR docs (118–129)
- Support / account-security / takedown docs (093–095)

Note: we recently edited the Wingman pages and the Data & Trust / privacy pages in earlier work. This
pass leaves all of those exactly as they are.

The 5 "clean" docs (`previewing-iterating`, `make-it-yours`, `try-it-before-you-share-it`,
`get-found-on-google`, `get-your-first-users`) get **only** the global systemic fixes, nothing else.

## How each finding is handled
- **CONFLICT** → replace the wrong fact with the corrected value from the report / Appendix A.
- **SLIGHTLY-OFF** → adjust the wording or add the missing caveat named in the finding.
- **UNVERIFIED** → **leave the wording exactly as-is** and insert a visible plain-text marker
  `[NEEDS-REVIEW: unverified — PM/support to confirm]` immediately before the claim (never an HTML
  comment). Exception: an invented domain or email inside an unverified claim is still corrected to the
  canonical value.

## Global (systemic) fixes applied everywhere, even where not itemised
- Domains → `<appname>.emergent.host` (prod), `{slug}.preview.emergentagent.com` (preview),
  `app.emergent.sh` (platform). Remove all `.emergent.run/.app/.build/.dev`, `emergent.ai`,
  `api.emergentagi.com`.
- All support email → **support@emergent.sh**; partners → **partners.emergent.sh**.
- Plan names → **Free / Standard / Pro / Enterprise** (remove Indie/Startup/Starter/Developer/Team as
  *plan* names).
- Deployment tiers → **Starter / Launch / Grow / Scale / Elite** (50–1,100 credits/month, fixed).
- "Deploy" button/label → **Publish / Republish**.
- Other cross-doc rules from Part 1 (env-var model, credit economics, rollback model, GitHub push-only,
  managed Expo/EAS, E1/E2/E3 as agents + Maxx = Pro-only) applied wherever they appear.

## Docs rewritten (not patched), rebuilt from Appendix A + their findings
005, 006, 010, 013, 016, 019, 021, 022, 028, 033, 037, 039, 042, 045, 046, 084, 091 — their core
premise is wrong, so the body is rewritten (title/slug and doc structure kept; status stays in-review).

## Two disputed facts — fixed wording + permanent flag
- **Redeploy / republish cost:** stated as **free of charge** (beyond the monthly tier fee), followed by
  `[NEEDS-REVIEW: redeploy billing — KB sources disagree]`.
- **Project ownership:** stated as **cannot be transferred** (stays with the creating account), followed
  by `[NEEDS-REVIEW: ownership transfer — KB sources disagree]`.

## Compliance / privacy wording inside in-scope docs
Any certification, compliance, GDPR, data-protection, or AI-training sentence found inside an in-scope
doc is **left unchanged** and flagged with
`[NEEDS-REVIEW: compliance/privacy wording — separate review track]`.

## Other hard rules carried from the report
- No invented specifics — no date, SLA, retention period, price, or limit that the report/Appendix A
  does not state.
- Object storage: any promise of file deletion is corrected to "deletion of uploaded assets is not
  currently supported (uploads are permanent)".
- Clean docs (Part 3) untouched except for a systemic domain/email fix if one appears.

## Working order and progress updates
Worked section by section in the report's order (getting-started & core → secrets/deploy/infra →
mobile → billing/rewards → agents/MCP/GitHub → integrations → troubleshooting/FAQ → beginner journey)
as **one continuous pass** — no interim batch summaries (every page is reviewed by a PM anyway). At the
very end, a single consolidated checklist of all `[NEEDS-REVIEW]` flags (doc + claim) is produced, since
it is cheap to generate and gives the PM one clear worklist.

## Verification
Because this is documentation content (not code) and nothing is published, verification is: confirm each
edited doc is still `in_review`/draft, the review markers render as visible body text, and a spot check
in the editor/review console that pages render. No deploy, no publish.

## Assumptions (will proceed on these unless told otherwise)
1. Documents are matched by **slug**; any report slug with no matching doc in our project is skipped and
   listed in the final flag checklist rather than created.
2. Runs as **one continuous pass** across all in-scope sections with no interim summaries; a final
   consolidated `[NEEDS-REVIEW]` checklist is produced at the end.
3. Rewritten docs keep their existing title, slug, and MDX structure conventions; only the body facts
   are rebuilt from Appendix A.
4. All in-scope docs are already unpublished/in-review, so no status change is needed beyond leaving
   them in-review.
