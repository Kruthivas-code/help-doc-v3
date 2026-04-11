/**
 * PublicDocs - Emergent Documentation Site
 * Layout matching Mintlify/Emergent reference:
 * - Top Navigation: Logo + Section Tabs + Support + CTA
 * - Left Sidebar: Search + Pages within selected tab + Theme toggle at bottom
 * - Main Content: Breadcrumb + Title + Copy button + Content
 * - Right Sidebar: In-page TOC (anchors)
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { 
  Search, Menu, X, ChevronRight, ChevronDown,
  ExternalLink, FileText, Book, Copy, Check,
  ArrowLeft, ArrowRight, Sparkles
} from 'lucide-react';
import { DocContent } from '@/components/docs/DocContent';
import { getIcon } from '@/components/docs/IconPicker';
import { search, initializeSearch } from '@/lib/search';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Theme configurations
const THEMES = {
  dark: {
    bg: 'bg-[#0a0a0a]',
    navBg: 'bg-[#0a0a0a]',
    sidebarBg: 'bg-[#0a0a0a]',
    text: 'text-white',
    textMuted: 'text-slate-400',
    textSecondary: 'text-slate-500',
    border: 'border-white/10',
    hover: 'hover:bg-white/5',
    activeBg: 'bg-white/10',
    activeText: 'text-white',
    inputBg: 'bg-white/5 border border-white/10'
  },
  light: {
    bg: 'bg-white',
    navBg: 'bg-white',
    sidebarBg: 'bg-slate-50',
    text: 'text-slate-900',
    textMuted: 'text-slate-600',
    textSecondary: 'text-slate-500',
    border: 'border-slate-200',
    hover: 'hover:bg-slate-100',
    activeBg: 'bg-slate-100',
    activeText: 'text-slate-900',
    inputBg: 'bg-white border border-slate-200'
  }
};

// ============= TOP NAVIGATION =============
const TopNavigation = ({ 
  config, 
  project, 
  theme,
  darkMode,
  mobileMenuOpen,
  onMobileMenuToggle
}) => {
  const navbar = config?.navbar || {};
  const links = navbar.links || [{ label: 'Support', href: '#' }];
  const primaryCta = navbar.primary || { label: 'Try Emergent', href: '#' };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${theme.navBg} border-b ${theme.border}`}>
      <div className="h-14 px-4 sm:px-6 flex items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-4 lg:mr-8" data-testid="logo-link">
          {config?.logo_dark_url ? (
            <img 
              src={darkMode ? config.logo_dark_url : (config.logo_light_url || config.logo_dark_url)} 
              alt={project?.name} 
              className="h-6"
            />
          ) : (
            <span className={`font-semibold text-lg ${theme.text}`}>
              {config?.site_title || project?.name || 'emergent'}
            </span>
          )}
        </Link>

        {/* Right: Support Link + CTA Button + Mobile Menu */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              className={`hidden sm:block text-sm font-medium ${theme.textMuted} hover:${theme.text} transition-colors`}
            >
              {link.label}
            </a>
          ))}
          
          <a
            href={primaryCta.href}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#188455] hover:bg-[#157149] text-white text-sm font-medium rounded-lg transition-colors"
            data-testid="cta-button"
          >
            <span className="hidden sm:inline">{primaryCta.label}</span>
            <span className="sm:hidden">Build Now</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* Mobile Menu Button - visible on small screens */}
          <button
            className={`lg:hidden p-2 rounded-lg ${theme.hover} ${theme.text} transition-colors`}
            onClick={onMobileMenuToggle}
            aria-label="Toggle navigation menu"
            data-testid="mobile-nav-toggle"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};

// ============= LEFT SIDEBAR =============
const LeftSidebar = ({ 
  tabs,
  documents,
  selectedDocSlug,
  onDocSelect,
  theme,
  darkMode,
  onSearchOpen,
  mobileOpen,
  onMobileClose
}) => {
  // Track which groups are collapsed
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onMobileClose}
        />
      )}
      
      <aside className={`
        fixed top-14 bottom-0 left-0 z-40
        w-72 lg:w-64 ${theme.sidebarBg} border-r ${theme.border}
        transform transition-transform duration-300 lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Search */}
        <div className="p-4">
          <button
            onClick={onSearchOpen}
            className={`w-full flex items-center gap-3 px-3 py-2.5 ${theme.inputBg} rounded-lg text-sm ${theme.textMuted} transition-colors`}
            data-testid="sidebar-search"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className={`px-1.5 py-0.5 text-xs rounded ${darkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>⌘K</kbd>
          </button>
        </div>

        {/* All Tabs as Sections */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {tabs.map((tab, tabIndex) => {
            const groups = tab.groups || [];

            return (
              <div key={tab.id} className="mb-6">
                {/* Tab/Section Title - Simple Text, No Collapse */}
                <h2 className={`px-3 py-2 text-sm font-bold ${theme.text} tracking-wide text-left`}>
                  {tab.label}
                </h2>

                {/* Groups within this tab/section */}
                {groups.map((group, groupIndex) => {
                  const groupId = `${tab.id}-${groupIndex}`;
                  const isCollapsed = collapsedGroups[groupId];
                  const hasPages = group.pages && group.pages.length > 0;

                  return (
                    <div key={groupIndex} className="mt-2">
                      {/* Group Header - Collapsible if it has a name */}
                      {group.group && (
                        <button
                          onClick={() => toggleGroup(groupId)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${theme.textMuted} hover:${theme.text}`}
                          data-testid={`group-${groupId}`}
                        >
                          <span className="uppercase tracking-wider">{group.group}</span>
                          {hasPages && (
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                          )}
                        </button>
                      )}
                      
                      {/* Group Pages */}
                      {!isCollapsed && hasPages && (
                        <div className="space-y-0.5 mt-1">
                          {group.pages.map((page, pageIndex) => {
                            const pageSlug = typeof page === 'string' ? page : page.page;
                            // Case-insensitive document lookup
                            const matchingDoc = documents.find(d => d.slug?.toLowerCase() === pageSlug?.toLowerCase());
                            const pageTitle = typeof page === 'string' 
                              ? matchingDoc?.title || page
                              : page.title || page.page;
                            const isActive = pageSlug?.toLowerCase() === selectedDocSlug?.toLowerCase();
                            const isMissing = !matchingDoc;

                            return (
                              <button
                                key={pageIndex}
                                onClick={() => !isMissing && onDocSelect(pageSlug)}
                                disabled={isMissing}
                                className={`
                                  w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all text-left
                                  ${isActive 
                                    ? 'bg-[#188455]/10 text-[#188455] border-l-2 border-[#188455] font-medium' 
                                    : isMissing
                                      ? 'text-slate-600 cursor-not-allowed opacity-50'
                                      : `${theme.textMuted} ${theme.hover}`
                                  }
                                `}
                                data-testid={`page-${pageSlug}`}
                              >
                                <span className="truncate flex-1">{pageTitle}</span>
                                {isMissing && <span className="text-xs text-red-500 ml-2">(missing)</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Nested Groups */}
                      {!isCollapsed && group.groups?.map((nestedGroup, nestedIndex) => {
                        const nestedGroupId = `${groupId}-${nestedIndex}`;
                        const isNestedCollapsed = collapsedGroups[nestedGroupId];
                        const hasNestedPages = nestedGroup.pages && nestedGroup.pages.length > 0;

                        return (
                          <div key={nestedIndex} className="mt-2 ml-4">
                            {/* Nested Group Header */}
                            {nestedGroup.group && (
                              <button
                                onClick={() => toggleGroup(nestedGroupId)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${theme.textMuted} hover:${theme.text}`}
                              >
                                <span>{nestedGroup.group}</span>
                                {hasNestedPages && (
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isNestedCollapsed ? '-rotate-90' : ''}`} />
                                )}
                              </button>
                            )}
                            
                            {/* Nested Group Pages */}
                            {!isNestedCollapsed && hasNestedPages && (
                              <div className="space-y-0.5 mt-1">
                                {nestedGroup.pages.map((page, pageIndex) => {
                                  const pageSlug = typeof page === 'string' ? page : page.page;
                                  const matchingDoc = documents.find(d => d.slug?.toLowerCase() === pageSlug?.toLowerCase());
                                  const pageTitle = typeof page === 'string' 
                                    ? matchingDoc?.title || page
                                    : page.title || page.page;
                                  const isActive = pageSlug?.toLowerCase() === selectedDocSlug?.toLowerCase();
                                  const isMissing = !matchingDoc;

                                  return (
                                    <button
                                      key={pageIndex}
                                      onClick={() => !isMissing && onDocSelect(pageSlug)}
                                      disabled={isMissing}
                                      className={`
                                        w-full flex items-center px-3 py-1.5 rounded-lg text-xs transition-all text-left
                                        ${isActive 
                                          ? 'bg-[#188455]/10 text-[#188455] border-l-2 border-[#188455] font-medium' 
                                          : isMissing
                                            ? 'text-slate-600 cursor-not-allowed opacity-50'
                                            : `${theme.textMuted} ${theme.hover}`
                                        }
                                      `}
                                    >
                                      <span className="truncate flex-1">{pageTitle}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

// ============= RIGHT SIDEBAR (TOC) =============
const RightSidebar = ({ headings, theme }) => {
  const [activeId, setActiveId] = useState('');
  const [validHeadings, setValidHeadings] = useState([]);

  // Filter to only headings that actually exist in the DOM
  useEffect(() => {
    const existingHeadings = headings.filter(heading => {
      const el = document.getElementById(heading.id);
      return el !== null;
    });
    setValidHeadings(existingHeadings);
  }, [headings]);

  useEffect(() => {
    if (validHeadings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    validHeadings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [validHeadings]);

  if (validHeadings.length === 0) return null;

  return (
    <aside className="hidden xl:block fixed top-14 right-0 bottom-0 w-56 overflow-y-auto z-10 border-l border-slate-800/50">
      <div className="p-4">
        <h4 className={`text-xs font-semibold ${theme.text} mb-3 uppercase tracking-wider`}>
          On this page
        </h4>
        <nav className="space-y-0.5">
          {validHeadings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={`block py-1 text-[13px] leading-snug transition-colors break-words ${
                activeId === heading.id
                  ? `${theme.text} font-medium`
                  : `${theme.textMuted} hover:${theme.text}`
              }`}
              style={{ paddingLeft: `${(heading.level - 2) * 8}px` }}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
};

// ============= SEARCH DIALOG =============
const SearchDialog = ({ open, onClose, documents, onSelect, theme, darkMode, config }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ documents: [], headings: [] });
  const inputRef = useRef(null);

  // Get navigation config for breadcrumbs
  const tabs = config?.navigation?.tabs || [];

  // Helper to find breadcrumb path for a document slug
  const getBreadcrumb = (slug) => {
    for (const tab of tabs) {
      for (const group of (tab.groups || [])) {
        const pages = group.pages || [];
        for (const page of pages) {
          const pageSlug = typeof page === 'string' ? page : page.page;
          if (pageSlug?.toLowerCase() === slug?.toLowerCase()) {
            return `${tab.label} > ${group.group}`;
          }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ documents: [], headings: [] });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = search(query);
      setResults(searchResults);
    } else {
      setResults({ documents: [], headings: [] });
    }
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) onClose();
      }
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const hasResults = results.documents?.length > 0 || results.headings?.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-2xl mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden`}>
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="flex-1 bg-transparent text-white text-lg placeholder:text-slate-500 outline-none"
            data-testid="search-input"
          />
          <kbd className="px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded border border-slate-700">ESC</kbd>
        </div>
        
        {/* Results */}
        <div className="max-h-[60vh] overflow-auto">
          {hasResults ? (
            <div className="p-2">
              {/* Document Results */}
              {results.documents?.map((result, i) => {
                const breadcrumb = getBreadcrumb(result.slug);
                return (
                  <button
                    key={`doc-${i}`}
                    onClick={() => { onSelect(result.slug); onClose(); }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors group"
                  >
                    {breadcrumb && (
                      <div className="text-xs text-slate-500 mb-1">{breadcrumb}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">#</span>
                      <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {result.title}
                      </span>
                    </div>
                    {result.snippet && (
                      <div className="text-sm text-slate-400 mt-1 line-clamp-2 pl-5">
                        {result.snippet}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Heading Results */}
              {results.headings?.map((result, i) => {
                const breadcrumb = getBreadcrumb(result.slug);
                return (
                  <button
                    key={`heading-${i}`}
                    onClick={() => { 
                      onSelect(result.slug); 
                      onClose();
                      // Scroll to heading after navigation
                      setTimeout(() => {
                        const el = document.getElementById(result.anchor);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 300);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors group"
                  >
                    {breadcrumb && (
                      <div className="text-xs text-slate-500 mb-1">{breadcrumb} {' > '} {result.docTitle}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">{'#'.repeat(result.level || 1)}</span>
                      <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {result.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="px-4 py-12 text-center">
              <div className="text-slate-400 mb-2">No results found for "{query}"</div>
              <div className="text-sm text-slate-500">Try different keywords or check your spelling</div>
            </div>
          ) : (
            <div className="px-4 py-12 text-center">
              <div className="text-slate-400 mb-2">Search documentation</div>
              <div className="text-sm text-slate-500">Type at least 2 characters to search</div>
            </div>
          )}
        </div>

        {/* Footer with AI option */}
        {query.length >= 2 && (
          <div className="border-t border-slate-700 px-4 py-3">
            <button 
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
              onClick={() => {/* TODO: AI assistant */}}
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI assistant about "{query}"</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= COPY BUTTON =============
const CopyButton = ({ text, theme }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-3 py-1.5 ${theme.inputBg} rounded-lg text-sm ${theme.textMuted} hover:${theme.text} transition-colors`}
      data-testid="copy-page-btn"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      <span>{copied ? 'Copied!' : 'Copy page'}</span>
      <ChevronDown className="w-3 h-3" />
    </button>
  );
};

// ============= MAIN COMPONENT =============
const PublicDocs = () => {
  const { docSlug } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [config, setConfig] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toc, setToc] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [darkMode] = useState(true); // Dark mode only - light mode disabled
  const [isNavigating, setIsNavigating] = useState(false); // Prevent flicker during navigation

  const theme = darkMode ? THEMES.dark : THEMES.light;

  // Build tabs from config navigation - support both old and new formats
  // If no navigation config, auto-generate from documents
  const tabs = useMemo(() => {
    const rawTabs = config?.navigation?.tabs || [];
    const autoGroups = documents.length > 0 ? [{
      group: 'Documentation',
      pages: documents.map(d => ({ page: d.slug, title: d.title }))
    }] : [];
    
    return rawTabs.length > 0 
      ? rawTabs.map(t => ({
          id: t.id || t.tab || t.label,
          label: t.label || t.tab || t.id,
          icon: t.icon,
          groups: t.groups || []
        }))
      : [{ 
          id: 'docs', 
          label: 'Documentation', 
          groups: config?.navigation?.groups?.length > 0 
            ? config.navigation.groups 
            : autoGroups 
        }];
  }, [config?.navigation, documents]);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Fetch data
  const fetchPublicData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/public/default-project`, { withCredentials: false });
      setProject(res.data.project);
      setConfig(res.data.config);
      setDocuments(res.data.documents);
      
      // Set initial active tab
      const navTabs = res.data.config?.navigation?.tabs;
      if (navTabs?.length > 0) {
        setActiveTab(navTabs[0].id);
      }
      
      if (res.data.documents.length > 0) {
        initializeSearch(res.data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  // Apply favicon
  useEffect(() => {
    if (config?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = config.favicon_url;
    }
  }, [config?.favicon_url]);

  // Helper to get first document from navigation config
  const getFirstNavDocument = useCallback(() => {
    if (!tabs || tabs.length === 0) return null;
    for (const tab of tabs) {
      for (const group of (tab.groups || [])) {
        for (const page of (group.pages || [])) {
          const slug = typeof page === 'string' ? page : page.page;
          const doc = documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
          if (doc) return doc;
        }
      }
    }
    return null;
  }, [tabs, documents]);

  // Select document - only on initial load or when URL changes externally
  useEffect(() => {
    // Skip if we're in the middle of a programmatic navigation
    if (isNavigating) return;
    
    if (documents.length > 0 && !selectedDoc) {
      // Only set initial document if none is selected
      if (docSlug) {
        const doc = documents.find(d => d.slug?.toLowerCase() === docSlug?.toLowerCase());
        if (doc) {
          setSelectedDoc(doc);
        } else {
          const firstNavDoc = getFirstNavDocument();
          setSelectedDoc(firstNavDoc || documents[0]);
        }
      } else {
        const firstNavDoc = getFirstNavDocument();
        setSelectedDoc(firstNavDoc || documents[0]);
      }
    } else if (documents.length > 0 && docSlug && selectedDoc?.slug?.toLowerCase() !== docSlug?.toLowerCase()) {
      // URL changed externally (browser back/forward), sync the doc
      const doc = documents.find(d => d.slug?.toLowerCase() === docSlug?.toLowerCase());
      if (doc) {
        setSelectedDoc(doc);
      }
    }
  }, [documents, docSlug, selectedDoc, getFirstNavDocument, isNavigating]);

  // Handle tab change - navigate to first document in that tab
  const handleTabChange = useCallback((tabId) => {
    if (isNavigating) return;
    
    setActiveTab(tabId);
    
    // Find first document in the new tab
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.groups) {
      for (const group of tab.groups) {
        if (group.pages?.length > 0) {
          const firstPage = group.pages[0];
          const slug = typeof firstPage === 'string' ? firstPage : firstPage.page;
          // Case-insensitive slug matching
          const doc = documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
          if (doc && doc.id !== selectedDoc?.id) {
            setIsNavigating(true);
            setSelectedDoc(doc);
            requestAnimationFrame(() => {
              navigate(`/${doc.slug}`);
              setTimeout(() => setIsNavigating(false), 100);
            });
            return;
          }
        }
      }
    }
  }, [tabs, documents, navigate, selectedDoc, isNavigating]);

  const handleDocSelect = useCallback((slug) => {
    // Prevent multiple rapid navigations
    if (isNavigating) return;
    
    // Case-insensitive slug matching
    const doc = documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
    if (doc && doc.id !== selectedDoc?.id) {
      setIsNavigating(true);
      // Set doc first, then navigate - use requestAnimationFrame for smoother transition
      setSelectedDoc(doc);
      requestAnimationFrame(() => {
        navigate(`/${slug}`, { replace: false });
        // Reset navigation lock after a short delay
        setTimeout(() => setIsNavigating(false), 100);
      });
    }
  }, [documents, navigate, selectedDoc, isNavigating]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Find current tab based on selected doc
  useEffect(() => {
    if (selectedDoc && tabs.length > 0) {
      for (const tab of tabs) {
        const found = tab.groups?.some(g => 
          g.pages?.some(p => (typeof p === 'string' ? p : p.page) === selectedDoc.slug)
        );
        if (found) {
          setActiveTab(tab.id);
          break;
        }
      }
    }
  }, [selectedDoc, tabs]);

  // Get breadcrumb
  const getBreadcrumb = () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    if (!currentTab) return null;
    
    for (const group of currentTab.groups || []) {
      const page = group.pages?.find(p => 
        (typeof p === 'string' ? p : p.page) === selectedDoc?.slug
      );
      if (page) {
        return group.group;
      }
    }
    return currentTab.label;
  };

  // Prev/Next navigation
  const currentIndex = documents.findIndex(d => d.id === selectedDoc?.id);
  const prevDoc = currentIndex > 0 ? documents[currentIndex - 1] : null;
  const nextDoc = currentIndex < documents.length - 1 ? documents[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div className="animate-spin w-8 h-8 border-2 border-[#188455] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Prepare SEO data
  const pageTitle = selectedDoc 
    ? `${selectedDoc.title} | ${config?.site_title || project?.name || 'Documentation'}`
    : config?.site_title || project?.name || 'Documentation';
  
  const pageDescription = selectedDoc
    ? selectedDoc.content?.substring(0, 160).replace(/[#*>`]/g, '').trim() || config?.site_description
    : config?.site_description || 'Documentation and guides';
  
  const pageUrl = `${window.location.origin}${selectedDoc ? `/${selectedDoc.slug}` : ''}`;
  const siteTitle = config?.site_title || project?.name || 'Documentation';

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      {/* SEO Meta Tags */}
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content={siteTitle} />
        {config?.logo_dark_url && <meta property="og:image" content={config.logo_dark_url} />}
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={pageUrl} />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={pageDescription} />
        {config?.logo_dark_url && <meta property="twitter:image" content={config.logo_dark_url} />}
        
        {/* Canonical URL */}
        <link rel="canonical" href={pageUrl} />
        
        {/* Structured Data for SEO */}
        {selectedDoc && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": selectedDoc.title,
              "description": pageDescription,
              "url": pageUrl,
              "datePublished": selectedDoc.created_at,
              "dateModified": selectedDoc.updated_at,
              "author": {
                "@type": "Organization",
                "name": siteTitle
              },
              "publisher": {
                "@type": "Organization",
                "name": siteTitle,
                "logo": config?.logo_dark_url ? {
                  "@type": "ImageObject",
                  "url": config.logo_dark_url
                } : undefined
              }
            })}
          </script>
        )}
      </Helmet>
      
      {/* Grid Pattern Background - lower z-index */}
      <div className={`fixed inset-0 pointer-events-none z-0 ${darkMode ? 'bg-grid-pattern' : 'bg-grid-pattern-light'}`} />
      
      {/* Gradient Glow Effect - lower z-index */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-hero-glow" />
      
      {/* Top Navigation */}
      <TopNavigation
        config={config}
        project={project}
        theme={theme}
        darkMode={darkMode}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Search Dialog */}
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        documents={documents}
        onSelect={handleDocSelect}
        theme={theme}
        darkMode={darkMode}
        config={config}
      />

      {/* Left Sidebar */}
      <LeftSidebar
        tabs={tabs}
        documents={documents}
        selectedDocSlug={selectedDoc?.slug}
        onDocSelect={handleDocSelect}
        theme={theme}
        darkMode={darkMode}
        onSearchOpen={() => setSearchOpen(true)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content - higher z-index than grid */}
      <main className="lg:ml-64 xl:mr-56 min-h-screen pt-14 relative z-10">
        {selectedDoc ? (
          <article 
            key={selectedDoc.id} 
            className="max-w-none xl:max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fadeIn"
          >
            {/* Breadcrumb */}
            <div className={`text-sm ${theme.textMuted} mb-4`}>
              {getBreadcrumb()}
            </div>

            {/* Title + Copy Button */}
            <div className="flex items-start justify-between gap-4 mb-8">
              <h1 className={`text-3xl sm:text-4xl font-bold ${theme.text} tracking-tight`}>
                {selectedDoc.title}
              </h1>
              <CopyButton text={window.location.href} theme={theme} />
            </div>

            {/* Content */}
            <div className={`prose ${darkMode ? 'prose-invert' : 'prose-slate'} max-w-none
              prose-headings:font-semibold prose-headings:text-inherit
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-7 prose-p:break-words
              prose-a:text-[#188455] prose-a:no-underline hover:prose-a:underline
              prose-code:text-[#188455] prose-code:bg-[#188455]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words
              prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-pre:overflow-x-auto
              ${darkMode 
                ? '' 
                : '[&_h1]:!text-slate-900 [&_h2]:!text-slate-900 [&_h3]:!text-slate-900 [&_h4]:!text-slate-900 [&_p]:!text-slate-700 [&_li]:!text-slate-700 [&_strong]:!text-slate-900 [&_td]:!text-slate-700 [&_th]:!text-slate-900 [&_blockquote]:!text-slate-600 [&_blockquote_p]:!text-slate-600 [&_blockquote_*]:!text-slate-600'
              }
            `}>
              <DocContent 
                content={selectedDoc.content?.replace(
                  new RegExp(`^#\\s*${selectedDoc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'),
                  ''
                ) || selectedDoc.content} 
                onHeadings={setToc} 
              />
            </div>

            {/* Prev/Next Navigation */}
            <div className={`flex flex-col sm:flex-row justify-between gap-4 mt-16 pt-8 border-t ${theme.border}`}>
              {prevDoc ? (
                <button
                  onClick={() => handleDocSelect(prevDoc.slug)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${theme.border} ${theme.hover} transition-colors`}
                  data-testid="prev-doc-btn"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <div className="text-left">
                    <span className="block text-xs text-slate-500">Previous</span>
                    <span className={`text-sm font-medium ${theme.text}`}>{prevDoc.title}</span>
                  </div>
                </button>
              ) : <div />}
              {nextDoc && (
                <button
                  onClick={() => handleDocSelect(nextDoc.slug)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${theme.border} ${theme.hover} transition-colors`}
                  data-testid="next-doc-btn"
                >
                  <div className="text-right">
                    <span className="block text-xs text-slate-500">Next</span>
                    <span className={`text-sm font-medium ${theme.text}`}>{nextDoc.title}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </article>
        ) : (
          <div className="flex items-center justify-center h-[60vh]">
            <p className={theme.textMuted}>Select a document</p>
          </div>
        )}
      </main>

      {/* Right Sidebar (TOC) */}
      <RightSidebar headings={toc} theme={theme} />
    </div>
  );
};

export default PublicDocs;
