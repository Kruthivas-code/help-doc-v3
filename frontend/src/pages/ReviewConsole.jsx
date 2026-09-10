import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Inbox, ClipboardList, BarChart3, Send, CheckCircle2, RotateCcw, Trash2,
  ArrowLeft, MessageSquarePlus, Loader2, UserPlus, Sun, Moon, Filter, Users, ShieldCheck, History,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VERDICTS = [
  'Looks correct', 'Needs small edits', 'Wrong info', 'More info needed',
  'Outdated', 'Tone / clarity', 'Other',
];

const ACTION_LABEL = {
  assigned: 'assigned', delegated: 'delegated', edited: 'edited',
  commented: 'commented on', replied: 'replied on', resolved: 'resolved a comment on',
  published: 'published', unpublished: 'unpublished', deleted: 'moved to trash',
  restored: 'restored', purged: 'permanently deleted', verdict: 'set a verdict on',
};

const StatusPill = ({ s }) => {
  const map = {
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    draft: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    not_started: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  const label = { published: 'Published', in_review: 'In review', draft: 'Draft', done: 'Done', not_started: 'Not started' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[s] || 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>{label[s] || s}</span>;
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
  const [reviewerFilter, setReviewerFilter] = useState('');
  const [owners, setOwners] = useState([]);
  const [scopeView, setScopeView] = useState('unassigned'); // unassigned | assigned | all
  // reviewer delegate form
  const [dScopes, setDScopes] = useState([]);
  const [dQuery, setDQuery] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [activity, setActivity] = useState([]);
  const [activityPeople, setActivityPeople] = useState([]);
  const [pubSel, setPubSel] = useState(new Set());
  const [activityPerson, setActivityPerson] = useState('');
  const { isDark, toggleTheme } = useTheme();

  const isOwner = role?.is_owner;

  // Whose queue the reviewer-delegate panel operates on: a real reviewer delegates their own.
  const delegateFrom = (role?.email || '').toLowerCase();

  const myQueue = useMemo(() => {
    const s = new Set();
    if (!delegateFrom) return s;
    assignments.forEach((a) => {
      if ((a.assignee_email || '').toLowerCase() === delegateFrom) (a.slugs || []).forEach((x) => s.add(x));
    });
    return s;
  }, [assignments, delegateFrom]);

  const toggleDScope = (o) => {
    const key = `${o.type}:${o.id}`;
    const kids = (descendants[key] || []).filter((k) => myQueue.has(k.replace(/^page:/, '')));
    if (kids.length) {
      setDScopes((prev) => {
        const allIn = kids.every((k) => prev.includes(k));
        return allIn ? prev.filter((k) => !kids.includes(k)) : Array.from(new Set([...prev, ...kids]));
      });
    } else {
      setDScopes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    }
  };

  const delegatePages = async () => {
    const selectedSlugs = dScopes.filter((k) => k.startsWith('page:')).map((k) => k.slice(5));
    if (!delegateFrom) { toast.error('Pick a reviewer first'); return; }
    if (selectedSlugs.length === 0 || !dEmail.trim()) { toast.error('Pick at least one page and enter an email'); return; }
    const to = dEmail.trim();
    if (to.toLowerCase() === delegateFrom) { toast.info('Already assigned to that email'); return; }
    if (!window.confirm(`Delegate ${selectedSlugs.length} page(s) from ${delegateFrom} to ${to}?`)) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/projects/${pid}/assignments/delegate-pages`, {
        from_email: delegateFrom, to_email: to, slugs: selectedSlugs,
      });
      const asg = await axios.get(`${API}/projects/${pid}/assignments`);
      setAssignments(asg.data.assignments);
      setDScopes([]); setDEmail(''); setDQuery('');
      toast.success(`Delegated ${data.moved} page(s) to ${to}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to delegate'); } finally { setBusy(false); }
  };

  const byReviewer = useMemo(() => {
    const m = {};
    assignments.forEach(a => { const e = a.assignee_email || '—'; m[e] = (m[e] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [assignments]);

  // slug -> assignee email (first assignment that covers it)
  const assignedMap = useMemo(() => {
    const m = {};
    assignments.forEach(a => (a.slugs || []).forEach(s => { if (!m[s]) m[s] = a.assignee_email; }));
    return m;
  }, [assignments]);

  const docBySlug = useMemo(() => { const m = {}; documents.forEach(d => { m[d.slug] = d; }); return m; }, [documents]);
  // A page is "reviewer done" when any assignment covering it is marked done.
  const reviewDoneByPage = useMemo(() => {
    const m = {};
    assignments.forEach(a => { if (a.status === 'done') (a.slugs || []).forEach(s => { m[s] = true; }); });
    return m;
  }, [assignments]);

  const scopeOptions = useMemo(() => {
    const tabs = config?.navigation?.tabs || [];
    const opts = [];
    const seen = new Set();
    const titleOf = (slug) => (documents.find(d => d.slug === slug)?.title) || slug;
    const slugOf = (p) => (typeof p === 'string' ? p : p.page);
    tabs.forEach(t => {
      const tabId = t.id || t.label;
      opts.push({ type: 'tab', id: tabId, label: t.label, depth: 0 });
      const walk = (groups, depth) => {
        (groups || []).forEach(g => {
          opts.push({ type: 'group', id: `${tabId}::${g.group}`, label: g.group, depth });
          (g.pages || []).forEach(p => {
            const s = slugOf(p);
            if (!s) return;
            seen.add(s);
            opts.push({ type: 'page', id: s, label: (typeof p === 'object' && p.title) || titleOf(s), depth: depth + 1 });
          });
          walk(g.groups, depth + 1);
        });
      };
      walk(t.groups, 1);
    });
    // pages that aren't linked anywhere in the nav tree
    documents.filter(d => !seen.has(d.slug)).forEach(d => opts.push({ type: 'page', id: d.slug, label: d.title, depth: 0 }));
    return opts;
  }, [config, documents]);

  // Position of each page slug in the navigation (used to order the review list like the docs)
  const pageOrder = useMemo(() => {
    const m = {}; let i = 0;
    scopeOptions.forEach(o => { if (o.type === 'page' && !(o.id in m)) m[o.id] = i++; });
    return m;
  }, [scopeOptions]);

  // For each tab/section option key -> the list of descendant page keys (page:<slug>)
  const descendants = useMemo(() => {
    const map = {};
    const tabs = config?.navigation?.tabs || [];
    const slugOf = (p) => (typeof p === 'string' ? p : p.page);
    tabs.forEach(t => {
      const tabId = t.id || t.label;
      const tabPages = [];
      const collect = (gg) => {
        const acc = [];
        (gg.pages || []).forEach(p => { const s = slugOf(p); if (s) acc.push(`page:${s}`); });
        (gg.groups || []).forEach(sub => { acc.push(...collect(sub)); });
        map[`group:${tabId}::${gg.group}`] = acc;
        return acc;
      };
      (t.groups || []).forEach(g => { tabPages.push(...collect(g)); });
      map[`tab:${tabId}`] = Array.from(new Set(tabPages));
    });
    return map;
  }, [config]);

  const delegateOptions = useMemo(() => {
    if (myQueue.size === 0) return [];
    return scopeOptions.filter((o) => {
      if (o.type === 'page') return myQueue.has(o.id);
      const kids = descendants[`${o.type}:${o.id}`] || [];
      return kids.some((k) => myQueue.has(k.replace(/^page:/, '')));
    });
  }, [scopeOptions, descendants, myQueue]);

  // New-assignment picker: filter by assigned state + search
  const pageOptCount = useMemo(() => scopeOptions.filter(o => o.type === 'page').length, [scopeOptions]);
  const assignedPageCount = useMemo(() => scopeOptions.filter(o => o.type === 'page' && assignedMap[o.id]).length, [scopeOptions, assignedMap]);
  const visibleScopeOptions = useMemo(() => {
    const q = scopeQuery.toLowerCase();
    const pageVisible = (slug) => scopeView === 'all' ? true : scopeView === 'assigned' ? !!assignedMap[slug] : !assignedMap[slug];
    return scopeOptions.filter((o) => {
      if (!o.label.toLowerCase().includes(q)) return false;
      if (o.type === 'page') return pageVisible(o.id);
      const kids = descendants[`${o.type}:${o.id}`] || [];
      return kids.some((k) => pageVisible(k.replace(/^page:/, '')));
    });
  }, [scopeOptions, descendants, scopeView, scopeQuery, assignedMap]);

  // Keep Overview numbers fresh after assignment changes (no manual refresh needed)
  useEffect(() => {
    if (!pid || !isOwner) return;
    axios.get(`${API}/projects/${pid}/review/progress`).then(r => setProgress(r.data)).catch(() => {});
  }, [assignments, pid, isOwner]);

  // Load the global activity feed when the Activity tab (or its person filter) changes
  useEffect(() => {
    if (!pid || !isOwner || tab !== 'activity') return;
    const q = activityPerson ? `?person=${encodeURIComponent(activityPerson)}` : '';
    axios.get(`${API}/projects/${pid}/activity${q}`).then(r => {
      setActivity(r.data.activity || []);
      setActivityPeople(r.data.people || []);
    }).catch(() => {});
  }, [tab, activityPerson, pid, isOwner]);

  const load = useCallback(async () => {
    try {
      const me = await axios.get(`${API}/roles/me`);
      setRole(me.data);
      if (!me.data.is_owner) setTab('assignments');
      const dp = await axios.get(`${API}/public/default-project`, { withCredentials: false });
      const projectId = dp.data.project.id;
      setPid(projectId);
      setConfig(dp.data.config);
      const docs = await axios.get(`${API}/projects/${projectId}/documents`);
      setDocuments(docs.data);
      const asg = await axios.get(`${API}/projects/${projectId}/assignments`);
      setAssignments(asg.data.assignments);
      try {
        if (me.data.is_owner) {
          const ke = await axios.get(`${API}/projects/${projectId}/known-emails`);
          setKnownEmails(ke.data.emails || []);
        }
      } catch (e) { /* suggestions are best-effort */ }
      if (me.data.is_owner) {
        const [pr, ib, ow] = await Promise.all([
          axios.get(`${API}/projects/${projectId}/review/progress`),
          axios.get(`${API}/projects/${projectId}/review/inbox`),
          axios.get(`${API}/roles/owners`).catch(() => ({ data: { owners: [] } })),
        ]);
        setProgress(pr.data);
        setInbox(ib.data);
        setOwners((ow.data.owners || []).map(o => (o.email || '').toLowerCase()));
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
          scope_label: opt.label,
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

  const toggleScope = (key) => {
    const kids = descendants[key];
    if (kids && kids.length) {
      // Tab / section: cascade-select all its pages
      setAScopes((prev) => {
        const allIn = kids.every((k) => prev.includes(k));
        if (allIn) return prev.filter((k) => !kids.includes(k));
        return Array.from(new Set([...prev, ...kids]));
      });
    } else {
      setAScopes((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    }
  };

  const setAssignmentStatus = async (a, status) => {
    try {
      await axios.put(`${API}/projects/${pid}/assignments/${a.id}`, { status });
      setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status } : x));
      toast.success(`Marked ${status.replace('_', ' ')}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const delegate = async (a) => {
    const email = window.prompt(`Currently assigned to ${a.assignee_email}.\nReassign this review to which email?`);
    if (!email) return;
    if (email.trim().toLowerCase() === (a.assignee_email || '').toLowerCase()) {
      toast.info('Already assigned to that email'); return;
    }
    if (!window.confirm(`This was assigned to ${a.assignee_email}.\nAre you sure you want to reassign it to ${email.trim()}?`)) return;
    try {
      await axios.post(`${API}/projects/${pid}/assignments/${a.id}/delegate`, { email: email.trim() });
      const asg = await axios.get(`${API}/projects/${pid}/assignments`);
      setAssignments(asg.data.assignments);
      toast.success(`Reassigned to ${email.trim()}`);
    } catch (e) { toast.error('Failed to reassign'); }
  };

  const promote = async (email) => {
    if (!window.confirm(`Make ${email} an Owner? Owners can assign, publish, and manage roles.`)) return;
    try {
      await axios.post(`${API}/roles/promote`, { email });
      const ow = await axios.get(`${API}/roles/owners`);
      setOwners((ow.data.owners || []).map(o => (o.email || '').toLowerCase()));
      toast.success(`${email} is now an Owner`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to promote'); }
  };

  const bulkDelegate = async (fromEmail, count) => {
    const to = window.prompt(`Delegate all ${count} review(s) assigned to ${fromEmail} to which email?`);
    if (!to) return;
    const t = to.trim();
    if (t.toLowerCase() === (fromEmail || '').toLowerCase()) { toast.info('Already assigned to that email'); return; }
    if (!window.confirm(`Reassign all ${count} review(s) from ${fromEmail} to ${t}?`)) return;
    try {
      const { data } = await axios.post(`${API}/projects/${pid}/assignments/delegate-bulk`, { from_email: fromEmail, to_email: t });
      const asg = await axios.get(`${API}/projects/${pid}/assignments`);
      setAssignments(asg.data.assignments);
      toast.success(`Reassigned ${data.reassigned} review(s) to ${t}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to delegate'); }
  };

  const togglePub = (slug) => setPubSel(prev => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  const bulkPublish = async (slugs, publish) => {
    const targets = [...new Set(slugs)].map(s => docBySlug[s]).filter(Boolean)
      .filter(d => publish ? d.status !== 'published' : d.status === 'published');
    if (!targets.length) { toast(`Nothing to ${publish ? 'publish' : 'take down'}`); return; }
    await Promise.allSettled(targets.map(d => axios.post(`${API}/projects/${pid}/documents/${d.id}/${publish ? 'publish' : 'unpublish'}`)));
    setDocuments(prev => prev.map(d => targets.find(t => t.id === d.id) ? { ...d, status: publish ? 'published' : 'in_review' } : d));
    setPubSel(new Set());
    toast.success(`${targets.length} page(s) ${publish ? 'published' : 'taken down'}`);
  };

  const publishDoc = async (doc, publish) => {
    try {
      await axios.post(`${API}/projects/${pid}/documents/${doc.id}/${publish ? 'publish' : 'unpublish'}`);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: publish ? 'published' : 'in_review' } : d));
      toast.success(publish ? 'Published' : 'Taken down');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  const TabBtn = ({ id, icon: Icon, label, badge }) => (
    <button
      onClick={() => setTab(id)}
      data-testid={`review-tab-${id}`}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
    >
      <Icon className="w-4 h-4" /> {label}
      {badge > 0 && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white" data-testid={`${id}-badge`}>{badge}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" data-testid="review-console">
      <header className="h-14 px-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md" data-testid="review-back"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="font-semibold">Review Console</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 font-medium" data-testid="review-role">{isOwner ? 'Owner' : 'Reviewer'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400" data-testid="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{role?.email}</span>
        </div>
      </header>

      <div className="px-6 py-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {isOwner && <TabBtn id="overview" icon={BarChart3} label="Overview" />}
        <TabBtn id="assignments" icon={ClipboardList} label={isOwner ? 'Assignments' : 'My Reviews'} />
        {isOwner && <TabBtn id="inbox" icon={Inbox} label="Review Inbox" badge={inbox.unread} />}
        {isOwner && <TabBtn id="publish" icon={Send} label="Publish" />}
        {isOwner && <TabBtn id="team" icon={ShieldCheck} label="Team" />}
        {isOwner && <TabBtn id="activity" icon={History} label="Activity" />}
      </div>

      <main className="p-6 max-w-5xl mx-auto">
        {/* OVERVIEW */}
        {tab === 'overview' && isOwner && (
          <div className="grid grid-cols-2 gap-4" data-testid="review-overview">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="font-semibold mb-3">Documents</h3>
              {Object.entries(progress?.docs_by_status || {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5"><StatusPill s={k} /><span className="font-semibold">{v}</span></div>
              ))}
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="font-semibold mb-3">Assignments</h3>
              <p className="text-sm text-zinc-500 mb-2">{progress?.total_assignments || 0} total</p>
              {Object.entries(progress?.assignments_by_status || {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5"><StatusPill s={k} /><span className="font-semibold">{v}</span></div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <span className="text-sm text-zinc-500">Open comments</span><span className="font-semibold">{inbox.open}</span>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGNMENTS */}
        {tab === 'assignments' && (
          <div data-testid="review-assignments">
            {isOwner && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4" /> New assignment</h3>
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs text-zinc-500">Assign these (pick one or many)</label>
                    <input
                      value={scopeQuery}
                      onChange={(e) => setScopeQuery(e.target.value)}
                      placeholder="Filter tabs / sections / pages…"
                      data-testid="assign-scope-search"
                      className="mt-1 w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex items-center gap-1 text-xs" data-testid="assign-scope-view">
                      {[['unassigned', `Unassigned (${pageOptCount - assignedPageCount})`], ['assigned', `Assigned (${assignedPageCount})`], ['all', 'All']].map(([v, lbl]) => (
                        <button key={v} onClick={() => setScopeView(v)} data-testid={`scope-view-${v}`} className={`px-2 py-1 rounded-md border ${scopeView === v ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>{lbl}</button>
                      ))}
                    </div>
                    <div className="mt-2 max-h-56 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800" data-testid="assign-scope-list">
                      {visibleScopeOptions.length === 0 && <p className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400" data-testid="assign-scope-empty">No {scopeView === 'unassigned' ? 'unassigned' : scopeView} pages.</p>}
                      {visibleScopeOptions
                        .slice(0, 300)
                        .map((o) => {
                          const key = `${o.type}:${o.id}`;
                          const kids = descendants[key];
                          const checked = kids && kids.length ? kids.every((k) => aScopes.includes(k)) : aScopes.includes(key);
                          const some = kids && kids.length ? kids.some((k) => aScopes.includes(k)) : false;
                          const assignee = o.type === 'page' ? assignedMap[o.id] : null;
                          return (
                            <label key={key} style={{ paddingLeft: 12 + o.depth * 18 }} className={`flex items-center gap-2 pr-3 py-1.5 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${o.type !== 'page' ? 'font-medium' : ''}`} data-testid={`assign-option-${o.type}-${o.id}`}>
                              <input type="checkbox" checked={checked} ref={(el) => { if (el) el.indeterminate = some && !checked; }} onChange={() => toggleScope(key)} className="accent-zinc-900 dark:accent-white" />
                              <span className={`text-[10px] uppercase tracking-wide px-1 py-0.5 rounded ${o.type === 'tab' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' : o.type === 'group' ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-transparent text-zinc-400'}`}>{o.type === 'tab' ? 'Tab' : o.type === 'group' ? 'Sec' : 'Pg'}</span>
                              <span className={o.type === 'tab' ? 'text-indigo-700 dark:text-indigo-400' : o.type === 'group' ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}>{o.label}</span>
                              {assignee && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 whitespace-nowrap" data-testid={`assigned-badge-${o.id}`}>→ {assignee}</span>}
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
                      className="border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-3 py-2 text-sm min-w-[240px]"
                    />
                    <datalist id="known-emails">
                      {knownEmails.map((em) => <option key={em} value={em} />)}
                    </datalist>
                    <button onClick={createAssignment} disabled={busy} data-testid="assign-submit" className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-md disabled:opacity-50">
                      Assign {aScopes.length > 0 ? `(${aScopes.length})` : ''}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delegate — owner sees per-reviewer mass delegate; reviewer picks pages (all / several / one) */}
            {isOwner ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-5" data-testid="bulk-delegate-panel">
                <h3 className="font-semibold mb-1 flex items-center gap-2"><Users className="w-4 h-4" /> Delegate all reviews (per reviewer)</h3>
                <p className="text-xs text-zinc-500 mb-3">Reassign everything currently on one reviewer's plate to someone else in one step.</p>
                {byReviewer.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="bulk-delegate-empty">No reviewers have assignments yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {byReviewer.map(([email, count]) => (
                      <div key={email} className="flex items-center justify-between py-2 text-sm" data-testid={`bulk-delegate-row-${email}`}>
                        <span className="text-zinc-700 dark:text-zinc-200">{email} <span className="text-zinc-400">· {count} review(s)</span></span>
                        <button onClick={() => bulkDelegate(email, count)} className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800" data-testid={`bulk-delegate-btn-${email}`}>Delegate all →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-5" data-testid="reviewer-delegate-panel">
                <h3 className="font-semibold mb-1 flex items-center gap-2"><Users className="w-4 h-4" /> Delegate pages</h3>
                <p className="text-xs text-zinc-500 mb-3">Hand off some or all of your assigned pages to another reviewer — pick all, several, or just one.</p>
                {!delegateFrom ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="reviewer-delegate-hint">Type a reviewer's email in the “Show reviews for email…” box below to load their pages.</p>
                ) : delegateOptions.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="reviewer-delegate-empty">No pages assigned to {delegateFrom}.</p>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-zinc-500">Choose pages to delegate</label>
                      <div className="flex gap-3">
                        <button onClick={() => setDScopes(delegateOptions.filter((o) => o.type === 'page').map((o) => `page:${o.id}`))} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline" data-testid="delegate-select-all">Select all</button>
                        <button onClick={() => setDScopes([])} className="text-xs text-zinc-500 hover:underline" data-testid="delegate-clear">Clear</button>
                      </div>
                    </div>
                    <input value={dQuery} onChange={(e) => setDQuery(e.target.value)} placeholder="Filter your pages…" data-testid="delegate-scope-search" className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-3 py-2 text-sm" />
                    <div className="max-h-56 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800" data-testid="delegate-scope-list">
                      {delegateOptions
                        .filter((o) => o.label.toLowerCase().includes(dQuery.toLowerCase()))
                        .map((o) => {
                          const key = `${o.type}:${o.id}`;
                          const kids = (descendants[key] || []).filter((k) => myQueue.has(k.replace(/^page:/, '')));
                          const checked = kids.length ? kids.every((k) => dScopes.includes(k)) : dScopes.includes(key);
                          const some = kids.length ? kids.some((k) => dScopes.includes(k)) : false;
                          return (
                            <label key={key} style={{ paddingLeft: 12 + o.depth * 18 }} className={`flex items-center gap-2 pr-3 py-1.5 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${o.type !== 'page' ? 'font-medium' : ''}`} data-testid={`delegate-option-${o.type}-${o.id}`}>
                              <input type="checkbox" checked={checked} ref={(el) => { if (el) el.indeterminate = some && !checked; }} onChange={() => toggleDScope(o)} className="accent-zinc-900 dark:accent-white" />
                              <span className={`text-[10px] uppercase tracking-wide px-1 py-0.5 rounded ${o.type === 'tab' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' : o.type === 'group' ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-transparent text-zinc-400'}`}>{o.type === 'tab' ? 'Tab' : o.type === 'group' ? 'Sec' : 'Pg'}</span>
                              <span className={o.type === 'tab' ? 'text-indigo-700 dark:text-indigo-400' : o.type === 'group' ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}>{o.label}</span>
                            </label>
                          );
                        })}
                    </div>
                    {dScopes.length > 0 && <p className="text-xs text-zinc-500" data-testid="delegate-selected-count">{dScopes.filter((k) => k.startsWith('page:')).length} page(s) selected</p>}
                    <div className="flex flex-wrap gap-2 items-center">
                      <input value={dEmail} onChange={(e) => setDEmail(e.target.value)} placeholder="reviewer@emergent.sh" list="known-emails-delegate" data-testid="delegate-email" className="border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-3 py-2 text-sm min-w-[240px]" />
                      <datalist id="known-emails-delegate">{knownEmails.map((em) => <option key={em} value={em} />)}</datalist>
                      <button onClick={delegatePages} disabled={busy} data-testid="delegate-submit" className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-md disabled:opacity-50">
                        Delegate {dScopes.filter((k) => k.startsWith('page:')).length > 0 ? `(${dScopes.filter((k) => k.startsWith('page:')).length})` : ''}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isOwner && (
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 max-w-xs">
                <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={reviewerFilter}
                  onChange={(e) => setReviewerFilter(e.target.value)}
                  placeholder="Show reviews for email…"
                  data-testid="assign-reviewer-filter"
                  className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm"
                />
              </div>
              {reviewerFilter && <button onClick={() => setReviewerFilter('')} className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">Clear</button>}
            </div>
            )}
            <div className="space-y-2">
              {(() => {
                const shown = assignments
                  .filter(a => !reviewerFilter.trim() || (a.assignee_email || '').toLowerCase().includes(reviewerFilter.trim().toLowerCase()))
                  .slice()
                  .sort((x, y) => {
                    const ord = (a) => Math.min(...((a.slugs || []).map(s => (s in pageOrder ? pageOrder[s] : 1e9))), 1e9);
                    return ord(x) - ord(y);
                  });
                if (shown.length === 0) return <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="assign-empty">{assignments.length === 0 ? 'No assignments yet.' : 'No reviews match that email.'}</p>;
                return shown.map(a => (
                <div key={a.id} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between" data-testid={`assignment-${a.id}`}>
                  <div className="flex-1">
                    {(a.slugs || []).length === 1 ? (
                      <button onClick={() => navigate(`/review/${a.slugs[0]}?reviewer=${encodeURIComponent(a.assignee_email || '')}`)} className="font-medium text-left text-indigo-700 dark:text-indigo-400 hover:underline" data-testid={`review-page-${a.slugs[0]}`}>
                        {a.scope_label}
                      </button>
                    ) : (
                      <div className="font-medium">{a.scope_label} <span className="text-xs text-zinc-400">({a.scope_type})</span></div>
                    )}
                    <div className="text-xs text-zinc-500">{a.assignee_email} · {a.slugs?.length || 0} page(s){(a.assigned_by_name || a.assigned_by) ? ` · assigned by ${a.assigned_by_name || a.assigned_by}` : ''}{a.delegated_from ? ` · delegated from ${a.delegated_from}` : ''}</div>
                    {(a.slugs || []).length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(a.slugs || []).map(s => {
                        const doc = documents.find(x => x.slug === s);
                        return (
                          <button key={s} onClick={() => navigate(`/review/${s}?reviewer=${encodeURIComponent(a.assignee_email || '')}`)} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-zinc-600 dark:text-zinc-300" data-testid={`review-page-${s}`}>
                            {doc?.title || s}
                          </button>
                        );
                      })}
                    </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill s={a.status} />
                    {a.status !== 'done' && <button onClick={() => setAssignmentStatus(a, 'done')} className="text-xs px-2 py-1 rounded-md border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" data-testid={`assignment-done-${a.id}`}>Mark done</button>}
                    {a.status === 'done' && <button onClick={() => setAssignmentStatus(a, 'in_review')} className="text-xs px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">Reopen</button>}
                    <button onClick={() => delegate(a)} className="text-xs px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800" data-testid={`assignment-delegate-${a.id}`}>Delegate</button>
                    {isOwner && <button data-testid={`assignment-delete-btn-${a.id}`} onClick={async () => { await axios.delete(`${API}/projects/${pid}/assignments/${a.id}`); setAssignments(p => p.filter(x => x.id !== a.id)); }} className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                ));
              })()}
            </div>
          </div>
        )}
        {tab === 'inbox' && isOwner && (
          <div className="space-y-2" data-testid="review-inbox">
            {inbox.comments.length === 0 && <p className="text-sm text-zinc-500">No comments yet.</p>}
            {inbox.comments.map(c => (
              <div key={c.id} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4" data-testid={`inbox-comment-${c.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{c.author_name || c.author_email} <span className="text-xs text-zinc-400">on {c.doc_slug}</span></span>
                  {c.resolved
                    ? <button onClick={() => resolveComment(c, false)} className="text-xs flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"><RotateCcw className="w-3 h-3" /> Reopen</button>
                    : <button onClick={() => resolveComment(c, true)} className="text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800" data-testid={`resolve-${c.id}`}><CheckCircle2 className="w-3 h-3" /> Resolve</button>}
                </div>
                {c.anchor_text && <div className="text-xs italic text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-300 dark:border-zinc-700 pl-2 mb-1">“{c.anchor_text}”</div>}
                <p className="text-sm text-zinc-700 dark:text-zinc-200">{c.body}</p>
                {c.resolved && <span className="text-[10px] text-emerald-600 font-medium">Resolved</span>}
              </div>
            ))}
          </div>
        )}

        {/* PUBLISH */}
        {tab === 'publish' && isOwner && (
          <div data-testid="review-publish">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button onClick={() => bulkPublish([...pubSel], true)} disabled={pubSel.size === 0} className="text-xs px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 disabled:opacity-40" data-testid="bulk-publish-selected">Publish selected ({pubSel.size})</button>
              <button onClick={() => bulkPublish([...pubSel], false)} disabled={pubSel.size === 0} className="text-xs px-3 py-1.5 rounded-md border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 disabled:opacity-40" data-testid="bulk-takedown-selected">Take down selected</button>
              {pubSel.size > 0 && <button onClick={() => setPubSel(new Set())} className="text-xs px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">Clear</button>}
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-auto flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> = reviewer marked done</span>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
              {scopeOptions.map((o) => {
                if (o.type !== 'page') {
                  const kids = (descendants[`${o.type}:${o.id}`] || []).map(k => k.replace(/^page:/, ''));
                  const pubKids = kids.filter(s => docBySlug[s] && docBySlug[s].status !== 'published');
                  return (
                    <div key={`${o.type}:${o.id}`} style={{ paddingLeft: 12 + o.depth * 18 }} className="flex items-center gap-2 pr-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/50" data-testid={`publish-group-${o.id}`}>
                      <span className={`text-[10px] uppercase tracking-wide px-1 py-0.5 rounded ${o.type === 'tab' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{o.type === 'tab' ? 'Tab' : 'Sec'}</span>
                      <span className={`text-sm font-medium ${o.type === 'tab' ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{o.label}</span>
                      {pubKids.length > 0 && (
                        <button onClick={() => bulkPublish(pubKids, true)} className="ml-auto text-[11px] px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid={`publish-all-${o.id}`}>Publish all ({pubKids.length})</button>
                      )}
                    </div>
                  );
                }
                const d = docBySlug[o.id];
                if (!d) return null;
                const done = reviewDoneByPage[o.id];
                return (
                  <div key={`page:${o.id}`} style={{ paddingLeft: 12 + o.depth * 18 }} className="flex items-center gap-2 pr-3 py-2 bg-white dark:bg-zinc-900" data-testid={`publish-row-${d.id}`}>
                    <input type="checkbox" checked={pubSel.has(o.id)} onChange={() => togglePub(o.id)} className="accent-zinc-900 dark:accent-white" data-testid={`publish-check-${d.id}`} />
                    <button onClick={() => navigate(`/review/${d.slug}`)} className="text-sm text-left hover:underline truncate" data-testid={`publish-title-${d.id}`}>{d.title}</button>
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                      {done && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-medium flex items-center gap-1" data-testid={`reviewed-done-${d.id}`}><CheckCircle2 className="w-3 h-3" /> Reviewed</span>}
                      {d.reviewer_edited_by && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium" title={`Edited by ${d.reviewer_edited_by}`} data-testid={`edited-by-reviewer-${d.id}`}>Edited by reviewer</span>}
                      <StatusPill s={d.status || 'in_review'} />
                      {d.status === 'published'
                        ? <button onClick={() => publishDoc(d, false)} className="text-xs px-2 py-1 rounded-md border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" data-testid={`takedown-${d.id}`}>Take down</button>
                        : <button onClick={() => publishDoc(d, true)} className="text-xs px-2 py-1 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" data-testid={`publish-${d.id}`}>Publish</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'team' && isOwner && (
          <div className="max-w-2xl" data-testid="review-team">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-5">
              <h3 className="font-semibold mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Owners</h3>
              <p className="text-xs text-zinc-500 mb-3">Owners can assign reviews, publish pages, and promote others.</p>
              <div className="flex flex-wrap gap-2" data-testid="team-owners">
                {owners.length === 0 ? <span className="text-sm text-zinc-500">No owners yet.</span> : owners.map(em => (
                  <span key={em} className="text-sm px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 font-medium" data-testid={`team-owner-${em}`}>{em}</span>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="font-semibold mb-1 flex items-center gap-2"><Users className="w-4 h-4" /> Reviewers &amp; people</h3>
              <p className="text-xs text-zinc-500 mb-3">Everyone the workspace knows. Promote a trusted reviewer to Owner in one click.</p>
              {knownEmails.filter(em => !owners.includes(em)).length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="team-reviewers-empty">No other people yet — they'll appear here once they log in or get an assignment.</p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {knownEmails.filter(em => !owners.includes(em)).map(em => (
                    <div key={em} className="flex items-center justify-between py-2 text-sm" data-testid={`team-person-${em}`}>
                      <span className="text-zinc-700 dark:text-zinc-200">{em}</span>
                      <button onClick={() => promote(em)} className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5" data-testid={`make-owner-${em}`}><ShieldCheck className="w-3.5 h-3.5" /> Make owner</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 'activity' && isOwner && (
          <div data-testid="review-activity">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-zinc-500" />
              <h3 className="font-semibold">Activity</h3>
              <select value={activityPerson} onChange={e => setActivityPerson(e.target.value)} data-testid="activity-person-filter" className="ml-auto text-sm border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-2 py-1">
                <option value="">Everyone</option>
                {activityPeople.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {activity.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="activity-empty">No activity yet.</p>
            ) : (
              <div className="relative pl-4 border-l border-zinc-200 dark:border-zinc-800 space-y-4" data-testid="activity-feed">
                {activity.map(ev => (
                  <div key={ev.id} className="relative" data-testid={`activity-${ev.id}`}>
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="text-sm text-zinc-700 dark:text-zinc-200">
                      <span className="font-medium">{ev.actor_name || ev.actor_email}</span>{' '}
                      {ACTION_LABEL[ev.action] || ev.action}
                      {(ev.doc_title || ev.doc_slug) ? <> <button onClick={() => (ev.doc_slug ? navigate(`/review/${ev.doc_slug}`) : null)} className="text-indigo-600 dark:text-indigo-400 hover:underline">{ev.doc_title || ev.doc_slug}</button></> : null}
                      {ev.meta?.assignee ? <span className="text-zinc-500"> → {ev.meta.assignee}</span> : null}
                      {ev.meta?.to ? <span className="text-zinc-500"> ({ev.meta.from} → {ev.meta.to})</span> : null}
                      {ev.meta?.verdict ? <span className="text-zinc-500"> — “{ev.meta.verdict}”</span> : null}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{new Date(ev.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setActiveDoc(null)}>
          <div className="w-[440px] h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl p-5 overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="review-drawer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{activeDoc.title}</h3>
              <button onClick={() => navigate(`/review/${activeDoc.slug}`)} className="text-xs px-2 py-1 rounded-md border border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10" data-testid="open-inline-review">Open full page ↗</button>
            </div>
            <label className="text-xs text-zinc-500">Verdict</label>
            <div className="flex flex-wrap gap-1.5 my-2">
              {VERDICTS.map(v => (
                <button key={v} onClick={() => saveVerdict(v)} className={`text-xs px-2 py-1 rounded-full border ${verdict === v ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} data-testid={`verdict-${v.replace(/\W+/g, '-')}`}>{v}</button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-xs text-zinc-500">Comments</label>
              <div className="space-y-2 my-2">
                {comments.map(c => (
                  <div key={c.id} className="text-sm border border-zinc-200 dark:border-zinc-800 rounded-md p-2">
                    <div className="text-xs text-zinc-400">{c.author_name || c.author_email}{c.resolved ? ' · resolved' : ''}</div>
                    <p>{c.body}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs text-zinc-400">No comments yet.</p>}
              </div>
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Leave a comment…" data-testid="drawer-comment-input" className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md p-2 text-sm" rows={3} />
              <button onClick={addComment} disabled={busy} className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm rounded-md disabled:opacity-50" data-testid="drawer-comment-submit"><MessageSquarePlus className="w-4 h-4" /> Add comment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
