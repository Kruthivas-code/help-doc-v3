import os, re, sys, asyncio, json, datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

PID = 'd901b4ab-a271-4aff-b63a-bf92d73b9bb0'
KEY = 'sk-emergent-a8b62F4847aF04dD7C'
REPORT = '/app/memory/factcheck.md'
LOG = '/app/memory/factcheck_run.log'
FLAGLOG = '/app/memory/needs_review_checklist.md'

EXCLUDE = {
    'what-is-wingman','channels-web-telegram-whatsapp-imessage-slack','custom-mcp-integrations','integrations-scheduled-tasks',
    'privacy-gdpr-overview','data-processing-agreement','sub-processors','where-your-data-is-stored','ai-model-training',
    'data-isolation-leakage','deletion-retention','data-subject-rights','security-breach-audit','special-category-data',
    'regulators-supervisory-authorities','your-data-ownership',
    'getting-help-support-community','account-security-login','app-takedown-content-moderation',
}
CLEAN = {'previewing-iterating','make-it-yours','try-it-before-you-share-it','get-found-on-google','get-your-first-users'}
REWRITE = {
    'which-prompt-window-should-i-use','compare-the-4-windows','understanding-models-e1-e2-e3-maxx',
    'building-from-the-emergent-mobile-app','the-universal-llm-key','deployment-types','deployment-plan-levels',
    'migrate-to-your-own-database','web-mobile-conversion-canonical','publishing-to-the-stores','troubleshooting',
    'web-mobile-conversion-ref','credit-expiry-recharging','streaks-rewards','payment-methods-regional-billing',
    'pull-from-github-with-caution','glossary-of-emergent-terms',
}
INDEX_OVERRIDE = {
    '024':'scheduled-tasks-background-jobs-in-your-app','034':'monetisation-in-app-purchases-subscriptions',
    '036':'build-generation-for-a-pre-existing-play-store-app','050':'how-the-agent-runs-workflow-stop-reasons',
    '079':'ai-media-generation-image-video-audio','089':'works-in-preview-but-breaks-in-production',
    '090':'app-slow-crashing-or-cold-starting','091':'glossary-of-emergent-terms','116':'how-credits-work-basics',
    '041':'how-credits-work','037':'troubleshooting',
}

# --- deterministic global domain/email fixes (applied to every in-scope doc) ---
def global_fix(t):
    for bad in ['.emergent.run', '.emergent.app', '.emergent.build', '.emergent.dev']:
        t = t.replace(bad, '.emergent.host')
    t = t.replace('app.emergent.ai', 'app.emergent.sh').replace('emergent.ai', 'emergent.sh')
    t = t.replace('support@emergent.sh', '\x00')  # protect already-correct
    for e in ['support@emergent.host','support@emergent.com','support@emergent.dev','support@emergent.build']:
        t = t.replace(e, 'support@emergent.sh')
    t = t.replace('\x00', 'support@emergent.sh')
    t = re.sub(r'partners@emergent\.[a-z]+', 'partners.emergent.sh', t)
    t = re.sub(r'(sales|billing|enterprise|hello|contact)@emergent\.[a-z]+', 'support@emergent.sh', t)
    return t

def parse_findings():
    txt = open(REPORT).read()
    part2 = txt[txt.index('## Part 2'):txt.index('## Part 3')]
    appx = txt[txt.index('## Appendix A'):]
    lines = part2.splitlines()
    blocks = {}
    cur = None
    hdr = re.compile(r'^\*\*(\d{3}) ([^*]+?)\*\*(.*)$')
    for ln in lines:
        m = hdr.match(ln)
        if m:
            idx = m.group(1); rest = (m.group(2) + m.group(3))
            slugtok = m.group(2).strip().split()[0].strip('()')
            cur = (idx, slugtok)
            blocks[cur] = [ln]
        elif cur and (ln.startswith('### ') or ln.startswith('## ')):
            cur = None
        elif cur is not None:
            blocks[cur].append(ln)
    return blocks, appx

def resolve(idx, slugtok, project_slugs):
    if idx in INDEX_OVERRIDE:
        return INDEX_OVERRIDE[idx]
    if slugtok in project_slugs:
        return slugtok
    cand = [s for s in project_slugs if s.startswith(slugtok)]
    if len(cand) == 1:
        return cand[0]
    return None

SYS = """You are a meticulous documentation editor applying a fact-check report to one Emergent documentation page.
The report and its Canonical Facts Sheet (Appendix A) are the ONLY source of truth. Do not use any outside knowledge of Emergent.

RULES:
- Apply every [C] CONFLICT: replace the wrong fact with the corrected value from the finding / Appendix A.
- Apply every [S] SLIGHTLY-OFF: adjust wording or add the missing caveat named in the finding.
- For every [U] UNVERIFIED: DO NOT change, soften, or remove the wording of that claim. Insert the EXACT marker `[NEEDS-REVIEW: unverified — PM/support to confirm]` on its own line immediately before the sentence/paragraph containing the claim. (Exception: an invented domain or email inside such a claim is still corrected to the canonical value.)
- Any certification, compliance, GDPR, data-protection, or AI-training sentence: leave the wording unchanged and put `[NEEDS-REVIEW: compliance/privacy wording — separate review track]` on its own line immediately before it.
- Redeploy/republish cost: state it is "free of charge" (beyond the monthly tier fee) followed by `[NEEDS-REVIEW: redeploy billing — KB sources disagree]`.
- Project ownership: state it "cannot be transferred" (stays with the creating account) followed by `[NEEDS-REVIEW: ownership transfer — KB sources disagree]`.
- Object storage: any promise of file deletion must be corrected to "deletion of uploaded assets is not currently supported (uploads are permanent)".
- NEVER invent a date, SLA, retention period, price, or limit not stated in the finding or Appendix A.
- Domains: production `<appname>.emergent.host`, previews `{slug}.preview.emergentagent.com`, platform `app.emergent.sh`. Support email is `support@emergent.sh` only. The deploy button is `Publish`/`Republish` (never "Deploy"). Plan names are Free/Standard/Pro/Enterprise. Deployment tiers are Starter/Launch/Grow/Scale/Elite.
- PRESERVE the document's MDX/Markdown structure: keep component tags (<Callout>, <Step>, <Steps>, <Tip>, <Note>, <Warning>, <Info>, <Card>, <CardGroup>, etc.), headings, tables, and the leading `# Title` if present. Keep the same topic and section flow. Only change facts.
- Output ONLY the corrected document body as Markdown/MDX. No preamble, no explanation, no surrounding code fences."""

async def call_llm(slug, body, findings_text, appx, rewrite):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    mode = ("REWRITE this page's body from scratch using the Canonical Facts Sheet + findings below "
            "(its core premise is wrong). Keep the same topic, title, and MDX component style."
            if rewrite else
            "Apply the findings below to the page body. Change ONLY what the findings and rules require; leave everything else verbatim.")
    fk = findings_text if findings_text else "(No specific per-doc findings. Apply only the global rules where relevant.)"
    user = (f"{mode}\n\n=== FINDINGS FOR THIS PAGE ({slug}) ===\n{fk}\n\n"
            f"=== CANONICAL FACTS SHEET (Appendix A) ===\n{appx}\n\n"
            f"=== CURRENT PAGE BODY ===\n{body}\n\n=== END. Return the corrected body only. ===")
    chat = LlmChat(api_key=KEY, session_id=f"fc-{slug}", system_message=SYS).with_model("anthropic","claude-sonnet-4-6")
    resp = await chat.send_message(UserMessage(text=user))
    out = resp.strip()
    if out.startswith('```'):
        out = re.sub(r'^```[a-zA-Z]*\n', '', out); out = re.sub(r'\n```$', '', out)
    return out.strip()

def log(msg):
    with open(LOG,'a') as f:
        f.write(msg+'\n')
    print(msg, flush=True)

async def main():
    validate = '--validate' in sys.argv
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    docs = await db.documents.find({'project_id':PID,'deleted_at':None},{'_id':0,'id':1,'slug':1,'content':1}).to_list(2000)
    pslugs = {d['slug'] for d in docs}
    by_slug = {d['slug']: d for d in docs}
    blocks, appx = parse_findings()

    findings_map = {}     # project_slug -> findings text
    unmatched = []
    for (idx, slugtok), lns in blocks.items():
        ps = resolve(idx, slugtok, pslugs)
        if ps is None:
            unmatched.append(f"{idx} {slugtok}")
        else:
            findings_map[ps] = "\n".join(lns).strip()

    inscope = sorted(pslugs - EXCLUDE)
    log(f"project docs={len(pslugs)} in-scope={len(inscope)} excluded={len(EXCLUDE)} "
        f"clean={len(CLEAN)} rewrite={len(REWRITE)} findings-blocks={len(blocks)} mapped={len(findings_map)} unmatched={unmatched}")
    # sanity: rewrite/clean/exclude slugs all exist
    for label,st in [('REWRITE',REWRITE),('CLEAN',CLEAN),('EXCLUDE',EXCLUDE)]:
        missing = [s for s in st if s not in pslugs]
        if missing: log(f"WARNING {label} slugs not in project: {missing}")
    if validate:
        withf = [s for s in inscope if s in findings_map]
        nof   = [s for s in inscope if s not in findings_map]
        log(f"in-scope WITH findings={len(withf)}  in-scope WITHOUT findings={len(nof)}: {nof}")
        return

    open(LOG,'a').write(f"\n===== RUN {datetime.datetime.now(datetime.timezone.utc).isoformat()} =====\n")
    DONEF='/app/memory/factcheck_done.txt'
    done_set=set()
    if os.path.exists(DONEF):
        done_set={x.strip() for x in open(DONEF) if x.strip()}
    todo=[s for s in inscope if s not in done_set]
    log(f"resuming: {len(done_set)} already done, {len(todo)} to process")
    sem=asyncio.Semaphore(6)
    counter={'n':len(done_set)}; failed=[]
    async def worker(slug):
        async with sem:
            d=by_slug[slug]; body=d['content'] or ''
            try:
                if slug in CLEAN:
                    new=global_fix(body); tag='clean(global-only)'
                else:
                    new=await call_llm(slug, body, findings_map.get(slug,''), appx, slug in REWRITE)
                    new=global_fix(new); tag='rewrite' if slug in REWRITE else 'patched'
                if not new or len(new)<40:
                    failed.append((slug,'empty/short')); log(f"FAIL {slug}: short output ({len(new)})"); return
                await db.documents.update_one({'id':d['id']},{'$set':{'content':new,'status':'in_review',
                    'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}})
                counter['n']+=1
                with open(DONEF,'a') as f: f.write(slug+'\n')
                log(f"OK [{counter['n']}/{len(inscope)}] {slug} [{tag}] {len(body)}->{len(new)} flags={new.count('[NEEDS-REVIEW')}")
            except Exception as e:
                failed.append((slug,str(e))); log(f"FAIL {slug}: {e}")
    await asyncio.gather(*[worker(s) for s in todo])
    log(f"DONE processed={counter['n']} failed={len(failed)} {failed}")

    # consolidated NEEDS-REVIEW checklist
    docs2 = await db.documents.find({'project_id':PID,'deleted_at':None},{'_id':0,'slug':1,'title':1,'content':1}).to_list(2000)
    with open(FLAGLOG,'w') as f:
        f.write("# NEEDS-REVIEW checklist — fact-check pass "+datetime.datetime.now(datetime.timezone.utc).date().isoformat()+"\n\n")
        total=0
        for d in sorted(docs2,key=lambda x:x['slug']):
            if d['slug'] in EXCLUDE: continue
            flags=re.findall(r'\[NEEDS-REVIEW:[^\]]+\]', d['content'] or '')
            if not flags: continue
            f.write(f"## {d['title']}  (`{d['slug']}`) — {len(flags)}\n")
            for fl in flags:
                f.write(f"- {fl}\n"); total+=1
            f.write("\n")
        f.write(f"\n**Total NEEDS-REVIEW flags: {total}**\n")
        if unmatched:
            f.write("\n## Report slugs with no matching project doc (skipped)\n")
            for u in unmatched: f.write(f"- {u}\n")
    log(f"CHECKLIST written to {FLAGLOG}")

asyncio.run(main())
