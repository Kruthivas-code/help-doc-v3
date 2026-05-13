/**
 * WritingAssistant — AI writing companion for the editor.
 *
 * Surfaces:
 *   - A toolbar trigger button (rendered inline in the editor toolbar).
 *   - A right-side slide-over panel with 3 modes:
 *       (1) Tweak     — rewrite the current doc or the selected slice.
 *       (2) New Page  — turn raw notes into a fresh Markdown doc + auto-link it.
 *       (3) Chat      — free-form Q&A about the current doc.
 *
 * Backend endpoints used:
 *   POST /api/assistant/tweak      { instruction, markdown, selection? } -> { markdown }
 *   POST /api/generator/markdown   { raw_input, title?, style? }         -> { markdown }
 *   POST /api/projects/:pid/documents
 *   PUT  /api/projects/:pid/config
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Sparkles, X, Wand2, FilePlus2, MessageSquare, Loader2,
  Check, RefreshCw, ChevronRight,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const cx = (...c) => c.filter(Boolean).join(' ');

const QUICK_TWEAKS = [
  { id: 'improve', label: 'Improve writing', instruction: 'Polish the prose. Tighten sentences, remove fluff, fix grammar, and keep the same meaning.' },
  { id: 'expand', label: 'Expand', instruction: 'Add more depth, examples, and clarifying details where the content is thin. Stay faithful to the original facts.' },
  { id: 'shorten', label: 'Shorten', instruction: 'Make this more concise. Cut filler words and redundant phrasing while keeping every meaningful point.' },
  { id: 'simpler', label: 'Simpler language', instruction: 'Rewrite for a less technical audience. Replace jargon with plain language where appropriate.' },
  { id: 'examples', label: 'Add examples', instruction: 'Add concrete code examples or use cases where they would help the reader understand.' },
  { id: 'callouts', label: 'Add callouts', instruction: 'Insert <Callout> blocks (note/tip/warning) at the spots where they would aid comprehension.' },
];

const STYLES = [
  { id: 'documentation', label: 'Documentation' },
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'reference', label: 'API Reference' },
  { id: 'blog', label: 'Blog post' },
];

// ===================================================================
// Trigger Button — sits in the editor toolbar
// ===================================================================
export const WritingAssistantTrigger = ({ onOpen }) => (
  <button
    onClick={onOpen}
    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
    data-testid="writing-assistant-trigger"
    title="Writing Assistant"
  >
    <Sparkles className="w-4 h-4" />
    <span>Assist</span>
  </button>
);

// ===================================================================
// Slide-over Panel
// ===================================================================
export const WritingAssistant = ({
  open, onClose,
  content, onApplyContent,             // (newMarkdown) => void — replaces entire doc body
  onApplySelection,                    // (replacement, selStart, selEnd) => void
  selection,                           // { text, start, end } | null
  // For "New Page" mode:
  projectId, navConfig, onAfterCreatePage,  // callback after new doc created -> usually navigate to it
}) => {
  const [mode, setMode] = useState('tweak'); // 'tweak' | 'new' | 'chat'

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 flex flex-col" data-testid="writing-assistant-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-950 dark:bg-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white dark:text-zinc-950" />
          </div>
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">Writing Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
          data-testid="writing-assistant-close"
          aria-label="Close assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        {[
          { id: 'tweak', label: 'Tweak', icon: Wand2 },
          { id: 'new', label: 'New Page', icon: FilePlus2 },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cx(
              'flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
              mode === id
                ? 'border-zinc-950 dark:border-white text-zinc-950 dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-white',
            )}
            data-testid={`assistant-mode-${id}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'tweak' && (
          <TweakMode
            content={content}
            selection={selection}
            onApplyContent={onApplyContent}
            onApplySelection={onApplySelection}
          />
        )}
        {mode === 'new' && (
          <NewPageMode
            projectId={projectId}
            navConfig={navConfig}
            onAfterCreatePage={onAfterCreatePage}
            onClose={onClose}
          />
        )}
        {mode === 'chat' && <ChatMode content={content} />}
      </div>
    </div>
  );
};

// ===================================================================
// Tweak Mode
// ===================================================================
const TweakMode = ({ content, selection, onApplyContent, onApplySelection }) => {
  const [instruction, setInstruction] = useState('');
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targetLabel = selection?.text
    ? `Selected text (${selection.text.length} chars)`
    : 'Whole document';

  const run = useCallback(async (instr) => {
    setLoading(true);
    setError('');
    setProposal(null);
    try {
      const { data } = await axios.post(`${API}/assistant/tweak`, {
        instruction: instr,
        markdown: content,
        selection: selection?.text || null,
      });
      setProposal(data.markdown || '');
    } catch (e) {
      // Build a useful message instead of swallowing it
      if (e?.response?.data?.detail) {
        setError(e.response.data.detail);
      } else if (e?.response?.status === 404) {
        setError('The /api/assistant/tweak endpoint was not found on this server. If you\'re on production, the backend hasn\'t been re-deployed since this feature was added.');
      } else if (e?.response?.status === 401) {
        setError('Your session expired — refresh the page and sign in again.');
      } else if (e?.response?.status) {
        setError(`Server returned ${e.response.status}. ${e.response.statusText || ''}`);
      } else {
        setError('Network error — could not reach the assistant. Check that the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  }, [content, selection]);

  const accept = () => {
    if (!proposal) return;
    if (selection?.text) {
      onApplySelection(proposal, selection.start, selection.end);
    } else {
      onApplyContent(proposal);
    }
    setProposal(null);
    setInstruction('');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
        Target
      </div>
      <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs text-zinc-700 dark:text-zinc-300">
        {targetLabel}
      </div>

      <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold pt-2">
        Quick Actions
      </div>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_TWEAKS.map((q) => (
          <button
            key={q.id}
            onClick={() => run(q.instruction)}
            disabled={loading}
            className="text-left px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md hover:border-zinc-950 dark:hover:border-white text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-50 transition-colors"
            data-testid={`quick-tweak-${q.id}`}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold pt-2">
        Custom Instruction
      </div>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={3}
        placeholder="e.g. Rewrite this section in a more friendly tone and add a warning callout about rate limits."
        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white resize-none"
        data-testid="tweak-instruction"
      />
      <button
        onClick={() => run(instruction)}
        disabled={loading || !instruction.trim()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors"
        data-testid="tweak-run"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        Apply instruction
      </button>

      {error && (
        <div className="px-3 py-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-md">
          {error}
        </div>
      )}

      {proposal !== null && (
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Proposed result
          </div>
          <pre className="px-3 py-2 max-h-64 overflow-auto text-[11px] font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md whitespace-pre-wrap text-zinc-800 dark:text-zinc-200" data-testid="tweak-proposal">
            {proposal}
          </pre>
          <div className="flex items-center gap-2">
            <button
              onClick={accept}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md"
              data-testid="tweak-accept"
            >
              <Check className="w-4 h-4" /> Apply
            </button>
            <button
              onClick={() => setProposal(null)}
              className="px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
              data-testid="tweak-reject"
            >
              Discard
            </button>
            <button
              onClick={() => run(instruction || 'Try a different angle while still respecting the same intent.')}
              disabled={loading}
              className="p-2 text-zinc-500 hover:text-zinc-950 dark:hover:text-white rounded-md disabled:opacity-50"
              title="Try again"
              data-testid="tweak-retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// New Page Mode
// ===================================================================
const NewPageMode = ({ projectId, navConfig, onAfterCreatePage, onClose }) => {
  const [title, setTitle] = useState('');
  const [raw, setRaw] = useState('');
  const [style, setStyle] = useState('documentation');
  const [groupSelection, setGroupSelection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);

  // Flatten nav into a list of (tabIndex, groupIndex, label) entries for the picker
  const groupOptions = useMemo(() => {
    const out = [];
    (navConfig?.tabs || []).forEach((t, tIdx) => {
      (t.groups || []).forEach((g, gIdx) => {
        out.push({
          id: `${tIdx}::${gIdx}`,
          label: `${t.label || t.id} › ${g.group || 'Unnamed'}`,
        });
      });
    });
    return out;
  }, [navConfig]);

  useEffect(() => {
    if (groupOptions.length && !groupSelection) setGroupSelection(groupOptions[0].id);
  }, [groupOptions, groupSelection]);

  const slugify = (s) =>
    s.toLowerCase().trim().replace(/[^a-z0-9-_ ]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `page-${Date.now()}`;

  const generate = async () => {
    setError('');
    setDraft(null);
    if (!title.trim() || !raw.trim()) {
      setError('Title and raw notes are required.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/generator/markdown`, {
        raw_input: raw,
        title,
        style,
      });
      setDraft(data.markdown || '');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const createAndLink = async () => {
    setError('');
    setLoading(true);
    try {
      const slug = slugify(title);
      // 1) Create the doc
      const { data: doc } = await axios.post(`${API}/projects/${projectId}/documents`, {
        title,
        slug,
        content: draft || '',
      });
      // 2) Link into nav under the selected group (append last)
      if (groupSelection && navConfig?.tabs) {
        const [tIdx, gIdx] = groupSelection.split('::').map(Number);
        const newTabs = navConfig.tabs.map((t, ti) => {
          if (ti !== tIdx) return t;
          const newGroups = (t.groups || []).map((g, gi) => {
            if (gi !== gIdx) return g;
            return { ...g, pages: [...(g.pages || []), slug] };
          });
          return { ...t, groups: newGroups };
        });
        await axios.put(`${API}/projects/${projectId}/config`, {
          navigation: { ...navConfig, tabs: newTabs },
        });
      }
      onAfterCreatePage?.(doc);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not create page.');
    } finally {
      setLoading(false);
    }
  };

  if (!groupOptions.length) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        Add a navigation group first under <strong>Configurations</strong> before creating new pages from notes.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 block">
          Page title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Webhooks Configuration"
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
          data-testid="new-page-title"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 block">
          Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={cx(
                'px-3 py-1.5 text-xs rounded-md border transition-colors',
                style === s.id
                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-white',
              )}
              data-testid={`new-page-style-${s.id}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 block">
          Raw notes
        </label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder="Paste rough notes, an outline, or bullet points. The assistant will turn them into polished Markdown with headings, code blocks, and callouts."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white resize-none font-mono"
          data-testid="new-page-raw"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 block">
          Add to group
        </label>
        <select
          value={groupSelection}
          onChange={(e) => setGroupSelection(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white"
          data-testid="new-page-group"
        >
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
      </div>

      {!draft ? (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50"
          data-testid="new-page-generate"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate Markdown
        </button>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                Draft (editable)
              </label>
              <button
                onClick={generate}
                disabled={loading}
                className="text-[11px] text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1"
                data-testid="new-page-regen"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white resize-none"
              data-testid="new-page-draft"
            />
          </div>
          <button
            onClick={createAndLink}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
            data-testid="new-page-create"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Create page & add to navigation
          </button>
        </>
      )}

      {error && (
        <div className="px-3 py-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

// ===================================================================
// Chat Mode — free-form Q&A about the current doc
// ===================================================================
const ChatMode = ({ content }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/assistant/tweak`, {
        instruction: `The user asked: "${userMsg.text}". Respond as a writing coach. If they're asking for advice, give it in 2-4 short paragraphs. If they're asking to rewrite, give them the rewritten Markdown.`,
        markdown: content || ' ',
      });
      setMessages((m) => [...m, { role: 'assistant', text: data.markdown || '(no response)' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.response?.data?.detail || 'Could not reach the assistant.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            Ask anything about this page — "Is the structure clear?", "Suggest a better intro paragraph", or "Translate this section to a casual tone".
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cx(
              'rounded-md px-3 py-2 text-sm whitespace-pre-wrap',
              m.role === 'user'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white ml-6'
                : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 mr-6',
            )}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
            }}
            rows={2}
            placeholder="Ask the assistant... (⌘/Ctrl+Enter to send)"
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white resize-none"
            data-testid="chat-input"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="px-3 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-md disabled:opacity-50"
            data-testid="chat-send"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WritingAssistant;
