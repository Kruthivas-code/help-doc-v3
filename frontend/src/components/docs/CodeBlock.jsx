import { useState, useEffect } from 'react';
import { Copy, Check, Terminal, FileCode } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * CodeBlock Component - Syntax-highlighted code with copy functionality
 * Usage:
 * <CodeBlock language="javascript" title="server.js">
 *   const app = express();
 * </CodeBlock>
 */

// Custom theme based on oneDark but refined
const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0f172a',
    margin: 0,
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    lineHeight: '1.7',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
  },
};

// Language display names
const LANGUAGE_NAMES = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  py: 'Python',
  python: 'Python',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  zsh: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  css: 'CSS',
  html: 'HTML',
  md: 'Markdown',
  markdown: 'Markdown',
  sql: 'SQL',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  diff: 'Diff',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  env: 'Environment',
};

export const CodeBlock = ({ 
  children, 
  language = 'text', 
  title,
  showLineNumbers = false,
  highlightLines = [],
  className = '' 
}) => {
  const [copied, setCopied] = useState(false);
  const code = typeof children === 'string' ? children.trim() : String(children).trim();
  const langName = LANGUAGE_NAMES[language] || language.toUpperCase();
  const isTerminal = ['bash', 'sh', 'shell', 'zsh'].includes(language);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`code-block my-4 rounded-lg overflow-hidden border border-slate-800 ${className}`}
      data-testid="code-block"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-400">
          {isTerminal ? (
            <Terminal className="w-4 h-4" />
          ) : (
            <FileCode className="w-4 h-4" />
          )}
          <span className="text-xs font-medium">
            {title || langName}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-white rounded transition-colors"
          data-testid="copy-code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={language}
        style={customTheme}
        showLineNumbers={showLineNumbers}
        wrapLines={highlightLines.length > 0}
        lineProps={(lineNumber) => {
          const style = { display: 'block' };
          if (highlightLines.includes(lineNumber)) {
            style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
            style.borderLeft = '3px solid #6366f1';
            style.marginLeft = '-3px';
            style.paddingLeft = '3px';
          }
          return { style };
        }}
        customStyle={{
          margin: 0,
          borderRadius: 0,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

CodeBlock.displayName = 'CodeBlock';

/**
 * InlineCode Component - For inline code snippets
 */
export const InlineCode = ({ children, className = '' }) => {
  return (
    <code className={`inline-code px-1.5 py-0.5 bg-slate-800 text-pink-400 rounded text-[0.875em] font-mono ${className}`}>
      {children}
    </code>
  );
};
