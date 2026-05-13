/**
 * AnchorsMenu — dropdown that lists every heading in the doc plus any
 * inline `<a id="...">` anchors, lets you copy the deep link, and
 * insert a custom anchor marker at end of content.
 *
 * Props:
 *   content     — current markdown content (string)
 *   onContentChange  — (newContent) => void, used to insert a new anchor
 *   slug        — current document slug (the URL path segment)
 *   publicBaseUrl — origin of the published docs site (defaults to window.location.origin)
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { Link2, Copy, Check, Plus, Hash, X } from 'lucide-react';

const slugify = (text) => {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

const parseAnchors = (content) => {
    if (!content) return [];
    const items = [];
    const lines = content.split('\n');
    let inCodeFence = false;
    lines.forEach((line, idx) => {
        const fenceMatch = line.match(/^```/);
        if (fenceMatch) { inCodeFence = !inCodeFence; return; }
        if (inCodeFence) return;

        // Markdown headings: ## Heading or # Heading {#custom-id}
        const headingMatch = line.match(/^(#{1,4})\s+(.+?)(\s+\{#([^}]+)\})?\s*$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2].trim();
            const customId = headingMatch[4];
            items.push({
                type: 'heading',
                level,
                text,
                id: customId || slugify(text),
                custom: !!customId,
                line: idx,
            });
            return;
        }

        // Inline anchor markers: <a id="..."></a> or <a name="...">
        const anchorRegex = /<a\s+(?:id|name)=["']([^"']+)["'][^>]*>/g;
        let m;
        while ((m = anchorRegex.exec(line)) !== null) {
            items.push({
                type: 'inline',
                level: 0,
                text: m[1],
                id: m[1],
                custom: true,
                line: idx,
            });
        }
    });
    return items;
};

export const AnchorsMenu = ({ content, onContentChange, slug, publicBaseUrl }) => {
    const [open, setOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [newAnchorId, setNewAnchorId] = useState('');
    const dropdownRef = useRef(null);
    const baseUrl = publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const docPath = slug ? `/${slug}` : '';

    const anchors = useMemo(() => parseAnchors(content), [content]);

    // Close on outside click
    useEffect(() => {
        const onDown = (e) => {
            if (!open) return;
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const handleCopy = async (anchorId) => {
        const url = `${baseUrl}${docPath}#${anchorId}`;
        try { await navigator.clipboard.writeText(url); } catch (e) {}
        setCopiedId(anchorId);
        setTimeout(() => setCopiedId(null), 1800);
    };

    const handleInsertAnchor = () => {
        const id = slugify(newAnchorId);
        if (!id) return;
        const marker = `\n\n<a id="${id}"></a>\n`;
        onContentChange((content || '') + marker);
        setNewAnchorId('');
    };

    const idTaken = anchors.some(a => a.id === slugify(newAnchorId));
    const canInsert = newAnchorId.trim().length > 0 && !idTaken;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    open
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white'
                }`}
                title="Anchors & deep links"
                data-testid="anchors-toggle"
            >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Anchors</span>
                {anchors.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                        {anchors.length}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[420px] max-h-[70vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
                        <div>
                            <p className="eyebrow text-zinc-500">Document anchors</p>
                            <p className="text-sm font-semibold text-zinc-950 dark:text-white mt-0.5">Deep-link to any heading</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="btn-press p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white rounded"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Insert new anchor */}
                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                        <p className="eyebrow text-zinc-500 mb-2">Insert anchor marker</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus-within:border-brand">
                                <span className="pl-2.5 pr-1 text-zinc-400 font-mono text-sm">#</span>
                                <input
                                    value={newAnchorId}
                                    onChange={(e) => setNewAnchorId(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && canInsert) handleInsertAnchor(); }}
                                    placeholder="my-anchor"
                                    className="flex-1 py-1.5 pr-2 bg-transparent text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none font-mono"
                                    data-testid="anchor-input"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleInsertAnchor}
                                disabled={!canInsert}
                                className="btn-press inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-bold rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                                data-testid="anchor-insert"
                            >
                                <Plus className="w-3.5 h-3.5" /> Insert
                            </button>
                        </div>
                        {idTaken && newAnchorId.trim() && (
                            <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Anchor ID already exists in this document.</p>
                        )}
                        <p className="mt-1.5 text-[11px] text-zinc-500">
                            Inserts <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{'<a id="…"></a>'}</code> at end of content.
                        </p>
                    </div>

                    {/* Existing anchors */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-4 py-2 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
                            <p className="eyebrow text-zinc-500">
                                Existing anchors · {anchors.length}
                            </p>
                        </div>
                        {anchors.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Hash className="w-6 h-6 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                                <p className="text-sm text-zinc-500">No headings or anchors yet.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {anchors.map((a, i) => {
                                    const isHeading = a.type === 'heading';
                                    const indent = isHeading ? (a.level - 1) * 12 : 0;
                                    const isCopied = copiedId === a.id;
                                    return (
                                        <li
                                            key={`${a.id}-${i}`}
                                            className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group"
                                        >
                                            <span
                                                className={`text-[10px] font-mono font-bold rounded px-1.5 py-0.5 flex-shrink-0 ${
                                                    isHeading
                                                        ? 'bg-brand/10 text-brand'
                                                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                                                }`}
                                            >
                                                {isHeading ? `H${a.level}` : 'A'}
                                            </span>
                                            <div className="min-w-0 flex-1" style={{ paddingLeft: indent }}>
                                                <p className="text-sm font-medium text-zinc-950 dark:text-white truncate">
                                                    {a.text}
                                                </p>
                                                <p className="text-[11px] text-zinc-500 font-mono truncate">
                                                    #{a.id}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(a.id)}
                                                className="btn-press inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-brand hover:text-brand opacity-0 group-hover:opacity-100 transition-all"
                                                data-testid={`copy-anchor-${a.id}`}
                                                title="Copy link"
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-brand" />
                                                        <span className="text-brand">Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3" /> Copy link
                                                    </>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnchorsMenu;
