import { useState } from 'react';
import { Copy, Check, Terminal, FileCode } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * CodeBlock — syntax-highlighted code with copy.
 * Theme-aware: uses one-dark in dark mode, one-light in light mode.
 */

const buildTheme = (isDark) => {
    const base = isDark ? oneDark : oneLight;
    return {
        ...base,
        'pre[class*="language-"]': {
            ...base['pre[class*="language-"]'],
            background: isDark ? '#0a0a0a' : '#fafafa',
            margin: 0,
            padding: '1rem 1.25rem',
            fontSize: '0.8125rem',
            lineHeight: '1.7',
        },
        'code[class*="language-"]': {
            ...base['code[class*="language-"]'],
            background: 'transparent',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        },
    };
};

const LANGUAGE_NAMES = {
    js: 'JavaScript', javascript: 'JavaScript',
    ts: 'TypeScript', typescript: 'TypeScript',
    jsx: 'JSX', tsx: 'TSX',
    py: 'Python', python: 'Python',
    bash: 'Bash', sh: 'Shell', shell: 'Shell', zsh: 'Shell',
    json: 'JSON', yaml: 'YAML', yml: 'YAML',
    css: 'CSS', html: 'HTML',
    md: 'Markdown', markdown: 'Markdown',
    sql: 'SQL', go: 'Go', rust: 'Rust', java: 'Java',
    c: 'C', cpp: 'C++', csharp: 'C#',
    php: 'PHP', ruby: 'Ruby', swift: 'Swift', kotlin: 'Kotlin',
    diff: 'Diff', dockerfile: 'Dockerfile', graphql: 'GraphQL', env: 'env',
};

export const CodeBlock = ({
    children,
    language = 'text',
    title,
    showLineNumbers = false,
    highlightLines = [],
    className = ''
}) => {
    const { isDark } = useTheme();
    const [copied, setCopied] = useState(false);
    const code = typeof children === 'string' ? children.trim() : String(children).trim();
    const langName = LANGUAGE_NAMES[language] || language.toUpperCase();
    const isTerminal = ['bash', 'sh', 'shell', 'zsh'].includes(language);
    const theme = buildTheme(isDark);

    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(code); } catch (e) {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className={`code-block my-5 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 ${className}`}
            data-testid="code-block"
        >
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    {isTerminal ? <Terminal className="h-3.5 w-3.5" /> : <FileCode className="h-3.5 w-3.5" />}
                    <span className="text-[11px] font-mono font-medium tracking-wide">
                        {title || langName}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-press flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-md transition-colors"
                    data-testid="copy-code"
                >
                    {copied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-brand" />
                            <span className="text-brand">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            <SyntaxHighlighter
                language={language}
                style={theme}
                showLineNumbers={showLineNumbers}
                wrapLines={highlightLines.length > 0}
                lineProps={(lineNumber) => {
                    const style = { display: 'block' };
                    if (highlightLines.includes(lineNumber)) {
                        style.backgroundColor = 'rgba(21,136,252,0.10)';
                        style.borderLeft = '3px solid #1588FC';
                        style.marginLeft = '-3px';
                        style.paddingLeft = '3px';
                    }
                    return { style };
                }}
                customStyle={{ margin: 0, borderRadius: 0 }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

CodeBlock.displayName = 'CodeBlock';

export const InlineCode = ({ children, className = '' }) => (
    <code
        className={`px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-brand-700 dark:text-brand-300 rounded text-[0.875em] font-mono ${className}`}
    >
        {children}
    </code>
);
