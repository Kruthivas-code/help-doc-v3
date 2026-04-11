/**
 * MDX Validation - Build-time validation for documentation
 * Checks for broken links, heading hierarchy, component usage
 */

import { parseContent, ValidationError } from './parser';

/**
 * Validate a document and return all errors/warnings
 */
export function validateDocument(content, context = {}) {
  const { ast, errors, components, headings } = parseContent(content);
  const validationResult = {
    valid: true,
    errors: [...errors],
    warnings: [],
    info: {
      headingCount: headings.length,
      componentCount: components.length,
      wordCount: content ? content.split(/\s+/).length : 0,
    },
  };

  // Separate errors and warnings
  validationResult.errors = validationResult.errors.filter(e => e.severity === 'error');
  validationResult.warnings = errors.filter(e => e.severity === 'warning');

  // Check if document is valid (no errors)
  validationResult.valid = validationResult.errors.length === 0;

  // Additional validations if context is provided
  if (context.documents) {
    validateInternalLinks(content, context.documents, validationResult);
  }

  if (context.strictMode) {
    // In strict mode, warnings become errors
    validationResult.errors.push(...validationResult.warnings);
    validationResult.warnings = [];
    validationResult.valid = validationResult.errors.length === 0;
  }

  return validationResult;
}

/**
 * Validate internal links against known documents
 */
function validateInternalLinks(content, documents, result) {
  if (!content) return;

  const docSlugs = new Set(documents.map(d => d.slug));
  const docIds = new Set(documents.map(d => d.id));

  // Find all internal links
  const linkPattern = /\[([^\]]*)\]\(\/docs\/([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const linkTarget = match[2];
    const parts = linkTarget.split('/');
    const targetSlug = parts[parts.length - 1];

    if (!docSlugs.has(targetSlug) && !docIds.has(targetSlug)) {
      result.errors.push({
        type: ValidationError.BROKEN_LINK,
        message: `Internal link target not found: ${linkTarget}`,
        severity: 'error',
      });
      result.valid = false;
    }
  }
}

/**
 * Validate all documents in a project
 * Returns aggregated validation results
 */
export function validateProject(documents) {
  const results = {
    valid: true,
    totalErrors: 0,
    totalWarnings: 0,
    documents: [],
  };

  const context = { documents };

  for (const doc of documents) {
    const docResult = validateDocument(doc.content, context);
    results.documents.push({
      id: doc.id,
      title: doc.title,
      ...docResult,
    });

    if (!docResult.valid) {
      results.valid = false;
    }
    results.totalErrors += docResult.errors.length;
    results.totalWarnings += docResult.warnings.length;
  }

  return results;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors) {
  return errors.map(error => {
    const location = error.position 
      ? ` (line ${error.position.start.line})` 
      : '';
    return {
      ...error,
      formatted: `${error.severity.toUpperCase()}: ${error.message}${location}`,
    };
  });
}

/**
 * Check if content has validation errors
 * Quick check without full parsing
 */
export function hasErrors(content) {
  const { errors } = parseContent(content);
  return errors.some(e => e.severity === 'error');
}

/**
 * Validate component usage in content
 */
export function validateComponents(content) {
  const { components, errors } = parseContent(content);
  return {
    components,
    errors: errors.filter(e => 
      e.type === ValidationError.UNKNOWN_COMPONENT ||
      e.type === ValidationError.INVALID_PROPS ||
      e.type === ValidationError.MISSING_REQUIRED_PROP
    ),
  };
}

export default {
  validateDocument,
  validateProject,
  formatValidationErrors,
  hasErrors,
  validateComponents,
};
