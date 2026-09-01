"""Review Mode: roles, draft/published publish gate, assignments, comments, verdicts, inbox.
Registered onto the existing /api router; reuses the app's db, auth and storage via ctx."""
import uuid
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional

OWNER_SEED_EMAIL = "sarang@emergent.sh"


def _now():
    return datetime.now(timezone.utc).isoformat()


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


class CommentReq(BaseModel):
    doc_slug: str
    body: str = ""
    anchor_text: Optional[str] = None
    audio_url: Optional[str] = None


class VerdictReq(BaseModel):
    doc_slug: str
    verdict: str


def register_review_routes(api_router, ctx):
    db = ctx["db"]
    get_current_user = ctx["get_current_user"]
    storage_put_object = ctx["storage_put_object"]
    storage_build_path = ctx["storage_build_path"]
    storage_public_url = ctx["storage_public_url"]

    def is_owner(user):
        return getattr(user, "role", "member") == "owner"

    def ensure_owner(user):
        if not is_owner(user):
            raise HTTPException(status_code=403, detail="Owner role required")

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
                for g in t.get("groups", []):
                    if g.get("group") == grp:
                        collect(g)
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
        ensure_owner(user)
        invites = await db.owner_invites.find({}, {"_id": 0}).to_list(200)
        return {"owners": invites}

    @api_router.get("/projects/{project_id}/known-emails")
    async def known_emails(project_id: str, user=Depends(get_current_user)):
        """Suggestion list for the assign-email autocomplete: everyone we already know about
        (users who have logged in, seeded owners, and previously-assigned reviewers)."""
        ensure_owner(user)
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
        ensure_owner(user)
        return await grant_owner(req.email)

    # ---------------- Publish gate ----------------
    @api_router.post("/projects/{project_id}/documents/{doc_id}/publish")
    async def publish_doc(project_id: str, doc_id: str, user=Depends(get_current_user)):
        ensure_owner(user)
        doc = await db.documents.find_one({"id": doc_id, "project_id": project_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        now = _now()
        await db.documents.update_one({"id": doc_id}, {"$set": {
            "status": "published",
            "published_content": doc.get("content", ""),
            "published_title": doc.get("title", ""),
            "published_at": now, "updated_at": now,
        }})
        return {"status": "published", "published_at": now}

    @api_router.post("/projects/{project_id}/documents/{doc_id}/unpublish")
    async def unpublish_doc(project_id: str, doc_id: str, user=Depends(get_current_user)):
        ensure_owner(user)
        doc = await db.documents.find_one({"id": doc_id, "project_id": project_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        await db.documents.update_one({"id": doc_id}, {"$set": {
            "status": "in_review", "published_content": None, "published_title": None,
            "published_at": None, "updated_at": _now(),
        }})
        return {"status": "in_review"}

    # ---------------- Assignments ----------------
    @api_router.post("/projects/{project_id}/assignments")
    async def create_assignment(project_id: str, req: AssignmentReq, user=Depends(get_current_user)):
        ensure_owner(user)
        slugs = await flatten_scope_slugs(project_id, req.scope_type, req.scope_id)
        a = {"id": str(uuid.uuid4()), "project_id": project_id, "scope_type": req.scope_type,
             "scope_id": req.scope_id, "scope_label": req.scope_label or req.scope_id,
             "assignee_email": _norm(req.assignee_email), "assigned_by": user.email,
             "status": "in_review", "slugs": slugs, "delegated_from": None,
             "created_at": _now(), "updated_at": _now()}
        await db.assignments.insert_one({**a})
        if slugs:
            await db.documents.update_many(
                {"project_id": project_id, "slug": {"$in": slugs}, "status": "draft"},
                {"$set": {"status": "in_review", "updated_at": _now()}})
        a.pop("_id", None)
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
        if req.status == "done":
            open_ct = await db.review_comments.count_documents(
                {"project_id": project_id, "doc_slug": {"$in": a.get("slugs", [])}, "resolved": False})
            if open_ct > 0:
                raise HTTPException(400, f"Resolve all {open_ct} open comment(s) before marking done")
        await db.assignments.update_one({"id": aid}, {"$set": {"status": req.status, "updated_at": _now()}})
        return {"status": req.status}

    @api_router.post("/projects/{project_id}/assignments/{aid}/delegate")
    async def delegate_assignment(project_id: str, aid: str, req: DelegateReq, user=Depends(get_current_user)):
        a = await db.assignments.find_one({"id": aid, "project_id": project_id})
        if not a:
            raise HTTPException(404, "Assignment not found")
        if not is_owner(user) and _norm(user.email) != a.get("assignee_email"):
            raise HTTPException(403, "Only the Owner or the current assignee can delegate")
        await db.assignments.update_one({"id": aid}, {"$set": {
            "assignee_email": _norm(req.email), "delegated_from": a.get("assignee_email"),
            "status": "in_review", "updated_at": _now()}})
        return {"assignee_email": _norm(req.email), "delegated_from": a.get("assignee_email")}

    @api_router.delete("/projects/{project_id}/assignments/{aid}")
    async def delete_assignment(project_id: str, aid: str, user=Depends(get_current_user)):
        ensure_owner(user)
        await db.assignments.delete_one({"id": aid, "project_id": project_id})
        return {"message": "deleted"}

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
             "resolved": False, "resolved_by": None, "read_by": [_norm(user.email)], "created_at": _now()}
        await db.review_comments.insert_one({**c})
        c.pop("_id", None)
        return c

    @api_router.post("/projects/{project_id}/comments/{cid}/resolve")
    async def resolve_comment(project_id: str, cid: str, user=Depends(get_current_user)):
        ensure_owner(user)
        await db.review_comments.update_one({"id": cid, "project_id": project_id},
            {"$set": {"resolved": True, "resolved_by": user.email}})
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
        key = {"project_id": project_id, "doc_slug": req.doc_slug, "reviewer_email": _norm(user.email)}
        await db.review_verdicts.update_one(key, {"$set": {**key, "verdict": req.verdict,
            "reviewer_name": user.name, "updated_at": _now()}}, upsert=True)
        return {"verdict": req.verdict}

    # ---------------- Inbox / progress ----------------
    @api_router.get("/projects/{project_id}/review/inbox")
    async def review_inbox(project_id: str, user=Depends(get_current_user)):
        ensure_owner(user)
        comments = await db.review_comments.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        me = _norm(user.email)
        unread = sum(1 for c in comments if me not in (c.get("read_by") or []) and c.get("author_email") != me)
        open_ct = sum(1 for c in comments if not c.get("resolved"))
        return {"comments": comments, "unread": unread, "open": open_ct, "total": len(comments)}

    @api_router.get("/projects/{project_id}/review/progress")
    async def review_progress(project_id: str, user=Depends(get_current_user)):
        ensure_owner(user)
        assignments = await db.assignments.find({"project_id": project_id}, {"_id": 0}).to_list(500)
        by_status = {}
        for a in assignments:
            by_status[a["status"]] = by_status.get(a["status"], 0) + 1
        docs = await db.documents.find({"project_id": project_id}, {"_id": 0, "status": 1}).to_list(2000)
        doc_status = {}
        for d in docs:
            s = d.get("status", "draft")
            doc_status[s] = doc_status.get(s, 0) + 1
        return {"assignments_by_status": by_status, "docs_by_status": doc_status,
                "total_assignments": len(assignments)}
