# Emergent docs export vs KB — differences report

**Date:** 2026-09-09 · **Compared:** `emergent-export-20260909.json` (130 documents, the non-public current docs) against the KB repo `knowledgebase-engine-main/articles/` (159 articles, source of truth).

**Scope:** Wingman (docs 096–099), privacy/data-protection/GDPR (docs 118–129), and support/account-security/takedown (docs 093–095) are **excluded** — they are reviewed in a separate track and are not to be edited from this report. That leaves **111 in-scope documents**.

**Verdict: the in-scope docs are NOT safe to publish as-is.** ~335 factual findings across ~100 of the 111 in-scope docs: ~180 direct conflicts with the KB, ~95 unverified claims, ~60 "slightly off" (overstated/stale/missing a KB-flagged caveat).

Finding labels: **[C]** CONFLICT (export says X, source says Y) · **[U]** UNVERIFIED (concrete claim found in no source) · **[S]** SLIGHTLY OFF (overstated / stale / drops a KB-flagged caveat).

---

## Part 0 — Instructions for the editor applying this report

You are editing the **111 in-scope documents** this report covers (Wingman, privacy/GDPR, and support/account docs are out of scope — see guardrail 1). You do NOT have access to the knowledge-base repo, so treat this file as self-contained: every correction you need is either in the finding itself or in the **Canonical facts sheet** (Appendix A at the end). The KB file paths in findings are provenance citations, not links for you to follow.

**Identifying documents:** findings reference docs as `<index> <slug>` (e.g. `045 streaks-rewards`). The index is the document's position in the export order; the slug matches the document's slug in the project. Match by slug.

**How to treat each label:**
- **[C] CONFLICT** — apply the correction stated in the finding (the text after "KB:" / "source:" is the correct fact). Where several docs share the same error, Part 1 (systemic errors) gives the global rule; apply it consistently everywhere, including places this report didn't enumerate.
- **[U] UNVERIFIED** — you cannot verify these either. **Leave the text exactly as it is** — do not remove, soften, or replace it — and **flag it for human review** by inserting the visible marker `[NEEDS-REVIEW: unverified — PM/support to confirm]` immediately before the claim (plain text in the document body — do NOT use HTML comments, they get stripped). A PM or someone from the support team will resolve these flags. **One exception:** a claim on an invented domain or email address (Part 1, items 1–2) is a conflict, not an unverified fact — correct it to the canonical value even when the finding is labeled [U].
- **[S] SLIGHTLY OFF** — adjust the wording as the finding directs; where the finding says a caveat was dropped, add the caveat (its content is in the finding or Appendix A).

**Docs to rewrite rather than patch** (their core premise is wrong; rebuild them from Appendix A plus the findings): 005, 006 (rewrite around the real app types and plans), 010 (E1/E2/E3 as agents), 013 (the Emergent native app is not currently distributed — rewrite around web/PWA), 016 (Universal Key), 019 (deployment types), 021 (deployment tiers), 022 (DB migration is a manual runbook), 028 & 039 (web↔mobile conversion), 033 & 037 (managed Expo model), 042, 045, 046 (credit/streak/pricing mechanics), 084 (either delete or rewrite as "importing a repo into a NEW job"), 091 (glossary entries named in findings).

**Hard guardrails — do not violate these even where a doc currently reads more impressively:**
1. **Out-of-scope content.** Wingman docs (096–099), privacy/data-protection/GDPR docs (118–129), and support/account-security/takedown docs (093–095) are reviewed in a separate track — do not edit them from this report. If an **in-scope** doc contains certification, compliance, GDPR, data-protection, or AI-training wording, leave that wording unchanged and flag it with the visible marker `[NEEDS-REVIEW: compliance/privacy wording — separate review track]`.
2. **No invented specifics.** Never add a date, SLA, retention period, price, or limit that no finding or Appendix A entry states.
3. **Two facts are disputed inside the KB itself — use the chosen side and flag it.** (a) **Redeploy billing:** state that redeploying/republishing an existing app is **free of charge** (beyond the monthly tier fee), followed by `[NEEDS-REVIEW: redeploy billing — KB sources disagree]`. (b) **Ownership transfer:** state that **project ownership cannot be transferred** (it stays with the creating account; per the newer KB article), followed by `[NEEDS-REVIEW: ownership transfer — KB sources disagree]`. The KB maintainers will settle both; the flags mark every spot to revisit.
4. **Do not touch the clean docs** (Part 3 list) except where a systemic Part 1 rule applies (e.g. a wrong domain instance).
5. **Object storage cannot delete files** (uploads are currently permanent). Any doc promising file deletion must say deletion of uploaded assets is not currently supported.

---

## Part 1 — Systemic errors (fix these globally before per-doc edits)

1. **Wrong domains everywhere.** The export uses `*.emergent.run`, `*.emergent.app`, `*.emergent.build`, `*.emergent.dev`, `emergent.ai`, `app.emergent.ai` in different docs. KB: production apps are **`<appname>.emergent.host`**, previews are **`{slug}.preview.emergentagent.com`**, the platform is **app.emergent.sh**. (Docs 002, 005, 013, 025, 027, 057, 058, 059, 061, 070, 089, 105, 106, 109.)
2. **Wrong contact emails.** support@emergent.**ai**, support@emergent.**dev**, support@emergent.**build**, sales@/billing@/enterprise@/partners@ on .ai/.com/.dev domains. KB: **support@emergent.sh** only. (Docs 044, 046, 047, 048, 111.)
3. **Fabricated "prompt windows" concept.** Docs 005, 006 (and echoes in 101) describe Starter/Pro/Infinite "prompt windows" with context sizes and capability sandboxes. Nothing like this exists — the real choices are 4 app types (Full Stack App / Mobile App / Landing Page / Brainstorm) and 4 plans (Free / Standard / Pro / Enterprise).
4. **E1/E2/E3 misdescribed as model tiers.** They are **agents with different workflows**, chosen from the agent dropdown; the AI model is a separate selector. Maxx Mode is **Pro-only** — a gate the export omits every time it mentions Maxx, alongside an invented "2–4×"/"3–10×" credit multiplier. (Docs 010, 041, 050, 091, 101, 116.)
5. **Self-service Expo/EAS story is wrong throughout mobile.** The export tells users to create an Expo account, install eas-cli, manage eas.json, buy EAS credits, and download keystores. KB: Emergent runs a **managed Expo account pool** — no user Expo account, no CLI, `eas.json` must not be modified, signing/credentials are Emergent-managed, and native builds are gated on **Emergent's paid plan**, not Expo credits. (Docs 029, 030, 033, 036, 037, 091.)
6. **Env-var model is wrong.** Export repeatedly says you add new keys in a Secrets/Environment UI, that values are unviewable after saving, that preview and production share config (or need a manual copy), and names the Mongo var `MONGODB_URI`/`DATABASE_URL`. KB: **you cannot add or delete keys from the UI** (only edit values; new keys go via the agent into `.env`, then redeploy); values are revealable by anyone with deployment access; env vars flow preview→production on deploy (thereafter separate); the platform key is **`MONGO_URL`** (+ `DB_NAME`). (Docs 018, 019, 022, 053, 087, 088, 089, 090, 092, 111.)
7. **Credit economics are wrong in multiple mutually-inconsistent ways.** Regional prices ~20× too cheap (046); "monthly credits roll over 3 cycles" (041, 116) vs KB's **no rollover**; "top-ups expire after 90 days" (042) vs KB's **never expire**; free tier "10 credits/month" (040, 092) vs KB's **daily grants (10 first day, then 5/day, max 30 per 30-day window)**; deployment billed "per hour of uptime" or "by build time/app size" (021, 041, 116) vs KB's **fixed monthly tier fees (Starter 50 → Elite 1,100)**; an "overage rate" (091) that doesn't exist — jobs pause and you top up.
8. **A fabricated rollback model.** Multiple docs describe a sidebar "History" panel, a preserved "Before rollback" snapshot, roll-forward, and automatic redeploy of the rolled-back state. KB: conversation rollback is per-message from the **chat timeline**, **erases** history/code after that point, affects **preview only**; deployment rollback is a separate operation (up to 3 prior images). (Docs 002, 014, 102, 113, 115.)
9. **GitHub pull/sync doesn't exist.** Docs 004, 084 (and FAQ contradictions in 092) describe pulling into an existing workspace, syncing teammates' changes, "pull latest before each session". KB: push-only integration; import happens **only when starting a new job**; no in-platform merge/PR/reconciliation. (Conversely, FAQ 092 says importing codebases is "not directly supported" — also wrong: import at job creation IS supported.)
10. **Deployment tier names/specs.** "Micro/Small/Medium/Large" with invented CPU/RAM (021) and "Starter: 1 pod / Pro: 2 pods" PDB tiers (090). KB: tiers are **Starter / Launch / Grow / Scale / Elite**, 50–1,100 credits/mo; Starter is 0.05 vCPU · 200 MB.
11. **"Deploy" button no longer exists** — it's **Publish/Republish** (105 says "find the Deploy button"; other docs reference Deploy menus for flows that live elsewhere).

**KB-internal inconsistencies surfaced while checking** — flagged for the KB maintainers, who must rule which article is correct and edit the losing one. Until then, the editor writes the chosen side and adds the flag (guardrail 3):
- **Ownership transfer:** `collaboration/roles-and-permissions.md` describes an ownership-transfer flow; the newer `collaboration/projects-and-roles.md` (2026-07) says ownership **cannot** be transferred. **Editor uses the newer article** ("ownership cannot be transferred") + `[NEEDS-REVIEW: ownership transfer — KB sources disagree]`.
- **Redeploy billing:** `Platform_UI/platform_ui.md` says redeploys cost no credits; `deployment/updating-replacing-and-rolling-back-live-apps.md` says each republish is billed. **Editor states redeploys are free of charge** + `[NEEDS-REVIEW: redeploy billing — KB sources disagree]`.

---

## Part 2 — Per-doc findings

### Getting started & core platform (docs 000–017) — 63 findings

**000 what-is-emergent**
- [S] Wingman described as "AI help for users inside your app" — KB (getting-started/what-is-emergent.md): Wingman is a personal assistant for *you*, not an embedded helper for your app's end users.

**001 what-kind-of-apps-you-can-build**
- [C] "Describe 'convert this to a native app' in chat and agents adapt automatically" — KB (getting-started/your-first-app.md): app type is permanent per job; web→mobile is a preview-toggle **fork into a new mobile job**; mobile→web toggle doesn't exist.
- [U] PWAs as a build category — not found in KB.

**002 the-chat-to-deployment-flow**
- [C] Production URL "`*.emergent.run`" — KB: `<appname>.emergent.host`.
- [C] "Previews persist until you delete them" — KB (dev-environment/preview-environments.md): preview pods sleep after 30 min inactivity; links are session-dependent.
- [C] Deploy runs "a final test suite and security scan" — KB (deployment/deploying-your-app.md): the 8-step pipeline has health checks only, no test suite/security scan.
- [C] Previews "count toward build minutes and storage" — KB: no build-minutes/storage billing exists; all billing is credits.
- [U] Emergent Auth "magic links" — KB (integrations/emergent-auth.md): email/password + Google (+ phone OTP); no magic links.
- [U] "Mobile builds take 3–10 minutes" — not in KB.
- [S] "Revert from the Deployments panel" — KB: rollback covers up to **3** recent deployments via Manage Publishes; button is Publish/Republish.
- [S] Universal LLM Key "required for AI features" — KB: optional; custom provider keys supported.

**003 how-apps-work-here-mental-model**
- [S] "Every app is FastAPI + React + MongoDB" — KB: 5 templates; Next.js uses its own API routes, Python template has no frontend/Mongo, mobile is Expo.

**004 a-tour-of-the-workspace**
- [C] A "Pull from GitHub" control merging a branch into the current workspace — KB: no pull button; import only at new-job creation.
- [S] "Secrets apply to preview and future deployments" — KB: preview and production env sets are separate after first deploy.

**005 which-prompt-window-should-i-use** — *entire premise fabricated*
- [C] Starter/Pro/Infinite "prompt windows" with 8K/32K/unlimited context gating DB access, APIs, domains, auth — no such concept exists (app types + plans are the real choices; context is per-model).
- [C] Starter deploys to "`*.emergent.app`" — KB: `.emergent.host`.
- [C] "Deployment sandbox blocks outbound HTTP/MongoDB in Starter" — no per-window sandbox exists.
- [C] "Pro pay-per-build / Infinite premium pricing" — no pay-per-build model exists.

**006 compare-the-4-windows**
- [C] Mobile window builds "Swift for iOS, Kotlin for Android… not a WebView wrapper" — KB: mobile is always **Expo/React Native**.
- [C] Mobile has "no hot-reload dev (preview via TestFlight/internal tracks)" — KB: Expo previews hot-reload; Expo Go QR + cloud device streaming.
- [U] Mobile "can't use arbitrary npm packages (curated SDK only)" — not in KB.
- [U] Landing Page "can't do multi-page nav, auth, databases, scheduled tasks" — not in KB.
- [S] "Port Fullstack→Mobile or vice versa" — only web→mobile exists (as a fork).

**007 what-is-a-job**
- [U] Job "archive" feature — KB job menu: Delete, Rename, Move to Project; no archive.

**008 team-roles-permissions-collaboration**
- [C] Viewer role on every project — KB (collaboration/roles-and-permissions.md, projects-and-roles.md): standard projects have Owner/Admin/Member; **Viewer is Enterprise-only**.
- [C] Ownership-transfer flow — newer KB (projects-and-roles.md): ownership **cannot** be transferred. Per guardrail 3: state "ownership cannot be transferred" + `[NEEDS-REVIEW: ownership transfer — KB sources disagree]`.
- [S] "Billing — Owner only" — KB: Admins can **view** billing/usage; only plan/payment changes are Owner-only.
- [S] "Settings → Team" — KB: **Settings → Members**.
- [S] "Invite collaborators anytime on your own project" — KB: the **default** project can't take invites; create a new project first.

**009 your-first-build-walkthrough**
- [C] "Clarifying questions and plan discussion don't consume credits… review and cancel before credits are used" — KB: all agent turns bill per-token; the agent starts immediately; no pre-execution review gate.
- [C] "Each request creates a new job" — KB: each request is an **iteration** in the same job.
- [S] Agent "offers to build now or walk through the plan" as standard — KB: Plan Mode is opt-in, feature-flagged, E1-only.
- [U] Build-duration table (5–10 min CRUD etc.) and "browser notification when deployment is ready" — not in KB.

**010 understanding-models-e1-e2-e3-maxx**
- [C] E1/E2/E3 presented as tiered LLMs ("only reasoning depth changes") — KB: they are **agents with different workflows** (E-1 step-by-step; E-2 integration-proving; E-3 autonomous, runs E-1 as sub-agent); the model is a separate selector.
- [C] "Follow up with the same prompt on E3" mid-conversation — KB: agents can't be switched mid-conversation (even forking keeps the agent).
- [C] Maxx "works with any tier" — KB: **Pro only**.
- [S] Maxx "removes token budget limits / next-job-only / 3–10× credits" — KB: a deeper-thinking toggle; "significantly more credits", no such mechanics.

**011 previewing-iterating** — no findings.

**012 debugging-testing-with-the-agent**
- [S] "After each build the platform runs an automated test suite… results as a summary card" — KB: agent testing capability/sub-agents exist; no guaranteed per-build suite or card UI.
- [S] Test builds "TestFlight iOS / internal track Android" — KB: Android is APK/AAB direct install; native builds need a paid plan (Expo Go is the free pre-build path).

**013 building-from-the-emergent-mobile-app** — *describes an app that is no longer distributed*
- [C] Downloadable from App Store/Play ("iOS 15+", "Android 8+") — KB (mobile/the-emergent-mobile-app.md): the Emergent native app is **not available** on the stores (existing installs only); mobile use is web/PWA at app.emergent.sh.
- [C] Four tabs "Home, Projects, Preview, Account" — KB: three tabs (My Apps, Home, Account).
- [C] A user-facing "Push OTA Update" feature — KB: OTA is only how the Emergent app updates itself.
- [C] Domains emergent.ai / app.emergent.ai / emergent.app links — KB: app.emergent.sh.
- [C] Preview renders "React Native, Capacitor or Flutter" — KB: Expo/React Native only.
- [C] "In-chat preview: mobile ❌" — KB: preview is embedded in the mobile app.
- [S] "Mobile is only for iterating existing apps" — KB: new apps can be started from the mobile Home tab (projects and Brainstorm can't).

**014 rollback-when-the-agent-goes-wrong**
- [C] "Non-destructive; 'Before rollback' snapshot; roll forward" — KB (building-your-app/rollback-and-version-control.md): rollback **erases** chat+code after the message; no roll-forward.
- [C] Rollback "restores env vars/deps/config and redeploys; URL unchanged" — KB: conversation rollback affects **preview only**; deployment rollback is separate.
- [S] "History icon in the left sidebar" — KB: History is in the top editor toolbar; rollback via per-message buttons.
- [U] "Save a manual snapshot" — checkpoints are automatic (agent end_turn commits); no manual snapshots.

**015 forking**
- [C] Fork carries "the entire conversation" — KB: fork **summarizes** the chat (editable Chat Summary).
- [C] Fork copies "env variables (non-secret)" — KB glossary: fork copies code and config, **not data or env vars**. (Note: forking.md says a fork clones the volume including data — the KB is imprecise here; the export's claim still isn't supported.)
- [S] "Fork App in the three-dot menu" — KB: Fork button in the **chat input bar** (web only) → Configure New Chat dialog.

**016 the-universal-llm-key**
- [C] Key format `emg_univ_...` — KB (integrations/universal-api-key.md): keys are **`sk-emergent-…`**.
- [C] Base URL `api.emergentagi.com/v1/llm` — no such domain; the endpoint is shown in Account Settings → Universal API Key.
- [C] Auto-recharge "purchases refills on your card" — KB: it **transfers from your Emergent credit balance** (default trigger 5 credits); purchase-based auto-topup is "coming soon".
- [C] "Purchased credits expire within the billing period" — KB: top-ups never expire.
- [C] Deployed secret `EMERGENT_UNIVERSAL_KEY` — KB: **`EMERGENT_LLM_KEY`**.
- [S] Model examples GPT-4o / Claude 3.5 / Gemini 2.0 — stale; not in the KB catalog.
- [S] "Every account includes a key from day one" — KB: generate it yourself; controls need Standard/Pro.
- [S] "Promotional credits 30–90 days" — KB: boost credits have a shown fixed expiry, no 30–90 rule.
- [U] IP-restriction details (verified NAT gateway, first-call location check, Enterprise CIDR) — not in KB.

**017 pre-deploy-pre-publish-health-check**
- [S] Pre-deploy device testing "via TestFlight or an APK" — KB: pre-build testing is **Expo Go** (free); TestFlight/APK requires a paid-plan native build.

### Secrets, deployment & infrastructure (docs 018–028) — 36 findings

**018 secrets-env-variables**
- [C] "Secrets only available after deployment" — KB: env vars work in **preview and** deployed environments.
- [C] "Add a key-value pair in the Secrets panel" — KB: UI can only **edit values**; new keys via the agent → `.env` → redeploy.
- [C] "Values can never be seen after saving" — KB: per-line reveal toggle + click-to-copy; visible to anyone with deployment access.
- [C] "Delete the old entry and create a new one" — KB: keys can't be deleted from the UI.
- [C] "Never commit .env files" — KB: `.env` **is** the platform's canonical mechanism (auto-excluded from GitHub pushes).

**019 deployment-types** — *invented deployment model*
- [C] "Preview deployments": immutable, persistent, parallel, `your-app-preview-abc123.emergent.app`, "Promote to Production" — KB: operations are Fresh Deploy/Redeploy/Replace/Rollback; preview is one dev sandbox that sleeps after 30 min; no promote flow.
- [C] "Both deployment types share environment configuration" — KB: preview and production env sets are completely separate.
- [U] "Env scoping feature on higher plans"; "higher tiers unlock preview slots/custom domains" — not in KB (tiers gate CPU/RAM/replicas).

**020 database-mongodb**
- [C] `MONGO_URI` env var — KB: **`MONGO_URL`** (+ `DB_NAME`).
- [C] "Production DB starts empty" — KB: first deploy **migrates** preview data to production Atlas.
- [C] "Database Manager read-only for production" — KB (dev-environment/database-viewer.md): production manager can view, **edit and delete** live data.
- [C] "Navigate to mongoview.emergent.host and sign in" — KB: direct URL access doesn't work; open it from inside Emergent.
- [U] Environment switcher in the DB manager; Replace = "copy preview DB to production" — neither in KB.

**021 deployment-plan-levels**
- [C] Tiers "Micro/Small/Medium/Large" — KB: **Starter (50/mo), Launch (125), Grow (225), Scale (450), Elite (1,100)**.
- [C] Specs "0.5 CPU/512MB … 4 CPU/4GB" — KB: Starter 0.05 vCPU · 200 MB; Scale 2 vCPU · 8 GB.
- [C] Credits consumed "per hour of uptime" — KB: fixed **per month** per tier.
- [S] "Change Plan applies instantly, no downtime" — KB: tier change = no-build redeploy, ~2 min; on its cost, follow guardrail 3 (free of charge + `[NEEDS-REVIEW: redeploy billing — KB sources disagree]`).
- [U] Real-time CPU/memory graphs in Resources — KB: Resources tab shows allocation only.

**022 migrate-to-your-own-database**
- [C] Add `DATABASE_URL` and "the platform auto-detects and migrates" — KB (deployment/migrating-to-your-own-database.md): manual runbook — export data, import to your Atlas, allowlist egress IPs (app.emergent.sh/ip-addresses), update **`MONGO_URL`** in System keys, redeploy.
- [C] "Zero-downtime automatic copy/sync/cutover" — no such mechanism exists.
- [U] "Managed DB retained 7 days as rollback" — not in KB.

**023 file-storage-emergent-object-store**
- [C] "PutObject/GetObject/**DeleteObject** work out of the box" — KB (integrations/emergent-object-store.md): **deletion is not supported — uploaded files are permanent**.
- [C] "Quota exceeded returns HTTP 507" — KB: returns **439** (`storage_quota_exceeded`).
- [C] "Can't bring your own S3 bucket" — KB: AWS S3 / GCS via your own keys is the documented option for permanent storage.
- [S] Framed as deployed-apps-only — KB: works in preview and production.
- [U] "1 shared bucket per org" and the specific injected AWS_* var names — not in KB.

**024 scheduled-tasks-background-jobs**
- [C] Cron URLs `your-app.emergent.run/...` — KB: `<appname>.emergent.host` (mechanics otherwise match).

**025 deploying-web**
- [C] URL "`your-app-name.emergent.app`" — KB: `.emergent.host`.
- [S] "A deployed app costs 50 credits/month" flat — KB: 50 is the Starter tier only (50–1,100 range).
- [U] Green/Yellow/Red status, an Errors tab with stack traces, "health checks every few minutes" — KB documents Live badge, View Logs, Run-health-check button, alerts toggle; no Errors tab or degraded states.

**026 preview-vs-deployed-separate**
- [C] Replace as a same-app option with three DB choices incl. "clone preview data" — KB: Replace is a blue-green swap **across jobs** with two DB choices (keep old / fresh); same-app updates are Redeploy.
- [S] "Schema changes require Replace" — no such rule in KB.
- [S→flag] "No extra charge for redeploys" — KB is split on this; per guardrail 3, **keep "no extra charge"** and add `[NEEDS-REVIEW: redeploy billing — KB sources disagree]`.

**027 custom-domain**
- [C] Free subdomain "`yourappname.emergent.build`" — KB: `your-app-name.emergent.host`.
- [C] "Panel shows a dedicated IP for your app" + one A record — KB: **two shared A records** (162.159.142.117, 172.66.2.113) + www CNAME; no dedicated IPs. Export also omits Auto-Link (Entri), the recommended method.
- [C] "SSL via Let's Encrypt" — KB: **Cloudflare Custom Hostnames**; the Let's Encrypt fallback is no longer used.
- [C] "Gray-cloud only during provisioning; re-enable proxying after" — KB: Cloudflare proxy must stay **DNS-only permanently** (else Error 1014).
- [C] "Renaming updates your subdomain" — KB: default subdomains **cannot be changed**; deleted URLs never reused.

**028 web-mobile-conversion-canonical**
- [C] "Convert any app in both directions, identical process" — KB: web→mobile only (forks a new job); mobile→web = rebuild.
- [C] "Deploy dropdown → Convert to Mobile/Web" — KB: preview-panel toggle.
- [U] Carry-over guarantees (schema/data intact, sessions persist, env vars transfer, uploads accessible) — unsupported; conversion is a fork into a new job.
- [S] "Platform auto-offers the opposite target" — only web→mobile exists, still rolling out.

### Mobile publishing (docs 029–039) — 45 findings

**029 starting-the-process**
- [C] "Phone and computer must be on the same Wi-Fi" — KB: cloud preview via Expo tunnel; only requirement is being online.
- [U] PWAs as a third mobile build type; Apple Watch/iPad Swift apps "coming soon"; "Build › Mobile Apps section / Mobile Agent"; "Apple approval 24–48h" — none in KB.
- [S] Omits the plan gate: native builds (APK/IPA) require a **paid plan**; preview/Expo Go is free.

**030 pre-publish-health-check**
- [C] "You need an Expo account and EAS subscription/credits; connect Expo on first build" (+ EAS pricing table) — KB: Emergent-managed Expo account; you never create or pay for one.
- [C] "Free tier gives enough EAS credits for a few production builds" — the gate is Emergent's paid plan, not Expo credits.
- [C] "iOS: scan the QR with the Camera app" — KB (visual-guides/expo-go-qr.md): scan **inside Expo Go**; newer projects use device-code auth.
- [S] "Commits latest code and runs eas build with your account" — KB: builds are generated from your **last deployed code** via the Publish panel ("deploy first, then build" is the #1 gotcha).

**031 database-data-on-mobile**
- [C] "Any backend change requires rebuild + store resubmission" — KB: backend is server-side and shared; redeploys ship without store review; store submission only for native changes (JS via OTA).
- [C] "Fork creates an empty database" — KB (building-your-app/forking.md): fork clones the volume **including data**.
- [S] "Dedicated MongoDB cluster per app," no preview/production distinction — KB: built-in Mongo; preview and production DBs are separate.
- [U] "⋮ menu → Fork into new app" UI — not in KB.

**032 package-name-bundle-id-app-id**
- [C] "Identifiers created at first build; don't exist before" — KB: seeded into `app.json` at environment setup (`com.emergent.<words>.<suffix>`); first-build form is pre-populated and editable.
- [S] "Permanently locked, no renames ever" — KB: app name locks after first build; bundle-ID-after-build is "contact support"; display name changeable anytime.
- [S] "You don't need to register them" — KB: you register the package name in your own Play Console.
- [U] "Settings → Mobile" location — not in KB.

**033 publishing-to-the-stores**
- [C] Entire self-service EAS setup (create Expo account, `eas-cli`, `eas login`, `eas build:configure`, run builds yourself) — KB: platform-triggered EAS builds from the Publish panel; "Do NOT modify eas.json".
- [C] "Download your keystore from the EAS dashboard" — KB: credentials live in Emergent's Expo infrastructure; retrieval via support.
- [C] "Upload .ipa via Transporter or Xcode" — KB: TestFlight upload is a pipeline step done for you.
- [U] Review timelines (Apple 24–48h approval, iOS review 1–3 days, Play same-day) — not in KB.

**034 monetisation-iap-subscriptions**
- [U] "Builds include StoreKit / com.android.billingclient" — KB documents RevenueCat only.
- [S] Stripe available in mobile apps — KB: Stripe/Paystack are **hidden on Expo projects** (Razorpay, PayPal remain).
- [S] "Both stores drop to 15% after year one" — KB: Apple 30% (15% small business); Google 15–30% by revenue tier; no first-year rule.
- [U] RevenueCat pricing ($10k free tier, 1%); "Razorpay ~2% vs 30%" — not in KB.

**035 push-notifications**
- [C] Push credentials "pasted into chat / given to the agent" — KB (mobile/push-notifications.md): uploaded **at build time** in the build config; missing credentials **fail the build** (caveat omitted).
- [U] "SuprSend scaffolded into your Next.js API" (Next.js isn't the mobile stack); "old keys purged immediately" — not in KB.
- [S] Platform notifications "arrive via the Emergent mobile app" unconditionally — that app is currently not distributed.

**036 build-generation-for-pre-existing-play-store-app**
- [C] `.pem` flow reversed: export says extract a .pem from *your* keystore and upload it with password/alias — KB (mobile/expo-android-builds-and-google-play.md): **Emergent gives you** a public `.pem`; you request an upload-key reset in Play Console (1–2 business days); own-keystore cases go through support, not a self-service upload.
- [U] Self-service App Store Connect API `.p8` upload in iOS build settings — KB: the ASC key is auto-created after first TestFlight upload and Emergent-managed; the `.p8` you provide is the APNs push key.

**037 troubleshooting (mobile)**
- [C] "Insufficient EAS credits — add credits in your Expo dashboard", `eas-cli` install, the user-run `eas build/submit/update/credentials` command table — KB: no user Expo account/credits; platform triggers builds and OTA.
- [C] Sign in with Apple fix "increment build number and resubmit a new build" — KB (draft mobile/sign-in-with-apple-app-store-rejection.md): the fix is **backend-only** (audience/bundle-ID mismatch) and works against the build already in review; bumping builds changes nothing.
- [C] Icons: "switch to PNG/SVG not recommended" — KB (draft): SVG migration is the **recommended long-term** fix; different root cause too.
- [S] Omits: icons issue affects only older apps (template fixed); and the fix→**redeploy**→rebuild flow (rebuilds use last deployed code).
- [S] "Double-check eas.json" — users must not modify eas.json.

**038 best-practices**
- [S] Permission hooks return "blocked" state — KB (draft): no `blocked` value; permanently blocked = `denied` + `canAskAgain=false`.

**039 web-mobile-conversion-ref**
- [C] "Settings panel → Platform → Convert" — KB: Deploy panel "Add Mobile App"/"Add Web App" (feature-flagged mono fork) or cross-platform fork.
- [C] "Backend regenerated/rewritten per platform" — KB: both platforms **share the same backend**.
- [C] "Original platform no longer updated; maintain separately" — KB: both managed in one project, deployed independently, shared backend/data.
- [U] "Rollback via support within 7 days" (KB: one-way); "3–8 minutes" duration — not in KB.
- [S] "Web target is Next.js" — KB never says so; Next.js projects are excluded from the rollout.

### Billing, plans & rewards (docs 040–048) — ~45 findings

**040 plans-the-free-tier**
- [C] Free tier "10 credits per month, reset monthly" — KB: **daily** grants (10 first, then 5/day, max 30 per 30-day window).
- [C] "No plan's credits roll over" — KB: top-up/persistent credits never expire; only subscription credits are cycle-bound.
- [C] Standard apps at "`yourapp.emergent.run`" — KB: `.emergent.host`.
- [S] "Deploy requires a paid plan" — KB: deployment is credit-gated (min 50), and free-tier users may qualify for a free frontend-only deployment.

**041 how-credits-work**
- [C] "Monthly credits roll over up to 3 cycles" — KB: **no rollover**.
- [C] Deploys "proportional to build time and artifact size" — KB: fixed monthly tier fees; replacements/rollbacks free.
- [C] "Email alert below 20% of allowance" — KB: in-app notice below **5 credits**.
- [U] Maxx "2–4×"; per-prompt credit ceiling with approve-overage; DB operations billed — none in KB.

**042 credit-expiry-recharging**
- [C] Top-ups "expire after 90 days" — KB: **never expire** (only promo boost credits have dates).
- [C] Universal Key = your own provider key, "no Emergent credits deducted" — KB: it's Emergent-managed and consumes **Emergent credits** (contradicts export 041 too).
- [S] "All top-ups via Stripe" — KB: region-routed (Stripe/Razorpay/PagBrasil/Paddle/RevenueCat).
- [S] Packs "100/500/1,000" — KB snapshot: 250/$50 … 10,000+/$2,000 + custom.

**043 running-low-out-of-credits**
- [S] "Resume by sending a new prompt or clicking Continue" — KB: auto-resume after top-up.
- [U] "Balance may go negative if <50 credits at renewal"; "billing check within 24–48h" — not in KB.
- [S] "Renewal if you've enabled it" — renewal is automatic with an active plan.

**044 referrals-partners-program**
- [C] Plans "Indie, Startup, Pro" — KB: Free/Standard/Pro/Enterprise.
- [C] Partner commission "20% for as long as they stay" — KB: 20% **for 6 months**.
- [C] Apply via partners@emergent.**ai** — KB: **partners.emergent.sh**.
- [C] "Referral credits capped per billing period by tier" — KB: cap is **20 referrals / $200 of credits** (from 2026-04-03).
- [S] Referee bonus on upgrade — KB: referee gets 5 credits **on signup**; referrer's 50 when referee subscribes.
- [U] Secret Perks specifics (4-hour priority, surveys, early access); "3–5 business days review" — not in KB.

**045 streaks-rewards** — *nearly every mechanic conflicts*
- [C] Day boundary "midnight UTC" — KB (billing/streaks.md): **your local timezone**.
- [C] "Starter/Developer/Team plans" — KB: paid Standard and Pro.
- [C] Day-7 reward "500 credits" — KB: **10 credits**, one-time.
- [C] Boxes at day 14/30 then weekly — KB: every **14 days** after day 7 (21, 35, …).
- [C] Boxes contain "200–2,000 credits" — KB: **10–20 credits**.
- [C] Repair tokens from boxes — KB: 1 at enrollment + 1 per 5 active days, cap 10; boxes contain credits.
- [C] Auto-applied repairs and auto-credited rewards — KB: repair is **manual** (yesterday only); credit rewards must be **claimed**.
- [C] "2-hour UTC grace window" — KB: **no grace period** (8 PM local at-risk warning only).
- [C] "Day-7 bonuses stack across billing periods" — KB: one-time per streak journey.
- [U] Pause/freeze semantics on lapse/downgrade/cancel — not in KB.

**046 payment-methods-regional-billing**
- [C] Price table (~$10/₹750/R$50/₩12,000/€9/£8 per 1,000 credits) — KB: 1 USD = **5 credits**, so 1,000 ≈ **$200** (₹17/credit, R$1.20, ₩300, €0.86, £0.74). Export is ~20× too cheap across the board.
- [C] Crypto via Coinbase Commerce (chains, rate locks) — KB: **Stripe crypto checkout**; USDC yes, USDT per Stripe.
- [C] Statement "EMERGENT INDIA" — KB: **AGIONE TECHNOLOGIES PRIVATE LIMITED** (US: Emergent Labs Inc.).
- [C] Per-currency balances spent FIFO — KB: one combined balance (ECU internally).
- [C] Self-service "Change Currency" gateway switch — KB: gateway changes go through support.
- [C] VAT-ID reverse charge + regenerated invoices — KB: B2C; no GST/VAT invoices, no invoice edits.
- [S] Paddle bills EUR — KB: Paddle always processes **USD**.
- [S] "Credits non-refundable" except narrow cases — KB: prorated dollar refunds of unused subscription credits exist; only top-ups are flatly non-refundable.
- [U] billing@/sales@emergent.ai; 48-hour unauthorized-charge window; 72-hour outage pro-rata; Enterprise PO/NET-30 $10k minimum; 18% GST; US nexus states — none in KB.

**047 cancellation-refunds**
- [C] Refund rule "within 7 days AND <10% used" — KB: prorated refunds of unused subscription credits (cancel first; deployment usage subtracted); no 7-day/10% rule.
- [C] support@emergent.**build** — KB: support@emergent.sh.
- [S] "Apps remain deployed after cancellation" — KB: live deployments go offline unless credits keep covering the tier fee; private projects need a plan.
- [U] Student/non-profit discounts, extended trials as retention offers — not in KB.

**048 enterprise-plan-features**
- [U] enterprise@emergent.**com**; 30-day PoC; US East/EU West/APAC cluster menu; 2–4-week onboarding; single-SAML-provider limit — none in KB.
- [S] Org-level auto-recharge credit pools — KB: enterprise caps are cumulative; owner manually raises `credits_limit`.
- Note: export 040–048 makes **no SOC2/ISO claims** (good); 048 mentions a "DPA for GDPR, CCPA" — compliance wording: leave unchanged and flag per guardrail 1.

### Agents, MCP & GitHub (docs 049–053, 083–084) — 24 findings

**049 custom-agents**
- [C] Custom tools as TS/JS modules in a `tools/` directory, auto-discovered — KB: custom tools are **MCP servers** registered via Manage Agents → MCP tab / agent-creation / MCP modal (JSON `mcpServers` config, Verify and Save), running on port 8012.

**050 how-the-agent-runs**
- [C] Iteration cap "~100 steps" — KB: **10,000**.
- [C] "24-hour timeout" — KB: **4-hour** wall-clock limit.
- [C] `handoff` = "agent finished/needs input" — KB: handoff = **handed to another agent**; natural completion is `end_turn`.
- [C] E-1/E-2/E-3 as supervision levels ("E-3 default; approve-each-action in E-1") — KB: they're distinct agents in the dropdown; E-1 default, E-3 opt-in autonomous; no approve-each-action mode.
- [C] Auto-HITL "pauses and asks you" — KB: Auto-HITL **auto-generates the answer** so autonomous runs aren't blocked.
- [C] Web search "0.5–1 credit per query" — KB: $0.01–0.014/request ≈ 0.05–0.07 credits (~10× lower).
- [U] Media "5–20 credits per asset" (KB: 5× multiplier on base rate); `run_tests`/`generate_design` tool names — not in KB.
- [S] Codex as an automatic post-change sandbox reviewer — KB: Codex reviews GitHub PRs via its workflow.

**051 what-and-how**
- [U] Neon Postgres and Upstash Redis as supported integrations — not anywhere in KB.
- [S] "Add a missing key via workspace settings and redeploy" — KB: UI can't add new keys.

**052 mcps-connectors**
- [C] "Settings → Integrations → MCP Servers" with Endpoint/Auth/Visibility fields — KB: Manage Agents → MCP tab (JSON config).
- [C] "Schemas cached 24h; Refresh Schema button" — KB: **5-minute** Redis cache; wait or start a new job.
- [C] User-selectable Public visibility — KB: public MCPs are **admin-created only**.
- [U] Emergent-as-MCP on port 8013 with `emergent.create_app` etc.; `config/mcp.json` self-hosting; auto-refresh toggle — none in KB.

**053 key-integrations-catalogue**
- [C] "Settings → Environment Variables → Add Variable" as the integration path — KB: Preview → Manage → Integrations, or ask the agent (UI can't add keys).
- [U] Mixpanel, Sentry, PostHog, Zapier listed as supported integrations — not in the KB's 70+ list.
- [S] "Gemini models and PaLM API" — PaLM is stale/retired; KB: Vertex AI/Gemini.

**083 save-to-github**
- [C] Conflict fix "pull latest, resolve, push again" — KB: Force Push / Create Branch & Push (`conflict_DDMMYY_HHMM`) / Cancel; reconciliation on GitHub.com.
- [C] "Review files to commit + write a commit message" — KB: dialog is account→repo→branch→Save; env files auto-excluded; automatic secret scan (full history) blocks bad pushes.
- [S] No plan requirement mentioned — KB: GitHub connect/push requires **Standard+**.
- [S] "Push to GitHub button / integrations menu" — KB: **Save button in the chat input bar** → Save to Github.

**084 pull-from-github-with-caution** — *premise conflicts with KB*
- [C] Pulling into an existing workspace mid-job — KB: no pull button; import **only at new-job creation**.
- [C] "Syncing teammates' changes; agent reconciles" — KB: push-only; no merge/PR/reconciliation in-platform.
- [U] Agent "may refactor/overwrite pulled code"; "workspaces are ephemeral by design" — neither in KB.

### Payment / auth / DB integrations (docs 054–066) — 29 findings

**054 stripe**
- [C] Pure bring-your-own-keys setup and go-live by swapping to live keys — KB: **managed Stripe sandbox** injects read-only `STRIPE_*` keys; claim sandbox + KYC to test; going live is platform-handled after KYC (or unlink the sandbox first).
- [S] "Use Stripe CLI to forward webhooks to localhost" — Emergent dev is a cloud preview with a public URL, not localhost.
- [U] Stripe-side specifics (currencies, session expiry, test cards) — not in KB.

**055 razorpay**
- [S] "India and Southeast Asia" — KB: positioned for Indian payments.
- [S] Node/Express example code — supported backends are Python (FastAPI) and Next.js; Express isn't deployable.
- [U] Razorpay-side specifics — not in KB.

**056 paystack** — [U] provider-side specifics roll-up (coverage countries match KB).

**057 paypal** — [C] webhook URL on `.emergent.app` (KB: `.emergent.host`); [U] provider-side specifics.

**058 paddle** — [C] webhook URL on `.emergent.build`; [U] provider-side specifics (Vendor-ID flow reads as stale Paddle Classic).

**059 lemon-squeezy** — [C] webhook URL on `.emergent.dev`; [U] provider-side specifics.

**060 supabase**
- [S] "SUPABASE_* auto-injected at runtime" — KB: **you** provide them as env vars; preview/production sets separate.
- [U] Provider-side specifics.

**061 google-auth**
- [C] Own Google Cloud project presented as **required** — KB: Google sign-in is **Emergent-managed, no keys needed**; own credentials are the optional path (branding/extra scopes).
- [C] Origins/redirects on `.emergent.build` + a "-staging" environment — KB: `.emergent.host` / `.preview.emergentagent.com`; no staging env.
- [U] "Enable the Google+ API", "billing required for consent screen" (stale externally too).

**062 pinecone** — [U] provider-side roll-up (environment-name credential reads stale for serverless Pinecone).

**063 emergent-auth-built-in**
- [C] "Email/password only; social login on the roadmap; use Auth0/Clerk for OAuth today" — KB (integrations/emergent-auth.md): **Google sign-in and Phone OTP work today**.
- [C] Fully in-app auth UI/storage story — KB: login runs on the hosted **auth.emergentagent.com** page with non-removable "Secured by Emergent" branding at every tier (omitted).
- [U] Session/hashing/rate-limit internals — not in KB.

**064 firebase**
- [S] `VITE_FIREBASE_*` convention — KB conventions are `NEXT_PUBLIC_`/`REACT_APP_*`; VITE_ appears nowhere.
- [U] Provider-side specifics.

**065 auth0**
- [C] "Team members inherit access without seeing raw values" — KB: values are visible to anyone with deployment access.
- [S] `localhost:3000/callback` for development — dev happens on the cloud preview URL.
- [S] "Credentials automatically included in production" — only on first deploy; separate afterwards.
- [U] Provider-side specifics.

**066 clerk** — [U] roll-up; "dev keys allow unlimited users" is dubious externally (Clerk caps dev instances).

### AI, media & productivity integrations (docs 067–082) — 40 findings

**067 openai**
- [C] Model table GPT-4 Turbo / GPT-4 / GPT-3.5 — KB catalog: GPT-6/5.x lineup; recommended default GPT-5.4. Entirely stale.
- [C] Key added in "Integrations → AI Providers" — KB: Account Settings → Universal API Key → **Custom LLM Keys**.
- [U] Provider-side roll-up.

**068 claude**
- [C] "Universal Key includes a small markup" — KB: **no markup**, same per-token rates.
- [C] Claude 3.5/3 model table (200K) — KB: Fable 5.x/Opus 5/Sonnet 5/4.6 etc. (up to 1M); recommended Sonnet 4.6. Stale.
- [C] "Available on all plans" — KB: model access is tier-gated; free users blocked from compute-intensive models.
- [S] Balance "in Settings → Billing" — KB: Account Settings → Universal API Key / Credit Usage.
- [U] Model-picker grouping, retry internals.

**069 gemini**
- [C] "You need a Google Cloud account + Gemini key" — KB: Emergent-managed; own key optional.
- [C] Gemini 1.x model table — KB: Gemini 2.5–3.8 lineup; recommended 3.1 Pro Preview. Stale.
- [C] "AI Providers" panel — as above, Custom LLM Keys.
- [U] Precedence/rate-limit/`GOOGLE_API_KEY` claims.

**070 slack** — [C] webhook examples on `emergent.run`; [S] "Emergent serverless functions" (no such product; Kubernetes); [U] Slack-side roll-up.

**071 twilio** — [U] provider-side roll-up only.

**072 resend** — [S] omits KB's "fullstack-only, not on Expo" caveat; [U] provider-side roll-up.

**073 sendgrid** — [U] roll-up incl. a "mark variable as secret" step that doesn't exist (values auto-masked).

**074 giphy** — [S] presented as a first-class integration; not in the KB's list (generic public-API path at best); [U] provider-side roll-up.

**075 elevenlabs** — [S] omits the **1.5-credits-per-playbook-run** cost; [U] provider-side roll-up.

**076 google-suite** — [C] "Integrations → Google Suite" panel with callback URL — KB: set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` as env vars; [U] Google-side roll-up.

**077 figma** — [U] roll-up (public-file requirement, timings, conversion table not in KB).

**078 cloudinary** — [C] settings-panel setup — KB: env vars; [U] provider-side roll-up.

**079 ai-media-generation**
- [C] Imagen 4 at "2×" — KB: **5×** multiplier.
- [C] GPT Image 1 at "1.5×" — KB: **standard rate**.
- [C] Sora 2 "up to 20 seconds" — KB: **4/8/12 seconds** (default 4).
- [C] "All media generation through the Universal Key" — KB: server-side agent tools; direct Veo calls via the Key are **blocked**.
- [S] Omits the free-tier block on heavy models (veo, sora-2, etc.).
- [U] Other multipliers (Sora 10×, Veo 8×…), Suno 4 min, format conversion, CDN URL rewriting.

**080 notion** — [C] "Settings → Integrations → Connect" — KB: Preview → Manage + env vars; [U] Notion-side roll-up.

**081 airtable** — [C] left-sidebar Integrations + "press I" + connection check UI — none exists; [U] Airtable-side roll-up.

**082 shopify**
- [C] Single Admin API token flow — KB (integrations/shopify.md): current flow is Dev Dashboard custom app with **Client ID + Secret**; the `shpat_` token is **legacy**.
- [U] Rate limits/webhook steps; omits `read_all_orders` requirement and ~1.5-credit playbook cost.

### Troubleshooting & FAQs (docs 085–092) — ~30 findings

**085 design-inconsistencies**
- [S] "Agent fixes and deploys; you see it live immediately" — agent changes hit **preview**; publishing is explicit.
- [U] Drag-to-resize responsive preview — not in KB.

**086 missing-functionality**
- [S] Tells everyone to open `.env`/file tree — the code editor is a **paid-plan** feature.

**087 deployment-issues**
- [C] `MONGODB_URI`/`DATABASE_URL` in an "Environment pane" — KB: `MONGO_URL` etc.; Secrets tab.
- [C] "Dynamic deploy IPs; allowlist 0.0.0.0/0 or ask support" — KB: **fixed egress IPs** self-served at app.emergent.sh/ip-addresses.
- [C] Health check "200 on /health or /; timeout configurable on some plans" — KB: frontend 200 + backend <500 at /health; fixed 10s/3 retries/20s.
- [C] "CNAME to the deployment hostname" for custom domains — KB: two A records for root; CNAME for www; never CNAME the preview URL.
- [S] Out of credits → "queued indefinitely" — KB: rejected with `INSUFFICIENT_CREDITS`; live apps can still redeploy at low balance.
- [U] Per-plan runtimes/build windows/Docker options; a status page in the workspace footer — not in KB.

**088 deployment-pipeline-failures**
- [C] Migrate step = user schema migrations — KB: preview→production **data dump/restore**, first deploy & Replace only.
- [C] Telegram 409 = webhook conflicts — KB: **polling with >1 instance**; fix is webhook mode or single poller.
- [C] "Delete and re-add the secret in the UI" — keys can't be deleted from the panel.
- [S] "Failed checks roll the deployment back" — KB: deployment marked failed; the live app just keeps running (plus auto failure-recovery agent).
- [U] Support-adjustable migration/memory/probe settings; /ready endpoint convention — not in KB.

**089 works-in-preview-breaks-in-production**
- [C] URLs `*.preview.emergent.run` / `my-app.emergent.run` — KB: `{slug}.preview.emergentagent.com` / `{slug}.emergent.host`.
- [C] Dual Preview/Production env columns + manual copy — KB: no such panel; vars flow automatically on deploy (real failure: key set in pod but not written to `.env`).
- [S] "Use a Docker base image that includes the tool" — user Docker base images aren't an option; the gap is declared package deps.

**090 app-slow-crashing-cold-starting**
- [C] PDB table "Free 0 / Starter 1 / Pro 2 / Enterprise custom" — KB: tiers are Starter–Elite; PDB minAvailable=1 for Tier 1+.
- [C] "`MONGODB_URI` and `PORT` injected; custom vars in Settings" — KB: `MONGO_URL`, `DB_NAME`, `REACT_APP_BACKEND_URL`, `CORS_ORIGINS`; Secrets tab.
- [U] Scaling thresholds (70% CPU, queue >10, scale-to-zero 10 min), 5–15s cold starts, log retention 7/30 days, per-tier min replicas, multi-stage Docker — none in KB.

**091 glossary**
- [C] ECU as user-facing unit with **overage billing** — KB: credits (1 USD = 5); no overage — jobs pause.
- [C] Job = per-request work item, auto-split — KB: a Job is the app/task with its own conversation/code/deployment.
- [C] Replace "tears down, new URLs, reconfigure everything, support-only" — KB: normal zero-downtime blue-green swap; secrets carried; domains persist.
- [C] Universal Key "200+ providers" — KB: 44+ models, 7 providers.
- [C] "Connect any Mongo client with the URI" — KB: cluster only accepts Emergent-internal connections.
- [S] Maxx description + missing Pro gate; Expo "may need your own account"/BYO keystore (contradicts managed model); custom agents for everyone (KB: Pro).
- [U] "Starter plan 2–5 projects/month"; preview not indexed; tool-picker/billing-panel claims.

**092 faqs** (the largest doc)
- [C] Stack "Node.js, serverless, GraphQL, hosted on Vercel, auth by Clerk/Auth0" — KB: Python/FastAPI + React in Docker on **Emergent's Kubernetes** (Cloud Build → emergent.host, Cloudflare); built-in auth is Emergent Auth.
- [C] "Deployment happens automatically; live URL immediately" — KB: explicit Publish, 10–15 min pipeline, tier fee.
- [C] "Connect directly with Mongo clients" — KB: external connections rejected; use the Database Manager.
- [C] "Configure backup policies in Atlas settings" — KB: platform-managed backups; no Atlas console access.
- [C] "Importing existing codebases is not directly supported" — KB: GitHub import at new-job creation IS supported (OAuth, public URL, or agent).
- [C] Free "10 credits/month" — KB: daily grants (above).
- [C] "New env vars need a replace-deploy" — KB: ordinary redeploy picks up new `.env` keys.
- [C→flag] "Redeploy at no extra charge" — KB internally split on this; per guardrail 3, **keep "no extra charge"** and add `[NEEDS-REVIEW: redeploy billing — KB sources disagree]`.
- [C] "Background process migrates your DB automatically" — KB: manual runbook (above).
- [S] "Change your app name on the emergent domain" — subdomains can't be changed.
- [S] "Dedicated Atlas database; export anytime" — default is a shared cluster (dedicated is an upgrade); production export isn't self-serve.
- [S] "Export code and self-host" — paid plans only; no download button.
- [S] "Cancel → free or read-only tier" — KB: Free plan; no read-only tier.
- [U] Slack channels/onboarding sessions/feedback widget/feature voting; deployment changelogs — not in KB.
- *(The FAQ's privacy, GDPR, data-deletion, and compliance answers are out of scope for this pass — separate review track; flag them per guardrail 1 and leave unchanged.)*

*(Docs 093 getting-help, 094 account-security-login, 095 app-takedown: out of scope — separate review track.)*

### Wingman (docs 096–099) — OUT OF SCOPE (reviewed separately)

*Docs 096–099 are reviewed in a separate track and must not be edited from this report.*

### Privacy & GDPR (docs 118–129) — OUT OF SCOPE (reviewed separately)

*Docs 118–129 are reviewed in a separate track (against the privacy answer sheet and SOP) and must not be edited from this report.*

### Beginner journey (docs 100–117) — 33 findings

**100 start-with-your-idea**
- [C] "Describe the issue; the agent fixes and puts it live automatically" — KB: agent has no deployment access; you click Re-publish.
- [S] Prompts "produce a live URL" — first build produces a **preview**; live needs a paid Publish (min 50 credits).
- [U] "Working app in under 20 minutes" — not in KB.

**101 talk-it-through (free)**
- [C] Premise that discussion/planning is free — KB: **everything bills per-token**; no free-discussion exemption.
- [U] "Prompt windows (Starter/Pro/Infinite)" again — fabricated; Maxx "2–4×" + missing Pro gate.
- [S] Window names wrong (Full Stack App/Mobile App/Landing Page/Brainstorm; permanent choice); "partial-generation credits can't be refunded" (KB: doom-loop rebates, Bug Rebates, case-by-case failed-deploy handling).

**102 watch-your-app-come-alive**
- [U] Standard post-prompt questionnaire (API key choice, "plan first?") — closest is opt-in Plan Mode, still rolling out.
- [S] "Plan first = before credits are spent" — planning bills too.
- [C] Rollback "History panel in the sidebar, pick a snapshot" — KB: chat-timeline rollback (see systemic #8).

**103, 104, 110, 117** — no findings.

**105 put-your-app-live**
- [C] URL "`your-app-name.emergent.app`" — `.emergent.host`.
- [C] "Find the Deploy button" — renamed **Publish**.
- [S] "50 credits/month" flat — tiered 50–1,100; also shutdown removes the custom-domain link (not restored on redeploy) and revived deployments reset to base tier — caveats omitted.

**106 share-it-with-the-world**
- [C] URL `.emergent.app` — `.emergent.host`.
- [U] Green/Yellow/Red health states + Errors tab; real-time full request logs (App Analytics is Pro-only) — not in KB.

**107 get-paid**
- [C] "Tell the agent: Set STRIPE_SECRET_KEY to sk_test_xxx" (real keys in chat) — KB: agent sets **placeholders**; real keys go in Republish → Secrets; export doc 111 itself warns chat goes to the AI provider.
- [S] Skips the managed Stripe sandbox + KYC flow; read-only injected keys.
- [U] Payout timing (2–7 days then 2 days) — not in KB.

**108 connect-your-tools**
- [S] "Credentials never in your app's code; injected at runtime" — true for production; in **preview** they live in `.env` in the code.

**109 use-your-own-web-address**
- [C] Free address `.emergent.build` — `.emergent.host`.
- [C] "Dedicated IP" + one A record — two shared A records; Auto-Link (recommended) absent.
- [S] UI path/status names wrong (Manage Publishes → Domain tab; Check Status; Pending/Active-Verified/Failed).

**111 keep-it-safe**
- [C] support@emergent.**dev** — support@emergent.sh.
- [C] "Add variable in the env panel; the agent never sees values" — UI can't add keys; in preview the agent reads/writes `.env`, so it does see them.
- [S] "Never used to train LLMs" unconditional — AI-training/compliance wording: leave unchanged and flag per guardrail 1 (separate review track).

**112 write-prompts-that-work**
- [S] Plan Mode presented as universally available — gradually rolling out; unavailable in Brainstorm/E3/E4.

**113 when-something-breaks**
- [C] History-panel rollback that "makes it live automatically" + "Before rollback" snapshot — see systemic #8; rollback is preview-only, erases, republish needed.
- [U] Rollback restores "keys, dependencies, configuration" itemization — not documented.

**114 add-login-user-accounts**
- [C] "Google sign-in requires Google Cloud Console setup" — Emergent Auth includes Google with **no keys**.
- [S] "Every app includes authentication automatically" — auth is added by asking the agent, not shipped by default.
- [U] `User` collection name; automatic reset-link emails for your app's end users — not documented.

**115 checkpoints-undo-anything**
- [C] "Fork copies structure but not data (empty DB)" — KB: fork clones the volume **including data**.
- [C] "Fork carries chat history to the fork point" — KB: summarized, not carried.
- [C] Same fabricated rollback model as 113 (+ "restarts on its own; URL unchanged" conflating preview rollback with deployment rollback).
- [U] Fork secret/env-var itemization; the ✅/❌ rollback-contents list — not documented.

**116 how-credits-work (basics)**
- [C] "Monthly credits roll over 3 cycles" — no rollover.
- [C] "Going live costs credits by build time and app size" — fixed tier fees.
- [C] Per-prompt max in Settings → Billing with approve/split — KB: per-session budget on the task form; agent pauses when exhausted.
- [S] Credit meter location/categories wrong (Account Settings → Credit Usage; agent runs / deployments / Universal Key…).
- [U] 20% email alert; pre-commit cost estimates; Maxx 2–4×; DB/testing incremental charges — none in KB.

---

## Part 3 — Docs with no findings

011 previewing-iterating · 103 make-it-yours · 104 try-it-before-you-share-it · 110 get-found-on-google · 117 get-your-first-users

(The billing/streaks/regional-pricing and getting-started sections are the worst-aligned; the third-party integration guides carry the most NEEDS-REVIEW flags.)

---

*Method: the export documents were each read in full and their concrete factual claims (plan gating, prices, credits, limits, URLs, workflows, feature availability) verified against the KB articles by independent review passes. Wingman, privacy/GDPR, and support/account docs were removed from this report's scope after the fact — they are handled in a separate review track. Structural/tonal differences and mere omissions were excluded by instruction, except omissions of caveats the KB itself marks as important.*

---

## Appendix A — Canonical facts sheet (self-contained; use these values in every edit and rewrite)

### Domains & URLs
- Platform: **app.emergent.sh** · Help site: **help.emergent.sh**
- Production apps: **`<appname>.emergent.host`** · Previews: **`{slug}.preview.emergentagent.com`**
- There is NO `.emergent.run`, `.emergent.app`, `.emergent.build`, `.emergent.dev`, `emergent.ai`, or `api.emergentagi.com`.
- Egress/deployment IP list (self-serve): **app.emergent.sh/ip-addresses** · DB viewer: **mongoview.emergent.host** (opens only from inside Emergent, never by direct URL)

### Contacts
- Support: **support@emergent.sh** (only support address) · Partners: apply at **partners.emergent.sh**
- Support channels: in-app live chat (Emmy — primary/fastest), Discord community, support email. No documented response-time SLA.

### Plans, credits & pricing
- Subscription plans: **Free, Standard, Pro, Enterprise** (Enterprise via waitlist/inquiry). There are no Indie/Startup/Starter/Developer/Team plans.
- Free tier credits: **10 on the first day, then 5/day, max 30 per rolling 30-day window** (daily, not monthly).
- Credit value: **1 USD = 5 credits** (~₹17, R$1.20, ₩300, €0.86, £0.74 per credit). One combined balance (internal unit ECU); no per-currency balances.
- **Monthly subscription credits do NOT roll over** (refill-to-cap at each cycle). **Purchased top-up credits never expire.** Promotional/boost credits carry a shown expiry date.
- **No overage billing.** At zero credits the job pauses; it **auto-resumes** after top-up. Low-balance notice: in-app below 5 credits.
- Payment providers route by region: Stripe, Razorpay (India), PagBrasil (Brazil), Paddle (always processes USD), RevenueCat. Crypto via **Stripe crypto checkout** (USDC; USDT per Stripe). Gateway changes go through support. B2C: no GST/VAT invoices, no invoice edits. India entity: **AGIONE TECHNOLOGIES PRIVATE LIMITED**; US: **Emergent Labs Inc.** Statements say "Emergent" or "Agione".
- Refunds: prorated dollar refunds of **unused subscription credits** (cancel first; deployment usage subtracted); top-up credits are non-refundable. support@emergent.sh.
- Referrals: referee gets 5 credits **on signup**; referrer gets 50 when the referee subscribes; cap 20 referrals / $200 (from 2026-04-03). Partner program: 20% of referred revenue **for 6 months**.
- Streaks (paid Standard/Pro, gradual rollout): day measured in **your local timezone**; miss one full day = streak ends (no grace period; 8 PM local at-risk warning). Day 7: one-time **10-credit** bonus. After day 7, a mystery box every **14 days** (days 21, 35, …) worth **10–20 credits**. Repair tokens: 1 at enrollment + 1 per 5 active days (cap 10); **manual** repair of yesterday only. Credit rewards must be **claimed** on the rewards screen.

### Deployment
- The button is **Publish** (first time) / **Republish** — "Deploy" no longer exists as a label.
- Tiers: **Starter 50 · Launch 125 · Grow 225 · Scale 450 · Elite 1,100 credits/month** (fixed monthly fees; not per-hour, not by build time). Starter = 0.05 vCPU / 200 MB; Scale = 2 vCPU / 8 GB. Minimum 50 credits to start a deploy. Tier change = ~2-min no-build redeploy. Redeploys/republishes and tier changes: write "free of charge" + the guardrail-3 redeploy-billing flag (KB sources disagree).
- Pipeline (~10–15 min): build → mongodb_migrate → manage_secrets → deploy → transfer_files → health_check → switch_traffic → cleanup. Health check: frontend HTTP 200, backend < 500 at `/health` (10s timeout, 3 retries). A failed deploy leaves the previous version live (no rollback event).
- **Replace** = zero-downtime blue-green swap of a different job onto a live app (user secrets carried over; DB choice: keep or fresh). **Redeploy/Republish** = update the same app. **Deployment rollback** = revert to one of up to **3** previous images (URL/DB unchanged).
- Preview ≠ production: preview sleeps after **30 min** inactivity; preview and production env vars are separate after the first deploy (first deploy carries `.env` values across).
- Default subdomains **cannot be renamed**; deleted URLs are never reused. Shutdown removes the custom-domain link (not restored by redeploy; re-add manually) and revived deployments reset to the base tier.
- Custom domains: recommended **Auto-Link (Entri)**; manual = **two A records 162.159.142.117 and 172.66.2.113** (+ `www` CNAME). No dedicated IPs. SSL via **Cloudflare Custom Hostnames** (not Let's Encrypt). If the user's DNS is on Cloudflare, the records must stay **DNS-only (gray cloud) permanently** or they hit Error 1014. Status check: Manage Publishes → Domain tab → Check Status (Pending / Active-Verified / Failed).

### Environment variables & secrets
- Platform-managed keys: **`MONGO_URL`**, **`DB_NAME`**, **`REACT_APP_BACKEND_URL`**, **`CORS_ORIGINS`** (never `MONGODB_URI`/`DATABASE_URL`/`PORT` as platform keys). Universal Key secret: **`EMERGENT_LLM_KEY`**.
- The Secrets UI (Manage Publishes → Secrets) can only **edit values of existing keys** — it cannot add or delete keys. New keys: ask the agent to add them to `.env`, then republish. Values are masked but revealable/copyable by anyone with deployment access.
- In preview, env vars live in `.env` files inside the app code (the agent reads/writes them); `.env` is auto-excluded from GitHub pushes; a full-history secret scan blocks pushes containing credentials.
- Real third-party keys are entered in **Republish → Secrets → Custom keys** — never pasted into chat (chat content goes to the AI provider; the agent uses placeholders).

### Database & storage
- Built-in MongoDB. First deploy **migrates preview data** to a production Atlas instance (shared cluster by default; "Dedicated Database" is a paid upgrade). External Mongo clients **cannot connect** to the managed cluster; browse/edit via the Database Manager (it edits live data, no undo). Production dump: not self-serve — use your own external DB or `mongodump` from an allowlisted machine after migration.
- Migrating to your own DB is a **manual runbook**: export data → import into your Atlas → allowlist Emergent's egress IPs → set `MONGO_URL`/`DB_NAME` under System keys → republish. No automatic sync/cutover; no `DATABASE_URL` auto-detection.
- **Emergent Object Store: upload, download, list only — deletion is not supported; uploaded files are currently permanent.** Quota 5 GB; exceeding it returns error **439** (`storage_quota_exceeded`). For permanent/large storage the documented alternative is your own AWS S3 / GCS via your keys.

### Agents & models
- **E-1, E-2, E-3 are agents** (different workflows), chosen from the agent dropdown at job creation; the LLM is a separate model selector. E-1 = default step-by-step builder; E-3 = opt-in autonomous (runs E-1 as sub-agent). Agents cannot be switched mid-conversation (forking keeps the agent).
- **Maxx Mode is Pro-only**; deeper reasoning, "significantly more credits" (no published multiplier).
- Limits: iteration cap **10,000**; wall-clock limit **4 hours**. Stop reasons: `end_turn` = finished; `handoff` = handed to another agent. Auto-HITL **auto-answers** the agent's questions in autonomous runs (it does not pause for the user).
- App types at job creation: **Full Stack App, Mobile App (Expo/React Native), Landing Page, Brainstorm** — the choice is permanent per job. Backends are Python/FastAPI or Next.js API routes (no Express, no serverless-functions product, no Vercel; apps run in Docker on Emergent's Kubernetes).
- Plan Mode is opt-in from the composer (Build/Plan switcher), still rolling out, unavailable in Brainstorm/E3/E4. **All agent turns bill per-token — planning and discussion included; nothing about chatting is free.** Budget control = per-session budget on the task form (agent pauses when exhausted). Rebates exist: automatic doom-loop rebates, Bug Rebates, case-by-case failed-deploy handling.
- Rollback (conversation): per-message **Rollback button in the chat timeline**; erases chat+code after that message (option: messages only); affects **preview only** — republish to update the live app. No sidebar History panel, no "Before rollback" snapshot, no roll-forward.
- Fork: **Fork button in the chat input bar** (web only) → new job with a **cloned volume (code AND data)**; chat history is **summarized** (editable), not carried verbatim.
- Universal LLM Key: prefix **`sk-emergent-`**; managed in Account Settings → Universal API Key; **no markup** (platform per-token rates); balance funded from Emergent credits (auto-recharge **transfers** from the main balance, default trigger 5 credits); controls need Standard/Pro; free tier blocked from compute-intensive models. 44+ models / 7 providers. Current model families: Claude Fable 5.x / Opus 5 / Sonnet 5 / 4.6 / Haiku 4.5; GPT-6 / GPT-5.x; Gemini 2.5–3.8. (Claude 3.x, GPT-4/3.5, Gemini 1.x are stale — remove.)
- Media generation runs through server-side agent tools (not the Universal Key; direct Veo calls via the Key are blocked). Imagen 4 bills at **5×** base rate; GPT Image 1 at **standard rate**; Sora 2 videos are **4/8/12 s** (default 4). Free tier cannot use the heavy media models.
- Custom tools = **MCP servers**: Account Settings → Manage Agents → MCP tab (JSON `mcpServers` config, "Verify and Save"); tool cache **5 minutes**; public MCPs are admin-created only. No `tools/` directory, no Emergent-as-MCP endpoint, no port 8013.

### GitHub / GitLab / Bitbucket
- **Push-only** integration: Save button in the chat input bar → Save to GitHub (account → repo → branch). Requires **paid plan (Standard+)**. The agent never pushes on its own. Env vars/secrets and node_modules excluded; full-history secret scan blocks bad pushes.
- Conflict dialog: **Force Push / Create Branch & Push (auto-named `conflict_DDMMYY_HHMM`) / Cancel** — no pull-and-merge; reconcile on GitHub.com.
- **Importing a repo is only possible when starting a NEW job** (connected account, public URL, or ask the agent). No mid-job pull, no sync, no in-platform merge/PR. There is **no Download/archive button** — code leaves via GitHub push or copying from the VS Code view (all plans).

### Mobile (Expo)
- All mobile apps are **Expo/React Native** (no Swift/Kotlin/Capacitor/Flutter builds). Preview: embedded preview, **Expo Go** QR (scan inside Expo Go, not the camera app; newer projects use device-code auth), or cloud device streaming — free and cloud-hosted (no same-Wi-Fi requirement).
- **Emergent manages the Expo/EAS account**: users never create an Expo account, install eas-cli, buy EAS credits, or edit **eas.json** (do not modify it). Native builds (APK/AAB/IPA) require a **paid Emergent plan** and are triggered from the Publish panel, built from the **last deployed code** (fix → redeploy → rebuild).
- Signing is Emergent-managed. Pre-existing Play Store app: **Emergent provides a public `.pem`**; the user requests an upload-key reset in Play Console (1–2 business days); own-keystore cases go through support. iOS: TestFlight upload is done for you; the App Store Connect API key is auto-created and Emergent-managed; the `.p8` a user supplies is the **APNs push key**, uploaded **at build time** (missing push credentials fail the build).
- Bundle ID / package name: seeded into `app.json` at setup (`com.emergent.<words>.<suffix>`), editable in the pre-populated first-build form; app name locks after first build; display name changeable anytime; the user registers the package name in their own Play Console.
- Backend changes ship by **redeploying** (no store review); JS-only changes can go OTA; store submission is only for native changes. Store fees: Apple 30% (15% small-business program); Google 15–30% by revenue tier. Mobile IAP integration: **RevenueCat**. On Expo projects, Stripe and Paystack are hidden (Razorpay and PayPal remain).
- The **Emergent native mobile app is currently not distributed** on the App Store/Play (existing installs keep working); mobile access is the web/PWA at app.emergent.sh. In the mobile web app: three tabs (My Apps, Home, Account); new apps can be started; projects and Brainstorm cannot.
- Web↔mobile: **web → mobile only**, via the preview toggle / Deploy panel "Add Mobile App" (feature-flagged; excludes Next.js projects); it forks into a mono setup where both platforms **share the same backend** and are managed in one project. Mobile → web = rebuild. Conversion is one-way; no rollback.

### Auth
- **Emergent Auth** (built-in, ask the agent to add it): email/password, **Google sign-in (no keys needed)**, and **phone OTP** — today, not "on the roadmap". Login runs on the hosted **auth.emergentagent.com** page; the "Secured by Emergent" branding **cannot be removed on any tier**. Own Google Cloud credentials are optional (consent-screen branding / extra scopes like Gmail/Calendar via `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env vars). Auth0/Clerk/Firebase Auth remain available as integrations.

### Integrations (general)
- Managed from **Preview → Manage → Integrations** (tiles), or by asking the agent; keys go into `.env` via the agent (see env-var rules). There is no "Settings → Integrations" panel, no "AI Providers" panel, no left-sidebar Integrations entry, no per-integration Connect/Verify UI.
- Bring-your-own LLM keys: Account Settings → Universal API Key → **Custom LLM Keys**.
- The managed **Stripe sandbox** injects read-only `STRIPE_*` keys (`STRIPE_MODE`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ACCOUNT_ID`); the user claims the sandbox + completes KYC to test; going live is platform-handled (or unlink the sandbox to use own keys).
- Shopify: Dev Dashboard custom app with **Admin API Client ID + Secret** (the single `shpat_` token is legacy); `read_all_orders` scope needed for orders older than 60 days; ~1.5 credits per playbook run. ElevenLabs playbook: 1.5 credits/run. Resend: fullstack-only (not on Expo). Supported-integration list does NOT include Mixpanel, Sentry, PostHog, Zapier, Neon, Upstash, or Giphy as first-class integrations (any public API can still be wired generically by the agent).

### Cancellation
- On cancellation the account reverts to the **Free plan** (no read-only tier); projects/code preserved; live deployments stay up only while credits cover the tier fee.
- (Account deletion, takedown/moderation, and other support/trust topics: separate review track — see guardrail 1.)

*(Wingman and privacy/GDPR facts are intentionally absent from this sheet — those docs are reviewed in a separate track and must not be edited from this report.)*
