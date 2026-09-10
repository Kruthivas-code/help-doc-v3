# Plan — Publishing & editing workflow in the Review Console

This plan answers the questions you raised, then lists what will be built. Everything is on the
admin/review side. Nothing changes for public readers except when you choose to publish.

---

## Part A — How it works today (answers to your questions)

**1. Direct link to the full editor for a published page?**
Partly. Clicking a project card on the dashboard opens the editor for any page, but there's no
one-click link to a *specific* page — the Publish tab and review page only link to the review
reader. So today you open the editor and hunt for the page.

**2. What does "Take down" do?** Sets the page back to **In review** and removes it from the public
site immediately. ("Done" is separate — a reviewer's assignment status — unrelated to publishing.)

**3. Must a published page be taken down before editing?** No. The public site serves a **frozen
published copy**; editing only changes your draft, and it goes live when an owner **publishes
again**. Both workflows already work (edit-while-live-then-republish, or take-down-then-edit). Only
owners can publish, and a page can't be (re)published with unresolved comments.

---

## Part B — What will be built

### 1. "Open in editor" link  *(both places)*
A direct link opening the full editor on that exact page, on **both** each Publish-tab row **and**
the review page.

### 2. Publish-tab filter  *(default = All)*
A filter above the Publish list: **All** (default, nav order) · **In review** (not yet live — your
still-to-publish worklist) · **Published** · **Needs update** (live pages with unpublished edits,
see #3).

### 3. "Unpublished changes" marker + one-click Republish
A live page is flagged **"Unpublished changes"** whenever its **current draft differs from the live
published copy**, with a **Republish** button to push it live without a takedown. **Take down** stays
for when you want the page off the site while editing.

### 4. Page-level "Done", driven by the "Looks correct" verdict  *(reworked to page-level)*
"Done" becomes a **per-page** state, not a per-assignment one. A page is **Done** when it has a
**"Looks correct"** verdict from its assigned reviewer **and** has **no unresolved comments** — that
one page, on its own. Specifically:
- Setting **"Looks correct"** on a page with no open comments marks that page **Done** immediately.
- If the page has open comments, the verdict is still saved but the page is **not** Done; it flips to
  Done automatically once the last comment on it is resolved.
- The other six verdicts (Needs small edits, Wrong info, More info needed, Outdated, Tone / clarity,
  Other) never mark a page Done.
- No dependency on any other page — each page stands alone.

Where "Done"/"Reviewed" is shown today (the Publish-tab **Reviewed** mark, and reviewer progress
counts like "8 of 18 reviewed"), it will use this page-level definition. A reviewer's queue shows how
many of their pages are Done by this rule.

### 5. Remove 2 orphaned assignments  *(data cleanup)*
There are 132 assignments but 130 live pages. The two extras are Mihir's **"Data leakage"** and
**"Data privacy"**, whose pages were removed earlier (overlapping content). These assignments now
point at pages that no longer exist. They will be deleted. At build time this is verified first — an
assignment is only removed if its page(s) no longer resolve to a live document; if either turns out
to still map to a live page, it's left alone and reported back instead.

### 6. Small clarity touches  *(both confirmed)*
- **Take down** gets a tooltip noting it returns the page to *In review* and removes it from the
  public site.
- Rows blocked from publishing by open comments show that blocked state (the block already exists).

---

## Decisions (locked from your replies)
1. Publish-tab default view → **All**.
2. "Needs update" → flagged whenever the **draft differs from the live copy**.
3. "Open in editor" → on **both** Publish rows and the review page.
4. "Looks correct" → marks the page **Done** unless it has unresolved comments — and **Done is
   page-level**, with no condition on other pages in the assignment.
5. Take-down tooltip and open-comment blocked-state indicator → **yes to both**.
6. Remove the 2 orphaned assignments (Mihir's "Data leakage" and "Data privacy").

## Assumptions (will proceed on these unless you say otherwise)
- **Page-level Done is derived** from "verdict = Looks correct" + "no open comments", so it self-heals:
  opening a new comment on a Done page makes it not-Done until resolved; resolving the last comment on
  a "Looks correct" page makes it Done. No separate manual "mark done" toggle is needed, so the old
  assignment-level "Mark done" button is retired in favour of this. (Say if you want to keep a manual
  override too.)
- An assignment covering several pages simply shows "x / y pages Done" using the page metric; there is
  no separate assignment-level done state.
- "Looks correct" counts when set by the page's assigned reviewer (owners can also set verdicts).
- Publishing stays **owner-only** and manual; resolve-comments-before-publishing is unchanged; the
  public frozen-copy model is unchanged.
