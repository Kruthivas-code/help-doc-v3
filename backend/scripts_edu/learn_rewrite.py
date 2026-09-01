"""Plain-language rewrite of the 'Learn the Basics' tab (18 pages), grounded on existing content.
Only rewords jargon + weaves in approved additions (B1/B3, B2, B6). No invented features."""
import asyncio, os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
from learn_generate import SYSTEM, MODEL, EMERGENT_LLM_KEY

HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(HERE, "..", ".env"))

TAB1 = ['start-with-your-idea', 'talk-it-through', 'watch-your-app-come-alive', 'make-it-yours',
        'try-it-before-you-share-it', 'put-your-app-live', 'share-it-with-the-world', 'get-paid',
        'connect-your-tools', 'use-your-own-web-address', 'get-found-on-google', 'keep-it-safe',
        'write-prompts-that-work', 'when-something-breaks', 'add-login-user-accounts',
        'checkpoints-undo-anything', 'how-credits-work-basics', 'get-your-first-users']

RULES = """Rewrite this documentation page for NON-TECHNICAL beginners.

STRICT RULES:
- Keep the SAME structure, headings, links, images, callouts, front-matter and overall meaning. Do NOT add or remove sections or headings.
- Only change WORDING to remove/soften technical jargon:
  * "UX" / "UI" -> "how your app looks and feels"
  * "deploy" / "publish" / "put live" / "put it live" -> "making it live" (adapt grammar naturally)
  * "environment variable" / "secret" -> "a private key for your service"
  * The FIRST time "API" appears on the page write "a connection to another service (API)"; after that just "API".
  * The FIRST time "schema" or "database" appears write "where your app stores its information (database)"; after that just "database".
  * Leave the word "iterate" as-is.
- Do NOT invent any product features, numbers, or claims. Use only what is already in the text.
- Return ONLY the rewritten markdown page content, no commentary, no code fences."""

EXTRA = {
    "talk-it-through": (
        "\nADDITIONALLY: weave in ONE short, natural sentence (no new heading): if the reader only has a "
        "rough idea, they can use plan mode to shape it into a clear plan before building, because plan "
        "mode already knows the whole context of their app."),
    "write-prompts-that-work": (
        "\nADDITIONALLY, woven into the existing flow (NO new section headings):\n"
        "1) A short paragraph: you don't need a perfect request to begin. Start from a rough idea and use "
        "plan mode to turn it into a clear plan. Plan mode has the full context of your app, so it shapes a "
        "better plan than trying to write the whole request in one shot. Describe the flow plainly: describe "
        "your rough idea -> plan mode asks a few questions and proposes a plan -> you approve -> it builds. "
        "Do NOT suggest using an outside AI (like ChatGPT) to write the prompt; point to plan mode instead.\n"
        "2) Two or three ready-made copy-paste example prompt starters for common app types (for example a "
        "simple booking app, a small online store, a personal portfolio) that a beginner can copy and adapt, "
        "shown as examples within the existing flow."),
    "how-credits-work-basics": (
        "\nADDITIONALLY: near the top, weave in a short 'costs at a glance' intro in plain everyday words "
        "(no new heading), grounded only in what the page already says about credits."),
}


async def rewrite_one(chat_key, content, slug):
    prompt = RULES + EXTRA.get(slug, "") + "\n\n---PAGE CONTENT---\n" + content
    chat = LlmChat(api_key=chat_key, session_id=f"rewrite_{slug}", system_message=SYSTEM).with_model(*MODEL)
    md = (await chat.send_message(UserMessage(text=prompt))).strip()
    if md.startswith("```"):
        md = "\n".join(md.split("\n")[1:])
        if md.rstrip().endswith("```"):
            md = md.rstrip()[:-3]
    return md.strip()


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    proj = await db.projects.find_one({"name": "Emergent"}, {"_id": 0}); pid = proj["id"]
    for slug in TAB1:
        d = await db.documents.find_one({"project_id": pid, "slug": slug}, {"_id": 0, "content": 1})
        if not d:
            print("MISSING", slug); continue
        try:
            new = await rewrite_one(EMERGENT_LLM_KEY, d["content"], slug)
            if not new or len(new) < 50:
                print("SKIP (empty)", slug); continue
            await db.documents.update_one({"project_id": pid, "slug": slug}, {"$set": {"content": new}})
            print(f"OK {slug} ({len(new)} chars)")
        except Exception as e:
            print(f"FAIL {slug}: {str(e)[:150]}")
    print("DONE")


if __name__ == "__main__":
    asyncio.run(main())
