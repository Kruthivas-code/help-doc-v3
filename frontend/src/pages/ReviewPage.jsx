import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { DocContent } from '@/components/docs/DocContent';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft, MessageSquarePlus, CheckCircle2, RotateCcw, X, Sun, Moon,
  ChevronLeft, ChevronRight, ListChecks, Circle, Pencil, ExternalLink, Save, History,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const VERDICTS = ['Looks correct', 'Needs small edits', 'Wrong info', 'More info needed', 'Outdated', 'Tone / clarity', 'Other'];
const ACTION_LABEL = {
  assigned: 'assigned', delegated: 'delegated', edited: 'edited', commented: 'commented on',
  replied: 'replied on', resolved: 'resolved a comment', published: 'published',
  unpublished: 'unpublished', deleted: 'moved to trash', restored: 'restored',
  purged: 'permanently deleted', verdict: 'set a verdict',
};

// Lightweight @mention textarea: type "@" then filter people the app knows.
function MentionInput({ value, onChange, options, placeholder, rows = 3, testid, autoFocus }) {
  const ref = useRef(null);
  const [menu, setMenu] = useState(null);
  const handle = (e) => {
    onChange(e.target.value);
    const upto = e.target.value.slice(0, e.target.selectionStart);
    const m = upto.match(/@([\w.\-+@]*)$/);
    setMenu(m ? { q: m[1].toLowerCase() } : null);
  };
  const pick = (email) => {
    const pos = ref.current.selectionStart;
    const before = value.slice(0, pos).replace(/@([\w.\-+@]*)$/, '@' + email + ' ');
    onChange(before + value.slice(pos));
    setMenu(null); setTimeout(() => ref.current && ref.current.focus(), 0);
  };
  const matches = menu ? options.filter((o) => o.includes(menu.q)).slice(0, 6) : [];
  return (
    <div className="relative">
      <textarea ref={ref} value={value} onChange={handle} placeholder={placeholder} rows={rows} autoFocus={autoFocus} data-testid={testid} className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md p-2 text-sm" />
      {menu && matches.length > 0 && (
        <div className="absolute z-50 left-2 bottom-full mb-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg max-h-40 overflow-y-auto" data-testid="mention-menu">
          {matches.map((m) => (
            <button key={m} type="button" onMouseDown={(e) => { e.preventDefault(); pick(m); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap" data-testid={`mention-opt-${m}`}>{m}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const [pid, setPid] = useState(null);
  const [doc, setDoc] = useState(null);
  const [comments, setComments] = useState([]);
  const [role, setRole] = useState(null);
  const [reviewOn, setReviewOn] = useState(true);
  const [sel, setSel] = useState(null);
  const [composer, setComposer] = useState(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState('');
  // Reviewer queue / progress
  const [queue, setQueue] = useState([]);            // ordered unique slugs assigned to the reviewer
  const [docsMap, setDocsMap] = useState({});        // slug -> title
  const [reviewedSet, setReviewedSet] = useState(new Set()); // slugs with a verdict by the reviewer
  const [pendingNav, setPendingNav] = useState(null); // { url } while the verdict nudge is open
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [allPages, setAllPages] = useState([]);       // full navigation, ordered {slug,title,tab,section}
  const [onlyAssigned, setOnlyAssigned] = useState(true);
  const [knownEmails, setKnownEmails] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const isOwner = role?.is_owner;
  const reviewerEmail = (searchParams.get('reviewer') || role?.email || '').toLowerCase();

  const loadComments = useCallback(async (projectId) => {
    const cm = await axios.get(`${API}/projects/${projectId}/comments`, { params: { doc_slug: slug } });
    setComments(cm.data.comments);
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        const me = await axios.get(`${API}/roles/me`);
        setRole(me.data);
        const who = (searchParams.get('reviewer') || me.data.email || '').toLowerCase();
        const dp = await axios.get(`${API}/public/default-project`, { withCredentials: false });
        const projectId = dp.data.project.id;
        setPid(projectId);
        const docs = await axios.get(`${API}/projects/${projectId}/documents`);
        const map = {};
        docs.data.forEach((d) => { map[d.slug] = d.title; });
        setDocsMap(map);
        setDoc(docs.data.find((x) => x.slug === slug) || null);
        // Full navigation, in order, for the side-nav
        const nav = dp.data.config?.navigation;
        const pages = [];
        const slugOf = (p) => (typeof p === 'string' ? p : p.page);
        (nav?.tabs || []).forEach((t) => {
          const walk = (groups) => (groups || []).forEach((g) => {
            (g.pages || []).forEach((p) => {
              const s = slugOf(p);
              if (s) pages.push({ slug: s, title: map[s] || (typeof p === 'object' && p.title) || s, tab: t.label, section: g.group });
            });
            walk(g.groups);
          });
          walk(t.groups);
        });
        setAllPages(pages);
        axios.get(`${API}/projects/${projectId}/known-emails`).then((r) => setKnownEmails(r.data.emails || [])).catch(() => {});
        await loadComments(projectId);

        // Reviewer's assigned pages (queue) — in assignment order, de-duped
        try {
          const asg = await axios.get(`${API}/projects/${projectId}/assignments`);
          const mine = (asg.data.assignments || []).filter((a) => (a.assignee_email || '').toLowerCase() === who);
          const seen = new Set(); const q = [];
          mine.forEach((a) => (a.slugs || []).forEach((s) => { if (!seen.has(s)) { seen.add(s); q.push(s); } }));
          setQueue(q);
        } catch (e) { /* no queue */ }

        // Verdicts (for progress + current page state)
        try {
          const vd = await axios.get(`${API}/projects/${projectId}/verdicts`);
          const reviewed = new Set(
            (vd.data.verdicts || [])
              .filter((v) => (v.reviewer_email || '').toLowerCase() === who && v.verdict)
              .map((v) => v.doc_slug)
          );
          setReviewedSet(reviewed);
          const mineV = (vd.data.verdicts || []).find((v) => v.doc_slug === slug && (v.reviewer_email || '').toLowerCase() === who);
          setVerdict(mineV?.verdict || '');
        } catch (e) { /* no verdict yet */ }
      } catch (e) {
        toast.error('Failed to load page');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, loadComments, searchParams]);

  const assignedSet = useMemo(() => new Set(queue), [queue]);
  const hasAssignments = assignedSet.size > 0;
  const showOnlyAssigned = hasAssignments && onlyAssigned;
  const visiblePages = useMemo(
    () => (showOnlyAssigned ? allPages.filter((p) => assignedSet.has(p.slug)) : allPages),
    [allPages, assignedSet, showOnlyAssigned]
  );
  const idx = visiblePages.findIndex((p) => p.slug === slug);
  const prevSlug = idx > 0 ? visiblePages[idx - 1].slug : null;
  const nextSlug = idx >= 0 && idx < visiblePages.length - 1 ? visiblePages[idx + 1].slug : null;
  const reviewedCount = useMemo(() => queue.filter((s) => reviewedSet.has(s)).length, [queue, reviewedSet]);
  const showNav = allPages.length > 0;
  const myEmail = (role?.email || '').toLowerCase();
  // Reviewers may edit pages assigned to them; owners may edit anything.
  const canEdit = !!doc; // Part 5: any signed-in @emergent.sh user may edit; only publishing is owner-gated.
  const startEdit = () => { setEditTitle(doc.title || ''); setEditContent(doc.content || ''); setEditing(true); };
  const saveDraft = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const { data } = await axios.put(`${API}/projects/${pid}/documents/${doc.id}`, { title: editTitle, content: editContent });
      setDoc((d) => ({ ...d, title: data.title ?? editTitle, content: data.content ?? editContent }));
      setEditing(false);
      toast.success('Saved as draft — an owner can publish it');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const buildUrl = (targetSlug) => `/review/${targetSlug}${reviewerEmail ? `?reviewer=${encodeURIComponent(reviewerEmail)}` : ''}`;

  // Nudge the reviewer for a verdict before leaving this page.
  const guardedNavigate = (url) => {
    if (verdict) { navigate(url); return; }
    setPendingNav({ url });
  };
  const goToSlug = (targetSlug) => { if (targetSlug) guardedNavigate(buildUrl(targetSlug)); };

  const onMouseUp = () => {
    if (!reviewOn || editing) return;
    const s = window.getSelection();
    const text = s?.toString().trim();
    if (!text || text.length < 2) { setSel(null); return; }
    const rect = s.getRangeAt(0).getBoundingClientRect();
    setSel({ text, x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 6 });
  };

  const startComment = () => { setComposer({ anchor_text: sel.text }); setSel(null); setBody(''); };

  const mentionsIn = (text) => knownEmails.filter((e) => new RegExp('@' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\w)', 'i').test(text));
  const renderBody = (text) => (text || '').split(/(@[\w.\-+@]+)/g).map((part, i) => (part.startsWith('@') && knownEmails.includes(part.slice(1).toLowerCase())
    ? <span key={i} className="text-indigo-600 dark:text-indigo-400 font-medium">{part}</span> : part));

  const submitComment = async () => {
    if (!body.trim()) return;
    try {
      const { data } = await axios.post(`${API}/projects/${pid}/comments`, {
        doc_slug: slug, body: body.trim(), anchor_text: composer?.anchor_text || null, mentions: mentionsIn(body),
      });
      setComments((prev) => [...prev, data]);
      setComposer(null); setBody('');
      toast.success('Comment added');
    } catch (e) { toast.error('Failed to add comment'); }
  };

  const submitReply = async (parentId) => {
    const b = replyBody.trim();
    if (!b) return;
    try {
      const { data } = await axios.post(`${API}/projects/${pid}/comments`, {
        doc_slug: slug, body: b, parent_id: parentId, mentions: mentionsIn(b),
      });
      setComments((prev) => [...prev, data]);
      setReplyTo(null); setReplyBody('');
      toast.success('Reply added');
    } catch { toast.error('Failed to reply'); }
  };

  const resolve = async (c, r) => {
    try {
      await axios.post(`${API}/projects/${pid}/comments/${c.id}/${r ? 'resolve' : 'reopen'}`);
      setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, resolved: r } : x)));
    } catch { toast.error('Action failed'); }
  };

  const saveVerdict = async (v) => {
    setVerdict(v);
    setReviewedSet((prev) => { const n = new Set(prev); n.add(slug); return n; });
    try {
      await axios.post(`${API}/projects/${pid}/verdicts`, { doc_slug: slug, verdict: v });
      toast.success('Verdict saved');
    } catch { toast.error('Failed to save verdict'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-400">Loading…</div>;
  if (!doc) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400">Page not found.</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" data-testid="review-page">
      <header className="sticky top-0 z-40 h-14 px-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => guardedNavigate('/admin/review')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md" data-testid="reviewpage-back"><ArrowLeft className="w-4 h-4" /></button>
          <span className="font-semibold truncate">{doc.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium whitespace-nowrap">Review mode</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {showNav && (
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={() => goToSlug(prevSlug)} disabled={!prevSlug} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent" data-testid="prev-page-btn" aria-label="Previous assigned page"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{idx >= 0 ? idx + 1 : '–'} / {visiblePages.length}</span>
              <button onClick={() => goToSlug(nextSlug)} disabled={!nextSlug} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent" data-testid="next-page-btn" aria-label="Next assigned page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400" data-testid="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {canEdit && !editing && (
            <>
              <button onClick={startEdit} className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="reviewpage-edit-btn"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => navigate(`/admin/editor/${pid}/${doc.id}`)} className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="reviewpage-open-editor-btn"><ExternalLink className="w-3.5 h-3.5" /> Full editor</button>
            </>
          )}
          <button onClick={() => { setShowHistory(true); if (doc?.slug) axios.get(`${API}/projects/${pid}/activity/page/${doc.slug}`).then(r => setHistory(r.data.activity || [])).catch(() => {}); }} className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="reviewpage-history-btn"><History className="w-3.5 h-3.5" /> History</button>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none" data-testid="review-toggle">
            <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">Review</span>
            <button onClick={() => setReviewOn((v) => !v)} aria-pressed={reviewOn} className={`relative w-10 h-5 rounded-full transition-colors ${reviewOn ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} data-testid="review-toggle-btn">
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${reviewOn ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>
      </header>

      <div className={`max-w-6xl mx-auto grid grid-cols-1 gap-8 px-6 py-8 ${showNav ? 'lg:grid-cols-[240px_1fr_300px]' : 'lg:grid-cols-[1fr_320px]'}`}>
        {/* Side-nav: full navigation with an "only my assigned pages" toggle (default on) */}
        {showNav && (
          <nav className="lg:sticky lg:top-20 h-fit order-first" data-testid="review-sidenav">
            {hasAssignments && (
              <div className="mb-3" data-testid="review-progress">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-600 dark:text-zinc-300"><ListChecks className="w-3.5 h-3.5" /> Your reviews</span>
                  <span className="text-zinc-500 dark:text-zinc-400 tabular-nums" data-testid="review-progress-count">{reviewedCount} of {queue.length} reviewed</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all" style={{ width: `${queue.length ? (reviewedCount / queue.length) * 100 : 0}%` }} data-testid="review-progress-bar" />
                </div>
              </div>
            )}
            {hasAssignments && (
              <label className="flex items-center justify-between gap-2 text-xs mb-2 px-1 cursor-pointer select-none" data-testid="only-assigned-toggle">
                <span className="text-zinc-600 dark:text-zinc-300">Only my assigned pages</span>
                <button onClick={() => setOnlyAssigned((v) => !v)} aria-pressed={onlyAssigned} className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${onlyAssigned ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} data-testid="only-assigned-toggle-btn">
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${onlyAssigned ? 'translate-x-4' : ''}`} />
                </button>
              </label>
            )}
            <div className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1">
              {visiblePages.map((p, i) => {
                const s = p.slug;
                const done = reviewedSet.has(s);
                const active = s === slug;
                const isAssigned = assignedSet.has(s);
                const showTab = i === 0 || visiblePages[i - 1].tab !== p.tab;
                return (
                  <div key={s}>
                    {showTab && <div className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">{p.tab}</div>}
                    <button
                      onClick={() => goToSlug(s)}
                      data-testid={`sidenav-item-${s}`}
                      className={`w-full text-left flex items-start gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                      {done
                        ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                        : <Circle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isAssigned ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-200 dark:text-zinc-700'}`} />}
                      <span className="line-clamp-2">{p.title}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </nav>
        )}

        <article onMouseUp={onMouseUp} className={`min-w-0 ${reviewOn && !editing ? 'cursor-text' : ''}`} data-testid="review-content">
          {editing ? (
            <div data-testid="reviewpage-editor">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium">Editing draft</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/admin/editor/${pid}/${doc.id}`)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="reviewpage-open-editor-inline"><ExternalLink className="w-3.5 h-3.5" /> Open in full editor</button>
                  <button onClick={() => setEditing(false)} className="text-xs px-2.5 py-1.5 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="reviewpage-edit-cancel">Cancel</button>
                  <button onClick={saveDraft} disabled={saving} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium disabled:opacity-50" data-testid="reviewpage-edit-save"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save draft'}</button>
                </div>
              </div>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-2xl font-bold mb-3 bg-transparent border-b border-zinc-200 dark:border-zinc-800 pb-2 focus:outline-none text-zinc-950 dark:text-white" data-testid="reviewpage-edit-title" />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={24} spellCheck className="w-full font-mono text-sm border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md p-3 leading-relaxed" data-testid="reviewpage-edit-content" />
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Markdown / MDX supported. Your changes save to the draft — an owner publishes when ready.</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-4 text-zinc-950 dark:text-white">{doc.title}</h1>
              <div className="doc-content">
                <DocContent content={doc.content?.replace(new RegExp(`^#\\s*${(doc.title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'), '') || doc.content} />
              </div>
            </>
          )}
          {showNav && !editing && (
            <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <button onClick={() => goToSlug(prevSlug)} disabled={!prevSlug} className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-30" data-testid="prev-page-footer"><ChevronLeft className="w-4 h-4" /> Previous</button>
              <button onClick={() => goToSlug(nextSlug)} disabled={!nextSlug} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-30" data-testid="next-page-footer">Next page <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </article>

        <aside className="lg:sticky lg:top-20 h-fit">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Your verdict{!verdict && <span className="ml-1 text-amber-600 dark:text-amber-400">· not set</span>}</h3>
            <div className="flex flex-wrap gap-1.5">
              {VERDICTS.map((v) => (
                <button key={v} onClick={() => saveVerdict(v)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${verdict === v ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} data-testid={`reviewpage-verdict-${v.replace(/\W+/g, '-')}`}>{v}</button>
              ))}
            </div>
          </div>
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Comments ({comments.length})</h3>
          {reviewOn && <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Select any text in the page to pin a comment to it.</p>}
          <div className="space-y-2" data-testid="review-comments-rail">
            {comments.filter((c) => !c.parent_id).length === 0 && <p className="text-xs text-zinc-400 dark:text-zinc-500">No comments yet.</p>}
            {comments.filter((c) => !c.parent_id).map((c) => {
              const replies = comments.filter((r) => r.parent_id === c.id);
              return (
              <div key={c.id} className={`rounded-lg border p-3 text-sm ${c.resolved ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'}`} data-testid={`review-comment-${c.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{c.author_name || c.author_email}</span>
                  {c.resolved
                    ? <button onClick={() => resolve(c, false)} className="text-[11px] flex items-center gap-1 text-zinc-500 dark:text-zinc-400" data-testid={`reviewpage-reopen-${c.id}`}><RotateCcw className="w-3 h-3" /> Reopen</button>
                    : <button onClick={() => resolve(c, true)} className="text-[11px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400" data-testid={`reviewpage-resolve-${c.id}`}><CheckCircle2 className="w-3 h-3" /> Resolve</button>}
                </div>
                {c.anchor_text && <div className="text-xs italic text-zinc-500 dark:text-zinc-400 border-l-2 border-indigo-300 dark:border-indigo-500 pl-2 mb-1">“{c.anchor_text}”</div>}
                <p className="text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{renderBody(c.body)}</p>

                {replies.length > 0 && (
                  <div className="mt-2 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                    {replies.map((r) => (
                      <div key={r.id} data-testid={`review-reply-${r.id}`}>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{r.author_name || r.author_email}</span>
                        <p className="text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{renderBody(r.body)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {replyTo === c.id ? (
                  <div className="mt-2">
                    <MentionInput value={replyBody} onChange={setReplyBody} options={knownEmails} rows={2} autoFocus placeholder="Reply…  use @ to mention" testid={`reply-input-${c.id}`} />
                    <div className="flex justify-end gap-2 mt-1">
                      <button onClick={() => { setReplyTo(null); setReplyBody(''); }} className="text-[11px] px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">Cancel</button>
                      <button onClick={() => submitReply(c.id)} disabled={!replyBody.trim()} className="text-[11px] px-2.5 py-1 bg-indigo-600 text-white rounded disabled:opacity-50" data-testid={`reply-submit-${c.id}`}>Reply</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setReplyTo(c.id); setReplyBody(''); }} className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400" data-testid={`reply-btn-${c.id}`}>Reply</button>
                )}
              </div>
              );
            })}
          </div>
          {/* Start a new top-level comment (no selection needed) */}
          <div className="mt-3" data-testid="new-comment-box">
            <MentionInput value={replyTo === '__new__' ? replyBody : (replyTo ? '' : body)} onChange={(v) => { setReplyTo('__new__'); setReplyBody(v); }} options={knownEmails} rows={2} placeholder="Add a comment…  use @ to mention" testid="new-comment-input" />
            <div className="flex justify-end mt-1">
              <button onClick={async () => { const b = replyBody.trim(); if (!b) return; try { const { data } = await axios.post(`${API}/projects/${pid}/comments`, { doc_slug: slug, body: b, mentions: mentionsIn(b) }); setComments((p) => [...p, data]); setReplyTo(null); setReplyBody(''); toast.success('Comment added'); } catch { toast.error('Failed to add comment'); } }} disabled={replyTo !== '__new__' || !replyBody.trim()} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md disabled:opacity-50" data-testid="new-comment-submit">Comment</button>
            </div>
          </div>
        </aside>
      </div>

      {sel && reviewOn && (
        <button onClick={startComment} style={{ position: 'absolute', left: sel.x, top: sel.y, transform: 'translate(-50%,-100%)' }} className="z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-full shadow-lg" data-testid="selection-comment-btn">
          <MessageSquarePlus className="w-3.5 h-3.5" /> Comment
        </button>
      )}

      {composer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setComposer(null)}>
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-5 border border-transparent dark:border-zinc-800" onClick={(e) => e.stopPropagation()} data-testid="review-composer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Pin a comment</h3>
              <button onClick={() => setComposer(null)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-4 h-4" /></button>
            </div>
            {composer.anchor_text && <div className="text-xs italic text-zinc-500 dark:text-zinc-400 border-l-2 border-indigo-300 dark:border-indigo-500 pl-2 mb-3 line-clamp-3">“{composer.anchor_text}”</div>}
            <MentionInput value={body} onChange={setBody} options={knownEmails} rows={4} autoFocus placeholder="Your comment…  use @ to mention" testid="composer-input" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setComposer(null)} className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">Cancel</button>
              <button onClick={submitComment} disabled={!body.trim()} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md disabled:opacity-50" data-testid="composer-submit">Add comment</button>
            </div>
          </div>
        </div>
      )}

      {/* Verdict nudge before leaving a page with no verdict */}
      {pendingNav && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setPendingNav(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-5 border border-transparent dark:border-zinc-800" onClick={(e) => e.stopPropagation()} data-testid="verdict-nudge">
            <h3 className="font-semibold mb-1">No verdict yet</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">You haven't left a verdict for <span className="font-medium">{doc.title}</span>. Leave one now, or come back to it later?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setPendingNav(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full px-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-md" data-testid="nudge-stay">Stay and leave a verdict</button>
              <button onClick={() => { const url = pendingNav.url; setPendingNav(null); navigate(url); }} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800" data-testid="nudge-review-later">Review later, continue</button>
            </div>
          </div>
        </div>
      )}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setShowHistory(false)} data-testid="page-history-overlay">
          <div className="w-[380px] h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl p-5 overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="page-history-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Page history</h3>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded" data-testid="page-history-close"><X className="w-4 h-4" /></button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="page-history-empty">No history for this page yet.</p>
            ) : (
              <div className="relative pl-4 border-l border-zinc-200 dark:border-zinc-800 space-y-4">
                {history.map(ev => (
                  <div key={ev.id} className="relative" data-testid={`page-history-${ev.id}`}>
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="text-sm text-zinc-700 dark:text-zinc-200">
                      <span className="font-medium">{ev.actor_name || ev.actor_email}</span> {ACTION_LABEL[ev.action] || ev.action}
                      {ev.meta?.verdict ? <span className="text-zinc-500"> — “{ev.meta.verdict}”</span> : null}
                      {ev.meta?.to ? <span className="text-zinc-500"> ({ev.meta.from} → {ev.meta.to})</span> : null}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{new Date(ev.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
