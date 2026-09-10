import os, re, asyncio, datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

PID='d901b4ab-a271-4aff-b63a-bf92d73b9bb0'
KEY='sk-emergent-a8b62F4847aF04dD7C'
LOG='/app/memory/factcheck_pass2.log'
RB='[NEEDS-REVIEW: rollback cap "up to 3" — KB sources disagree; product to confirm]'
UV='[NEEDS-REVIEW: unverified — PM/support to confirm]'

def global_fix(t):
    for bad in ['.emergent.run','.emergent.app','.emergent.build','.emergent.dev']:
        t=t.replace(bad,'.emergent.host')
    t=t.replace('app.emergent.ai','app.emergent.sh').replace('emergent.ai','emergent.sh')
    t=t.replace('support@emergent.sh','\x00')
    for e in ['support@emergent.host','support@emergent.com','support@emergent.dev','support@emergent.build']:
        t=t.replace(e,'support@emergent.sh')
    t=t.replace('\x00','support@emergent.sh')
    t=re.sub(r'partners@emergent\.[a-z]+','partners.emergent.sh',t)
    t=re.sub(r'(sales|billing|enterprise|hello|contact)@emergent\.[a-z]+','support@emergent.sh',t)
    return t

FINDINGS={
'database-mongodb':'CONFLICT: text says "Replace tears down the entire production environment and rebuilds it." Correct: Replace is a ZERO-DOWNTIME BLUE-GREEN SWAP ACROSS TWO JOBS (fork job1->job2, traffic switches over, old job torn down). Align with how deployment-types / preview-vs-deployed already describe Replace.',
'database-data-on-mobile':'CONFLICT: "Each app gets a dedicated MongoDB cluster" and fork="cloned cluster" are wrong. Correct: default is a SHARED Atlas cluster (Dedicated Database is a paid upgrade); each app gets its own DB on shared infrastructure. Fix both claims.',
'how-the-agent-runs-workflow-stop-reasons':'CONFLICT: Auto-HITL described as "pauses and shows a highlighted question; answer it and the workflow resumes." Correct: in autonomous runs Auto-HITL AUTO-ANSWERS the agent\'s ask_human ("assume a sensible default and continue") so the run is never blocked; it does NOT pause for the user.\nFLAG (keep wording, prepend '+UV+' on its own line before each): (a) the claim E-3 "runs E-1 as a sub-agent" internally; (b) the "5-20 credits per asset" media cost.',
'claude':'CONFLICT: context window "up to 1M tokens" for Haiku 4.5 and standard Sonnet 4.6 is wrong. Correct: Haiku 4.5 = 200K; standard Sonnet 4.6 = 200K (only a separate "Sonnet 4.6 1M" variant reaches 1M). Leave Fable/Opus 5/Sonnet 5 at 1M (correct).',
'missing-functionality':'CONFLICT (appears twice): "the code editor / file tree is a paid-plan feature." Correct: the VS Code editor / code viewing is available on ALL plans including Free; only GitHub PUSH requires Standard+. Fix both occurrences.',
'app-slow-crashing-or-cold-starting':'CONFLICT: the PDB/tier table invents an "Enterprise" deployment tier and says "use Starter tier or higher" for PDB. Correct: deployment tiers are Starter/Launch/Grow/Scale/Elite (NO "Enterprise" deployment tier); PDB minAvailable=1 begins at Launch (Tier 1); Free has no PDB.',
'glossary-of-emergent-terms':'CONFLICT (two): (a) "MCP tool RESULTS cached 5 minutes" -> it is the tool LISTS that cache 5 minutes (MCP_TOOLS_CACHE_TTL), not results. (b) Custom agents "configured via MCP servers in Manage Agents" -> custom agents use a 4-STEP WIZARD (system prompt, tools, sub-agents); MCP servers are a separate feature. Keep "Pro-only" and Manage Agents location (correct).\nFLAG: if it states rollback is capped at "up to 3" as a hard limit, prepend this before it: '+RB,
'checkpoints-undo-anything':'CONFLICT: still describes "roll forward again" and a "History panel" of snapshots. Correct exactly like sibling doc when-something-breaks: rollback ERASES everything forward, is PREVIEW-ONLY, has NO roll-forward and NO "Before rollback" snapshot; it lives on the PER-MESSAGE chat timeline (a Rollback button on each message), not a sidebar History panel.',
'the-chat-to-deployment-flow':'FLAG: the claim "revert to one of up to 3 recent deployments via Republish" states a hard cap a KB source disputes. Keep the wording but prepend on its own line before it: '+RB,
'deployment-types':'FLAG: the claim "Rollback - up to 3 previous production images" states a hard cap a KB source disputes. Keep the wording but prepend on its own line before it: '+RB,
'deployment-plan-levels':'FLAG: the doc states Scale "2 vCPU / 8 GB" and intermediate per-tier credit values as flat facts while its own note hedges the middle tiers as "not published". Be consistent: prepend '+UV+' before the unhedged intermediate spec/credit values.',
'the-universal-llm-key':'CONFLICT (wording): auto-recharge "default trigger of 5 credits" - 5 is the configurable MINIMUM threshold, not a default. Reword: the trigger is configurable, minimum 5 credits.',
'push-notifications':'FLAG: "Users who tap a notification convert at 3-5x the rate..." is an invented statistic. Prepend '+UV+' on its own line before it (keep wording).',
'referrals-partners-program':'CONFLICT + FLAG: (a) referral cap "20 referrals / $200 per billing period" -> the KB cap is a TOTAL/LIFETIME cap, not per billing period; correct "per billing period" to a total cap. (b) "referee must not have held a paid plan" is invented -> prepend '+UV+' before it. (c) referee reward is on SIGNUP (5 credits), not "on upgrade" - correct if timed to upgrade.',
'paystack':'CONFLICT: "Emergent validates the x-paystack-signature automatically" is wrong (contradicts the doc\'s own "always verify" line). Correct: the agent SCAFFOLDS signature verification into your code - the app verifies it; Emergent does not auto-validate.\nLOCALHOST: reword "webhooks can\'t reach local development servers unless you tunnel" - Emergent has no local dev; the dev target is the cloud preview at {slug}.preview.emergentagent.com (public URL reachable by webhooks).',
'paddle':'CONFLICT: the doc offers a PHP SDK option - supported deployable backends are Python/FastAPI and Next.js only. Replace/remove the PHP option with a supported stack.',
'airtable':'CONFLICT: invented connect UI - "click Connect -> Emergent tests the token -> green \'Connected\' checkmark." Correct: integrations appear as tiles with an ADD button; there is no live token validation or "Connected" state.',
'connect-your-tools':'CONFLICT: the doc lists Sentry as an available integration - Sentry is NOT in the KB catalogue. Remove Sentry (Google Analytics in the same group is fine to keep).',
'write-prompts-that-work':'SOFTEN/FLAG: "Plan mode unavailable in Brainstorm, E3, and E4" - the KB only says Plan Mode is feature-flagged / rolling out; that specific exclusion list is not stated. Reword to "still rolling out (feature-flagged), so it may not be available everywhere" and prepend '+UV+' before any retained specific exclusion list.',
'faqs':'CONFLICT: "if under 50 credits at renewal your balance can go negative and the app may be taken down" - there is NO such 50-credit threshold. Correct: the real rule is a deployment charge can take an already-<=0 balance negative (jobs pause at zero; no 50-credit renewal takedown threshold).\nFLAG: if this FAQ states rollback is capped at "up to 3", prepend this before it: '+RB,
'paypal':'LOCALHOST: the prerequisite "your app deployed or running locally in Emergent" is wrong - Emergent has no local dev; reword to the cloud preview ({slug}.preview.emergentagent.com) or the deployed app.',
'google-auth':'LOCALHOST: the doc lists http://localhost:3000/api/auth/callback/google "(for local testing)" as an Emergent dev redirect URI - Emergent dev is the cloud preview, not localhost. Reword the dev redirect URI to the cloud preview URL ({slug}.preview.emergentagent.com/...). Note: Google sign-in is Emergent-managed (no keys needed); own credentials optional - do not contradict that.',
'talk-it-through':'CONFLICT: the body was corrected (all agent turns bill per-token) but the leading H1/title still reads "Talk it through (free)". Remove "(free)" so it reads "Talk it through". Do not re-add any "free discussion" claim.',
}

SYS="""You are a meticulous documentation editor applying a short second-pass fact-check to one Emergent documentation page. Apply ONLY the corrections in the findings provided; change nothing else - leave all other text verbatim.
RULES:
- CONFLICT: replace the wrong fact with the corrected value stated in the finding.
- FLAG items: do NOT change the wording of the claim; insert the EXACT marker given in the finding on its own line immediately before the sentence/paragraph containing the claim.
- Never invent a date, SLA, price, or limit not stated in the finding.
- Domains: production <appname>.emergent.host, previews {slug}.preview.emergentagent.com, platform app.emergent.sh; support email support@emergent.sh only; deploy button is Publish/Republish.
- PRESERVE all MDX/Markdown structure: component tags (<Callout>,<Step>,<Steps>,<Tip>,<Note>,<Warning>,<Info>,<Card>,<CardGroup>), headings, tables, and the leading '# Title' line. Keep every existing [NEEDS-REVIEW: ...] marker already in the doc.
- Output ONLY the corrected document body as Markdown/MDX. No preamble, no explanation, no code fences."""

async def call_llm(slug, body, finding):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    user=(f"Apply these targeted corrections to the page '{slug}'. Change only what they require; leave the rest verbatim.\n\n"
          f"=== FINDINGS ===\n{finding}\n\n=== CURRENT PAGE BODY ===\n{body}\n\n=== END. Return the corrected body only. ===")
    chat=LlmChat(api_key=KEY, session_id=f"fc2-{slug}", system_message=SYS).with_model("anthropic","claude-sonnet-4-6")
    out=(await chat.send_message(UserMessage(text=user))).strip()
    if out.startswith('```'):
        out=re.sub(r'^```[a-zA-Z]*\n','',out); out=re.sub(r'\n```$','',out)
    return out.strip()

def log(m):
    open(LOG,'a').write(m+'\n'); print(m,flush=True)

async def main():
    db=AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    open(LOG,'w').write(f"RUN {datetime.datetime.now(datetime.timezone.utc).isoformat()}\n")
    by={d['slug']:d for d in await db.documents.find({'project_id':PID,'deleted_at':None},{'_id':0,'id':1,'slug':1,'content':1}).to_list(2000)}
    sem=asyncio.Semaphore(6); done=[]; failed=[]
    async def worker(slug):
        async with sem:
            d=by[slug]; body=d['content'] or ''
            try:
                new=global_fix(await call_llm(slug, body, FINDINGS[slug]))
                if not new or len(new)<40: failed.append((slug,'short')); log(f"FAIL {slug} short {len(new)}"); return
                await db.documents.update_one({'id':d['id']},{'$set':{'content':new,'status':'in_review','updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}})
                done.append(slug); log(f"OK {slug} {len(body)}->{len(new)} flags={new.count('[NEEDS-REVIEW')}")
            except Exception as e:
                failed.append((slug,str(e))); log(f"FAIL {slug}: {e}")
    await asyncio.gather(*[worker(s) for s in FINDINGS])
    # deterministic: Support-email + domain fix on the 3 support/account docs (user asked to keep Support in scope)
    for slug in ['account-security-login','getting-help-support-community','app-takedown-content-moderation']:
        d=by.get(slug)
        if not d: continue
        new=global_fix(d['content'] or '')
        if new!=d['content']:
            await db.documents.update_one({'id':d['id']},{'$set':{'content':new,'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}})
            log(f"EMAILFIX {slug} changed")
        else:
            log(f"EMAILFIX {slug} no-change")
    log(f"DONE done={len(done)} failed={len(failed)} {failed}")

asyncio.run(main())
