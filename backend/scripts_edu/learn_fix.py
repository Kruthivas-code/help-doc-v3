"""Targeted corrections to generated learn_pages for unverified/fabricated claims."""
import json, os
HERE = os.path.dirname(__file__)
P = os.path.join(HERE, "learn_pages")

def patch(slug, replacements):
    fp = os.path.join(P, f"{slug}.json")
    d = json.load(open(fp))
    c = d["content"]
    for old, new in replacements:
        assert old in c, f"NOT FOUND in {slug}: {old[:60]!r}"
        c = c.replace(old, new)
    d["content"] = c
    json.dump(d, open(fp, "w"), indent=1)
    print("patched", slug)

# 1) start-with-your-idea: 'Node' is not in any source doc -> generalise, drop fabricated stack item
patch("start-with-your-idea", [
    ("**Tech stack** - the agent picks React, Node, MongoDB, and other tools automatically",
     "**Tech stack** - the agent picks the tools for you (React, MongoDB and more) automatically"),
])

# 2) talk-it-through: the 'discussing is free / does not consume credits' premise is NOT supported by
#    any source doc. Keep the grounded fact (work consumes credits) and placeholder the unverified claim.
patch("talk-it-through", [
    ("Emergent agents are happy to talk through your idea before writing a single line of code - and the conversation costs you nothing. This article shows when to discuss, how it naturally turns into a build, and why you shouldn't worry about the credit meter during planning.",
     "Emergent agents can talk through your idea before writing a single line of code. This article shows when to discuss, how a discussion naturally turns into a build, and what does and doesn't draw down your credit balance."),
    ("## Planning is free\n\nHere's the most important thing: **discussing and planning in the chat does not consume credits**. You can describe your idea, ask \"what if\" questions, clarify requirements, and sketch out features for as long as you need. Credits are only deducted when the agent performs work - generating code, running tests, deploying to the cloud, or calling external APIs.\n\nThat means you can spend five minutes or fifty refining your vision before committing to a build. The agent will answer questions, suggest architectures, and help you decide [which prompt window](/which-prompt-window-should-i-use) fits your project (Starter for simple prototypes, Pro for databases and APIs, Infinite for complex builds) - all without touching your balance.",
     "## What draws down credits\n\nCredits are deducted when the agent performs **work** - generating code, running tests, deploying to the cloud, or calling external APIs (see [How credits work](/how-credits-work)). The agent can also help you decide [which prompt window](/which-prompt-window-should-i-use) fits your project (Starter, Pro or Infinite) before you commit.\n\n<Callout type=\"warning\" title=\"Draft - needs review\">\nThis article's premise is that a pure planning conversation is free / does not consume credits. That claim is NOT stated in the existing docs and needs product confirmation before publishing. If confirmed, restore the \"planning is free\" framing here.\n</Callout>"),
    ("<Callout type=\"tip\" title=\"Ask before you build\">\nIf you're unsure whether your idea needs a database, authentication, or external integrations, just ask. The agent will explain which features require Pro vs. Starter and help you choose the right starting point.\n</Callout>",
     "<Callout type=\"tip\" title=\"Ask before you build\">\nIf you're unsure whether your idea needs a database, authentication, or external integrations, just ask. The agent will help you choose the right starting point.\n</Callout>"),
    ("There's no penalty for planning first - in fact, a short discussion often saves credits later by ensuring the agent scaffolds the right architecture from the start.",
     "A short discussion often saves credits later by ensuring the agent scaffolds the right architecture from the start."),
    ("If you change your mind mid-build, you can pause and discuss adjustments - again, the conversation itself is free. Credits resume when the agent resumes coding.",
     "If you change your mind mid-build, you can pause and discuss adjustments. Credits are drawn down as the agent generates, tests and deploys code."),
])
print("done")
