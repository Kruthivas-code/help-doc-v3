import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { DocContent } from '@/components/docs/DocContent';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, MessageSquarePlus, CheckCircle2, RotateCcw, X, Sun, Moon } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const VERDICTS = ['Looks correct', 'Needs small edits', 'Wrong info', 'More info needed', 'Outdated', 'Tone / clarity', 'Other'];

export default function ReviewPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
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

  const isOwner = role?.is_owner;

  const loadComments = useCallback(async (projectId) => {
    const cm = await axios.get(`${API}/projects/${projectId}/comments`, { params: { doc_slug: slug } });
    setComments(cm.data.comments);
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        const me = await axios.get(`${API}/roles/me`);
        setRole(me.data);
        const dp = await axios.get(`${API}/public/default-project`, { withCredentials: false });
        const projectId = dp.data.project.id;
        setPid(projectId);
        const docs = await axios.get(`${API}/projects/${projectId}/documents`);
        setDoc(docs.data.find((x) => x.slug === slug) || null);
        await loadComments(projectId);
        try {
          const vd = await axios.get(`${API}/projects/${projectId}/verdicts`, { params: { doc_slug: slug } });
          const mine = (vd.data.verdicts || []).find((v) => v.reviewer_email === me.data.email);
          setVerdict(mine?.verdict || '');
        } catch (e) { /* no verdict yet */ }
      } catch (e) {
        toast.error('Failed to load page');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, loadComments]);

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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/review')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md" data-testid="reviewpage-back"><ArrowLeft className="w-4 h-4" /></button>
          <span className="font-semibold">{doc.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium">Review mode</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400" data-testid="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none" data-testid="review-toggle">
            <span className="text-zinc-500 dark:text-zinc-400">Review</span>
            <button onClick={() => setReviewOn((v) => !v)} aria-pressed={reviewOn} className={`relative w-10 h-5 rounded-full transition-colors ${reviewOn ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} data-testid="review-toggle-btn">
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${reviewOn ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 px-6 py-8">
        <article onMouseUp={onMouseUp} className={`min-w-0 ${reviewOn ? 'cursor-text' : ''}`} data-testid="review-content">
          <h1 className="text-3xl font-bold mb-4 text-zinc-950 dark:text-white">{doc.title}</h1>
          <div className="doc-content">
            <DocContent content={doc.content?.replace(new RegExp(`^#\\s*${(doc.title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'), '') || doc.content} />
          </div>
        </article>

        <aside className="lg:sticky lg:top-20 h-fit">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Your verdict</h3>
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
    </div>
  );
}
