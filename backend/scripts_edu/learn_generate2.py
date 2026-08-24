"""Grounded generation for Rail 2 (Grow Your App, 9) + 2 Reference pages of the Learn the Basics tab.
Same grounding rules as learn_generate.py. Sourceless topics get a scaffold-only prompt so nothing
Emergent-specific is fabricated. Output -> learn_pages2/<slug>.json (resumable)."""
import asyncio, json, os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
from learn_generate import SYSTEM, fetch_sources, MODEL, EMERGENT_LLM_KEY

HERE = os.path.dirname(__file__)
load_dotenv(os.path.join(HERE, "..", ".env"))
OUT = os.path.join(HERE, "learn_pages2")
os.makedirs(OUT, exist_ok=True)

NO_SOURCE = ("(No existing Emergent documentation covers this topic. You MUST NOT state any Emergent-specific "
             "fact, feature, UI label, price or capability. Produce a short SCAFFOLD only: the outcome intro, "
             "then the outline points as H2 headings, and under each heading a "
             "<Callout type=\"warning\" title=\"Draft - needs review\"> that names exactly what content must be "
             "added and confirmed. You may add at most one sentence of universally-true, clearly-generic guidance "
             "per section, but never anything specific to Emergent.)")

# title, slug, desc, [source slugs] (empty = sourceless), outline, next_slug
ARTICLES = [
    ("Get paid", "get-paid",
     "Accept payments in your app with Stripe - no code, no finance degree.",
     ["stripe", "monetisation-in-app-purchases-subscriptions", "payment-methods-regional-billing"],
     "How to add payments with Stripe (connect walkthrough). The critical difference between test mode and real money. The kind of prompt to type (e.g. add a paid subscription). When money actually reaches your bank. Keep it beginner-safe and stress test mode first.",
     "connect-your-tools"),
    ("Connect your tools", "connect-your-tools",
     "Plug in Gmail, Sheets, Slack, and more so your app works with what you use.",
     ["key-integrations-catalogue", "mcps-connectors", "custom-mcp-integrations", "integrations-scheduled-tasks"],
     "What integrations/connectors are in one plain metaphor. A few of the most useful integrations with a one-line use case each (only ones the source lists). The prompt pattern for asking the agent to connect a tool.",
     "use-your-own-web-address"),
    ("Use your own web address", "use-your-own-web-address",
     "Turn a default app address into your own custom domain.",
     ["custom-domain"],
     "Buying a domain vs connecting one you already own. What DNS is in one line, with reassurance that changes can take time. The step-by-step to connect a custom domain as described in the source. Placeholder any registrar-specific screenshots.",
     "get-found-on-google"),
    ("Get found on Google", "get-found-on-google",
     "Help people discover your app when they search.",
     [],  # SEO - no source doc
     "What SEO is in two lines. Any built-in SEO checks. The prompt to optimize for search. Google Search Console verification. Honest expectations (weeks, not days).",
     "keep-it-safe"),
    ("Keep it safe", "keep-it-safe",
     "Simple checks so your users' data stays protected.",
     ["account-security-login", "data-privacy", "data-leakage", "pre-publish-health-check"],
     "Running the security / pre-publish health check. What the results mean in plain words. A few simple safety rules (never paste secrets in chat, use login for private data, run the check before publishing) - only if the source supports them.",
     "write-prompts-that-work"),
    ("Write prompts that work", "write-prompts-that-work",
     "Small wording changes, dramatically better results.",
     ["best-practices", "your-first-build-walkthrough"],
     "A few prompt patterns with before/after (only patterns the source supports). Fixing vs adding features. Using screenshots and reference links in prompts. (A 20-prompt copy-paste library is requested but must be placeholdered - the source does not contain one.)",
     "when-something-breaks"),
    ("When something breaks", "when-something-breaks",
     "What to do when your app errors or looks wrong - fix it with one message.",
     ["troubleshooting", "rollback-when-the-agent-goes-wrong", "debugging-testing-with-the-agent"],
     "Reassure: nothing is lost thanks to checkpoints. The fix-it prompt formula (what you did + what you expected + what happened). When to Restore instead of asking for a fix. Using error text and screenshots as prompts.",
     "add-login-user-accounts"),
    ("Add login & user accounts", "add-login-user-accounts",
     "Let people sign up and have their own data.",
     ["emergent-auth-built-in", "google-auth", "account-security-login"],
     "Why you need accounts (private data per user). The prompt to add login. Email vs Google sign-in options (only those the source describes). How you see your users. Keep it simple.",
     "checkpoints-undo-anything"),
    ("Checkpoints: undo anything", "checkpoints-undo-anything",
     "Every change is saved automatically. Go back anytime - nothing is ever lost.",
     ["rollback-when-the-agent-goes-wrong", "forking"],
     "Auto-save after every change (checkpoints). How to Restore to an earlier point (walkthrough from the source). Duplicating/forking a project to experiment safely. Frame the whole thing as a safety net that makes it safe to experiment.",
     None),
    # ---- Reference group (standalone) ----
    ("How credits work", "how-credits-work-basics",
     "What uses credits, what doesn't, and what a first app typically costs.",
     ["how-credits-work"],
     "A short beginner summary: what credits are, what actions consume them, how deployment is billed, and how to top up. Link to the full [How credits work](/how-credits-work) reference for depth. Do not restate everything - keep it a friendly overview.",
     None),
    ("Get your first users", "get-your-first-users",
     "A simple launch checklist to get your app in front of real people.",
     [],  # no source doc
     "A pre-launch checklist. Where to share your app to get first users. Asking for feedback. Turning early feedback into next steps.",
     None),
]


async def gen_one(sem, db, pid, art):
    title, slug, desc, srcs, outline, nxt = art
    fp = os.path.join(OUT, f"{slug}.json")
    if os.path.exists(fp):
        print("skip", slug); return
    sources = (await fetch_sources(db, pid, srcs)) if srcs else NO_SOURCE
    p = [f"Article title (outcome): {title}", f"One-line promise: {desc}", "",
         "What this article should cover (outline):", outline, "",
         "SOURCE MATERIAL (the ONLY facts you may use about Emergent):", "=" * 40, sources, "=" * 40, "",
         "Write the short beginner article now, grounded strictly in the SOURCE MATERIAL above. "
         "Placeholder anything the source does not support."]
    if nxt:
        p += ["", f"End with a 'Next up' link: <CardGroup cols={{1}}><Card title=\"Next up\" icon=\"arrow-right\" href=\"/{nxt}\">Continue the path</Card></CardGroup>"]
    prompt = "\n".join(p)
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"learn2_{slug}", system_message=SYSTEM).with_model(*MODEL)
                md = (await chat.send_message(UserMessage(text=prompt))).strip()
                if md.startswith("```"):
                    md = "\n".join(md.split("\n")[1:])
                    if md.rstrip().endswith("```"):
                        md = md.rstrip()[:-3]
                md = md.strip()
                if not md:
                    raise ValueError("empty")
                json.dump({"title": title, "slug": slug, "content": md, "description": desc}, open(fp, "w"), indent=1)
                print(f"OK {slug} ({len(md)} chars)")
                return
            except Exception as e:
                print(f"retry {slug} {attempt+1}: {e}")
                await asyncio.sleep(3 * (attempt + 1))
        print("FAIL", slug)


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    proj = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = proj["id"]
    sem = asyncio.Semaphore(2)
    await asyncio.gather(*[gen_one(sem, db, pid, a) for a in ARTICLES])
    print("DONE")


if __name__ == "__main__":
    asyncio.run(main())
