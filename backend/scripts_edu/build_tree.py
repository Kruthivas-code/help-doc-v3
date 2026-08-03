"""Parse the User Education Gaps CSV into a nav tree: tabs -> sections -> (subsections) -> pages -> children(topics/bytes)."""
import csv, json, os, re

HERE = os.path.dirname(__file__)

def indent(s): return len(s) - len(s.lstrip(' '))
def clean(s): return s.strip().lstrip('-').strip()

def slugify(text):
    t = text.lower()
    t = re.sub(r"[&/]", " ", t)
    t = re.sub(r"[^a-z0-9]+", "-", t)
    return re.sub(r"-+", "-", t).strip("-")[:60]

def new_page(title, typ, brief, status):
    return {"title": title, "type": typ, "brief": brief, "status": status, "children": []}

def build():
    rows = list(csv.DictReader(open(os.path.join(HERE, "gaps.csv"))))
    tabs = []
    cur_tab = cur_sec = cur_sub = cur_page = None

    def ensure_section():
        nonlocal cur_sec
        if cur_sec is None:
            cur_sec = {"label": cur_tab["label"], "type": "Info", "brief": "", "status": "", "pages": [], "subsections": []}
            cur_tab["sections"].append(cur_sec)
        return cur_sec

    for r in rows:
        topic = r["Topic"]; struct = r["Structure"].strip(); typ = r["Type"].strip()
        content = (r["Content"] or "").strip(); status = (r["Status"] or "").strip()
        ind = indent(topic); name = clean(topic)
        if not name:
            continue
        if struct == "Tab":
            cur_tab = {"label": name, "sections": []}
            tabs.append(cur_tab); cur_sec = cur_sub = cur_page = None
        elif struct == "Section" and ind <= 3:
            cur_sec = {"label": name, "type": typ, "brief": content, "status": status, "pages": [], "subsections": []}
            cur_tab["sections"].append(cur_sec); cur_sub = None; cur_page = None
        elif struct == "Sub-section":
            ensure_section()
            cur_sub = {"label": name, "brief": content, "pages": []}
            cur_sec["subsections"].append(cur_sub); cur_page = None
        elif struct == "Page" or (struct == "Section" and ind >= 6):
            cur_page = new_page(name, typ, content, status)
            target = cur_sub if cur_sub else ensure_section()
            target["pages"].append(cur_page)
        elif struct in ("Topic", "Bytes"):
            if cur_page is None:
                cur_page = new_page(name, typ, content, status)
                target = cur_sub if cur_sub else ensure_section()
                target["pages"].append(cur_page)
            else:
                cur_page["children"].append({"title": name, "type": typ, "brief": content, "status": status, "kind": struct})

    # Ensure every tab has at least one page
    for t in tabs:
        if not t["sections"]:
            sec = {"label": t["label"], "type": "Info", "brief": "", "status": "", "pages": [], "subsections": []}
            t["sections"].append(sec)
        has_page = any(s["pages"] or any(ss["pages"] for ss in s["subsections"]) for s in t["sections"])
        if not has_page:
            t["sections"][0]["pages"].append(new_page(t["label"], "Info", "", "New"))

    # Assign unique slugs across all pages
    seen = set()
    def assign(pages, path):
        for p in pages:
            base = slugify(p["title"]) or "page"
            s = base; i = 2
            while s in seen:
                s = f"{base}-{i}"; i += 1
            seen.add(s); p["slug"] = s
    for t in tabs:
        for s in t["sections"]:
            assign(s["pages"], t["label"])
            for ss in s["subsections"]:
                assign(ss["pages"], t["label"])
    return tabs

def outline(tabs):
    lines = []
    npages = 0
    for t in tabs:
        lines.append(f"TAB: {t['label']}")
        for s in t["sections"]:
            lines.append(f"  SECTION: {s['label']}")
            for p in s["pages"]:
                nonlocal_add = len(p["children"])
                lines.append(f"    - PAGE [{p['type']}/{p['status']}] {p['title']}  (children:{nonlocal_add}) /{p['slug']}")
            for ss in s["subsections"]:
                lines.append(f"    SUBSECTION: {ss['label']}")
                for p in ss["pages"]:
                    lines.append(f"      - PAGE [{p['type']}/{p['status']}] {p['title']}  (children:{len(p['children'])}) /{p['slug']}")
    return "\n".join(lines)

if __name__ == "__main__":
    tabs = build()
    json.dump(tabs, open(os.path.join(HERE, "tree.json"), "w"), indent=1)
    o = outline(tabs)
    # count pages
    cnt = 0
    for t in tabs:
        for s in t["sections"]:
            cnt += len(s["pages"])
            for ss in s["subsections"]:
                cnt += len(ss["pages"])
    print(o)
    print("\nTOTAL TABS:", len(tabs), "TOTAL PAGES:", cnt)
