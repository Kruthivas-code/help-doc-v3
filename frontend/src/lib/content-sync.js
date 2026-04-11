/**
 * Content Sync - Bi-directional conversion between Markdown and HTML
 * Ensures WYSIWYG edits sync properly with Markdown view
 */
import TurndownService from 'turndown';
import { marked } from 'marked';

// Configure marked for safe HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Initialize Turndown for HTML → Markdown conversion
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Custom rules for better Markdown output
turndown.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: (content) => `~~${content}~~`
});

turndown.addRule('codeBlock', {
  filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
  replacement: (content, node) => {
    const code = node.firstChild;
    const language = code?.className?.replace('language-', '') || '';
    const text = code?.textContent || content;
    return `\n\`\`\`${language}\n${text}\n\`\`\`\n`;
  }
});

turndown.addRule('images', {
  filter: 'img',
  replacement: (content, node) => {
    const alt = node.getAttribute('alt') || '';
    const src = node.getAttribute('src') || '';
    return `![${alt}](${src})`;
  }
});

turndown.addRule('youtube', {
  filter: (node) => node.nodeName === 'IFRAME' && node.getAttribute('src')?.includes('youtube'),
  replacement: (content, node) => {
    const src = node.getAttribute('src') || '';
    // Extract video ID from embed URL
    const match = src.match(/embed\/([a-zA-Z0-9_-]+)/);
    const videoId = match ? match[1] : '';
    return videoId ? `\n<YouTube id="${videoId}" />\n` : '';
  }
});

// Preserve custom components
turndown.addRule('customComponents', {
  filter: (node) => {
    const tagName = node.nodeName.toLowerCase();
    return ['steps', 'step', 'cardgroup', 'card', 'tabs', 'tab', 'accordion', 'accordionitem', 'callout'].includes(tagName);
  },
  replacement: (content, node) => {
    return node.outerHTML;
  }
});

/**
 * Convert HTML to Markdown
 */
export function htmlToMarkdown(html) {
  if (!html) return '';
  
  // Clean up HTML first
  let cleaned = html
    .replace(/<p><br><\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ');
  
  // Convert using Turndown
  let markdown = turndown.turndown(cleaned);
  
  // Clean up extra whitespace
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return markdown;
}

/**
 * Convert Markdown to HTML (for WYSIWYG editor)
 * Uses marked library for proper markdown parsing
 */
export function markdownToHtml(markdown) {
  if (!markdown) return '';
  
  try {
    // Use marked for proper markdown parsing
    const html = marked.parse(markdown);
    return html;
  } catch (error) {
    console.error('Markdown to HTML conversion error:', error);
    // Fallback to simple conversion
    return markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .split('\n\n')
      .map(block => block.trim() ? `<p>${block}</p>` : '')
      .join('\n');
  }
}

/**
 * Detect if content is HTML or Markdown
 */
export function detectContentType(content) {
  if (!content) return 'markdown';
  
  // Check for HTML tags
  const htmlTags = /<(h[1-6]|p|div|span|ul|ol|li|pre|code|img|a|blockquote|strong|em|br)\b/i;
  if (htmlTags.test(content)) return 'html';
  
  // Check for Markdown patterns
  const mdPatterns = /^#{1,6}\s|^\s*[-*+]\s|\*\*|`{1,3}|^\s*>/m;
  if (mdPatterns.test(content)) return 'markdown';
  
  return 'markdown'; // Default to markdown
}

/**
 * Normalize content to Markdown (for storage)
 * All content should be stored as Markdown
 */
export function normalizeToMarkdown(content) {
  const type = detectContentType(content);
  if (type === 'html') {
    return htmlToMarkdown(content);
  }
  return content;
}

/**
 * Prepare content for WYSIWYG editor (HTML)
 */
export function prepareForEditor(content) {
  const type = detectContentType(content);
  if (type === 'markdown') {
    return markdownToHtml(content);
  }
  return content;
}

export default {
  htmlToMarkdown,
  markdownToHtml,
  detectContentType,
  normalizeToMarkdown,
  prepareForEditor,
};
