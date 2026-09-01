import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Inbox, ClipboardList, BarChart3, Send, CheckCircle2, RotateCcw, Trash2,
  ArrowLeft, MessageSquarePlus, Loader2, UserPlus,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VERDICTS = [
  'Looks correct', 'Needs small edits', 'Wrong info', 'More info needed',
  'Outdated', 'Tone / clarity', 'Other',
];

const StatusPill = ({ s }) => {
  const map = {
    published: 'bg-emerald-100 text-emerald-700',
    in_review: 'bg-amber-100 text-amber-700',
    draft: 'bg-zinc-200 text-zinc-600',
    done: 'bg-emerald-100 text-emerald-700',
    not_started: 'bg-zinc-200 text-zinc-600',
  };
  const label = { published: 'Published', in_review: 'In review', draft: 'Draft', done: 'Done', not_started: 'Not started' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[s] || 'bg-zinc-200 text-zinc-600'}`}>{label[s] || s}</span>;
};

export default function ReviewConsole() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [pid, setPid] = useState(null);
  const [config, setConfig] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [tab, setTab] = useState('overview');
  const [progress, setProgress] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [inbox, setInbox] = useState({ comments: [], unread: 0, open: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState(null); // {slug,title,id}
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [verdict, setVerdict] = useState('');
  // assignment form
  const [aScopes, setAScopes] = useState([]);
  const [scopeQuery, setScopeQuery] = useState('');
  const [knownEmails, setKnownEmails] = useState([]);
  const [aEmail, setAEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const isOwner = role?.is_owner;

  const scopeOptions = useMemo(() => {
    const tabs = config?.navigation?.tabs || [];
    const opts = [];
    tabs.forEach(t => {
      opts.push({ type: 'tab', id: t.id || t.label, label: `Tab: ${t.label}` });
      (t.groups || []).forEach(g => {
        opts.push({ type: 'group', id: `${t.id || t.label}::${g.group}`, label: `  Section: ${t.label} › ${g.group}` });
      });
    });
    documents.forEach(d => opts.push({ type: 'page', id: d.slug, label: `Page: ${d.title}` }));
    return opts;
  }, [config, documents]);

  const load = useCallback(async () => {
    try {
      const me = await axios.get(`${API}/roles/me`);
      setRole(me.data);
      const dp = await axios.get(`${API}/public/default-project`, { withCredentials: false });
      const projectId = dp.data.project.id;
      setPid(projectId);
      setConfig(dp.data.config);
      const docs = await axios.get(`${API}/projects/${projectId}/documents`);
      setDocuments(docs.data);
      const asg = await axios.get(`${API}/projects/${projectId}/assignments`);
      setAssignments(asg.data.assignments);
      try {
        const ke = await axios.get(`${API}/projects/${projectId}/known-emails`);
        setKnownEmails(ke.data.emails || []);
      } catch (e) { /* suggestions are best-effort */ }
      if (me.data.is_owner) {
        const [pr, ib] = await Promise.all([
          axios.get(`${API}/projects/${projectId}/review/progress`),
          axios.get(`${API}/projects/${projectId}/review/inbox`),
        ]);
        setProgress(pr.data);
        setInbox(ib.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load review console');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mark inbox comments read when the owner opens the Review Inbox (clears unread badge)
  useEffect(() => {
    if (tab !== 'inbox' || !isOwner || inbox.unread === 0) return;
    const me = role?.email;
    const unreadOnes = (inbox.comments || []).filter(c => !(c.read_by || []).includes(me) && c.author_email !== me);
    Promise.all(unreadOnes.map(c => axios.post(`${API}/projects/${pid}/comments/${c.id}/read`).catch(() => {})))
      .then(() => setInbox(prev => ({
        ...prev, unread: 0,
        comments: prev.comments.map(c => ({ ...c, read_by: [...(c.read_by || []), me] })),
      })));
  }, [tab, isOwner, pid, role, inbox.unread, inbox.comments]);

  const openDoc = useCallback(async (doc) => {
    setActiveDoc(doc);
    setVerdict('');
    setComments([]);
    try {
      const [cm, vd] = await Promise.all([
        axios.get(`${API}/projects/${pid}/comments`, { params: { doc_slug: doc.slug } }),
        axios.get(`${API}/projects/${pid}/verdicts`, { params: { doc_slug: doc.slug } }),
      ]);
      setComments(cm.data.comments);
      const mine = (vd.data.verdicts || []).find(v => v.reviewer_email === role?.email);
      setVerdict(mine?.verdict || '');
    } catch (e) {
      toast.error('Failed to load comments');
    }
  }, [pid, role]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/projects/${pid}/comments`, { doc_slug: activeDoc.slug, body: newComment.trim() });
      setComments(prev => [...prev, data]);
      setNewComment('');
      toast.success('Comment added');
    } catch (e) { toast.error('Failed to add comment'); } finally { setBusy(false); }
  };

  const saveVerdict = async (v) => {
    setVerdict(v);
    try {
      await axios.post(`${API}/projects/${pid}/verdicts`, { doc_slug: activeDoc.slug, verdict: v });
      toast.success('Verdict saved');
    } catch (e) { toast.error('Failed to save verdict'); }
  };

  const resolveComment = async (c, resolve) => {
    try {
      await axios.post(`${API}/projects/${pid}/comments/${c.id}/${resolve ? 'resolve' : 'reopen'}`);
      setComments(prev => prev.map(x => x.id === c.id ? { ...x, resolved: resolve } : x));
      setInbox(prev => ({ ...prev, comments: prev.comments.map(x => x.id === c.id ? { ...x, resolved: resolve } : x) }));
    } catch (e) { toast.error('Action failed'); }
  };

  const createAssignment = async () => {
    if (aScopes.length === 0 || !aEmail.trim()) { toast.error('Pick at least one item and enter an email'); return; }
    setBusy(true);
    try {
      const results = await Promise.allSettled(aScopes.map((key) => {
        const opt = scopeOptions.find((o) => `${o.type}:${o.id}` === key);
        return axios.post(`${API}/projects/${pid}/assignments`, {
          scope_type: opt.type, scope_id: opt.id,
          scope_label: opt.label.replace(/^\s*(Tab|Section|Page):\s*/, ''),
          assignee_email: aEmail.trim(),
        });
      }));
      const email = aEmail.trim();
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      const asg = await axios.get(`${API}/projects/${pid}/assignments`);
      setAssignments(asg.data.assignments);
      if (failed === 0) {
        setAEmail(''); setAScopes([]); setScopeQuery('');
        toast.success(`Assigned ${ok} item(s) to ${email}`);
      } else {
        toast.error(`${ok} assigned, ${failed} failed — try the failed ones again`);
      }
    } catch (e) { toast.error('Failed to assign'); } finally { setBusy(false); }
  };

  const toggleScope = (key) => setAScopes((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const setAssignmentStatus = async (a, status) => {
    try {
      await axios.put(`${API}/projects/${pid}/assignments/${a.id}`, { status });
      setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status } : x));
      toast.success(`Marked ${status.replace('_', ' ')}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const delegate = async (a) => {
    const email = window.prompt('Delegate this review to (email):');
    if (!email) return;
    try {
      await axios.post(`${API}/projects/${pid}/assignments/${a.id}/delegate`, { email });
      const asg = await axios.get(`${API}/projects/${pid}/assignments`);
      setAssignments(asg.data.assignments);
      toast.success('Delegated');
    } catch (e) { toast.error('Failed to delegate'); }
  };

  const publishDoc = async (doc, publish) => {
    try {
      await axios.post(`${API}/projects/${pid}/documents/${doc.id}/${publish ? 'publish' : 'unpublish'}`);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: publish ? 'published' : 'in_review' } : d));
      toast.success(publish ? 'Published' : 'Taken down');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  const TabBtn = ({ id, icon: Icon, label, badge }) => (
    <button
      onClick={() => setTab(id)}
      data-testid={`review-tab-${id}`}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
    >
      <Icon className="w-4 h-4" /> {label}
      {badge > 0 && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white" data-testid={`${id}-badge`}>{badge}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900" data-testid="review-console">
      <header className="h-14 px-6 flex items-center justify-between border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="p-1.5 hover:bg-zinc-100 rounded-md" data-testid="review-back"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="font-semibold">Review Console</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium" data-testid="review-role">{isOwner ? 'Owner' : 'Reviewer'}</span>
        </div>
        <span className="text-sm text-zinc-500">{role?.email}</span>
      </header>

      <div className="px-6 py-3 flex items-center gap-2 border-b border-zinc-200 bg-white">
        {isOwner && <TabBtn id="overview" icon={BarChart3} label="Overview" />}
        <TabBtn id="assignments" icon={ClipboardList} label={isOwner ? 'Assignments' : 'My Reviews'} />
        {isOwner && <TabBtn id="inbox" icon={Inbox} label="Review Inbox" badge={inbox.unread} />}
        {isOwner && <TabBtn id="publish" icon={Send} label="Publish" />}
      </div>

      <main className="p-6 max-w-5xl mx-auto">
        {/* OVERVIEW */}
        {tab === 'overview' && isOwner && (
          <div className="grid grid-cols-2 gap-4" data-testid="review-overview">
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="font-semibold mb-3">Documents</h3>
              {Object.entries(progress?.docs_by_status || {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5"><StatusPill s={k} /><span className="font-semibold">{v}</span></div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="font-semibold mb-3">Assignments</h3>
              <p className="text-sm text-zinc-500 mb-2">{progress?.total_assignments || 0} total</p>
              {Object.entries(progress?.assignments_by_status || {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5"><StatusPill s={k} /><span className="font-semibold">{v}</span></div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-zinc-500">Open comments</span><span className="font-semibold">{inbox.open}</span>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGNMENTS */}
        {tab === 'assignments' && (
          <div data-testid="review-assignments">
            {isOwner && (
              <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4" /> New assignment</h3>
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs text-zinc-500">Assign these (pick one or many)</label>
                    <input
                      value={scopeQuery}
                      onChange={(e) => setScopeQuery(e.target.value)}
                      placeholder="Filter tabs / sections / pages…"
                      data-testid="assign-scope-search"
                      className="mt-1 w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
                    />
                    <div className="mt-2 max-h-56 overflow-y-auto border border-zinc-200 rounded-md divide-y divide-zinc-100" data-testid="assign-scope-list">
                      {scopeOptions
                        .filter((o) => o.label.toLowerCase().includes(scopeQuery.toLowerCase()))
                        .slice(0, 200)
                        .map((o) => {
                          const key = `${o.type}:${o.id}`;
                          const checked = aScopes.includes(key);
                          return (
                            <label key={key} className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-zinc-50 ${o.type !== 'page' ? 'font-medium' : ''}`} data-testid={`assign-option-${o.type}-${o.id}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleScope(key)} className="accent-zinc-900" />
                              <span className={o.type === 'tab' ? 'text-indigo-700' : o.type === 'group' ? 'text-zinc-700' : 'text-zinc-500'}>{o.label.trim()}</span>
                            </label>
                          );
                        })}
                    </div>
                    {aScopes.length > 0 && <p className="text-xs text-zinc-500 mt-1" data-testid="assign-selected-count">{aScopes.length} item(s) selected</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      value={aEmail}
                      onChange={(e) => setAEmail(e.target.value)}
                      placeholder="reviewer@emergent.sh"
                      list="known-emails"
                      data-testid="assign-email"
                      className="border border-zinc-300 rounded-md px-3 py-2 text-sm min-w-[240px]"
                    />
                    <datalist id="known-emails">
                      {knownEmails.map((em) => <option key={em} value={em} />)}
                    </datalist>
                    <button onClick={createAssignment} disabled={busy} data-testid="assign-submit" className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md disabled:opacity-50">
                      Assign {aScopes.length > 0 ? `(${aScopes.length})` : ''}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {assignments.length === 0 && <p className="text-sm text-zinc-500" data-testid="assign-empty">No assignments yet.</p>}
              {assignments.map(a => (
                <div key={a.id} className="bg-white rounded-lg border border-zinc-200 p-4 flex items-center justify-between" data-testid={`assignment-${a.id}`}>
                  <div className="flex-1">
                    <div className="font-medium">{a.scope_label} <span className="text-xs text-zinc-400">({a.scope_type})</span></div>
                    <div className="text-xs text-zinc-500">{a.assignee_email} · {a.slugs?.length || 0} page(s){a.delegated_from ? ` · delegated from ${a.delegated_from}` : ''}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(a.slugs || []).map(s => {
                        const doc = documents.find(x => x.slug === s);
                        return (
                          <button key={s} onClick={() => openDoc(doc || { slug: s, title: s })} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-indigo-100 text-zinc-600" data-testid={`review-page-${s}`}>
                            {doc?.title || s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill s={a.status} />
                    {a.status !== 'done' && <button onClick={() => setAssignmentStatus(a, 'done')} className="text-xs px-2 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50" data-testid={`assignment-done-${a.id}`}>Mark done</button>}
                    {a.status === 'done' && <button onClick={() => setAssignmentStatus(a, 'in_review')} className="text-xs px-2 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-50">Reopen</button>}
                    <button onClick={() => delegate(a)} className="text-xs px-2 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-50" data-testid={`assignment-delegate-${a.id}`}>Delegate</button>
                    {isOwner && <button onClick={async () => { await axios.delete(`${API}/projects/${pid}/assignments/${a.id}`); setAssignments(p => p.filter(x => x.id !== a.id)); }} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INBOX */}
        {tab === 'inbox' && isOwner && (
          <div className="space-y-2" data-testid="review-inbox">
            {inbox.comments.length === 0 && <p className="text-sm text-zinc-500">No comments yet.</p>}
            {inbox.comments.map(c => (
              <div key={c.id} className="bg-white rounded-lg border border-zinc-200 p-4" data-testid={`inbox-comment-${c.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{c.author_name || c.author_email} <span className="text-xs text-zinc-400">on {c.doc_slug}</span></span>
                  {c.resolved
                    ? <button onClick={() => resolveComment(c, false)} className="text-xs flex items-center gap-1 text-zinc-500 hover:text-zinc-800"><RotateCcw className="w-3 h-3" /> Reopen</button>
                    : <button onClick={() => resolveComment(c, true)} className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-800" data-testid={`resolve-${c.id}`}><CheckCircle2 className="w-3 h-3" /> Resolve</button>}
                </div>
                {c.anchor_text && <div className="text-xs italic text-zinc-500 border-l-2 border-zinc-300 pl-2 mb-1">“{c.anchor_text}”</div>}
                <p className="text-sm text-zinc-700">{c.body}</p>
                {c.resolved && <span className="text-[10px] text-emerald-600 font-medium">Resolved</span>}
              </div>
            ))}
          </div>
        )}

        {/* PUBLISH */}
        {tab === 'publish' && isOwner && (
          <div className="space-y-1" data-testid="review-publish">
            {documents.map(d => (
              <div key={d.id} className="bg-white rounded-lg border border-zinc-200 px-4 py-2.5 flex items-center justify-between">
                <button onClick={() => navigate(`/admin/editor/${pid}/${d.id}`)} className="text-sm text-left hover:underline">{d.title}</button>
                <div className="flex items-center gap-2">
                  <button onClick={() => openDoc(d)} className="text-xs px-2 py-1 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50" data-testid={`review-doc-${d.id}`}>Review / Comment</button>
                  <StatusPill s={d.status || 'in_review'} />
                  {d.status === 'published'
                    ? <button onClick={() => publishDoc(d, false)} className="text-xs px-2 py-1 rounded-md border border-rose-300 text-rose-600 hover:bg-rose-50" data-testid={`takedown-${d.id}`}>Take down</button>
                    : <button onClick={() => publishDoc(d, true)} className="text-xs px-2 py-1 rounded-md bg-zinc-900 text-white" data-testid={`publish-${d.id}`}>Publish</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Doc review drawer */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setActiveDoc(null)}>
          <div className="w-[440px] h-full bg-white shadow-xl p-5 overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="review-drawer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{activeDoc.title}</h3>
              <button onClick={() => navigate(`/review/${activeDoc.slug}`)} className="text-xs px-2 py-1 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50" data-testid="open-inline-review">Open full page ↗</button>
            </div>
            <label className="text-xs text-zinc-500">Verdict</label>
            <div className="flex flex-wrap gap-1.5 my-2">
              {VERDICTS.map(v => (
                <button key={v} onClick={() => saveVerdict(v)} className={`text-xs px-2 py-1 rounded-full border ${verdict === v ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'}`} data-testid={`verdict-${v.replace(/\W+/g, '-')}`}>{v}</button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-xs text-zinc-500">Comments</label>
              <div className="space-y-2 my-2">
                {comments.map(c => (
                  <div key={c.id} className="text-sm border border-zinc-200 rounded-md p-2">
                    <div className="text-xs text-zinc-400">{c.author_name || c.author_email}{c.resolved ? ' · resolved' : ''}</div>
                    <p>{c.body}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs text-zinc-400">No comments yet.</p>}
              </div>
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Leave a comment…" data-testid="drawer-comment-input" className="w-full border border-zinc-300 rounded-md p-2 text-sm" rows={3} />
              <button onClick={addComment} disabled={busy} className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-md disabled:opacity-50" data-testid="drawer-comment-submit"><MessageSquarePlus className="w-4 h-4" /> Add comment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
