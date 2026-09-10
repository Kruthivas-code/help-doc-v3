# Plan — Read-only MIS (management dashboard) tab in the Review Console

A new **MIS** tab at `/admin/review`, read-only, one page, fast. **Visible to anyone signed in with an
`@emergent.sh` account** — everyone can see every reviewer's progress (not limited to their own
row). Built entirely from data already stored (the activity/event log + current assignment and page
state). No existing review, assignment, publish, or comment behavior changes except the two
deliberate ones below (Mark-done reinstated, and the NEEDS-REVIEW→comment conversion).

Decisions from the refinement rounds are locked and folded in; listed here so the user can confirm
the final shape before building.

---

## Locked decisions

1. **"Mark done" is reinstated.** The earlier change was only meant to *auto-switch* the button's
   state, not remove it. So: the manual **Mark done** button is back on each assignment, **and** the
   auto-switch condition stays — a page flips to Done automatically when it has a **looks_correct**
   verdict and no open comments. `done_at` is recorded whether Done was set manually or by
   auto-switch. Done and verdict stay independent, so "done without a verdict" remains a real state.

2. **All 7 verdicts are kept** — Looks correct · Needs small edits · Wrong info · More info needed ·
   Outdated · Tone / clarity · Other. No collapsing; the MIS reports them as **7 distinct** values.
   Only normalization: legacy `looks_good` → **Looks correct**. History kept; **latest** verdict per
   page is "current".

3. **NEEDS-REVIEW → comments: run the one-time mass conversion.** ~182 `[NEEDS-REVIEW: …]` markers
   across ~77 pages each become a **Docs-bot** page comment (verbatim text, anchored at the marker);
   the marker is removed from the page body (one edit per page, logged as an edit by "Docs bot").
   Idempotent (dedup by page id + marker-text hash), and re-run automatically on any future save that
   introduces a new marker. **Effect, by design:** those ~77 pages become publish-blocked until the
   Docs-bot comments are resolved. No separate debt tracker needed (see removed section F).

4. **MIS is open to all `@emergent.sh` users.** No per-role gating; every section (and CSV export) is
   visible to any signed-in Emergent user.

5. **Due dates fixed to Monday 14 September 2026** for every assignment (`due_date = 2026-09-14`).
   Overdue = today past that date (calendar days). Owners can still edit a due date later.

6. **No projection line, no orphan-removal tool.** Instead, **deleting a page cascades**: its
   assignment(s) are deleted with it and all counts follow automatically.

7. **MIS is NOT real-time.** It loads a snapshot when the tab is opened and offers a **Refresh**
   button to re-pull on demand; the **"data as of"** timestamp shows the last fetch. No websockets,
   no background polling (avoids the cost of live updates). Reopening the tab or hitting Refresh is
   how numbers update.

---

## Also included (small changes outside the MIS)

- **Review Inbox — clickable comments.** In the Review Inbox tab, each comment becomes a link that
  opens its page (`/review/<slug>`); if the comment pinned a text selection, it also scrolls to and
  highlights that text — so a comment can be jumped to and resolved quickly. (Same jump-to-anchor
  behavior already used on the review page.)

---

## What the MIS tab contains

Global controls: **date-range filter**, **person filter**, **Refresh** button, a **"data as of"
timestamp**, and an **include seed/test actors** toggle (off by default). Every number is
**clickable** to a drill-down list of the underlying pages/assignments with timestamps.

- **A. Reviewer table** — one row per reviewer, sortable: assigned (current) · done · % done ·
  verdicts split across **all 7** values · **done without verdict** · comments made · comments
  resolved · median hours assignment→first action · median hours assignment→done · overdue count
  (past 14 Sep 2026) · aging of open assignments (0–2d / 3–7d / >7d) · last activity. **CSV export.**
- **B. Pipeline funnel** — counts of **pages** (assignment count beside): unassigned → assigned/in
  review → done → verdict (the 7 values) → published. Plus a **per-TAB and per-SECTION** rollup.
- **C. Throughput** — reviews marked done per day (bars) + cumulative line. **No projection line.**
- **D. Comments health** — open vs resolved comment counts per page and per reviewer; pages with
  **>N** open comments highlighted (*assumption: N = 3*). Docs-bot NEEDS-REVIEW comments appear here.
- **E. Exceptions** (clickable, **CSV export**): pages **done without a verdict** · **wrong_info**
  verdict still unedited since that verdict · **reassigned/delegated more than once** · **duplicate
  page titles** assigned in more than one tab · **no activity 7+ days** after assignment · pages with
  a **looks_correct** verdict that still carry an open Docs-bot NEEDS-REVIEW comment. *(Orphaned-
  assignments row removed — cascade-delete prevents orphans.)*
- **~~F. NEEDS-REVIEW debt~~ — removed.** Those markers are now ordinary comments, tracked in D.

---

## Assumptions (built as stated unless challenged)

- **Time math:** medians use calendar hours; "first action" = the reviewer's first
  comment/verdict/edit on that page **after** its assigned_at.
- **Actor identity:** metrics key off the actor's email in the event log; a display name is mapped to
  the known email; `dev@local`, `QA Owner`, and any non-`@emergent.sh` actor are labeled **seed/test**
  and excluded by default (toggle to include).
- **Comment-highlight threshold** N = 3 open comments.
- **Cascade delete** applies to page soft-delete/trash and permanent delete alike; restoring a page
  from trash does not resurrect its old assignments.

## Explicitly out of scope
No changes to publishing rules, the public site, or the frozen-copy model. No comment/assignment
mechanics change beyond reinstating Mark done, the inbox clickable-comment link, the cascade delete,
and the NEEDS-REVIEW→comment conversion. No decorative charts beyond A–C. Nothing is published as
part of this work.
