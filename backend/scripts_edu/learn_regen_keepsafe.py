"""Regenerate keep-it-safe.json with a DATA-SAFETY focus (the first pass drifted into
mobile/Expo testing). Grounded strictly in the data-privacy / data-leakage / account-security
source docs, with only a light pre-publish-testing nudge. Overwrites learn_pages2/keep-it-safe.json."""
import asyncio, json, os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
from learn_generate import SYSTEM, fetch_sources, MODEL, EMERGENT_LLM_KEY

HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(HERE, "..", ".env"))
OUT = os.path.join(HERE, "learn_pages2", "keep-it-safe.json")

TITLE = "Keep it safe"
DESC = "Simple checks so your users' data stays protected."
SRCS = ["data-privacy", "data-leakage", "account-security-login"]
OUTLINE = (
    "This is a DATA-SAFETY article, NOT a mobile-testing article. Do NOT write about Expo Go, "
    "QR codes, EAS builds, iOS/Android device testing, or app-store submission - that content belongs "
    "elsewhere. Focus entirely on keeping user data safe. Cover, using ONLY the source material:\n"
    "1. Never paste secrets (API keys, tokens, passwords) into the chat - use the Env panel instead, "
    "where values are encrypted and never seen by the agent.\n"
    "2. What the AI actually sees vs. never sees (code and schema yes; secret values and real database "
    "records no) - reassure the reader their data is private and not used to train models.\n"
    "3. Put private data behind login: if each person should only see their own data, add user accounts "
    "(link to /add-login-user-accounts).\n"
    "4. A short, friendly pre-launch safety checklist drawn only from the sources (secrets in Env not code, "
    "test your login/permissions flow, remember your deployed app is public by URL).\n"
    "Keep it beginner-friendly and short. Placeholder anything the source does not support with a "
    "<Callout type=\"warning\" title=\"Draft - needs review\">."
)
NEXT = "write-prompts-that-work"


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    proj = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = proj["id"]
    sources = await fetch_sources(db, pid, SRCS)
    p = [f"Article title (outcome): {TITLE}", f"One-line promise: {DESC}", "",
         "What this article should cover (outline):", OUTLINE, "",
         "SOURCE MATERIAL (the ONLY facts you may use about Emergent):", "=" * 40, sources, "=" * 40, "",
         "Write the short beginner article now, grounded strictly in the SOURCE MATERIAL above. "
         "Placeholder anything the source does not support.",
         "", f"End with a 'Next up' link: <CardGroup cols={{1}}><Card title=\"Next up\" icon=\"arrow-right\" href=\"/{NEXT}\">Continue the path</Card></CardGroup>"]
    prompt = "\n".join(p)
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id="learn2_keep_safe_v2", system_message=SYSTEM).with_model(*MODEL)
    md = (await chat.send_message(UserMessage(text=prompt))).strip()
    if md.startswith("```"):
        md = "\n".join(md.split("\n")[1:])
        if md.rstrip().endswith("```"):
            md = md.rstrip()[:-3]
    md = md.strip()
    assert md, "empty"
    json.dump({"title": TITLE, "slug": "keep-it-safe", "content": md, "description": DESC}, open(OUT, "w"), indent=1)
    print(f"OK keep-it-safe regenerated ({len(md)} chars)")


if __name__ == "__main__":
    asyncio.run(main())
