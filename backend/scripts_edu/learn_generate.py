"""Grounded generation for the new 'Learn the Basics' tab (Rail 1 - Get Started, 7 articles).
Each article is written ONLY from the content of verified existing docs (pulled from Mongo).
Anything not supported by the source is emitted as a clearly-marked placeholder callout.
Output -> learn_pages/<slug>.json  (resumable)."""
import asyncio, json, os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

HERE = os.path.dirname(__file__)
load_dotenv(os.path.join(HERE, "..", ".env"))
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
MODEL = ("anthropic", "claude-sonnet-4-5-20250929")
OUT = os.path.join(HERE, "learn_pages")
os.makedirs(OUT, exist_ok=True)

# title, slug, one-line desc, [source slugs], outline (from the user's plan), next slug
ARTICLES = [
    ("Start with your idea", "start-with-your-idea",
     "Describe what you want in one sentence - plain English is enough.",
     ["your-first-build-walkthrough", "starting-the-process", "what-and-how", "what-kind-of-apps-you-can-build"],
     "Anatomy of a first prompt (what + who + one core action). Show 2-3 example prompts and the kind of app each creates. Explain what NOT to worry about at the start (design polish, tech stack, database choice). End with a simple fill-in-the-blank prompt template the reader can copy.",
     "talk-it-through"),
    ("Talk it through (free)", "talk-it-through",
     "Not sure yet? Discuss your idea with the agent before building - it costs nothing.",
     ["which-prompt-window-should-i-use", "how-the-agent-runs-workflow-stop-reasons", "how-credits-work"],
     "When to discuss vs. jump straight to building. Make clear that discussing/planning is free (address the fear that every message costs credits). How a discussion naturally turns into a build.",
     "watch-your-app-come-alive"),
    ("Watch your app come alive", "watch-your-app-come-alive",
     "See your idea turn into a real, working app in minutes.",
     ["your-first-build-walkthrough", "previewing-iterating", "how-the-agent-runs-workflow-stop-reasons", "rollback-when-the-agent-goes-wrong"],
     "What the agent's clarifying questions are for. What 'the agent is working' looks like and roughly how long the first build takes. What checkpoint/auto-save means (your safety net). The first preview moment - seeing your app run.",
     "make-it-yours"),
    ("Make it yours", "make-it-yours",
     "Change colors, text, and features by asking - one change at a time.",
     ["previewing-iterating", "best-practices", "debugging-testing-with-the-agent"],
     "The golden rule: one change at a time. How to point at what you see ('the button on the top right'). When to keep iterating vs. start fresh. (A library of copy-paste tweak prompts and the enhance feature are requested but must be placeholdered unless the source docs describe them.)",
     "try-it-before-you-share-it"),
    ("Try it before you share it", "try-it-before-you-share-it",
     "Click through your app like a real user and catch anything odd.",
     ["debugging-testing-with-the-agent", "pre-publish-health-check", "previewing-iterating"],
     "Click every button, submit every form. Check it on a phone-sized view. A short pre-share checklist. How to report what's broken to the agent (describe what you did, expected, and what happened; attach a screenshot).",
     "put-your-app-live"),
    ("Put your app live", "put-your-app-live",
     "One click gets you a real link on the internet.",
     ["deploying-web", "deployment-types", "preview-vs-deployed-separate", "pre-deploy-pre-publish-health-check"],
     "The publish/deploy click-through. What the resulting URL is. That updating later does not break your live app (preview vs deployed are separate). How unpublishing works if covered.",
     "share-it-with-the-world"),
    ("Share it with the world", "share-it-with-the-world",
     "Send your link, get your first feedback, and see visits.",
     ["deploying-web", "deployment-types", "preview-vs-deployed-separate"],
     "Share the live link and what visitors see. (Watching first visits/analytics, asking testers for feedback, and turning feedback into prompts are requested but must be placeholdered unless the source docs describe them.)",
     None),
]

SYSTEM = (
    "You are a technical writer creating a SHORT, beginner-friendly 'outcome' article for the Emergent platform's "
    "new 'Learn the Basics' learning path (think Replit Learn / Lovable). Tone: warm, plain-English, encouraging, "
    "for a total non-coder building their first app.\n\n"
    "CRITICAL GROUNDING RULE - read carefully:\n"
    "- You will be given SOURCE MATERIAL copied from existing, verified documentation pages.\n"
    "- Every Emergent-specific fact, feature name, step, button label, price, limit or capability you state MUST be "
    "directly supported by that SOURCE MATERIAL. Do NOT add anything from your own knowledge of Emergent.\n"
    "- If the outline asks for something the SOURCE MATERIAL does not cover (e.g. a specific prompt library, an "
    "analytics/visits view, an 'enhance' button, feedback templates, screenshots, videos), DO NOT invent it. Instead "
    "insert a placeholder callout exactly like: <Callout type=\"warning\" title=\"Draft - needs review\">This section "
    "(TOPIC) needs product confirmation before publishing.</Callout>\n"
    "- Universal, non-Emergent-specific common sense (e.g. 'test on your phone') is allowed but keep it minimal.\n\n"
    "LENGTH & STRUCTURE: keep it short (a beginner should read it in ~2 minutes). Start at H2, no top-level H1. "
    "Use this skeleton where it fits: a one-line 'What you'll get' opener; 3-5 short Steps or short paragraphs; a "
    "'If something looks wrong' mini-section if the source supports it.\n\n"
    "PLACEHOLDERS FOR MEDIA: wherever a screenshot or video belongs, insert <Callout type=\"info\" title=\"Video coming "
    "soon\">A short screen recording will go here.</Callout> (video) or <Callout type=\"info\" title=\"Screenshot coming "
    "soon\">Screenshot to be added.</Callout> (image).\n\n"
    "COMPONENTS (render natively, use sparingly): <Steps><Step title=\"...\">..</Step></Steps>, "
    "<Callout type=\"note|tip|warning|info|success\" title=\"...\">..</Callout>, "
    "<CardGroup cols={2}><Card title=\"..\" icon=\"rocket\" href=\"/slug\">..</Card></CardGroup>.\n"
    "OUTPUT: only the Markdown/MDX body. No surrounding code fence. No title heading. No em dashes (use spaced hyphens)."
)


async def fetch_sources(db, pid, slugs):
    out = []
    for s in slugs:
        d = await db.documents.find_one({"project_id": pid, "slug": s}, {"_id": 0, "title": 1, "content": 1})
        if d:
            body = d["content"][:4500]
            out.append(f"### SOURCE: {d['title']}  (link with /{s})\n{body}")
    return "\n\n".join(out)


def build_prompt(title, desc, outline, sources, next_slug):
    p = [f"Article title (outcome): {title}", f"One-line promise: {desc}", "",
         "What this article should cover (outline):", outline, "",
         "SOURCE MATERIAL (the ONLY facts you may use about Emergent):", "=" * 40, sources, "=" * 40, "",
         "Write the short beginner article now, grounded strictly in the SOURCE MATERIAL above. "
         "Placeholder anything the source does not support."]
    if next_slug:
        p += ["", f"End the article with a 'Next up' link: <CardGroup cols={{1}}><Card title=\"Next up\" icon=\"arrow-right\" href=\"/{next_slug}\">Continue the path</Card></CardGroup>"]
    return "\n".join(p)


async def gen_one(sem, db, pid, art):
    title, slug, desc, srcs, outline, nxt = art
    fp = os.path.join(OUT, f"{slug}.json")
    if os.path.exists(fp):
        print("skip", slug); return
    sources = await fetch_sources(db, pid, srcs)
    prompt = build_prompt(title, desc, outline, sources, nxt)
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"learn_{slug}", system_message=SYSTEM).with_model(*MODEL)
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
