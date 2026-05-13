/**
 * MintlifyNav - Mintlify-style navigation with tabs, groups, anchors
 * Supports the full navigation config structure from docs.json
 */
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, ChevronRight, FileText, Book, Code, Terminal,
  ExternalLink, Search, Home, Settings, Folder, FolderOpen
} from 'lucide-react';
import { getIcon } from '@/components/docs/IconPicker';

// Icon mapping for common Mintlify icons
const ICON_MAP = {
  'book-open': Book,
  'square-terminal': Terminal,
  'code': Code,
  'file-text': FileText,
  'settings': Settings,
  'home': Home,
  'folder': Folder,
};

const getNavIcon = (iconName) => {
  if (!iconName) return FileText;
  const mapped = ICON_MAP[iconName];
  if (mapped) return mapped;
  return getIcon(iconName) || FileText;
};

/**
 * Tab - Top navigation tab
 */
const Tab = ({ tab, active, onClick }) => {
  const Icon = getNavIcon(tab.icon);
  const isExternal = !!tab.href;
  
  if (isExternal) {
    return (
      <a
        href={tab.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
      >
        {tab.icon && <Icon className="w-4 h-4" />}
        <span>{tab.tab}</span>
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        active 
          ? 'text-zinc-950 dark:text-white border-brand' 
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border-transparent'
      }`}
    >
      {tab.icon && <Icon className="w-4 h-4" />}
      <span>{tab.tab}</span>
    </button>
  );
};

/**
 * Anchor - Sidebar section header
 */
const Anchor = ({ anchor, active, onClick, children }) => {
  const Icon = getNavIcon(anchor.icon);
  const isExternal = !!anchor.href;
  const [expanded, setExpanded] = useState(active);
  
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);
  
  if (isExternal) {
    return (
      <a
        href={anchor.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
      >
        {anchor.icon && <Icon className="w-4 h-4" />}
        <span>{anchor.anchor}</span>
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    );
  }
  
  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
          active ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/50' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/30'
        }`}
      >
        {anchor.icon && <Icon className="w-4 h-4" />}
        <span className="flex-1 text-left">{anchor.anchor}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-1 ml-2 pl-4 border-l border-zinc-200 dark:border-zinc-800">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Group - Sidebar group with label
 */
const Group = ({ group, children }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-700 dark:text-zinc-300"
      >
        <span className="flex-1 text-left">{group.group}</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * PageLink - Sidebar page link
 */
const PageLink = ({ page, basePath, selectedSlug, onClick }) => {
  const slug = typeof page === 'string' ? page : page.page;
  const title = typeof page === 'string' ? slug.split('/').pop().replace(/-/g, ' ') : page.title;
  const icon = typeof page === 'object' ? page.icon : null;
  const Icon = icon ? getNavIcon(icon) : FileText;
  const isSelected = selectedSlug === slug;
  
  return (
    <button
      onClick={() => onClick(slug)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
        isSelected 
          ? 'bg-brand/10 text-brand' 
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/30'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate capitalize">{title}</span>
    </button>
  );
};

/**
 * Dropdown - Collapsible menu section
 */
const Dropdown = ({ dropdown, children }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/30 rounded-lg transition-colors"
      >
        {expanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
        <span className="flex-1 text-left">{dropdown.dropdown}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-1 ml-2 pl-4 border-l border-zinc-200 dark:border-zinc-800">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * MintlifyNav - Main navigation component
 */
export const MintlifyNav = ({
  config,
  documents = [],
  selectedDocSlug,
  onDocSelect,
  projectSlug,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Build navigation from config or documents
  const navigation = useMemo(() => {
    if (config?.navigation) {
      return config.navigation;
    }
    
    // Auto-generate navigation from documents
    const groups = {};
    documents.forEach(doc => {
      const folder = doc.folder || 'Documentation';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(doc);
    });
    
    return {
      groups: Object.entries(groups).map(([name, docs]) => ({
        group: name,
        pages: docs.map(d => ({ page: d.slug, title: d.title, icon: d.icon }))
      }))
    };
  }, [config, documents]);

  // Render pages for a section
  const renderPages = (pages) => {
    if (!pages) return null;
    return pages.map((page, i) => (
      <PageLink 
        key={i} 
        page={page} 
        basePath={`/p/${projectSlug}`}
        selectedSlug={selectedDocSlug}
        onClick={onDocSelect}
      />
    ));
  };

  // Render groups
  const renderGroups = (groups) => {
    if (!groups) return null;
    return groups.map((group, i) => (
      <Group key={i} group={group}>
        {renderPages(group.pages)}
        {renderGroups(group.groups)}
      </Group>
    ));
  };

  // Render anchors
  const renderAnchors = (anchors) => {
    if (!anchors) return null;
    return anchors.map((anchor, i) => {
      const isActive = anchor.pages?.some(p => 
        (typeof p === 'string' ? p : p.page) === selectedDocSlug
      );
      return (
        <Anchor key={i} anchor={anchor} active={isActive}>
          {renderPages(anchor.pages)}
          {renderGroups(anchor.groups)}
        </Anchor>
      );
    });
  };

  // Render dropdowns
  const renderDropdowns = (dropdowns) => {
    if (!dropdowns) return null;
    return dropdowns.map((dropdown, i) => (
      <Dropdown key={i} dropdown={dropdown}>
        {renderPages(dropdown.pages)}
        {renderGroups(dropdown.groups)}
      </Dropdown>
    ));
  };

  // Get current tab content
  const currentTab = navigation.tabs?.[activeTab];

  return (
    <nav className={`mintlify-nav ${className}`}>
      {/* Tabs (Top Bar) */}
      {navigation.tabs && navigation.tabs.length > 0 && (
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-2 overflow-x-auto">
          {navigation.tabs.map((tab, i) => (
            <Tab 
              key={i} 
              tab={tab} 
              active={i === activeTab} 
              onClick={() => setActiveTab(i)} 
            />
          ))}
        </div>
      )}

      {/* Sidebar Content */}
      <div className="p-3 space-y-2">
        {/* Tab content */}
        {currentTab && (
          <>
            {renderAnchors(currentTab.anchors)}
            {renderGroups(currentTab.groups)}
            {renderPages(currentTab.pages)}
          </>
        )}

        {/* Top-level anchors (outside tabs) */}
        {!navigation.tabs && renderAnchors(navigation.anchors)}

        {/* Top-level groups (outside tabs) */}
        {!navigation.tabs && renderGroups(navigation.groups)}

        {/* Top-level dropdowns */}
        {renderDropdowns(navigation.dropdowns)}

        {/* Top-level pages */}
        {!navigation.tabs && renderPages(navigation.pages)}
      </div>

      {/* Global Anchors (always visible) */}
      {navigation.global?.anchors && (
        <div className="mt-auto pt-4 px-3 border-t border-zinc-200 dark:border-zinc-800">
          {navigation.global.anchors.map((anchor, i) => (
            <a
              key={i}
              href={anchor.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{anchor.anchor}</span>
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default MintlifyNav;
