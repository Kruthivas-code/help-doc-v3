# Review Mode — Final Plan

## Context: how things work TODAY (confirmed in code)
- **No draft/published separation exists.** Both the Writing Assistant's "Create page & add to navigation" and the editor's "Publish" button (which is really just **Save**) write straight to the database and are **immediately live** on this workspace's public docs view. The "Saved / Unsaved changes" text is only a dirty indicator.
- **This preview workspace is NOT the real user-facing site.** An older, separately-deployed version serves actual users. So changes here (including gating pages off) do not affect real users.
- The **"Deployments" navigation group currently shows 0 pages** even though deployment pages exist (`deploying-web`, `deployment-types`, `custom-domain`, `deployment-plan-levels`, …). They're linked under a different group or orphaned/unlinked. **First task when building: locate those pages and relink them into the Deployments group.**

## What we're building: a native Review Mode + a real Draft/Published gate

### Content gate (Option A)
Every page gets a state: **Draft → In review → Published**. The public docs view + `sitemap.xml` + pre-render serve **only Published** pages.
- Creating a page (manually or via "Create page & add to navigation") lands it as a **Draft** (not public).
- The editor gets a real **Save draft** vs **Publish** split. The current "Publish" button becomes an actual publish (Owner-only).
- Editing a live page offers **Publish update** (push a minor edit live) or **Take down for rework** (unpublish → back to Draft/In-review).
- An **"unpublished changes"** badge appears when a live page has edited-but-unpublished content.

### Roles
- Add an **Owner** role — the only role that can **Publish** and can promote others to Owner by entering their email. (No role system exists today; we add one.)
- Seed the first Owner as **`sarang@emergent.sh`**.
- Non-owner admins/reviewers can edit drafts and comment, but not publish.
- (Auth/role work will go through the integration playbook during build.)

### Assignments & delegation
- Assign at **Tab / Section (group) / Page** level; assigning a Tab or Section covers its pages.
- Reviewer filters to **"My Reviews"**; assignment status Not started → In review → Done.
- Reviewer can **delegate** to another email (trail kept).
- Progress roll-up for the Owner.

### Reviewer actions (on a read-only reading view with a Review toggle)
- **Verdict** tag (Looks correct / Needs small edits / Wrong info / More info needed / Outdated / Tone-clarity / Other) — this *is* the approve / request-changes signal.
- **Comments** — page-level or pinned to highlighted text; text and/or **voice** (audio stored, **Transcribe** is a manual button, no auto-transcription).
- **Edit this page** — jump into the editor to fix the draft directly (a version snapshot is auto-saved first).
- Anyone can comment on any page, assigned or not.

### Owner actions
- **Review Inbox** in the dashboard with an **unread badge**; grouped/filterable by page/tab/reviewer/status.
- **Resolve** comments (reviewer can Reopen).
- **Publish** (the only action that changes the public site).
- **Assignments view** to hand out and track work.

### "Done" rule
A reviewer can mark an assignment **Done** only once **all comments on its pages are Resolved** (a verdict alone doesn't gate it).

## End-to-end workflow
1. **Draft it** — write manually or via Writing Assistant → lands as **Draft** (not public).
2. **Assign** page/section/tab to a reviewer email → **In review**; appears in their "My Reviews".
3. **Reviewer** sets a verdict, leaves comments (highlight/page, text/voice), optionally edits the draft.
4. Feedback → **Review Inbox** (unread badge).
5. Owner fixes + **Resolves** comments (reviewer can reopen).
6. Reviewer marks assignment **Done** (gated on resolved comments).
7. **Owner Publishes** → live; sitemap/prerender include it.
8. Editing a live page later → **Publish update** (minor) or **Take down for rework** (major) → re-review → re-publish.

## Rollout of the existing 121 pages
- **All 121 pages start in "In review."** Because only Published is public and this workspace isn't the real user-facing site, it's fine that the workspace's public view shows nothing until pages are reviewed and published. (Confirmed by user.)

## Bug fixed as part of this work
- **Delete → wrong redirect.** The nav-tree/metadata-dialog delete routes to `/admin/docs/<projectId>` (the legacy flat "old sitemap" view); the sidebar-trash delete stays in the editor — hence the inconsistency. Fix: all delete paths stay in the editor (jump to a sibling page); stop routing into the legacy view.

## Loopholes closed
- Nothing public until Published (sitemap + prerender excluded too).
- Review UI + all review/assignment/comment APIs are login-only; voice audio access-gated.
- Version snapshot before reviewer edits; delegation trail; Unpublish/take-down available.
- Prerequisite for real-reviewer/go-live use: Emergent login must be re-enabled (currently bypassed). Fine to build/test with the bypass; must flip before real reviewers use it.

## Out of scope (this build) / fast-follow
- Slack (channel notifications + assignment DM) — kept in the plan as a fast-follow; needs a Slack app + bot token with `chat:write`, `users:read.email`, `im:write`.
- Tracked "suggesting mode" accept/reject; real-time multiplayer cursors; branch previews; email notifications; anonymous share links.
