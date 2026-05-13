/**
 * DocContent - AST-based MDX content renderer
 * Uses proper remark/rehype pipeline for robust parsing
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useMemo, useEffect, Children, isValidElement, Fragment } from 'react';
import { Copy, Check, Info, Lightbulb, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/contexts/ThemeContext';

// Import custom components
import { Steps, Step } from './Steps';
import { Card, CardGroup, Columns } from './Cards';
import { Tabs, Tab } from './Tabs';
import { Accordion, AccordionItem } from './Accordion';
import { DeleteAccountButton } from './DeleteAccountButton';

// Import parser
import { extractComponents, parseContent, generateTOC } from '@/lib/mdx/parser';

// Custom code themes — light + dark
const buildCodeTheme = (isDark) => {
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

// Language display names
// Callout configurations with CSS variable approach for text colors
const CALLOUT_CONFIG = {
  NOTE: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', iconColor: 'text-blue-600 dark:text-blue-400', textColorLight: '#1e40af', textColorDark: '#bfdbfe', title: 'Note' },
  INFO: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', iconColor: 'text-blue-600 dark:text-blue-400', textColorLight: '#1e40af', textColorDark: '#bfdbfe', title: 'Info' },
  TIP: { icon: Lightbulb, bg: 'bg-brand/10', border: 'border-brand/30', iconColor: 'text-emerald-600 dark:text-brand', textColorLight: '#065f46', textColorDark: '#a7f3d0', title: 'Tip' },
  WARNING: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', iconColor: 'text-amber-600 dark:text-amber-400', textColorLight: '#92400e', textColorDark: '#fde68a', title: 'Warning' },
  CAUTION: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', iconColor: 'text-amber-600 dark:text-amber-400', textColorLight: '#92400e', textColorDark: '#fde68a', title: 'Caution' },
  ERROR: { icon: AlertCircle, bg: 'bg-rose-500/10', border: 'border-rose-500/30', iconColor: 'text-red-600 dark:text-rose-600 dark:text-rose-400', textColorLight: '#991b1b', textColorDark: '#fecaca', title: 'Error' },
  DANGER: { icon: AlertCircle, bg: 'bg-rose-500/10', border: 'border-rose-500/30', iconColor: 'text-red-600 dark:text-rose-600 dark:text-rose-400', textColorLight: '#991b1b', textColorDark: '#fecaca', title: 'Danger' },
  SUCCESS: { icon: CheckCircle, bg: 'bg-brand/10', border: 'border-brand/30', iconColor: 'text-emerald-600 dark:text-brand', textColorLight: '#065f46', textColorDark: '#a7f3d0', title: 'Success' },
};

// Code block with copy functionality
const CodeBlockRenderer = ({ children, className }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  const codeTheme = useMemo(() => buildCodeTheme(isDark), [isDark]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(code); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match) {
    return <code className={className}>{children}</code>;
  }

  return (
    <div className="code-block group relative my-5 w-full max-w-3xl" data-testid="code-block">
      <button
        onClick={handleCopy}
        className="btn-press absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur rounded-md"
        data-testid="copy-code-btn"
      >
        {copied ? (
          <><Check className="w-3.5 h-3.5 text-brand" /><span className="text-brand">Copied</span></>
        ) : (
          <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
        )}
      </button>
      <div className="overflow-x-auto w-full">
        <SyntaxHighlighter
          language={language}
          style={codeTheme}
          customStyle={{
            margin: 0,
            background: 'transparent',
            padding: '1rem 0',
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
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
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
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">{title}</p>
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
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
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
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">{title}</p>
      )}
    </div>
  );
};

// Video (MP4/WebM) Embed Component
const VideoEmbed = ({ src, title, poster }) => {
  if (!src) return null;
  
  return (
    <div className="my-6 relative z-10" data-testid="video-embed">
      <video
        className="w-full"
        controls
        poster={poster}
        preload="metadata"
      >
        <source src={src} type={src.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
        Your browser does not support the video tag.
      </video>
      {title && title.trim() && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">{title}</p>
      )}
    </div>
  );
};

// Figure Component (Image with Caption)
const Figure = ({ src, alt, caption }) => {
  if (!src) return null;
  
  return (
    <figure className="my-6 relative z-10" data-testid="figure">
      <img 
        src={src} 
        alt={alt || caption || 'Image'} 
        className="w-full h-auto"
        loading="lazy"
      />
      {caption && caption.trim() && (
        <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
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
                <div key={i} className="relative w-full aspect-video overflow-hidden">
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
        <div className="my-6 relative w-full aspect-video overflow-hidden">
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
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-brand">
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
          <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-brand-700 dark:text-brand-300 rounded text-[0.875em] font-mono" {...props}>
            {children}
          </code>
        );
      }
      return <CodeBlockRenderer className={className}>{children}</CodeBlockRenderer>;
    },

    // Pre blocks — no container, just bounded width + horizontal scroll
    pre: ({ children }) => {
      return (
        <pre className="my-4 p-0 bg-transparent overflow-x-auto text-sm whitespace-pre font-mono max-w-full">
          {children}
        </pre>
      );
    },

    // Headers with auto-generated IDs - must have explicit colors for theme support
    // Using !important variant to override prose styles
    h1: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h1 id={id} className="scroll-mt-20 !text-zinc-950 dark:!text-white font-heading font-black tracking-tight">{children}</h1>;
    },
    h2: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h2 id={id} className="scroll-mt-20 !text-zinc-950 dark:!text-white text-2xl font-heading font-black tracking-tight mt-10 mb-3">{children}</h2>;
    },
    h3: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h3 id={id} className="scroll-mt-20 !text-zinc-950 dark:!text-white text-lg font-heading font-extrabold tracking-tight mt-7 mb-2">{children}</h3>;
    },
    h4: ({ children }) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return <h4 id={id} className="scroll-mt-20 !text-zinc-950 dark:!text-white text-base font-heading font-bold tracking-tight mt-5 mb-2">{children}</h4>;
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
        <blockquote className="my-5 pl-4 border-l-2 border-brand bg-zinc-50 dark:bg-zinc-900/60 rounded-r-md py-2 pr-3 [&>*]:!text-zinc-700 dark:[&>*]:!text-zinc-300 [&_p]:!text-zinc-700 dark:[&_p]:!text-zinc-300 [&_p]:!my-1 [&_strong]:!text-zinc-900 dark:[&_strong]:!text-zinc-100 [&_a]:!text-brand">
          {children}
        </blockquote>
      );
    },

    // Tables — no wrapper container, plain table flow
    table: ({ children }) => (
      <div className="overflow-x-auto my-5">
        <table className="w-full border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    th: ({ children }) => (
      <th className="text-left px-3 py-2 text-xs font-bold tracking-wide uppercase !text-zinc-700 dark:!text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-sm !text-zinc-700 dark:!text-zinc-300 border-b border-zinc-100 dark:border-zinc-800/60 align-top">
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
          className="text-[#1588FC] hover:text-[#0772E3] underline-offset-2 hover:underline"
        >
          {children}
        </a>
      );
    },

    img: ({ src, alt }) => (
      <img src={src} alt={alt} className="my-6 max-w-full h-auto" loading="lazy" />
    ),
    hr: () => <hr className="border-zinc-200 dark:border-zinc-800 my-8" />,
    ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-2 text-zinc-700 dark:text-zinc-300">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 ml-6 list-decimal space-y-2 text-zinc-700 dark:text-zinc-300">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    p: ({ children }) => <p className="my-4 leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold !text-zinc-950 dark:!text-zinc-100">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    details: ({ children }) => (
      <details className="my-4 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden group">{children}</details>
    ),
    summary: ({ children }) => (
      <summary className="px-4 py-3 bg-zinc-100 dark:bg-zinc-900 cursor-pointer !text-zinc-950 dark:!text-white font-medium hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors">
        {children}
      </summary>
    ),
  }), []);

  if (!content) {
    return (
      <div className="text-zinc-500 italic" data-testid="doc-empty">
        No content yet. Start typing or use <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400">/</kbd> for commands.
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
