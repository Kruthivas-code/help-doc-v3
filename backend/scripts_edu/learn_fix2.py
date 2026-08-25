"""QA fixes for Rail 2 generated articles (learn_pages2). Targeted patches for unverified claims."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "learn_pages2")

def patch(slug, replacements):
    fp = os.path.join(P, f"{slug}.json")
    d = json.load(open(fp))
    c = d["content"]
    for old, new in replacements:
        assert old in c, f"NOT FOUND in {slug}: {old[:70]!r}"
        c = c.replace(old, new)
    d["content"] = c
    json.dump(d, open(fp, "w"), indent=1)
    print("patched", slug)

# add-login-user-accounts: fabricated session durations ("weeks", "90 days") - source gives no duration
patch("add-login-user-accounts", [
    ("**Sessions expire too fast** - sessions last for weeks by default. If you need a different duration, tell the AI: *\"Keep users logged in for 90 days.\"*",
     "**Sessions expire too fast** - Emergent Auth keeps people signed in using secure, server-side sessions. If the timeout doesn't suit your app, just describe what you want in chat: *\"Keep users logged in longer between visits.\"*"),
])

print("done")
