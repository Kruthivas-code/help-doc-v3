import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { DocContent } from '@/components/docs/DocContent';
import { ArrowLeft, MessageSquarePlus, CheckCircle2, RotateCcw, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReviewPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [pid, setPid] = useState(null);
  const [doc, setDoc] = useState(null);
  const [comments, setComments] = useState([]);
  const [role, setRole] = useState(null);
  const [reviewOn, setReviewOn] = useState(true);
  const [sel, setSel] = useState(null); // {text,x,y}
  const [composer, setComposer] = useState(null); // {anchor_text}
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-zinc-400">Loading…</div>;
  if (!doc) return <div className="min-h-screen flex items-center justify-center bg-white text-zinc-500">Page not found.</div>;

  return (
    <div className="min-h-screen bg-white text-zinc-900" data-testid="review-page">
      <header className="sticky top-0 z-40 h-14 px-6 flex items-center justify-between border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/review')} className="p-1.5 hover:bg-zinc-100 rounded-md" data-testid="reviewpage-back"><ArrowLeft className="w-4 h-4" /></button>
          <span className="font-semibold">{doc.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Review mode</span>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" data-testid="review-toggle">
          <span className="text-zinc-500">Review</span>
          <button
            onClick={() => setReviewOn((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${reviewOn ? 'bg-indigo-600' : 'bg-zinc-300'}`}
            data-testid="review-toggle-btn"
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${reviewOn ? 'translate-x-5' : ''}`} />
          </button>
        </label>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 px-6 py-8">
        {/* Read-only content */}
        <article
          onMouseUp={onMouseUp}
          className={`doc-content prose prose-zinc max-w-none ${reviewOn ? 'cursor-text' : ''}`}
          data-testid="review-content"
        >
          <h1 className="text-3xl font-bold mb-4">{doc.title}</h1>
          <DocContent content={doc.content?.replace(new RegExp(`^#\\s*${(doc.title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'), '') || doc.content} />
        </article>

        {/* Comments rail */}
        <aside className="lg:sticky lg:top-20 h-fit">
          <h3 className="text-sm font-semibold text-zinc-500 mb-3">Comments ({comments.length})</h3>
          {reviewOn && <p className="text-xs text-zinc-400 mb-3">Select any text in the page to pin a comment to it.</p>}
          <div className="space-y-2" data-testid="review-comment-list">
            {comments.length === 0 && <p className="text-xs text-zinc-400">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c.id} className={`rounded-lg border p-3 text-sm ${c.resolved ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-200'}`} data-testid={`review-comment-${c.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-600">{c.author_name || c.author_email}</span>
                  {isOwner && (c.resolved
                    ? <button onClick={() => resolve(c, false)} className="text-[11px] flex items-center gap-1 text-zinc-500" data-testid={`reviewpage-reopen-${c.id}`}><RotateCcw className="w-3 h-3" /> Reopen</button>
                    : <button onClick={() => resolve(c, true)} className="text-[11px] flex items-center gap-1 text-emerald-600" data-testid={`reviewpage-resolve-${c.id}`}><CheckCircle2 className="w-3 h-3" /> Resolve</button>)}
                </div>
                {c.anchor_text && <div className="text-xs italic text-zinc-500 border-l-2 border-indigo-300 pl-2 mb-1">“{c.anchor_text}”</div>}
                <p className="text-zinc-700">{c.body}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Floating "add comment" button near a selection */}
      {sel && reviewOn && (
        <button
          onClick={startComment}
          style={{ position: 'absolute', left: sel.x, top: sel.y, transform: 'translate(-50%,-100%)' }}
          className="z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-full shadow-lg"
          data-testid="selection-comment-btn"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> Comment
        </button>
      )}

      {/* Composer */}
      {composer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setComposer(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()} data-testid="review-composer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Pin a comment</h3>
              <button onClick={() => setComposer(null)} className="p-1 hover:bg-zinc-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            {composer.anchor_text && <div className="text-xs italic text-zinc-500 border-l-2 border-indigo-300 pl-2 mb-3 line-clamp-3">“{composer.anchor_text}”</div>}
            <textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your comment…" rows={4} className="w-full border border-zinc-300 rounded-md p-2 text-sm" data-testid="composer-input" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setComposer(null)} className="px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md">Cancel</button>
              <button onClick={submitComment} disabled={!body.trim()} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md disabled:opacity-50" data-testid="composer-submit">Add comment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
