# Plan (v4): Emails, comment threads + mentions, activity/page history, safe deletes, permissions

Final scope. Independent pieces.

---

## Part 1 — Notification emails
Emergent managed email (no keys/domain setup). Sender name **"Emergent Docs"**; reply-to =
whoever triggered the email.

Triggers:
- **New assignment → reviewer** (only assignments created from ship-date onward; the
  backlog already on the preview is not emailed retroactively).
- **Delegation → new assignee.**
- **New comment →** page's assigned reviewer(s) + owners (not the author).
- **Reply →** thread participants + mentioned people (not the replier).
- **@mention →** the tagged person.
- **Comment resolved →** the author (skipped if they resolved their own).

One summary email per action; transactional; always on.

---

## Part 2 — Comment threads + @mentions
- **Threaded replies** under each comment.
- **@mention with autocomplete (option A, confirmed):** type `@` and pick from people the
  app knows (owners, reviewers, prior commenters); mentioned people are highlighted and
  notified even if not assigned. (A company-wide address book would need a separate Google
  Workspace integration — out of scope unless requested.)
- **Resolving is open to anyone** (no longer owner-only); the author still gets the email.

---

## Part 3 — Activity log + per-page history
A shared audit trail, viewable two ways:
- **By person / global feed** (owner-visible Activity log): who did what, when — assigned,
  delegated, edited, commented, resolved, published, deleted, restored — newest first,
  filterable by person.
- **By page (page history):** open any page and see its timeline — who it was assigned to,
  who edited it, who commented, verdicts given, when it was published, and any
  delete/restore. Answers "who reviewed or edited this page."

Also an inline "assigned by <name>" label on assignment rows.

---

## Part 4 — Safe deletes: confirmation + 90-day restore + delete tracker
- **Confirmation prompt** (names the item) before: delete page, delete image/asset,
  restore an old version (overwrites current), delete a saved version.
- **Soft-delete + 90-day restore for pages:** deleted pages go to **Trash**, kept 90 days
  (then purged), restorable (content + navigation spot).
- **Delete tracker:** every deletion logs what / who / when (feeds the page history above).
- **Restore is unrestricted** (anyone can restore, matching Part 5).
- Assumption (flag if wrong): 90-day trash/restore covers **pages** only; images/assets and
  saved versions get the confirmation prompt but not the trash.

---

## Part 5 — Permission model: only publishing is owner-gated
Simplify to one rule. **Owner-only: publish / unpublish / republish.** Everything else is
**unrestricted** for any signed-in `@emergent.sh` user.

- A **published** page can be *edited* by anyone in the admin, but the edit **cannot go
  live** (republish) without an owner — so live content is never changed without owner
  sign-off.
- This **reverses the recent lockdown**: the owner-only gates added to *create page*,
  *delete page*, and *edit navigation/config*, and the "reviewers may only edit their
  assigned pages" limit, are **removed** — those become unrestricted again. (The earlier
  "lock down project/asset/version deletes to owners" audit is therefore dropped;
  safety now comes from Part 4's confirmations + restore, not from blocking.)
- **Kept as-is:** **verdicts** remain limited to the assigned reviewer (per your earlier
  instruction) — that's a review-integrity rule, not gatekeeping.
- Reviewer-focused UI helpers (assigned-pages side-nav toggle, "My Reviews" default) stay
  as conveniences; they no longer imply hard blocks.

---

## Open items (defaults in parentheses — say if you disagree)
1. Confirm Part 5 is intended: revert the create/delete/config + reviewer-edit locks, keep
   only publish owner-gated, keep verdicts assigned-only. (assumed: yes)
2. 90-day trash/restore for **pages only**, or also images + saved versions? (pages only)
