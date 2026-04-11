/**
 * Client-side Search using FlexSearch
 * Provides instant, full-text search across documentation
 */

import FlexSearch from 'flexsearch';

// Create search index
let documentIndex = null;
let headingIndex = null;
let searchData = new Map();

/**
 * Initialize the search index with documents
 */
export function initializeSearch(documents) {
  // Create document index with enhanced options
  documentIndex = new FlexSearch.Document({
    document: {
      id: 'id',
      index: ['title', 'content', 'headings'],
      store: ['title', 'slug', 'icon', 'projectId'],
    },
    tokenize: 'forward',
    resolution: 9,
    cache: true,
  });

  // Create heading index for section-level search
  headingIndex = new FlexSearch.Document({
    document: {
      id: 'id',
      index: ['text'],
      store: ['text', 'docId', 'docTitle', 'slug', 'level'],
    },
    tokenize: 'forward',
    resolution: 9,
  });

  // Clear existing data
  searchData.clear();

  // Index each document
  for (const doc of documents) {
    // Extract headings from content
    const headings = extractHeadings(doc.content);
    const headingTexts = headings.map(h => h.text).join(' ');

    // Add to document index
    documentIndex.add({
      id: doc.id,
      title: doc.title,
      content: stripMarkdown(doc.content || ''),
      headings: headingTexts,
      slug: doc.slug,
      icon: doc.icon,
      projectId: doc.project_id,
    });

    // Store full data for results
    searchData.set(doc.id, {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      icon: doc.icon,
      projectId: doc.project_id,
      headings,
    });

    // Index each heading separately
    headings.forEach((heading, index) => {
      headingIndex.add({
        id: `${doc.id}-h-${index}`,
        text: heading.text,
        docId: doc.id,
        docTitle: doc.title,
        slug: doc.slug,
        level: heading.level,
      });
    });
  }
}

/**
 * Search documents and headings
 * Returns ranked results with context
 */
export function search(query, options = {}) {
  if (!query || query.length < 2) return { documents: [], headings: [] };
  if (!documentIndex) return { documents: [], headings: [] };

  const { limit = 10, projectId = null } = options;

  // Search documents
  const docResults = documentIndex.search(query, {
    limit: limit * 2,
    enrich: true,
  });

  // Search headings
  const headingResults = headingIndex.search(query, {
    limit: limit * 3,
    enrich: true,
  });

  // Process document results
  const documents = [];
  const seenDocs = new Set();

  for (const field of docResults) {
    for (const result of field.result) {
      if (seenDocs.has(result.id)) continue;
      
      const docData = searchData.get(result.id);
      if (!docData) continue;
      
      // Filter by project if specified
      if (projectId && docData.projectId !== projectId) continue;
      
      seenDocs.add(result.id);
      documents.push({
        id: result.id,
        title: docData.title,
        slug: docData.slug,
        icon: docData.icon,
        snippet: getSnippet(result.doc?.content || '', query),
        score: calculateScore(result, query),
      });
    }
  }

  // Process heading results
  const headings = [];
  const seenHeadings = new Set();

  for (const field of headingResults) {
    for (const result of field.result) {
      if (seenHeadings.has(result.id)) continue;
      
      const doc = result.doc;
      if (!doc) continue;
      
      // Filter by project if specified
      const docData = searchData.get(doc.docId);
      if (projectId && docData?.projectId !== projectId) continue;
      
      seenHeadings.add(result.id);
      headings.push({
        id: result.id,
        text: doc.text,
        docId: doc.docId,
        docTitle: doc.docTitle,
        slug: doc.slug,
        level: doc.level,
        anchor: doc.text.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
    }
  }

  // Sort by relevance score
  documents.sort((a, b) => b.score - a.score);

  return {
    documents: documents.slice(0, limit),
    headings: headings.slice(0, limit),
    total: documents.length + headings.length,
  };
}

/**
 * Get search suggestions (autocomplete)
 */
export function getSuggestions(query, limit = 5) {
  if (!query || query.length < 2) return [];
  if (!documentIndex) return [];

  const results = documentIndex.search(query, {
    limit,
    suggest: true,
  });

  const suggestions = new Set();
  
  for (const field of results) {
    for (const result of field.result) {
      const doc = searchData.get(result);
      if (doc) {
        suggestions.add(doc.title);
      }
    }
  }

  return [...suggestions].slice(0, limit);
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(content) {
  if (!content) return [];
  
  const headings = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = regex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  return headings;
}

/**
 * Strip markdown syntax for indexing
 */
function stripMarkdown(content) {
  return content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove headings symbols
    .replace(/^#+\s+/gm, '')
    // Remove bold/italic
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get snippet with highlighted query terms
 */
function getSnippet(content, query, maxLength = 150) {
  if (!content) return '';
  
  const stripped = stripMarkdown(content);
  const queryLower = query.toLowerCase();
  const index = stripped.toLowerCase().indexOf(queryLower);
  
  if (index === -1) {
    return stripped.slice(0, maxLength) + (stripped.length > maxLength ? '...' : '');
  }
  
  const start = Math.max(0, index - 50);
  const end = Math.min(stripped.length, index + query.length + 100);
  
  let snippet = stripped.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < stripped.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Calculate relevance score for sorting
 */
function calculateScore(result, query) {
  let score = 1;
  
  // Title match is most important
  if (result.doc?.title?.toLowerCase().includes(query.toLowerCase())) {
    score += 10;
  }
  
  // Exact match bonus
  if (result.doc?.title?.toLowerCase() === query.toLowerCase()) {
    score += 5;
  }
  
  return score;
}

/**
 * Clear the search index
 */
export function clearSearch() {
  documentIndex = null;
  headingIndex = null;
  searchData.clear();
}

export default {
  initializeSearch,
  search,
  getSuggestions,
  clearSearch,
};
