/**
 * DocContent - AST-based MDX content renderer
 * Uses proper remark/rehype pipeline for robust parsing
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useMemo, useEffect, Children, isValidElement, Fragment } from 'react';
import { Copy, Check, Terminal, FileCode, Info, Lightbulb, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Import custom components
import { Steps, Step } from './Steps';
import { Card, CardGroup, Columns } from './Cards';
import { Tabs, Tab } from './Tabs';
import { Accordion, AccordionItem } from './Accordion';
import { DeleteAccountButton } from './DeleteAccountButton';

// Import parser
import { extractComponents, parseContent, generateTOC } from '@/lib/mdx/parser';

// Custom code theme
const codeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0f172a',
    margin: 0,
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    lineHeight: '1.7',
  },
};

// Language display names
const LANG_NAMES = {
  js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  jsx: 'JSX', tsx: 'TSX',
  py: 'Python', python: 'Python',
  bash: 'Bash', sh: 'Shell', shell: 'Shell',
  json: 'JSON', yaml: 'YAML', yml: 'YAML',
  css: 'CSS', html: 'HTML', sql: 'SQL',
  go: 'Go', rust: 'Rust', java: 'Java',
  csharp: 'C#', cpp: 'C++', c: 'C',
  ruby: 'Ruby', php: 'PHP', swift: 'Swift',
  kotlin: 'Kotlin', scala: 'Scala',
  graphql: 'GraphQL', dockerfile: 'Dockerfile',
  markdown: 'Markdown', md: 'Markdown',
  xml: 'XML', toml: 'TOML', ini: 'INI',
};

// Callout configurations with CSS variable approach for text colors
const CALLOUT_CONFIG = {
  NOTE: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', iconColor: 'text-blue-600 dark:text-blue-400', textColorLight: '#1e40af', textColorDark: '#bfdbfe', title: 'Note' },
  INFO: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', iconColor: 'text-blue-600 dark:text-blue-400', textColorLight: '#1e40af', textColorDark: '#bfdbfe', title: 'Info' },
  TIP: { icon: Lightbulb, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', iconColor: 'text-emerald-600 dark:text-emerald-400', textColorLight: '#065f46', textColorDark: '#a7f3d0', title: 'Tip' },
  WARNING: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', iconColor: 'text-amber-600 dark:text-amber-400', textColorLight: '#92400e', textColorDark: '#fde68a', title: 'Warning' },
  CAUTION: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', iconColor: 'text-amber-600 dark:text-amber-400', textColorLight: '#92400e', textColorDark: '#fde68a', title: 'Caution' },
  ERROR: { icon: AlertCircle, bg: 'bg-red-500/10', border: 'border-red-500/30', iconColor: 'text-red-600 dark:text-red-400', textColorLight: '#991b1b', textColorDark: '#fecaca', title: 'Error' },
  DANGER: { icon: AlertCircle, bg: 'bg-red-500/10', border: 'border-red-500/30', iconColor: 'text-red-600 dark:text-red-400', textColorLight: '#991b1b', textColorDark: '#fecaca', title: 'Danger' },
  SUCCESS: { icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', iconColor: 'text-emerald-600 dark:text-emerald-400', textColorLight: '#065f46', textColorDark: '#a7f3d0', title: 'Success' },
};

// Code block with copy functionality
const CodeBlockRenderer = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  const langName = LANG_NAMES[language] || language?.toUpperCase() || 'CODE';
  const isTerminal = ['bash', 'sh', 'shell', 'zsh'].includes(language);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match) {
    return <code className={className}>{children}</code>;
  }

  return (
    <div className="code-block my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 w-full max-w-3xl" data-testid="code-block">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          {isTerminal ? <Terminal className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
          <span className="text-xs font-medium">{langName}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
          data-testid="copy-code-btn"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /><span className="text-emerald-500 dark:text-emerald-400">Copied</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
          )}
        </button>
      </div>
      <div className="overflow-x-auto w-full">
        <SyntaxHighlighter
          language={language}
          style={codeTheme}
          customStyle={{ 
            margin: 0, 
            borderRadius: 0,
            whiteSpace: 'pre',
            wordBreak: 'normal',
            overflowWrap: 'normal'
          }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// Callout component - uses data attributes for type-specific text colors
const Callout = ({ type, title, children }) => {
  const config = CALLOUT_CONFIG[type?.toUpperCase()] || CALLOUT_CONFIG.NOTE;
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const calloutType = (type || 'note').toLowerCase();

  return (
    <div 
      className={`callout my-6 p-4 rounded-lg border relative z-10 ${config.bg} ${config.border}`} 
      data-testid="callout"
      data-callout-type={calloutType}
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {displayTitle && (
            <p className={`font-semibold ${config.iconColor} mb-1`}>{displayTitle}</p>
          )}
          <div className="callout-content text-[15px] leading-relaxed [&>p]:m-0 [&>p:not(:last-child)]:mb-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// YouTube Video Embed Component
const YouTubeEmbed = ({ id, title }) => {
  if (!id) return null;
  
  // Extract video ID from various YouTube URL formats
  let videoId = id;
  if (id.includes('youtube.com') || id.includes('youtu.be')) {
    // Handle youtu.be/VIDEO_ID, youtube.com/watch?v=VIDEO_ID, youtube.com/embed/VIDEO_ID
    // Also handles query params like ?si=xxx
    const match = id.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      videoId = match[1];
    } else {
      // Try to extract from youtu.be with query params
      const shortMatch = id.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (shortMatch) {
        videoId = shortMatch[1].split('?')[0]; // Remove query params
      }
    }
  }
  
  return (
    <div className="my-6 relative z-10" data-testid="youtube-embed">
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title || 'Video'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {title && title.trim() && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">{title}</p>
      )}
    </div>
  );
};

// Loom Video Embed Component
const LoomEmbed = ({ id, title }) => {
  if (!id) return null;
  
  // Extract Loom ID from URL if needed
  let loomId = id;
  if (id.includes('loom.com')) {
    const match = id.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    if (match) loomId = match[1];
  }
  
  return (
    <div className="my-6 relative z-10" data-testid="loom-embed">
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.loom.com/embed/${loomId}`}
          title={title || 'Video'}
          frameBorder="0"
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          allowFullScreen
        />
      </div>
      {title && title.trim() && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">{title}</p>
      )}
    </div>
  );
};

// Video (MP4/WebM) Embed Component
const VideoEmbed = ({ src, title, poster }) => {
  if (!src) return null;
  
  return (
    <div className="my-6 relative z-10" data-testid="video-embed">
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-black">
        <video
          className="w-full"
          controls
          poster={poster}
          preload="metadata"
        >
          <source src={src} type={src.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
          Your browser does not support the video tag.
        </video>
      </div>
      {title && title.trim() && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">{title}</p>
      )}
    </div>
  );
};

// Figure Component (Image with Caption)
const Figure = ({ src, alt, caption }) => {
  if (!src) return null;
  
  return (
    <figure className="my-6 relative z-10" data-testid="figure">
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
        <img 
          src={src} 
          alt={alt || caption || 'Image'} 
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
      {caption && caption.trim() && (
        <figcaption className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

/**
 * Recursive content renderer - handles nested custom components
 * Parses markdown that might contain callouts, steps, etc.
 */
const NestedContent = ({ content, mdComponents }) => {
  if (!content) return null;
  
  // Check if content has custom components that need parsing
  const hasCustomComponents = /<(Steps|CardGroup|Columns|Card|Tabs|Accordion|Callout|YouTube|Loom|Video|Figure|DeleteAccountButton)/i.test(content) ||
    />\s*\[!(NOTE|TIP|WARNING|CAUTION|ERROR|INFO|SUCCESS)\]/i.test(content);
  
  if (hasCustomComponents) {
    // Recursively parse and render
    const parsed = extractComponents(content);
    return (
      <>
        {parsed.map((block, i) => {
          if (block.type === 'markdown') {
            return (
              <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
                {block.content}
              </ReactMarkdown>
            );
          }
          return (
            <RenderComponent
              key={i}
              type={block.component}
              children={block.children}
              props={block.props}
              content={block.content}
              mdComponents={mdComponents}
            />
          );
        })}
      </>
    );
  }
  
  // Simple markdown, no custom components
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {content}
    </ReactMarkdown>
  );
};

/**
 * Render a custom component based on parsed structure
 */
const RenderComponent = ({ type, children: items, props, content, mdComponents }) => {
  switch (type) {
    case 'Steps':
      return (
        <Steps>
          {items?.map((item, i) => (
            <Step key={i} title={item.title} icon={item.icon}>
              <NestedContent content={item.content} mdComponents={mdComponents} />
            </Step>
          ))}
        </Steps>
      );

    case 'CardGroup':
      return (
        <CardGroup>
          {items?.map((item, i) => (
            <Card key={i} title={item.title} icon={item.icon} href={item.href} color={item.color}>
              <NestedContent content={item.content} mdComponents={mdComponents} />
            </Card>
          ))}
        </CardGroup>
      );

    case 'Columns':
      return (
        <Columns cols={props?.cols || 2}>
          {items?.map((item, i) => {
            if (item.type === 'iframe') {
              return (
                <div key={i} className="relative w-full aspect-video rounded-xl overflow-hidden">
                  <iframe
                    src={item.src}
                    title={item.title || 'Embedded video'}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow={item.allow || "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"}
                    allowFullScreen={item.allowFullScreen}
                  />
                </div>
              );
            }
            return (
              <Card key={i} title={item.title} icon={item.icon} href={item.href} color={item.color}>
                <NestedContent content={item.content} mdComponents={mdComponents} />
              </Card>
            );
          })}
        </Columns>
      );

    case 'Card':
      // Standalone card (outside of CardGroup/Columns)
      return (
        <div className="my-6">
          <Card title={props?.title} icon={props?.icon} href={props?.href} color={props?.color}>
            <NestedContent content={content} mdComponents={mdComponents} />
          </Card>
        </div>
      );

    case 'iframe':
      // Standalone iframe embed
      return (
        <div className="my-6 relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <iframe
            src={props?.src}
            title={props?.title || 'Embedded content'}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow={props?.allow || "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"}
            allowFullScreen={props?.allowFullScreen}
          />
        </div>
      );

    case 'Tabs':
    case 'CodeGroup':
      return (
        <Tabs>
          {items?.map((item, i) => (
            <Tab key={i} label={item.label}>
              <NestedContent content={item.content} mdComponents={mdComponents} />
            </Tab>
          ))}
        </Tabs>
      );

    case 'Accordion':
      return (
        <Accordion>
          {items?.map((item, i) => (
            <AccordionItem key={i} title={item.title} defaultOpen={item.defaultOpen}>
              <NestedContent content={item.content} mdComponents={mdComponents} />
            </AccordionItem>
          ))}
        </Accordion>
      );

    case 'AccordionGroup':
      return (
        <Accordion>
          {items?.map((item, i) => (
            <AccordionItem key={i} title={item.title} defaultOpen={item.defaultOpen}>
              <NestedContent content={item.content} mdComponents={mdComponents} />
            </AccordionItem>
          ))}
        </Accordion>
      );

    case 'DeleteAccountButton':
      return (
        <div className="my-6">
          <DeleteAccountButton 
            label={props?.label}
            variant={props?.variant}
          />
        </div>
      );

    case 'DeleteAccountButton':
      return (
        <div className="my-6">
          <DeleteAccountButton 
            label={props?.label}
            variant={props?.variant}
          />
        </div>
      );

    case 'Callout':
      return (
        <Callout type={props?.type} title={props?.title}>
          <NestedContent content={content} mdComponents={mdComponents} />
        </Callout>
      );

    // Handle individual callout type components (Info, Note, Tip, Warning, etc.)
    case 'Info':
    case 'Note':
    case 'Tip':
    case 'Warning':
    case 'Caution':
    case 'Error':
    case 'Danger':
    case 'Success':
      return (
        <Callout type={type} title={props?.title}>
          <NestedContent content={content} mdComponents={mdComponents} />
        </Callout>
      );

    case 'YouTube':
      return <YouTubeEmbed id={props?.id} title={props?.title} />;

    case 'Loom':
      return <LoomEmbed id={props?.id} title={props?.title} />;

    case 'Video':
      return <VideoEmbed src={props?.src} title={props?.title} poster={props?.poster} />;

    case 'Figure':
      return <Figure src={props?.src} alt={props?.alt} caption={props?.caption} />;

    case 'Check':
      // Render a checkmark icon with optional text
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <Check className="w-4 h-4" />
          {content && <NestedContent content={content} mdComponents={mdComponents} />}
        </span>
      );

    default:
      return null;
  }
};

/**
 * DocContent - Main documentation content renderer
 * Now uses AST-based parsing for robustness
 */
export const DocContent = ({ content, className = '', onHeadings }) => {
  // Parse content using AST-based parser
  const { sections, headings, errors } = useMemo(() => {
    const parsed = parseContent(content);
    const sections = extractComponents(content);
    const toc = generateTOC(parsed.headings);
    return {
      sections,
      headings: toc,
      errors: parsed.errors,
    };
  }, [content]);

  // Notify parent of headings for TOC - use useEffect to avoid setState during render
  useEffect(() => {
    if (onHeadings && headings.length > 0) {
      onHeadings(headings);
    }
  }, [headings, onHeadings]);

  // Markdown component configuration
  const mdComponents = useMemo(() => ({
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-pink-600 dark:text-pink-400 rounded text-[0.875em] font-mono" {...props}>
            {children}
          </code>
        );
      }
      return <CodeBlockRenderer className={className}>{children}</CodeBlockRenderer>;
    },

    // Pre blocks - constrain width and enforce horizontal scrolling so long
    // single-line code (e.g. URLs, commands) never overflows the doc column
    // or overlaps the right-hand TOC sidebar.
    pre: ({ children }) => {
      return (
        <div className="my-4 max-w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <pre className="m-0 p-4 bg-slate-100 dark:bg-slate-900 overflow-x-auto text-sm whitespace-pre">
            {children}
          </pre>
        </div>
      );
    },

    // Headers with auto-generated IDs - must have explicit colors for theme support
    // Using !important variant to override prose styles
    h1: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h1 id={id} className="scroll-mt-20 !text-gray-900 dark:!text-white font-bold">{children}</h1>;
    },
    h2: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h2 id={id} className="scroll-mt-20 !text-gray-900 dark:!text-white text-2xl font-semibold mt-10 mb-4">{children}</h2>;
    },
    h3: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h3 id={id} className="scroll-mt-20 !text-gray-900 dark:!text-white text-xl font-semibold mt-8 mb-3">{children}</h3>;
    },
    h4: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h4 id={id} className="scroll-mt-20 !text-gray-900 dark:!text-white text-lg font-semibold mt-6 mb-2">{children}</h4>;
    },

    // Blockquote - detect callout syntax [!TYPE]
    blockquote: ({ children }) => {
      let textContent = '';
      const extractText = (node) => {
        if (typeof node === 'string') {
          textContent += node;
        } else if (isValidElement(node)) {
          Children.forEach(node.props.children, extractText);
        } else if (Array.isArray(node)) {
          node.forEach(extractText);
        }
      };
      Children.forEach(children, extractText);

      const calloutMatch = textContent.match(/^\s*\[!(NOTE|INFO|TIP|WARNING|CAUTION|ERROR|DANGER|SUCCESS)\]\s*/i);

      if (calloutMatch) {
        const type = calloutMatch[1].toUpperCase();
        const cleanContent = textContent.replace(/^\s*\[!(NOTE|INFO|TIP|WARNING|CAUTION|ERROR|DANGER|SUCCESS)\]\s*/i, '').trim();
        return <Callout type={type}><p>{cleanContent}</p></Callout>;
      }

      return (
        <blockquote className="my-6 pl-4 border-l-4 border-indigo-500 italic [&>*]:!text-slate-600 dark:[&>*]:!text-slate-300 [&_p]:!text-slate-600 dark:[&_p]:!text-slate-300">
          {children}
        </blockquote>
      );
    },

    // Tables
    table: ({ children }) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-900">{children}</thead>,
    th: ({ children }) => (
      <th className="text-left px-4 py-3 text-sm font-semibold !text-slate-900 dark:!text-slate-200 border-b border-slate-200 dark:border-slate-800">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm !text-slate-700 dark:!text-slate-300 border-b border-slate-200/50 dark:border-slate-800/50">
        {children}
      </td>
    ),

    // Links
    a: ({ href, children }) => {
      const isExternal = href?.startsWith('http');
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-[#188455] hover:text-[#157149] underline-offset-2 hover:underline"
        >
          {children}
        </a>
      );
    },

    img: ({ src, alt }) => (
      <img src={src} alt={alt} className="rounded-lg border border-slate-200 dark:border-slate-800 my-6 max-w-full" loading="lazy" />
    ),
    hr: () => <hr className="border-slate-200 dark:border-slate-800 my-8" />,
    ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-2 !text-slate-700 dark:!text-slate-300">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 ml-6 list-decimal space-y-2 !text-slate-700 dark:!text-slate-300">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    p: ({ children }) => <p className="my-4 leading-relaxed !text-slate-700 dark:!text-slate-300">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold !text-slate-900 dark:!text-slate-100">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    details: ({ children }) => (
      <details className="my-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden group">{children}</details>
    ),
    summary: ({ children }) => (
      <summary className="px-4 py-3 bg-slate-100 dark:bg-slate-900 cursor-pointer !text-slate-900 dark:!text-white font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
        {children}
      </summary>
    ),
  }), []);

  if (!content) {
    return (
      <div className="text-slate-500 italic" data-testid="doc-empty">
        No content yet. Start typing or use <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400">/</kbd> for commands.
      </div>
    );
  }

  // Show validation errors in dev mode
  const showErrors = errors.length > 0 && process.env.NODE_ENV === 'development';

  return (
    <div className={`doc-content ${className}`} data-testid="doc-content">
      {showErrors && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 font-medium mb-2">Validation Warnings</p>
          <ul className="text-amber-300 text-sm space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {sections.map((section, index) => (
        <Fragment key={index}>
          {section.type === 'markdown' ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {section.content}
            </ReactMarkdown>
          ) : (
            <RenderComponent
              type={section.component}
              children={section.children}
              props={section.props}
              content={section.content}
              mdComponents={mdComponents}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default DocContent;
