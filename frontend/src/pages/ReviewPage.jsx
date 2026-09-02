import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { DocContent } from '@/components/docs/DocContent';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft, MessageSquarePlus, CheckCircle2, RotateCcw, X, Sun, Moon,
  ChevronLeft, ChevronRight, ListChecks, Circle,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const VERDICTS = ['Looks correct', 'Needs small edits', 'Wrong info', 'More info needed', 'Outdated', 'Tone / clarity', 'Other'];

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

  const idx = queue.indexOf(slug);
  const prevSlug = idx > 0 ? queue[idx - 1] : null;
  const nextSlug = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null;
  const reviewedCount = useMemo(() => queue.filter((s) => reviewedSet.has(s)).length, [queue, reviewedSet]);
  const showNav = queue.length > 0;

  const buildUrl = (targetSlug) => `/review/${targetSlug}${reviewerEmail ? `?reviewer=${encodeURIComponent(reviewerEmail)}` : ''}`;

  // Nudge the reviewer for a verdict before leaving this page.
  const guardedNavigate = (url) => {
    if (verdict) { navigate(url); return; }
    setPendingNav({ url });
  };
  const goToSlug = (targetSlug) => { if (targetSlug) guardedNavigate(buildUrl(targetSlug)); };

  const onMouseUp = () => {
    if (!reviewOn) return;
    const s = window.getSelection();
    const text = s?.toString().trim();
    if (!text || text.length < 2) { setSel(null); return; }
    const rect = s.getRangeAt(0).getBoundingClientRect();
    setSel({ text, x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 6 });
  };

  const startComment = () => { setComposer({ anchor_text: sel.text }); setSel(null); setBody(''); };

  const submitComment = async () => {
    if (!body.trim()) return;
    try {
      const { data } = await axios.post(`${API}/projects/${pid}/comments`, {
        doc_slug: slug, body: body.trim(), anchor_text: composer?.anchor_text || null,
      });
      setComments((prev) => [...prev, data]);
      setComposer(null); setBody('');
      toast.success('Comment pinned to selection');
    } catch (e) { toast.error('Failed to add comment'); }
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
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{idx >= 0 ? idx + 1 : '–'} / {queue.length}</span>
              <button onClick={() => goToSlug(nextSlug)} disabled={!nextSlug} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent" data-testid="next-page-btn" aria-label="Next assigned page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400" data-testid="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none" data-testid="review-toggle">
            <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">Review</span>
            <button onClick={() => setReviewOn((v) => !v)} aria-pressed={reviewOn} className={`relative w-10 h-5 rounded-full transition-colors ${reviewOn ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} data-testid="review-toggle-btn">
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${reviewOn ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>
      </header>

      <div className={`max-w-6xl mx-auto grid grid-cols-1 gap-8 px-6 py-8 ${showNav ? 'lg:grid-cols-[240px_1fr_300px]' : 'lg:grid-cols-[1fr_320px]'}`}>
        {/* Reviewer side-nav: only the pages assigned to this reviewer */}
        {showNav && (
          <nav className="lg:sticky lg:top-20 h-fit order-first" data-testid="review-sidenav">
            <div className="mb-3" data-testid="review-progress">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-600 dark:text-zinc-300"><ListChecks className="w-3.5 h-3.5" /> Your reviews</span>
                <span className="text-zinc-500 dark:text-zinc-400 tabular-nums" data-testid="review-progress-count">{reviewedCount} of {queue.length} reviewed</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${queue.length ? (reviewedCount / queue.length) * 100 : 0}%` }} data-testid="review-progress-bar" />
              </div>
            </div>
            <div className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1">
              {queue.map((s) => {
                const done = reviewedSet.has(s);
                const active = s === slug;
                return (
                  <button
                    key={s}
                    onClick={() => goToSlug(s)}
                    data-testid={`sidenav-item-${s}`}
                    className={`w-full text-left flex items-start gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    {done
                      ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                      : <Circle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-zinc-300 dark:text-zinc-600" />}
                    <span className="line-clamp-2">{docsMap[s] || s}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <article onMouseUp={onMouseUp} className={`min-w-0 ${reviewOn ? 'cursor-text' : ''}`} data-testid="review-content">
          <h1 className="text-3xl font-bold mb-4 text-zinc-950 dark:text-white">{doc.title}</h1>
          <div className="doc-content">
            <DocContent content={doc.content?.replace(new RegExp(`^#\\s*${(doc.title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'), '') || doc.content} />
          </div>
          {showNav && (
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
            {comments.length === 0 && <p className="text-xs text-zinc-400 dark:text-zinc-500">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c.id} className={`rounded-lg border p-3 text-sm ${c.resolved ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'}`} data-testid={`review-comment-${c.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{c.author_name || c.author_email}</span>
                  {isOwner && (c.resolved
                    ? <button onClick={() => resolve(c, false)} className="text-[11px] flex items-center gap-1 text-zinc-500 dark:text-zinc-400" data-testid={`reviewpage-reopen-${c.id}`}><RotateCcw className="w-3 h-3" /> Reopen</button>
                    : <button onClick={() => resolve(c, true)} className="text-[11px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400" data-testid={`reviewpage-resolve-${c.id}`}><CheckCircle2 className="w-3 h-3" /> Resolve</button>)}
                </div>
                {c.anchor_text && <div className="text-xs italic text-zinc-500 dark:text-zinc-400 border-l-2 border-indigo-300 dark:border-indigo-500 pl-2 mb-1">“{c.anchor_text}”</div>}
                <p className="text-zinc-700 dark:text-zinc-200">{c.body}</p>
              </div>
            ))}
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
            <textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your comment…" rows={4} className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md p-2 text-sm" data-testid="composer-input" />
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
    </div>
  );
}
