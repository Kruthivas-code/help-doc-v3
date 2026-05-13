/**
 * Generator — AI-powered Markdown generator.
 *
 * Takes a raw text/notes input plus a style hint and uses Claude Sonnet
 * (via Emergent Universal Key) to produce polished Markdown ready to paste
 * into the editor. Designed to match the brand palette.
 */
import { useState } from "react";
import { useAuth, API } from "@/App";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    ArrowLeft, Sparkles, Copy, Check, Loader2, FileText, BookOpen, ListChecks, Newspaper,
    Wand2, ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const STYLES = [
    { value: "documentation", label: "Documentation", icon: BookOpen, hint: "Technical product docs" },
    { value: "tutorial",      label: "Tutorial",      icon: ListChecks, hint: "Step-by-step guide" },
    { value: "reference",     label: "API Reference", icon: FileText,   hint: "API endpoints, params, examples" },
    { value: "blog",          label: "Blog Post",     icon: Newspaper,  hint: "Narrative article" },
];

const Generator = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [rawInput, setRawInput] = useState("");
    const [title, setTitle] = useState("");
    const [style, setStyle] = useState("documentation");
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");

    const charCount = rawInput.length;
    const maxChars = 30000;
    const canGenerate = rawInput.trim().length > 10 && !generating;

    const handleGenerate = async () => {
        if (!canGenerate) return;
        setGenerating(true);
        setResult("");
        setError("");
        try {
            const res = await axios.post(`${API}/generator/markdown`, {
                raw_input: rawInput,
                title: title || null,
                style,
            });
            setResult(res.data.markdown || "");
        } catch (e) {
            setError(e.response?.data?.detail || "Generation failed. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(result); } catch (e) {}
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="min-h-screen bg-zinc-50/40 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100" data-testid="generator-page">
            {/* Sticky header */}
            <header className="sticky top-0 z-30 h-14 backdrop-blur-md bg-white/85 dark:bg-zinc-950/85 border-b border-zinc-200 dark:border-zinc-800">
                <div className="h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white"
                            aria-label="Back"
                            data-testid="generator-back"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-2.5">
                            <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-heading text-sm font-black tracking-tight">AI Generator</h1>
                                <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-500">Powered by Claude Sonnet 4.5</p>
                            </div>
                        </div>
                    </div>
                    <ThemeToggle compact />
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
                <div className="mb-10 fade-up">
                    <p className="eyebrow text-zinc-500 mb-2">AI Markdown</p>
                    <h2 className="h-display text-3xl sm:text-4xl text-zinc-950 dark:text-white text-balance">
                        Turn rough notes into polished docs
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 max-w-xl">
                        Drop in your raw text, voice transcripts, or scratch notes. Pick a style. Get clean Markdown — headings, callouts, code blocks, the works.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* INPUT side */}
                    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 lg:p-8 fade-up">
                        <p className="eyebrow text-zinc-500 mb-2">Input</p>
                        <h3 className="h-section text-base text-zinc-950 dark:text-white mb-5">Raw text</h3>

                        {/* Title */}
                        <label className="block mb-4">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                                Document title <span className="text-zinc-400 font-normal">(optional)</span>
                            </span>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Setting up GitHub OAuth"
                                className="adm-input2"
                                data-testid="generator-title-input"
                            />
                        </label>

                        {/* Style picker */}
                        <div className="mb-4">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 block">Style</span>
                            <div className="grid grid-cols-2 gap-2">
                                {STYLES.map((s) => {
                                    const Icon = s.icon;
                                    const active = style === s.value;
                                    return (
                                        <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => setStyle(s.value)}
                                            className={`btn-press text-left p-3 rounded-md border transition-all ${
                                                active
                                                    ? 'border-brand bg-brand/5 dark:bg-brand/10'
                                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                            }`}
                                            data-testid={`style-${s.value}`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${active ? 'text-brand' : 'text-zinc-500'}`} />
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-bold ${active ? 'text-brand' : 'text-zinc-950 dark:text-white'}`}>{s.label}</p>
                                                    <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">{s.hint}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Raw input */}
                        <label className="block mb-4">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 block flex items-center justify-between">
                                <span>Raw notes</span>
                                <span className={`tabular-nums font-mono font-normal ${charCount > maxChars * 0.9 ? 'text-amber-600' : 'text-zinc-400'}`}>
                                    {charCount.toLocaleString()} / {maxChars.toLocaleString()}
                                </span>
                            </span>
                            <textarea
                                value={rawInput}
                                onChange={(e) => setRawInput(e.target.value.slice(0, maxChars))}
                                placeholder={`Paste anything — meeting notes, voice transcripts, half-written drafts, bullet points…\n\nThe model will clean it up, add structure, and produce production-ready Markdown.`}
                                className="adm-input2 font-mono text-[13px] leading-relaxed resize-y"
                                rows={14}
                                data-testid="generator-input"
                            />
                        </label>

                        {error && (
                            <div className="mb-4 rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className="btn-press w-full h-11 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-md font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                            data-testid="generate-btn"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating…
                                </>
                            ) : (
                                <>
                                    <Wand2 className="h-4 w-4" />
                                    Generate Markdown
                                </>
                            )}
                        </button>
                    </section>

                    {/* OUTPUT side */}
                    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 lg:p-8 fade-up delay-1 flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <p className="eyebrow text-zinc-500 mb-2">Output</p>
                                <h3 className="h-section text-base text-zinc-950 dark:text-white">Generated Markdown</h3>
                            </div>
                            {result && (
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="btn-press inline-flex items-center gap-2 h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:border-zinc-300 dark:hover:border-zinc-600"
                                    data-testid="copy-result-btn"
                                >
                                    {copied ? (
                                        <><Check className="h-3.5 w-3.5 text-brand" /><span className="text-brand">Copied</span></>
                                    ) : (
                                        <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 min-h-[400px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden flex flex-col">
                            {generating ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 mb-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-brand" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">Crafting your Markdown…</p>
                                    <p className="text-xs text-zinc-500 mt-1">Claude Sonnet is structuring the content</p>
                                </div>
                            ) : result ? (
                                <pre
                                    className="flex-1 overflow-auto px-4 py-4 text-[13px] leading-relaxed font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words"
                                    data-testid="generator-result"
                                >
                                    {result}
                                </pre>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4">
                                        <Sparkles className="h-5 w-5 text-zinc-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">Your generated Markdown will appear here</p>
                                    <p className="text-xs text-zinc-500 mt-1">Paste your notes and hit Generate</p>
                                </div>
                            )}
                        </div>

                        {result && (
                            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                                <span>{result.length.toLocaleString()} chars · ~{Math.ceil(result.split(/\s+/).length / 200)} min read</span>
                                <button
                                    type="button"
                                    onClick={() => navigate("/admin/edit")}
                                    className="btn-press inline-flex items-center gap-1 text-brand hover:text-brand-600 font-bold"
                                >
                                    Open in editor <ArrowRight className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Generator;
