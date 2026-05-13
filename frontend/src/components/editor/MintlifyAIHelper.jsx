/**
 * MintlifyAIHelper - AI-powered Mintlify to Platform format converter
 * Shows section-wise suggestions for converting Mintlify markdown syntax
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, Check, X, ChevronDown, ChevronUp, Loader2, 
  RefreshCw, Wand2, AlertCircle, CheckCircle, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Mintlify-specific patterns to detect
const MINTLIFY_PATTERNS = [
  // Callouts
  { pattern: /<Note>/gi, name: 'Note Callout', replacement: '> [!NOTE]' },
  { pattern: /<Warning>/gi, name: 'Warning Callout', replacement: '> [!WARNING]' },
  { pattern: /<Info>/gi, name: 'Info Callout', replacement: '> [!INFO]' },
  { pattern: /<Tip>/gi, name: 'Tip Callout', replacement: '> [!TIP]' },
  { pattern: /<Check>/gi, name: 'Success Callout', replacement: '> [!SUCCESS]' },
  
  // Accordion components - all variants
  { pattern: /<AccordionGroup>/gi, name: 'Accordion Group', replacement: '<AccordionGroup>' },
  { pattern: /<\/AccordionGroup>/gi, name: 'Accordion Group Close', replacement: '</AccordionGroup>' },
  { pattern: /<Accordion\s+title=/gi, name: 'Accordion with Title', replacement: '<Accordion title=' },
  { pattern: /<Accordion\s+icon=/gi, name: 'Accordion with Icon', replacement: '<Accordion icon=' },
  { pattern: /<\/Accordion>/gi, name: 'Accordion Close', replacement: '</Accordion>' },
  { pattern: /<Expandable/gi, name: 'Expandable', replacement: '<Accordion>' },
  { pattern: /<\/Expandable>/gi, name: 'Expandable Close', replacement: '</Accordion>' },
  
  // CardGroup with columns - Mintlify uses cols attribute
  { pattern: /<CardGroup\s+cols=/gi, name: 'CardGroup with Columns', replacement: '<Columns cols=' },
  { pattern: /<CardGroup>/gi, name: 'CardGroup', replacement: '<CardGroup>' },
  { pattern: /<\/CardGroup>/gi, name: 'CardGroup Close', replacement: '</CardGroup>' },
  
  // Frame and containers
  { pattern: /<Frame[^>]*>/gi, name: 'Frame Component', replacement: '' },
  { pattern: /<\/Frame>/gi, name: 'Frame Close', replacement: '' },
  { pattern: /<Snippet[^>]*>/gi, name: 'Snippet Reference', replacement: '' },
  
  // API Fields
  { pattern: /<ResponseField/gi, name: 'Response Field', replacement: '**' },
  { pattern: /<ParamField/gi, name: 'Param Field', replacement: '**' },
  
  // Images - detect img tags for replacement
  { pattern: /<img\s+[^>]*src=/gi, name: 'Image Tag', replacement: '![image]' },
  { pattern: /!\[[^\]]*\]\([^)]+\)/gi, name: 'Markdown Image', replacement: '![image](url)' },
];

// Detect which Mintlify patterns exist in content
const detectMintlifyPatterns = (content) => {
  const detected = [];
  
  MINTLIFY_PATTERNS.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
      detected.push({ name, count: matches.length });
    }
  });
  
  // Check for frontmatter with Mintlify-specific fields
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    if (frontmatter.includes('sidebarTitle:') || frontmatter.includes('openapi:') || frontmatter.includes('api:')) {
      detected.push({ name: 'Mintlify Frontmatter', count: 1 });
    }
  }
  
  return detected;
};

// Split content into sections based on H2 headers
const splitIntoSections = (content) => {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = { title: 'Introduction', startLine: 0, content: [] };
  
  lines.forEach((line, index) => {
    if (line.startsWith('## ')) {
      if (currentSection.content.length > 0) {
        sections.push({
          ...currentSection,
          endLine: index - 1,
          content: currentSection.content.join('\n')
        });
      }
      currentSection = {
        title: line.replace('## ', ''),
        startLine: index,
        content: [line]
      };
    } else {
      currentSection.content.push(line);
    }
  });
  
  // Push the last section
  if (currentSection.content.length > 0) {
    sections.push({
      ...currentSection,
      endLine: lines.length - 1,
      content: currentSection.content.join('\n')
    });
  }
  
  return sections;
};

// Section Suggestion Card
const SectionSuggestion = ({ 
  section, 
  suggestion, 
  isLoading, 
  onAccept, 
  onReject,
  isExpanded,
  onToggleExpand
}) => {
  const hasSuggestion = suggestion && suggestion !== section.content;
  
  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      hasSuggestion 
        ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5' 
        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30'
    }`}>
      {/* Header */}
      <button 
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
          ) : hasSuggestion ? (
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-brand" />
          )}
          <span className="font-medium text-zinc-950 dark:text-white text-sm">{section.title}</span>
          {hasSuggestion && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-transparent">
              Suggestions available
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          {hasSuggestion ? (
            <div className="p-4 space-y-4">
              {/* Before/After Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="eyebrow text-zinc-500 mb-2 flex items-center gap-2">
                    <span>Original (Mintlify)</span>
                  </div>
                  <pre className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                    {section.content.slice(0, 500)}{section.content.length > 500 ? '...' : ''}
                  </pre>
                </div>
                <div>
                  <div className="eyebrow text-brand mb-2 flex items-center gap-2">
                    <span>Suggested (Platform Format)</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                  <pre className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-brand-600 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                    {suggestion.slice(0, 500)}{suggestion.length > 500 ? '...' : ''}
                  </pre>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => onReject(section)}
                  className="btn-press flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => onAccept(section, suggestion)}
                  className="btn-press flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand text-white rounded-md font-bold hover:opacity-90 transition-opacity"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                This section is already in the correct format.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Component
export const MintlifyAIHelper = ({ content, onChange, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedPatterns, setDetectedPatterns] = useState([]);
  const [sections, setSections] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [loadingSections, setLoadingSections] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [error, setError] = useState(null);

  // Analyze content when opened
  const analyzeContent = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Detect Mintlify patterns
      const patterns = detectMintlifyPatterns(content);
      setDetectedPatterns(patterns);
      
      // Split into sections
      const contentSections = splitIntoSections(content);
      setSections(contentSections);
      
      // Initialize expanded state (expand first section with issues)
      const initialExpanded = {};
      contentSections.forEach((s, i) => {
        initialExpanded[i] = i === 0;
      });
      setExpandedSections(initialExpanded);
      
      // Get AI suggestions for each section that might need conversion
      for (let i = 0; i < contentSections.length; i++) {
        const section = contentSections[i];
        const hasMintlifyPattern = MINTLIFY_PATTERNS.some(p => p.pattern.test(section.content));
        
        if (hasMintlifyPattern) {
          setLoadingSections(prev => ({ ...prev, [i]: true }));
          
          try {
            const response = await axios.post(`${API}/api/mintlify/convert`, {
              content: section.content,
              section_title: section.title
            });
            
            if (response.data.converted) {
              setSuggestions(prev => ({ ...prev, [i]: response.data.converted }));
            }
          } catch (err) {
            console.error('Error converting section:', err);
          }
          
          setLoadingSections(prev => ({ ...prev, [i]: false }));
        }
      }
    } catch (err) {
      setError('Failed to analyze content');
      console.error(err);
    }
    
    setIsAnalyzing(false);
  }, [content]);

  // Accept a suggestion
  const handleAccept = (section, suggestion) => {
    const lines = content.split('\n');
    const newLines = [
      ...lines.slice(0, section.startLine),
      ...suggestion.split('\n'),
      ...lines.slice(section.endLine + 1)
    ];
    onChange(newLines.join('\n'));
    
    // Remove the suggestion
    const sectionIndex = sections.findIndex(s => s.startLine === section.startLine);
    setSuggestions(prev => {
      const next = { ...prev };
      delete next[sectionIndex];
      return next;
    });
  };

  // Reject a suggestion
  const handleReject = (section) => {
    const sectionIndex = sections.findIndex(s => s.startLine === section.startLine);
    setSuggestions(prev => {
      const next = { ...prev };
      delete next[sectionIndex];
      return next;
    });
  };

  // Accept all suggestions
  const handleAcceptAll = () => {
    let newContent = content;
    
    // Apply suggestions in reverse order to maintain line numbers
    const sortedSections = Object.entries(suggestions)
      .map(([index, suggestion]) => ({ index: parseInt(index), suggestion }))
      .sort((a, b) => b.index - a.index);
    
    sortedSections.forEach(({ index, suggestion }) => {
      const section = sections[index];
      if (section) {
        const lines = newContent.split('\n');
        const newLines = [
          ...lines.slice(0, section.startLine),
          ...suggestion.split('\n'),
          ...lines.slice(section.endLine + 1)
        ];
        newContent = newLines.join('\n');
      }
    });
    
    onChange(newContent);
    setSuggestions({});
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const suggestionCount = Object.keys(suggestions).length;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && sections.length === 0) {
            analyzeContent();
          }
        }}
        className={`btn-press flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
          isOpen 
            ? 'bg-amber-500 text-white' 
            : 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-200 dark:hover:bg-amber-500/25'
        }`}
        data-testid="mintlify-helper-toggle"
      >
        <Wand2 className="w-4 h-4" />
        <span>Mintlify Helper</span>
        {suggestionCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">{suggestionCount}</span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[600px] max-h-[70vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-zinc-950 dark:text-white">Mintlify Format Converter</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={analyzeContent}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white rounded-md transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Re-analyze</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Detected Patterns Summary */}
          {detectedPatterns.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Mintlify Syntax Detected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {detectedPatterns.map((p, i) => (
                  <span key={i} className="px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-transparent">
                    {p.name} ({p.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[50vh]">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Analyzing content for Mintlify patterns...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-rose-600 dark:text-rose-400">{error}</p>
                <button
                  onClick={analyzeContent}
                  className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"
                >
                  Try again
                </button>
              </div>
            ) : sections.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-brand mx-auto mb-3" />
                <p className="text-zinc-950 dark:text-white font-medium">Content looks good!</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  No Mintlify-specific syntax detected that needs conversion.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {sections.map((section, index) => (
                  <SectionSuggestion
                    key={index}
                    section={section}
                    suggestion={suggestions[index]}
                    isLoading={loadingSections[index]}
                    isExpanded={expandedSections[index]}
                    onToggleExpand={() => toggleSection(index)}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {suggestionCount > 0 && (
            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                {suggestionCount} suggestion{suggestionCount !== 1 ? 's' : ''} available
              </span>
              <button
                onClick={handleAcceptAll}
                className="btn-press flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-md hover:opacity-90 transition-opacity"
              >
                <Check className="w-4 h-4" />
                <span>Accept All</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MintlifyAIHelper;
