# Plan — Restructure "Data & Trust" from 12 pages to 8 (information architecture only)

## Goal
Reduce the Data & Trust section (under "Data, Trust & Support") from 12 pages to 8 by merging and
retiring pages. Information-architecture only: moved wording is carried **verbatim** — no
privacy/legal statement is rewritten, softened, or expanded; every `privacy@emergent.sh` note and
every Callout/Note/Warning is preserved exactly. All pages stay in **draft / in-review** — nothing
is published. The exact replacement bodies supplied by the user are used as-is (not reproduced here).

## Final 8 pages, in this order
1. Privacy & GDPR overview *(unchanged)*
2. Data Processing Agreement (DPA) *(unchanged)*
3. Where your data is stored & who processes it *(merge target)*
4. AI & model training *(unchanged)*
5. Deletion & retention *(unchanged)*
6. Your responsibilities as a controller *(new, merged)*
7. Security, breach & audit *(unchanged)*
8. Your data & ownership *(body trimmed)*

## Operations
- **Op 1** — Merge "Sub-processors" into "Where your data is stored": keep slug
  `where-your-data-is-stored`, retitle to "Where your data is stored & who processes it", replace
  body with supplied text. Delete `sub-processors`.
- **Op 2** — Merge "Data subject rights" + "Special category data" + "Regulators & supervisory
  authorities" into a new page "Your responsibilities as a controller"
  (slug `controller-responsibilities`) with the supplied body. Delete the three source pages.
- **Op 3** — Retire "Data isolation & leakage" (`data-isolation-leakage`): isolation claims are not
  re-added anywhere; secrets-hygiene steps are appended to "Keep it safe" **only if** it doesn't
  already cover storing secrets in the Secrets manager, git-ignoring `.env`, and rotating exposed
  keys. Delete the page.
- **Op 4** — Trim "Your data & ownership" to the supplied shorter body that links to the
  "Save to GitHub" and "Database (MongoDB)" pages instead of repeating their steps.

## Locked decisions (confirmed with the user)
1. **No redirects.** These pages have never been published (only published pages are served), so
   there are no external bookmarks to protect. No slug-alias/redirect map is created.
2. **Internal links updated.** Every link anywhere in the docs pointing at the four deleted slugs
   (`sub-processors`, `data-subject-rights`, `special-category-data`,
   `regulators-supervisory-authorities`, `data-isolation-leakage`) is repointed to its new target
   (`where-your-data-is-stored`, `controller-responsibilities` ×3, `ai-model-training`). The summary
   lists every link changed.
3. **Review data on deleted pages.** Assignments on deleted pages are removed automatically;
   **verdicts on the deleted slugs are deleted**; any **comments are kept** (expected to be none).
4. **Op-4 verification runs before the trim.** The two link targets are checked to confirm they
   contain the detail being removed (Save-to-GitHub flow incl. its plan gate; database-export steps
   incl. where the Mongo URL lives). If a target is missing that detail, the fuller original bullet
   is kept in place of the link, and the summary says so.

## Assumptions
- Supplied bodies inserted exactly; the six "unchanged" pages are not touched.
- The new `controller-responsibilities` page takes the section slot vacated by the three merged
  pages; navigation is reordered to the 8-page order above.
- Deleted pages go to Trash (recoverable), not hard-purged.
- All eight pages remain in review; no publish step.
- Internal page links use the existing `/slug` format.

## Out of scope
No content edits beyond the supplied verbatim bodies and the conditional "Keep it safe" block. No
changes to publishing, the public site, or the six unchanged pages. Nothing published.

## Finish criteria
Summary listing: final 8-page structure, internal links updated, verdicts deleted / comments kept
on the removed slugs, whether the Keep-it-safe block was appended or skipped (and why), and the Op-4
verification result for each of the two link targets.
