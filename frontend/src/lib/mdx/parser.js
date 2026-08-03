/**
 * MDX Parser - AST-based parsing using unified/remark/rehype
 * Replaces regex-based parsing with proper AST transformations
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

// Whitelisted custom components
const ALLOWED_COMPONENTS = new Set([
  // Step components
  'Steps', 'Step',
  // Card components
  'CardGroup', 'Card',
  // Tab components
  'Tabs', 'Tab',
  // Accordion components
  'Accordion', 'AccordionItem', 'AccordionGroup',
  // Alert/Callout components
  'Callout', 'Info', 'Note', 'Tip', 'Warning', 'Caution', 'Error', 'Danger', 'Success',
  // Code components
  'CodeGroup',
  // Layout components
  'Columns',
  // Media components
  'YouTube', 'Loom', 'Video', 'Figure',
  // Embed components
  'iframe',
  // Icon/UI components
  'Check',
  // Action components
  'DeleteAccountButton'
]);

// Validation error types
export const ValidationError = {
  BROKEN_LINK: 'BROKEN_LINK',
  INVALID_HEADING: 'INVALID_HEADING',
  UNKNOWN_COMPONENT: 'UNKNOWN_COMPONENT',
  INVALID_PROPS: 'INVALID_PROPS',
  MISSING_REQUIRED_PROP: 'MISSING_REQUIRED_PROP',
};

/**
 * Parse MDX-like content into structured AST
 */
export function parseContent(content) {
  if (!content) return { ast: null, errors: [], components: [], headings: [] };

  const errors = [];
  const components = [];
  const headings = [];

  // Parse with remark
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm);

  const ast = processor.parse(content);

  // Extract headings
  visit(ast, 'heading', (node) => {
    const text = toString(node);
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    headings.push({
      level: node.depth,
      text,
      id,
      position: node.position,
    });
  });

  // Validate heading hierarchy
  validateHeadingHierarchy(headings, errors);

  // Extract and validate custom components from raw HTML
  visit(ast, 'html', (node) => {
    const componentMatches = node.value.matchAll(/<(\w+)([^>]*)>/g);
    for (const match of componentMatches) {
      const tagName = match[1];
      const propsString = match[2];
      
      // Check if it's a custom component (PascalCase)
      if (/^[A-Z]/.test(tagName)) {
        if (!ALLOWED_COMPONENTS.has(tagName)) {
          errors.push({
            type: ValidationError.UNKNOWN_COMPONENT,
            message: `Unknown component: <${tagName}>. Allowed: ${[...ALLOWED_COMPONENTS].join(', ')}`,
            position: node.position,
            severity: 'error',
          });
        } else {
          const props = parseProps(propsString);
          components.push({
            name: tagName,
            props,
            position: node.position,
          });
          
          // Validate props
          validateComponentProps(tagName, props, errors, node.position);
        }
      }
    }
  });

  // Extract links and validate
  visit(ast, 'link', (node) => {
    const href = node.url;
    if (href) {
      // Skip validation for:
      // - HTTP/HTTPS links (external)
      // - Anchor links (#heading)
      // - Absolute paths (/page)
      // - mailto: links
      // - tel: links
      // - Other valid protocols
      const isValidExternal = /^(https?|mailto|tel):/.test(href);
      const isAnchor = href.startsWith('#');
      const isAbsolute = href.startsWith('/');
      
      if (!isValidExternal && !isAnchor && !isAbsolute) {
        // Only flag truly relative links (e.g., ./page.md, ../folder/page)
        // But allow domain-only links like app.emergent.sh
        const isDomainLink = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(href);
        
        if (!isDomainLink) {
          errors.push({
            type: ValidationError.BROKEN_LINK,
            message: `Potentially broken link: ${href}`,
            position: node.position,
            severity: 'warning',
            href,
          });
        }
      }
    }
  });

  return { ast, errors, components, headings };
}

/**
 * Parse HTML-like props string into object
 */
function parseProps(propsString) {
  const props = {};
  const propRegex = /(\w+)(?:="([^"]*)")?/g;
  let match;
  
  while ((match = propRegex.exec(propsString)) !== null) {
    const [, key, value] = match;
    props[key] = value !== undefined ? value : true;
  }
  
  return props;
}

/**
 * Validate heading hierarchy (no skipping levels)
 */
function validateHeadingHierarchy(headings, errors) {
  let lastLevel = 0;
  
  for (const heading of headings) {
    if (lastLevel > 0 && heading.level > lastLevel + 1) {
      errors.push({
        type: ValidationError.INVALID_HEADING,
        message: `Heading level skipped: h${lastLevel} → h${heading.level}. "${heading.text}"`,
        position: heading.position,
        severity: 'warning',
      });
    }
    lastLevel = heading.level;
  }
}

/**
 * Validate component props
 */
function validateComponentProps(componentName, props, errors, position) {
  const requiredProps = {
    Step: ['title'],
    Card: ['title'],
    Tab: ['label'],
    AccordionItem: ['title'],
    Callout: ['type'],
  };

  const required = requiredProps[componentName];
  if (required) {
    for (const prop of required) {
      if (!props[prop]) {
        errors.push({
          type: ValidationError.MISSING_REQUIRED_PROP,
          message: `<${componentName}> requires "${prop}" prop`,
          position,
          severity: 'error',
        });
      }
    }
  }
}

/**
 * Extract custom components from content string
 * Returns parsed component structure for React rendering
 */
export function extractComponents(content) {
  if (!content) return [];

  const result = [];
  let remaining = content;
  let lastIndex = 0;

  // Combined pattern for all components we need to extract
  // Order matters: we check for the most specific patterns first
  const patterns = [
    // Container components with opening/closing tags (optional attributes allowed)
    { regex: /<(Steps|CardGroup|Tabs|Accordion|CodeGroup|AccordionGroup)(?:\s+[^>]*?)?>([\s\S]*?)<\/\1>/gi, type: 'container' },
    // Columns layout component with cols attribute
    { regex: /<Columns\s+cols=\{(\d+)\}>([\s\S]*?)<\/Columns>/gi, type: 'columns' },
    // Callout with type and optional title
    { regex: /<Callout\s+type="([^"]*)"(?:\s+title="([^"]*)")?>([\s\S]*?)<\/Callout>/gi, type: 'callout' },
    // Shorthand callouts: <Note>, <Info>, <Tip>, <Warning>, <Caution>, <Error>, <Danger>, <Success>
    { regex: /<(Note|Info|Tip|Warning|Caution|Error|Danger|Success)(?:\s+([^>]*?))?>([\s\S]*?)<\/\1>/gi, type: 'callout-shorthand' },
    // Self-closing media components (YouTube, Loom, Video, Figure)
    { regex: /<(YouTube|Loom|Video|Figure)\s+([^>]*?)\/>/gi, type: 'media' },
    // Self-closing action components (DeleteAccountButton)
    { regex: /<DeleteAccountButton\s*([^>]*?)\/>/gi, type: 'delete-button' },
    // Standalone Card components (outside of CardGroup)
    { regex: /<Card\s+([^>]*?)>([\s\S]*?)<\/Card>/gi, type: 'standalone-card' },
    // iframe embeds (for YouTube etc)
    { regex: /<iframe\s+([^>]*?)(?:\/>|><\/iframe>|>[\s\S]*?<\/iframe>)/gi, type: 'iframe' },
  ];

  // Process all patterns in a single pass
  const allMatches = [];
  
  for (const { regex, type } of patterns) {
    let match;
    // Reset regex lastIndex
    regex.lastIndex = 0;
    while ((match = regex.exec(content)) !== null) {
      allMatches.push({
        type,
        match,
        index: match.index,
        length: match[0].length,
        fullMatch: match[0]
      });
    }
  }

  // Sort matches by their position in the content
  allMatches.sort((a, b) => a.index - b.index);

  // Process matches in order
  for (const item of allMatches) {
    // Skip if this match overlaps with already processed content
    if (item.index < lastIndex) continue;

    // Add text before this component
    if (item.index > lastIndex) {
      const textBefore = content.slice(lastIndex, item.index);
      if (textBefore.trim()) {
        result.push({ type: 'markdown', content: textBefore });
      }
    }

    if (item.type === 'container') {
      const componentType = item.match[1];
      const innerContent = item.match[2];
      result.push({
        type: 'component',
        component: componentType,
        content: innerContent,
        children: extractInnerComponents(innerContent, componentType),
      });
    } else if (item.type === 'columns') {
      const cols = parseInt(item.match[1], 10) || 2;
      const innerContent = item.match[2];
      // Extract cards from within Columns
      const cards = extractCardsFromColumns(innerContent);
      result.push({
        type: 'component',
        component: 'Columns',
        props: { cols },
        content: innerContent,
        children: cards,
      });
    } else if (item.type === 'callout') {
      result.push({
        type: 'component',
        component: 'Callout',
        props: { type: item.match[1], title: item.match[2] },
        content: item.match[3].trim(),
      });
    } else if (item.type === 'callout-shorthand') {
      const attrs = item.match[2] || '';
      const titleM = attrs.match(/title="([^"]*)"/);
      result.push({
        type: 'component',
        component: 'Callout',
        props: { type: item.match[1], title: titleM ? titleM[1] : undefined },
        content: item.match[3].trim(),
      });
    } else if (item.type === 'media') {
      const componentType = item.match[1];
      const propsString = item.match[2];
      
      // Parse props from string
      const props = {};
      const propMatches = propsString.matchAll(/(\w+)="([^"]*)"/g);
      for (const propMatch of propMatches) {
        props[propMatch[1]] = propMatch[2];
      }
      
      result.push({
        type: 'component',
        component: componentType,
        props: props,
      });
    } else if (item.type === 'delete-button') {
      const propsString = item.match[1];
      
      // Parse props from string
      const props = {};
      if (propsString) {
        const propMatches = propsString.matchAll(/(\w+)="([^"]*)"/g);
        for (const propMatch of propMatches) {
          props[propMatch[1]] = propMatch[2];
        }
      }
      
      result.push({
        type: 'component',
        component: 'DeleteAccountButton',
        props: props,
      });
    } else if (item.type === 'standalone-card') {
      const propsString = item.match[1];
      const innerContent = item.match[2];
      
      // Parse props including color
      const props = parseCardProps(propsString);
      
      result.push({
        type: 'component',
        component: 'Card',
        props: props,
        content: innerContent.trim(),
      });
    } else if (item.type === 'iframe') {
      const propsString = item.match[1];
      const props = parseIframeProps(propsString);
      
      result.push({
        type: 'component',
        component: 'iframe',
        props: props,
      });
    }

    lastIndex = item.index + item.length;
  }

  // Add remaining text after the last component
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      result.push({ type: 'markdown', content: remaining });
    }
  }

  // If nothing was extracted, return the whole content as markdown
  return result.length > 0 ? result : [{ type: 'markdown', content }];
}

/**
 * Remove common leading indentation from multi-line content
 * This prevents indented content from being treated as code blocks
 */
function dedent(text) {
  if (!text) return text;
  
  const lines = text.split('\n');
  
  // Find minimum indentation (ignoring empty lines)
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === '') continue;
    const indent = line.match(/^(\s*)/)[1].length;
    minIndent = Math.min(minIndent, indent);
  }
  
  if (minIndent === Infinity || minIndent === 0) return text.trim();
  
  // Remove the common indentation from all lines
  return lines
    .map(line => line.slice(minIndent))
    .join('\n')
    .trim();
}

/**
 * Extract inner components (Step, Card, Tab, AccordionItem, Accordion)
 */
function extractInnerComponents(content, parentType) {
  const patterns = {
    Steps: /<Step\s+title="([^"]*)"(?:\s+icon="([^"]*)")?>([\s\S]*?)<\/Step>/gi,
    CardGroup: /<Card\s+title="([^"]*)"(?:\s+icon="([^"]*)")?(?:\s+href="([^"]*)")?>([\s\S]*?)<\/Card>/gi,
    Tabs: /<Tab\s+label="([^"]*)">([\s\S]*?)<\/Tab>/gi,
    Accordion: /<AccordionItem\s+title="([^"]*)"(?:\s+defaultOpen)?>([\s\S]*?)<\/AccordionItem>/gi,
    // AccordionGroup uses <Accordion title="..." icon="..."> as children (Mintlify style)
    AccordionGroup: /<Accordion\s+title="([^"]*)"(?:\s+icon="([^"]*)")?(?:\s+defaultOpen)?>([\s\S]*?)<\/Accordion>/gi,
    CodeGroup: /<Tab\s+label="([^"]*)">([\s\S]*?)<\/Tab>/gi,
  };

  const pattern = patterns[parentType];
  if (!pattern) return [];

  const items = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    if (parentType === 'Steps') {
      items.push({
        title: match[1],
        icon: match[2] || null,
        content: dedent(match[3]),
      });
    } else if (parentType === 'CardGroup') {
      items.push({
        title: match[1],
        icon: match[2] || null,
        href: match[3] || null,
        content: dedent(match[4]),
      });
    } else if (parentType === 'Tabs' || parentType === 'CodeGroup') {
      items.push({
        label: match[1],
        content: dedent(match[2]),
      });
    } else if (parentType === 'Accordion') {
      items.push({
        title: match[1],
        defaultOpen: match[0].includes('defaultOpen'),
        content: dedent(match[2]),
      });
    } else if (parentType === 'AccordionGroup') {
      // AccordionGroup has <Accordion title="..." icon="..."> children
      items.push({
        title: match[1],
        icon: match[2] || null,
        defaultOpen: match[0].includes('defaultOpen'),
        content: dedent(match[3]),
      });
    }
  }

  return items;
}

/**
 * Extract cards from Columns content
 * Handles Card components with all props including color
 */
function extractCardsFromColumns(content) {
  const cards = [];
  const seenIframeUrls = new Set(); // dedupe — same iframe can match both iframeRegex and divRegex
  // Match Card with various props - title, icon, color, href
  const cardRegex = /<Card\s+([^>]*?)>([\s\S]*?)<\/Card>/gi;
  let match;
  
  while ((match = cardRegex.exec(content)) !== null) {
    const propsString = match[1];
    const innerContent = match[2];
    const props = parseCardProps(propsString);
    
    cards.push({
      ...props,
      content: innerContent.trim(),
    });
  }
  
  // Iframes (embedded videos) at root level
  const iframeRegex = /<iframe\s+([^>]*?)(?:\/>|><\/iframe>|>[\s\S]*?<\/iframe>)/gi;
  while ((match = iframeRegex.exec(content)) !== null) {
    const props = parseIframeProps(match[1]);
    if (props.src && seenIframeUrls.has(props.src)) continue;
    if (props.src) seenIframeUrls.add(props.src);
    cards.push({
      type: 'iframe',
      ...props,
    });
  }
  
  // Iframes wrapped in <div style={{...}}> — only add ones not already seen
  const divRegex = /<div\s+style=\{\{([^}]*)\}\}>([\s\S]*?)<\/div>/gi;
  while ((match = divRegex.exec(content)) !== null) {
    const innerContent = match[2];
    const innerIframe = /<iframe\s+([^>]*?)(?:\/>|><\/iframe>|>[\s\S]*?<\/iframe>)/i.exec(innerContent);
    if (innerIframe) {
      const props = parseIframeProps(innerIframe[1]);
      if (props.src && seenIframeUrls.has(props.src)) continue;
      if (props.src) seenIframeUrls.add(props.src);
      cards.push({
        type: 'iframe',
        ...props,
      });
    }
  }
  
  return cards;
}

/**
 * Parse Card props including title, icon, color, href
 */
function parseCardProps(propsString) {
  const props = {};
  
  // Match title="value"
  const titleMatch = propsString.match(/title="([^"]*)"/);
  if (titleMatch) props.title = titleMatch[1];
  
  // Match icon="value"
  const iconMatch = propsString.match(/icon="([^"]*)"/);
  if (iconMatch) props.icon = iconMatch[1];
  
  // Match color="value"
  const colorMatch = propsString.match(/color="([^"]*)"/);
  if (colorMatch) props.color = colorMatch[1];
  
  // Match href="value"
  const hrefMatch = propsString.match(/href="([^"]*)"/);
  if (hrefMatch) props.href = hrefMatch[1];
  
  return props;
}

/**
 * Parse iframe props
 */
function parseIframeProps(propsString) {
  const props = {};
  
  // Match src="value"
  const srcMatch = propsString.match(/src="([^"]*)"/);
  if (srcMatch) props.src = srcMatch[1];
  
  // Match title="value"
  const titleMatch = propsString.match(/title="([^"]*)"/);
  if (titleMatch) props.title = titleMatch[1];
  
  // Match className="value"
  const classMatch = propsString.match(/className="([^"]*)"/);
  if (classMatch) props.className = classMatch[1];
  
  // Match allow="value"
  const allowMatch = propsString.match(/allow="([^"]*)"/);
  if (allowMatch) props.allow = allowMatch[1];
  
  // Check for allowfullscreen
  if (propsString.includes('allowfullscreen') || propsString.includes('allowFullScreen')) {
    props.allowFullScreen = true;
  }
  
  return props;
}

/**
 * Generate Table of Contents from headings
 * Deduplicates headings with the same ID and only includes actual headings on the page
 */
export function generateTOC(headings) {
  // Use a Map to deduplicate by ID
  const uniqueHeadings = new Map();
  
  headings
    .filter(h => h.level >= 2 && h.level <= 3)
    .forEach(h => {
      // Only add if we haven't seen this ID before
      if (!uniqueHeadings.has(h.id)) {
        uniqueHeadings.set(h.id, {
          level: h.level,
          text: h.text,
          id: h.id,
        });
      }
    });
  
  return Array.from(uniqueHeadings.values());
}

/**
 * Build concept graph from document metadata
 * Returns nodes and edges for navigation
 */
export function buildConceptGraph(documents) {
  const nodes = [];
  const edges = [];
  const tagIndex = new Map();

  for (const doc of documents) {
    // Parse document for metadata
    const { headings } = parseContent(doc.content);
    
    // Create node
    const node = {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      icon: doc.icon,
      headings: headings.map(h => h.text),
      tags: extractTags(doc.content),
      order: doc.order || 0,
      parentId: doc.parent_id || null,
    };
    nodes.push(node);

    // Index by tags for relationship building
    for (const tag of node.tags) {
      if (!tagIndex.has(tag)) {
        tagIndex.set(tag, []);
      }
      tagIndex.get(tag).push(doc.id);
    }
  }

  // Build edges based on shared tags and explicit relationships
  for (const [tag, docIds] of tagIndex.entries()) {
    if (docIds.length > 1) {
      for (let i = 0; i < docIds.length; i++) {
        for (let j = i + 1; j < docIds.length; j++) {
          edges.push({
            source: docIds[i],
            target: docIds[j],
            relationship: 'related',
            via: tag,
          });
        }
      }
    }
  }

  // Add parent-child edges
  for (const node of nodes) {
    if (node.parentId) {
      edges.push({
        source: node.parentId,
        target: node.id,
        relationship: 'parent-child',
      });
    }
  }

  return { nodes, edges };
}

/**
 * Extract tags from content (from frontmatter-like syntax or explicit tags)
 */
function extractTags(content) {
  if (!content) return [];
  
  const tags = new Set();
  
  // Look for tags in content (e.g., #tag or [tag])
  const tagMatches = content.matchAll(/(?:^|\s)#(\w+)/g);
  for (const match of tagMatches) {
    tags.add(match[1].toLowerCase());
  }
  
  // Extract keywords from headings
  const headingMatches = content.matchAll(/^#{1,3}\s+(.+)$/gm);
  for (const match of headingMatches) {
    const words = match[1].toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        tags.add(word.replace(/[^a-z0-9]/g, ''));
      }
    }
  }
  
  return [...tags];
}

export default {
  parseContent,
  extractComponents,
  generateTOC,
  buildConceptGraph,
  ValidationError,
};
