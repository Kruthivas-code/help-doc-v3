/**
 * SearchDialog - Full-text search component
 * Uses FlexSearch for instant client-side search
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Hash, X, ArrowRight, Command } from 'lucide-react';
import { search, initializeSearch, getSuggestions } from '@/lib/search';
import { getIcon } from './IconPicker';

/**
 * SearchDialog - Modal search interface
 */
export const SearchDialog = ({ 
  isOpen, 
  onClose, 
  documents,
  onNavigate,
  projectId 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ documents: [], headings: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  
  // Initialize search index when documents change
  useEffect(() => {
    if (documents?.length > 0) {
      initializeSearch(documents);
    }
  }, [documents]);
  
  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults({ documents: [], headings: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);
  
  // Perform search
  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = search(query, { projectId, limit: 8 });
      setResults(searchResults);
      setSelectedIndex(0);
    } else {
      setResults({ documents: [], headings: [] });
    }
  }, [query, projectId]);
  
  // Select a result and navigate
  const selectResult = useCallback((index) => {
    const docs = results.documents;
    const headings = results.headings;
    
    if (index < docs.length) {
      const doc = docs[index];
      onNavigate(doc.slug, null);
    } else {
      const heading = headings[index - docs.length];
      onNavigate(heading.slug, heading.anchor);
    }
    
    onClose();
  }, [results, onNavigate, onClose]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    const totalResults = results.documents.length + results.headings.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalResults);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
        break;
      case 'Enter':
        e.preventDefault();
        if (totalResults > 0) {
          selectResult(selectedIndex);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose, selectResult]);
  
  if (!isOpen) return null;
  
  const totalResults = results.documents.length + results.headings.length;
  const hasResults = totalResults > 0;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      data-testid="search-dialog"
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documentation..."
            className="flex-1 bg-transparent text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none text-base"
            data-testid="search-input"
          />
          <button 
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p>Type at least 2 characters to search</p>
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Document Results */}
              {results.documents.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pages</span>
                  </div>
                  {results.documents.map((doc, i) => {
                    const IconComponent = doc.icon ? getIcon(doc.icon) : FileText;
                    const isSelected = selectedIndex === i;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => selectResult(i)}
                        className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                          isSelected ? 'bg-brand/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                        data-testid={`search-result-${doc.id}`}
                      >
                        <div className={`mt-0.5 ${isSelected ? 'text-brand' : 'text-zinc-500'}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {doc.title}
                          </p>
                          {doc.snippet && (
                            <p className="text-sm text-zinc-500 truncate mt-0.5">
                              {doc.snippet}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="w-4 h-4 text-brand mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Heading Results */}
              {results.headings.length > 0 && (
                <div>
                  <div className="px-4 py-1 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sections</span>
                  </div>
                  {results.headings.map((heading, i) => {
                    const index = results.documents.length + i;
                    const isSelected = selectedIndex === index;
                    return (
                      <button
                        key={heading.id}
                        onClick={() => selectResult(index)}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                          isSelected ? 'bg-brand/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <Hash className={`w-4 h-4 ${isSelected ? 'text-brand' : 'text-zinc-400 dark:text-zinc-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                            {heading.text}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-600 truncate">
                            in {heading.docTitle}
                          </p>
                        </div>
                        {isSelected && (
                          <ArrowRight className="w-4 h-4 text-brand" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↵</kbd>
              <span className="ml-1">Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">esc</kbd>
              <span className="ml-1">Close</span>
            </span>
          </div>
          {hasResults && (
            <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * SearchTrigger - Button to open search dialog
 */
export const SearchTrigger = ({ onClick, className = '' }) => {
  // Listen for Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors ${className}`}
      data-testid="search-trigger"
    >
      <Search className="w-4 h-4" />
      <span className="text-sm">Search</span>
      <kbd className="hidden sm:flex items-center gap-0.5 ml-2 px-1.5 py-0.5 bg-white dark:bg-zinc-900 rounded text-xs text-zinc-500">
        <Command className="w-3 h-3" />
        <span>K</span>
      </kbd>
    </button>
  );
};

export default SearchDialog;
