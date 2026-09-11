"""Review Mode: roles, draft/published publish gate, assignments, comments, verdicts, inbox.
Registered onto the existing /api router; reuses the app's db, auth and storage via ctx."""
import uuid
import re
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional

OWNER_SEED_EMAIL = "sarang@emergent.sh"


def _now():
    return datetime.now(timezone.utc).isoformat()


def count_images_missing_alt(content: str) -> int:
    """Images that would ship without alt text. Markdown ![](url) with empty alt,
    and <Figure>/<img> tags with no alt= attribute at all. An explicit alt="" on a
    component is treated as intentionally decorative and is NOT flagged."""
    content = content or ""
    missing = len(re.findall(r'!\[\s*\]\([^)]+\)', content))
    for m in re.finditer(r'<(?:Figure|img)\b[^>]*?/?>', content, re.IGNORECASE):
        if not re.search(r'\balt\s*=', m.group(0), re.IGNORECASE):
            missing += 1
    return missing


def _norm(email):
    return (email or "").strip().lower()


class PromoteReq(BaseModel):
    email: str


class AssignmentReq(BaseModel):
    scope_type: str  # tab | group | page
    scope_id: str
    scope_label: Optional[str] = ""
    assignee_email: str


class AssignmentStatusReq(BaseModel):
    status: str  # not_started | in_review | done


class DelegateReq(BaseModel):
    email: str


class BulkDelegateReq(BaseModel):
    from_email: str
    to_email: str


class DelegatePagesReq(BaseModel):
    from_email: str
    to_email: str
    slugs: list[str] = []


class CommentReq(BaseModel):
    doc_slug: str
    body: str = ""
    anchor_text: Optional[str] = None
    audio_url: Optional[str] = None
    parent_id: Optional[str] = None
    mentions: Optional[list] = None


class VerdictReq(BaseModel):
    doc_slug: str
    verdict: str


def register_review_routes(api_router, ctx):
    db = ctx["db"]
    get_current_user = ctx["get_current_user"]
    storage_put_object = ctx["storage_put_object"]
    storage_build_path = ctx["storage_build_path"]
    storage_public_url = ctx["storage_public_url"]
    log_activity = ctx.get("log_activity")

    def is_owner(user):
        return getattr(user, "role", "member") == "owner"

    async def _owner_contact_str():
        docs = await db.owner_invites.find({}, {"_id": 0, "email": 1}).to_list(100)
        owners = [o["email"] for o in docs if o.get("email")]
        return ", ".join(owners) if owners else "an owner"

    async def _owner_only(user):
        if not is_owner(user):
            raise HTTPException(status_code=403, detail=f"Only an owner can do this. Please contact: {await _owner_contact_str()}")

    async def _unassign_slugs(project_id, slugs, keep_id=None):
        """Enforce one-assignee-per-page: strip these slugs from every other assignment
        doc (deleting any that become empty) so a page is never assigned to two reviewers."""
        sset = {s for s in (slugs or []) if s}
        if not sset:
            return
        docs = await db.assignments.find(
            {"project_id": project_id, "slugs": {"$in": list(sset)}}, {"_id": 0}).to_list(2000)
        for a in docs:
            if keep_id and a.get("id") == keep_id:
                continue
            remaining = [s for s in (a.get("slugs") or []) if s not in sset]
            if remaining:
                await db.assignments.update_one({"id": a["id"]}, {"$set": {"slugs": remaining, "updated_at": _now()}})
            else:
                await db.assignments.delete_one({"id": a["id"]})

    async def flatten_scope_slugs(project_id, scope_type, scope_id):
        if scope_type == "page":
            return [scope_id]
        cfg = await db.project_configs.find_one({"project_id": project_id}, {"_id": 0})
        tabs = ((cfg or {}).get("navigation") or {}).get("tabs") or []
        slugs = []

        def slug_of(p):
            return p.get("page") if isinstance(p, dict) else p

        def collect(g):
            for p in g.get("pages", []):
                s = slug_of(p)
                if s:
                    slugs.append(s)
            for sub in g.get("groups", []):
                collect(sub)

        for t in tabs:
            if scope_type == "tab" and (t.get("id") == scope_id or t.get("label") == scope_id):
                for g in t.get("groups", []):
                    collect(g)
            elif scope_type == "group":
                tgt_tab, sep, grp = scope_id.partition("::")
                if not sep:  # legacy / unqualified
                    grp, tgt_tab = scope_id, None
                if tgt_tab and t.get("id") != tgt_tab and t.get("label") != tgt_tab:
                    continue

                def _find(groups):
                    for g in groups:
                        if g.get("group") == grp:
                            collect(g)
                        _find(g.get("groups", []))
                _find(t.get("groups", []))
        return slugs

    async def grant_owner(email):
        email = _norm(email)
        await db.owner_invites.update_one(
            {"email": email}, {"$setOnInsert": {"email": email, "created_at": _now()}}, upsert=True)
        res = await db.users.update_one({"email": email}, {"$set": {"role": "owner"}})
        return {"email": email, "role": "owner", "user_exists": res.matched_count == 1}

    ctx["grant_owner"] = grant_owner

    # ---------------- Roles ----------------
    @api_router.get("/roles/me")
    async def roles_me(user=Depends(get_current_user)):
        return {"email": user.email, "role": getattr(user, "role", "member"), "is_owner": is_owner(user)}

    @api_router.get("/roles/owners")
    async def roles_owners(user=Depends(get_current_user)):
        await _owner_only(user)
        invites = await db.owner_invites.find({}, {"_id": 0}).to_list(200)
        return {"owners": invites}

    @api_router.get("/projects/{project_id}/known-emails")
    async def known_emails(project_id: str, user=Depends(get_current_user)):
        """Suggestion list for @mention / assign autocomplete: everyone we already know about."""
        emails = set()
        async for u in db.users.find({}, {"_id": 0, "email": 1}):
            if u.get("email"):
                emails.add(u["email"].lower())
        async for o in db.owner_invites.find({}, {"_id": 0, "email": 1}):
            if o.get("email"):
                emails.add(o["email"].lower())
        async for a in db.assignments.find({"project_id": project_id}, {"_id": 0, "assignee_email": 1}):
            if a.get("assignee_email"):
                emails.add(a["assignee_email"].lower())
        return {"emails": sorted(emails)}

    @api_router.post("/roles/promote")
    async def roles_promote(req: PromoteReq, user=Depends(get_current_user)):
        await _owner_only(user)
        return await grant_owner(req.email)

    # ---------------- Publish gate ----------------
    @api_router.post("/projects/{project_id}/documents/{doc_id}/publish")
    async def publish_doc(project_id: str, doc_id: str, user=Depends(get_current_user)):
        await _owner_only(user)
        doc = await db.documents.find_one({"id": doc_id, "project_id": project_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        open_ct = await db.review_comments.count_documents(
            {"project_id": project_id, "doc_slug": doc.get("slug"), "resolved": False})
        if open_ct > 0:
            raise HTTPException(400, f"Resolve all {open_ct} open comment(s) on this page before publishing")
        missing_alt = count_images_missing_alt(doc.get("content", ""))
        if missing_alt > 0:
            raise HTTPException(400, f"{missing_alt} image(s) on this page are missing alt text. Add alt text (or mark them decorative) in the editor before publishing.")
        now = _now()
        await db.documents.update_one({"id": doc_id}, {"$set": {
            "status": "published",
            "published_content": doc.get("content", ""),
            "published_title": doc.get("title", ""),
            "published_at": now, "updated_at": now,
            "reviewer_edited_by": None, "reviewer_edited_at": None,
        }})
        if log_activity:
            await log_activity(project_id, "published", user.email, getattr(user, "name", None),
                               doc_slug=doc.get("slug"), doc_title=doc.get("title"))
        return {"status": "published", "published_at": now}

    @api_router.post("/projects/{project_id}/documents/{doc_id}/unpublish")
    async def unpublish_doc(project_id: str, doc_id: str, user=Depends(get_current_user)):
        await _owner_only(user)
        doc = await db.documents.find_one({"id": doc_id, "project_id": project_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        await db.documents.update_one({"id": doc_id}, {"$set": {
            "status": "in_review", "published_content": None, "published_title": None,
            "published_at": None, "updated_at": _now(),
        }})
        if log_activity:
            await log_activity(project_id, "unpublished", user.email, getattr(user, "name", None),
                               doc_slug=doc.get("slug"), doc_title=doc.get("title"))
        return {"status": "in_review"}

    # ---------------- Assignments ----------------
    @api_router.post("/projects/{project_id}/assignments")
    async def create_assignment(project_id: str, req: AssignmentReq, user=Depends(get_current_user)):
        await _owner_only(user)
        slugs = await flatten_scope_slugs(project_id, req.scope_type, req.scope_id)
        # One assignee per page: pull these pages out of any existing assignment first.
        await _unassign_slugs(project_id, slugs)
        a = {"id": str(uuid.uuid4()), "project_id": project_id, "scope_type": req.scope_type,
             "scope_id": req.scope_id, "scope_label": req.scope_label or req.scope_id,
             "assignee_email": _norm(req.assignee_email), "assigned_by": user.email,
             "assigned_by_name": getattr(user, "name", None),
             "status": "in_review", "slugs": slugs, "delegated_from": None,
             "due_date": "2026-09-14",
             "created_at": _now(), "updated_at": _now()}
        await db.assignments.insert_one({**a})
        if slugs:
            await db.documents.update_many(
                {"project_id": project_id, "slug": {"$in": slugs}, "status": "draft"},
                {"$set": {"status": "in_review", "updated_at": _now()}})
        a.pop("_id", None)
        if log_activity:
            await log_activity(project_id, "assigned", user.email, getattr(user, "name", None),
                               doc_slug=(slugs[0] if len(slugs) == 1 else None),
                               doc_title=req.scope_label or req.scope_id,
                               meta={"assignee": _norm(req.assignee_email),
                                     "scope": req.scope_label or req.scope_id, "count": len(slugs)})
        return a

    @api_router.get("/projects/{project_id}/assignments")
    async def list_assignments(project_id: str, mine: bool = False, user=Depends(get_current_user)):
        q = {"project_id": project_id}
        if mine or not is_owner(user):
            q["assignee_email"] = _norm(user.email)
        items = await db.assignments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
        return {"assignments": items}

    @api_router.put("/projects/{project_id}/assignments/{aid}")
    async def update_assignment(project_id: str, aid: str, req: AssignmentStatusReq, user=Depends(get_current_user)):
        a = await db.assignments.find_one({"id": aid, "project_id": project_id})
        if not a:
            raise HTTPException(404, "Assignment not found")
        if not is_owner(user) and _norm(user.email) != a.get("assignee_email"):
            raise HTTPException(403, "Only the Owner or the assignee can update this")
        # Done and verdict are independent — Mark done works with or without verdicts.
        upd = {"status": req.status, "updated_at": _now()}
        if req.status == "done":
            upd["done_at"] = a.get("done_at") or _now()
        await db.assignments.update_one({"id": aid}, {"$set": upd})
        return {"status": req.status}

    @api_router.post("/projects/{project_id}/assignments/{aid}/delegate")
    async def delegate_assignment(project_id: str, aid: str, req: DelegateReq, user=Depends(get_current_user)):
        a = await db.assignments.find_one({"id": aid, "project_id": project_id})
        if not a:
            raise HTTPException(404, "Assignment not found")
        if not is_owner(user) and _norm(user.email) != a.get("assignee_email"):
            raise HTTPException(403, "Only the Owner or the current assignee can delegate")
        # Move these pages off any other reviewer so the target owns them uniquely.
        await _unassign_slugs(project_id, a.get("slugs") or [], keep_id=aid)
        await db.assignments.update_one({"id": aid}, {"$set": {
            "assignee_email": _norm(req.email), "delegated_from": a.get("assignee_email"),
            "status": "in_review", "updated_at": _now()}})
        if log_activity:
            await log_activity(project_id, "delegated", user.email, getattr(user, "name", None),
                               meta={"from": a.get("assignee_email"), "to": _norm(req.email),
                                     "scope": a.get("scope_label")})
        return {"assignee_email": _norm(req.email), "delegated_from": a.get("assignee_email")}

    @api_router.delete("/projects/{project_id}/assignments/{aid}")
    async def delete_assignment(project_id: str, aid: str, user=Depends(get_current_user)):
        await _owner_only(user)
        await db.assignments.delete_one({"id": aid, "project_id": project_id})
        return {"message": "deleted"}

    @api_router.post("/projects/{project_id}/assignments/delegate-bulk")
    async def delegate_bulk(project_id: str, req: BulkDelegateReq, user=Depends(get_current_user)):
        frm = _norm(req.from_email)
        to = _norm(req.to_email)
        if not frm or not to:
            raise HTTPException(400, "from_email and to_email are required")
        if frm == to:
            raise HTTPException(400, "Already assigned to that email")
        # Owners can delegate anyone's queue; a reviewer may only delegate their own.
        if not is_owner(user) and _norm(user.email) != frm:
            raise HTTPException(403, "Only the Owner or the current assignee can delegate these")
        # Dedupe against the target's existing pages so nothing ends up double-assigned.
        frm_docs = await db.assignments.find(
            {"project_id": project_id, "assignee_email": frm}, {"_id": 0}).to_list(2000)
        for d in frm_docs:
            await _unassign_slugs(project_id, d.get("slugs") or [], keep_id=d["id"])
        res = await db.assignments.update_many(
            {"project_id": project_id, "assignee_email": frm},
            {"$set": {"assignee_email": to, "delegated_from": frm,
                      "status": "in_review", "updated_at": _now()}})
        if log_activity:
            await log_activity(project_id, "delegated", user.email, getattr(user, "name", None),
                               meta={"from": frm, "to": to, "count": res.modified_count})
        return {"reassigned": res.modified_count, "to_email": to}

    @api_router.post("/projects/{project_id}/assignments/delegate-pages")
    async def delegate_pages(project_id: str, req: DelegatePagesReq, user=Depends(get_current_user)):
        """Delegate a chosen set of pages (all / several / one) from one reviewer to another.
        Splits multi-page assignments as needed and merges the pages into the target's queue."""
        frm = _norm(req.from_email)
        to = _norm(req.to_email)
        slugs = [s for s in (req.slugs or []) if s]
        if not frm or not to or not slugs:
            raise HTTPException(400, "from_email, to_email and at least one page are required")
        if frm == to:
            raise HTTPException(400, "Already assigned to that email")
        if not is_owner(user) and _norm(user.email) != frm:
            raise HTTPException(403, "Only the Owner or the current assignee can delegate these")
        now = _now()
        moved = 0
        for slug in slugs:
            # Pull the page out of every source-reviewer assignment that contains it.
            src = await db.assignments.find(
                {"project_id": project_id, "assignee_email": frm, "slugs": slug}).to_list(500)
            if not src:
                continue
            for a in src:
                remaining = [s for s in a.get("slugs", []) if s != slug]
                if remaining:
                    await db.assignments.update_one({"id": a["id"]}, {"$set": {"slugs": remaining, "updated_at": now}})
                else:
                    await db.assignments.delete_one({"id": a["id"]})
            # Merge into a single delegated assignment for the target (create if none yet).
            tgt = await db.assignments.find_one(
                {"project_id": project_id, "assignee_email": to, "scope_type": "pages"})
            if tgt:
                await db.assignments.update_one(
                    {"id": tgt["id"]}, {"$addToSet": {"slugs": slug}, "$set": {"updated_at": now, "status": "in_review"}})
            else:
                await db.assignments.insert_one({
                    "id": str(uuid.uuid4()), "project_id": project_id, "scope_type": "pages",
                    "scope_id": "pages", "scope_label": "Delegated pages", "assignee_email": to,
                    "assigned_by": user.email, "assigned_by_name": getattr(user, "name", None),
                    "status": "in_review", "slugs": [slug],
                    "delegated_from": frm, "created_at": now, "updated_at": now})
            moved += 1
        if log_activity and moved:
            await log_activity(project_id, "delegated", user.email, getattr(user, "name", None),
                               meta={"from": frm, "to": to, "count": moved})
        return {"moved": moved, "to_email": to}

    # ---------------- Comments ----------------
    @api_router.get("/projects/{project_id}/comments")
    async def list_comments(project_id: str, doc_slug: str = None, user=Depends(get_current_user)):
        q = {"project_id": project_id}
        if doc_slug:
            q["doc_slug"] = doc_slug
        items = await db.review_comments.find(q, {"_id": 0}).sort("created_at", 1).to_list(1000)
        return {"comments": items}

    @api_router.post("/projects/{project_id}/comments")
    async def create_comment(project_id: str, req: CommentReq, user=Depends(get_current_user)):
        c = {"id": str(uuid.uuid4()), "project_id": project_id, "doc_slug": req.doc_slug,
             "author_email": _norm(user.email), "author_name": user.name, "body": req.body,
             "anchor_text": req.anchor_text, "audio_url": req.audio_url, "transcript": None,
             "parent_id": req.parent_id, "mentions": [_norm(m) for m in (req.mentions or [])],
             "resolved": False, "resolved_by": None, "read_by": [_norm(user.email)], "created_at": _now()}
        await db.review_comments.insert_one({**c})
        c.pop("_id", None)
        if log_activity:
            await log_activity(project_id, "replied" if req.parent_id else "commented",
                               user.email, user.name, doc_slug=req.doc_slug,
                               meta={"mentions": c["mentions"]})
        return c

    @api_router.post("/projects/{project_id}/comments/{cid}/resolve")
    async def resolve_comment(project_id: str, cid: str, user=Depends(get_current_user)):
        c = await db.review_comments.find_one({"id": cid, "project_id": project_id}, {"_id": 0, "doc_slug": 1})
        await db.review_comments.update_one({"id": cid, "project_id": project_id},
            {"$set": {"resolved": True, "resolved_by": user.email}})
        if log_activity:
            await log_activity(project_id, "resolved", user.email, user.name, doc_slug=(c or {}).get("doc_slug"))
        return {"resolved": True}

    @api_router.post("/projects/{project_id}/comments/{cid}/reopen")
    async def reopen_comment(project_id: str, cid: str, user=Depends(get_current_user)):
        await db.review_comments.update_one({"id": cid, "project_id": project_id},
            {"$set": {"resolved": False, "resolved_by": None}})
        return {"resolved": False}

    @api_router.post("/projects/{project_id}/comments/{cid}/read")
    async def read_comment(project_id: str, cid: str, user=Depends(get_current_user)):
        await db.review_comments.update_one({"id": cid, "project_id": project_id},
            {"$addToSet": {"read_by": _norm(user.email)}})
        return {"ok": True}

    @api_router.delete("/projects/{project_id}/comments/{cid}")
    async def delete_comment(project_id: str, cid: str, user=Depends(get_current_user)):
        c = await db.review_comments.find_one({"id": cid, "project_id": project_id})
        if not c:
            raise HTTPException(404, "not found")
        if _norm(user.email) != c.get("author_email") and not is_owner(user):
            raise HTTPException(403, "Not allowed")
        await db.review_comments.delete_one({"id": cid})
        return {"message": "deleted"}

    @api_router.post("/projects/{project_id}/comments/{cid}/transcribe")
    async def transcribe_comment(project_id: str, cid: str, user=Depends(get_current_user)):
        # Fast-follow: manual voice-to-text not yet enabled.
        return {"transcript": None, "status": "unavailable", "message": "Voice transcription is coming soon."}

    # ---------------- Voice upload ----------------
    @api_router.post("/projects/{project_id}/review/voice")
    async def upload_voice(project_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
        content = await file.read()
        name = f"{uuid.uuid4().hex}.webm"
        path = storage_build_path(project_id, "review-audio", name)
        try:
            res = storage_put_object(path, content, file.content_type or "audio/webm")
            url = storage_public_url(res.get("path") or path, request_base=None)
        except Exception as e:
            raise HTTPException(500, f"Upload failed: {e}")
        return {"url": url}

    # ---------------- Verdicts ----------------
    @api_router.get("/projects/{project_id}/verdicts")
    async def list_verdicts(project_id: str, doc_slug: str = None, user=Depends(get_current_user)):
        q = {"project_id": project_id}
        if doc_slug:
            q["doc_slug"] = doc_slug
        items = await db.review_verdicts.find(q, {"_id": 0}).to_list(1000)
        return {"verdicts": items}

    @api_router.post("/projects/{project_id}/verdicts")
    async def set_verdict(project_id: str, req: VerdictReq, user=Depends(get_current_user)):
        if not is_owner(user):
            assigned = await db.assignments.find_one(
                {"project_id": project_id, "assignee_email": _norm(user.email), "slugs": req.doc_slug})
            if not assigned:
                raise HTTPException(403, "You can only add a verdict to pages assigned to you")
        key = {"project_id": project_id, "doc_slug": req.doc_slug, "reviewer_email": _norm(user.email)}
        await db.review_verdicts.update_one(key, {"$set": {**key, "verdict": req.verdict,
            "reviewer_name": user.name, "updated_at": _now()}}, upsert=True)
        if log_activity:
            await log_activity(project_id, "verdict", user.email, user.name,
                               doc_slug=req.doc_slug, meta={"verdict": req.verdict})
        return {"verdict": req.verdict}

    # ---------------- Inbox / progress ----------------
    @api_router.get("/projects/{project_id}/review/inbox")
    async def review_inbox(project_id: str, user=Depends(get_current_user)):
        await _owner_only(user)
        comments = await db.review_comments.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        me = _norm(user.email)
        unread = sum(1 for c in comments if me not in (c.get("read_by") or []) and c.get("author_email") != me)
        open_ct = sum(1 for c in comments if not c.get("resolved"))
        return {"comments": comments, "unread": unread, "open": open_ct, "total": len(comments)}

    @api_router.get("/projects/{project_id}/review/progress")
    async def review_progress(project_id: str, user=Depends(get_current_user)):
        await _owner_only(user)
        assignments = await db.assignments.find({"project_id": project_id}, {"_id": 0}).to_list(500)
        by_status = {}
        for a in assignments:
            by_status[a["status"]] = by_status.get(a["status"], 0) + 1
        docs = await db.documents.find({"project_id": project_id, "deleted_at": None}, {"_id": 0, "status": 1}).to_list(2000)
        doc_status = {}
        for d in docs:
            s = d.get("status", "draft")
            doc_status[s] = doc_status.get(s, 0) + 1
        return {"assignments_by_status": by_status, "docs_by_status": doc_status,
                "total_assignments": len(assignments)}

    # ---------------- Activity log ----------------
    @api_router.get("/projects/{project_id}/activity")
    async def get_activity(project_id: str, person: str = None, limit: int = 200, user=Depends(get_current_user)):
        await _owner_only(user)
        q = {"project_id": project_id}
        if person:
            q["actor_email"] = person.lower()
        items = await db.activity_log.find(q, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 500))
        people = await db.activity_log.distinct("actor_email", {"project_id": project_id})
        slugs = list({i["doc_slug"] for i in items if i.get("doc_slug") and not i.get("doc_title")})
        if slugs:
            docs = await db.documents.find(
                {"project_id": project_id, "slug": {"$in": slugs}}, {"_id": 0, "slug": 1, "title": 1}).to_list(1000)
            tmap = {d["slug"]: d.get("title") for d in docs}
            for i in items:
                if i.get("doc_slug") and not i.get("doc_title"):
                    i["doc_title"] = tmap.get(i["doc_slug"])
        return {"activity": items, "people": sorted([p for p in people if p])}

    @api_router.get("/projects/{project_id}/activity/page/{slug}")
    async def get_page_activity(project_id: str, slug: str, user=Depends(get_current_user)):
        items = await db.activity_log.find(
            {"project_id": project_id, "doc_slug": slug}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return {"activity": items}


    @api_router.get("/projects/{project_id}/mis")
    async def mis_dashboard(project_id: str, include_seed: bool = False, user=Depends(get_current_user)):
        """Read-only management snapshot, open to any signed-in @emergent.sh user."""
        from datetime import datetime as _dt, timezone as _tz
        DUE = "2026-09-14"
        VERDICTS = ["Looks correct", "Needs small edits", "Wrong info", "More info needed", "Outdated", "Tone / clarity", "Other"]
        docs = await db.documents.find({"project_id": project_id, "deleted_at": None}, {"_id": 0, "slug": 1, "title": 1, "status": 1}).to_list(2000)
        title_by = {d["slug"]: d.get("title") for d in docs}
        status_by = {d["slug"]: d.get("status") for d in docs}
        asg = await db.assignments.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
        vds = await db.review_verdicts.find({"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(5000)
        cms = await db.review_comments.find({"project_id": project_id}, {"_id": 0}).to_list(8000)

        def is_seed(e):
            e = (e or "").lower()
            return (not e.endswith("@emergent.sh")) or e == "dev@local"

        latest = {}
        for v in vds:
            if v.get("verdict") == "looks_good":
                v["verdict"] = "Looks correct"
            latest[v["doc_slug"]] = v
        assignee_by = {}
        for a in asg:
            for s in a.get("slugs", []):
                assignee_by[s] = a.get("assignee_email")
        open_by, resolved_by, cmade, cresolved = {}, {}, {}, {}
        for c in cms:
            slug = c.get("doc_slug")
            am = (c.get("author_email") or "").lower()
            if c.get("resolved"):
                resolved_by[slug] = resolved_by.get(slug, 0) + 1
                if am:
                    cresolved[am] = cresolved.get(am, 0) + 1
            else:
                open_by[slug] = open_by.get(slug, 0) + 1
            cmade[am] = cmade.get(am, 0) + 1

        def is_done(s):
            v = latest.get(s)
            return bool(v and v.get("verdict") == "Looks correct" and not open_by.get(s))

        today = _dt.now(_tz.utc).date()
        overdue_flag = today > _dt.fromisoformat(DUE).date()

        reviewers = {}
        for a in asg:
            em = a.get("assignee_email") or "unassigned"
            if is_seed(em) and not include_seed:
                continue
            r = reviewers.setdefault(em, {"email": em, "assigned": 0, "done": 0, "verdicts": {k: 0 for k in VERDICTS}, "done_no_verdict": 0, "comments_made": 0, "comments_resolved": 0, "overdue": 0})
            for s in a.get("slugs", []):
                r["assigned"] += 1
                d = is_done(s)
                if d:
                    r["done"] += 1
                v = latest.get(s)
                if v and v.get("verdict") in r["verdicts"]:
                    r["verdicts"][v["verdict"]] += 1
                if d and not (v and v.get("verdict")):
                    r["done_no_verdict"] += 1
                if overdue_flag and a.get("status") != "done" and not d:
                    r["overdue"] += 1
        for em, r in reviewers.items():
            r["comments_made"] = cmade.get(em, 0)
            r["comments_resolved"] = cresolved.get(em, 0)
            r["pct_done"] = round(100 * r["done"] / r["assigned"]) if r["assigned"] else 0
        reviewer_rows = sorted(reviewers.values(), key=lambda x: -x["assigned"])

        assigned_slugs = set(assignee_by.keys())
        all_slugs = set(title_by.keys())
        funnel = {
            "total_pages": len(all_slugs),
            "unassigned": len([s for s in all_slugs if s not in assigned_slugs]),
            "assigned": len(assigned_slugs),
            "done": len([s for s in all_slugs if is_done(s)]),
            "published": len([s for s in all_slugs if status_by.get(s) == "published"]),
            "verdicts": {k: len([s for s in all_slugs if (latest.get(s) or {}).get("verdict") == k]) for k in VERDICTS},
            "no_verdict": len([s for s in all_slugs if not (latest.get(s) or {}).get("verdict")]),
        }

        by_day = {}
        for s, v in latest.items():
            if v.get("verdict") == "Looks correct" and v.get("created_at"):
                day = str(v["created_at"])[:10]
                by_day[day] = by_day.get(day, 0) + 1
        throughput = [{"day": k, "count": by_day[k]} for k in sorted(by_day)]

        ch_pages = []
        for s in sorted(all_slugs):
            o, rv = open_by.get(s, 0), resolved_by.get(s, 0)
            if o or rv:
                ch_pages.append({"slug": s, "title": title_by.get(s), "open": o, "resolved": rv, "hot": o >= 3})
        ch_pages.sort(key=lambda x: -x["open"])

        exc = {"done_no_verdict": [], "wrong_info_unedited": [], "no_activity_7d": [], "looks_correct_open_nr": [], "duplicate_titles": []}
        for s in all_slugs:
            v = latest.get(s)
            if is_done(s) and not (v and v.get("verdict")):
                exc["done_no_verdict"].append({"slug": s, "title": title_by.get(s)})
            if v and v.get("verdict") == "Wrong info":
                exc["wrong_info_unedited"].append({"slug": s, "title": title_by.get(s)})
            if v and v.get("verdict") == "Looks correct" and open_by.get(s):
                exc["looks_correct_open_nr"].append({"slug": s, "title": title_by.get(s), "open": open_by.get(s)})
        seen = {}
        for s, t in title_by.items():
            seen.setdefault((t or "").strip().lower(), []).append(s)
        exc["duplicate_titles"] = [{"title": t, "slugs": v} for t, v in seen.items() if len(v) > 1]

        return {
            "generated_at": _dt.now(_tz.utc).isoformat(),
            "due_date": DUE, "overdue_active": overdue_flag,
            "verdict_labels": VERDICTS,
            "reviewers": reviewer_rows,
            "funnel": funnel,
            "throughput": throughput,
            "comments_health": ch_pages,
            "exceptions": exc,
        }
