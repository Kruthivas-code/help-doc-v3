"""Generate full Markdown docs for every page in tree.json via Claude (Universal Key).
Checkpoints to generated.json so it is resumable. Concurrent with a semaphore."""
import asyncio, json, os, sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from emergentintegrations.llm.chat import LlmChat, UserMessage

HERE = os.path.dirname(__file__)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
MODEL = ("anthropic", "claude-sonnet-4-5-20250929")
CONCURRENCY = 2

SYSTEM = (
    "You are an expert technical writer creating documentation pages for the Emergent platform "
    "(an agentic vibe-coding platform where users describe an app in chat and AI agents build, test and deploy it). "
    "Take the author's brief and produce a polished, accurate, well-formatted Markdown documentation page.\n\n"
    "STRICT OUTPUT RULES:\n"
    "1. Output ONLY the Markdown document — no preface, no explanation, no surrounding code fence.\n"
    "2. Do NOT include a top-level `# Title` heading (the platform renders the page title separately). Start at H2.\n"
    "3. Keep paragraphs short and scannable. Use `inline code` for identifiers, commands, env vars, UI labels.\n"
    "4. Be accurate and do not invent specific numbers, prices or limits that are not in the brief; when the brief gives a number, keep it. If a detail is uncertain, describe it generally rather than fabricating.\n\n"
    "PLATFORM-COMPATIBLE MDX COMPONENTS (use these — they render natively):\n"
    "  • Callouts: <Callout type=\"note|tip|warning|error|info|success\" title=\"Optional\">body</Callout> (shorthand <Note>,<Tip>,<Info>,<Warning>,<Success>,<Danger> also work).\n"
    "  • Steps: <Steps><Step title=\"...\">body</Step>...</Steps>\n"
    "  • Card grids: <CardGroup cols={2}><Card title=\"...\" icon=\"rocket\" href=\"/slug\">desc</Card></CardGroup> (lucide icon names, no emoji).\n"
    "  • Columns: <Columns cols={2}>...<Card>...</Card></Columns>\n"
    "  • Tabs: <Tabs><Tab title=\"...\">body</Tab></Tabs>\n"
    "  • Code groups: <CodeGroup>```bash\\n...```\\n```python\\n...```</CodeGroup>\n"
    "  • Accordions: <AccordionGroup><Accordion title=\"Question?\">answer</Accordion></AccordionGroup>\n"
    "  • Media: <YouTube id=\"ID\" />, <Video src=\"url\" />, <Figure src=\"url\" caption=\"...\" />.\n\n"
    "COMPONENT SELECTION BY INTENT:\n"
    "  - A sequence/procedure → <Steps>.\n"
    "  - A comparison of options → a Markdown table (columns = options, rows = attributes).\n"
    "  - A set of Q&A → <AccordionGroup>.\n"
    "  - An important caveat / data-loss / gotcha → <Callout type=\"warning\"> (or error for destructive).\n"
    "  - A reassuring aside for a user worry → <Callout type=\"info\"> or <Callout type=\"tip\">.\n"
    "  - Parallel choices/links to other pages → <CardGroup> of <Card href=\"/slug\">.\n"
    "  - Do NOT wrap the whole document in a code fence."
)

TYPE_HINT = {
    "Comparison": "This is a COMPARISON page — present the core content as a scannable Markdown table.",
    "FAQ": "This is an FAQ page — use an <AccordionGroup> with one <Accordion> per question.",
    "Guide": "This is a step-by-step GUIDE — use <Steps> for the main procedure.",
    "Warning": "This page centres on an important caveat — open with a <Callout type=\"warning\"> stating the risk plainly.",
    "User Concern": "This addresses a real user worry — answer directly, honestly and reassuringly; use a <Callout> for the key reassurance.",
    "Info": "Explain clearly with short paragraphs, lists and callouts where helpful.",
}


def load_tree():
    return json.load(open(os.path.join(HERE, "tree.json")))


def collect_pages(tabs):
    pages = []
    for t in tabs:
        for s in t["sections"]:
            for p in s["pages"]:
                pages.append((t["label"], s["label"], None, p))
            for ss in s["subsections"]:
                for p in ss["pages"]:
                    pages.append((t["label"], s["label"], ss["label"], p))
    return pages


def build_link_map(pages):
    return {p[3]["title"]: p[3]["slug"] for p in pages}


def build_prompt(tab, section, subsection, page, link_map):
    loc = f"{tab} › {section}" + (f" › {subsection}" if subsection else "")
    lines = [f"Page title: {page['title']}", f"Location in docs: {loc}", f"Page type: {page['type']}"]
    lines.append("")
    lines.append(TYPE_HINT.get(page["type"], TYPE_HINT["Info"]))
    lines.append("")
    if page.get("brief"):
        lines.append("Author brief for this page:")
        lines.append('"""')
        lines.append(page["brief"])
        lines.append('"""')
    else:
        lines.append("No detailed brief was provided. Write an accurate, helpful page for this topic in the context of the Emergent platform, matching the section it lives in.")
    if page.get("children"):
        lines.append("")
        lines.append("Cover the following sub-topics, each as its own H2 (or H3) section, in this order:")
        for c in page["children"]:
            tag = "callout" if c.get("kind") == "Bytes" else c.get("type", "Info")
            brief = c.get("brief") or "(expand appropriately for this topic)"
            lines.append(f"- {c['title']} [{tag}]: {brief}")
    # cross-link hint
    lines.append("")
    lines.append("When you reference another documentation page, link to it with a relative path /<slug>. Known pages (title → slug):")
    # only include a compact subset to save tokens: pages whose title words appear in brief, plus always-useful ones
    text = (page.get("brief") or "") + " ".join(c.get("brief", "") for c in page.get("children", []))
    rel = []
    for title, slug in link_map.items():
        if title == page["title"]:
            continue
        key = title.split(" ")[0].lower()
        if key and key in text.lower():
            rel.append(f"  {title} → /{slug}")
    for t2 in ["Database (MongoDB)", "The Universal LLM Key", "Redeploy vs Replace", "Custom domain",
               "Glossary of Emergent terms", "Web <-> Mobile conversion (canonical)"]:
        if t2 in link_map and t2 != page["title"]:
            entry = f"  {t2} → /{link_map[t2]}"
            if entry not in rel:
                rel.append(entry)
    lines.extend(rel[:12] if rel else ["  (none relevant)"])
    lines.append("")
    lines.append("Now produce the polished Markdown page (start at H2, no title heading, no code fence around the whole doc).")
    return "\n".join(lines)


def clean_md(md):
    md = (md or "").strip()
    if md.startswith("```"):
        parts = md.split("\n")
        if parts[0].startswith("```"):
            parts = parts[1:]
        if parts and parts[-1].strip() == "```":
            parts = parts[:-1]
        md = "\n".join(parts).strip()
    return md


PAGES_DIR = os.path.join(HERE, "gen_pages")
os.makedirs(PAGES_DIR, exist_ok=True)


async def gen_one(sem, tab, section, subsection, page, link_map):
    slug = page["slug"]
    out = os.path.join(PAGES_DIR, f"{slug}.json")
    if os.path.exists(out):
        return
    prompt = build_prompt(tab, section, subsection, page, link_map)
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"edu_{slug}", system_message=SYSTEM).with_model(*MODEL)
                resp = await chat.send_message(UserMessage(text=prompt))
                md = clean_md(resp)
                if not md:
                    raise ValueError("empty response")
                desc = (page.get("brief") or "").strip().split("\n")[0][:180] or page["title"]
                json.dump({"title": page["title"], "content": md, "description": desc}, open(out, "w"), indent=1)
                print(f"OK  {slug} ({len(md)} chars)")
                return
            except Exception as e:
                print(f"RETRY {slug} attempt {attempt+1}: {e}")
                await asyncio.sleep(3 * (attempt + 1))
        print(f"FAIL {slug}")


async def main():
    tabs = load_tree()
    pages = collect_pages(tabs)
    link_map = build_link_map(pages)
    # migrate legacy generated.json into per-page files (one-time)
    legacy = os.path.join(HERE, "generated.json")
    if os.path.exists(legacy):
        for slug, v in json.load(open(legacy)).items():
            f = os.path.join(PAGES_DIR, f"{slug}.json")
            if v.get("content") and not os.path.exists(f):
                json.dump({"title": v["title"], "content": v["content"], "description": v.get("description", "")}, open(f, "w"), indent=1)

    shard = os.environ.get("EDU_SHARD")  # "i/N"
    todo = [p for p in pages if not os.path.exists(os.path.join(PAGES_DIR, f"{p[3]['slug']}.json"))]
    if shard:
        i, n = map(int, shard.split("/"))
        todo = [p for idx, p in enumerate(todo) if idx % n == i]
    print(f"shard={shard} | to generate: {len(todo)}")
    sem = asyncio.Semaphore(CONCURRENCY)
    await asyncio.gather(*[gen_one(sem, *p[:3], p[3], link_map) for p in todo])
    print(f"shard {shard} DONE")


if __name__ == "__main__":
    asyncio.run(main())
