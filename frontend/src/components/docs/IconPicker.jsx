import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

/**
 * Available icons for the documentation system
 * Curated subset of Lucide icons that make sense for docs
 */
export const DOC_ICONS = {
  // Documents & Files
  'file-text': LucideIcons.FileText,
  'file-code': LucideIcons.FileCode,
  'file-json': LucideIcons.FileJson,
  'file': LucideIcons.File,
  'folder': LucideIcons.Folder,
  'folder-open': LucideIcons.FolderOpen,
  'book': LucideIcons.Book,
  'book-open': LucideIcons.BookOpen,
  'notebook': LucideIcons.NotebookPen,
  'scroll': LucideIcons.Scroll,
  
  // Development
  'code': LucideIcons.Code,
  'code-2': LucideIcons.Code2,
  'terminal': LucideIcons.Terminal,
  'bug': LucideIcons.Bug,
  'git-branch': LucideIcons.GitBranch,
  'git-commit': LucideIcons.GitCommit,
  'git-merge': LucideIcons.GitMerge,
  'database': LucideIcons.Database,
  'server': LucideIcons.Server,
  'cloud': LucideIcons.Cloud,
  'api': LucideIcons.Webhook,
  'brackets': LucideIcons.Braces,
  'function': LucideIcons.FunctionSquare,
  'variable': LucideIcons.Variable,
  
  // Actions & Navigation
  'rocket': LucideIcons.Rocket,
  'zap': LucideIcons.Zap,
  'sparkles': LucideIcons.Sparkles,
  'play': LucideIcons.Play,
  'settings': LucideIcons.Settings,
  'sliders': LucideIcons.SlidersHorizontal,
  'wrench': LucideIcons.Wrench,
  'hammer': LucideIcons.Hammer,
  'puzzle': LucideIcons.Puzzle,
  'puzzle-piece': LucideIcons.Puzzle, // Mintlify alias
  'blocks': LucideIcons.Blocks,
  'layers': LucideIcons.Layers,
  'box': LucideIcons.Box,
  'package': LucideIcons.Package,
  'download': LucideIcons.Download,
  'upload': LucideIcons.Upload,
  'refresh': LucideIcons.RefreshCw,
  'stairs': LucideIcons.TrendingUp, // Mintlify stairs icon alternative
  'brain': LucideIcons.Brain,
  'lightbulb': LucideIcons.Lightbulb,
  'wand-magic-sparkles': LucideIcons.Wand2, // Mintlify magic wand
  'robot': LucideIcons.Bot,
  
  // UI & Layout
  'layout': LucideIcons.Layout,
  'layout-grid': LucideIcons.LayoutGrid,
  'layout-list': LucideIcons.LayoutList,
  'table': LucideIcons.Table,
  'columns': LucideIcons.Columns,
  'rows': LucideIcons.Rows3,
  'sidebar': LucideIcons.PanelLeft,
  'component': LucideIcons.Component,
  'palette': LucideIcons.Palette,
  'image': LucideIcons.Image,
  
  // Communication
  'message': LucideIcons.MessageSquare,
  'mail': LucideIcons.Mail,
  'bell': LucideIcons.Bell,
  'megaphone': LucideIcons.Megaphone,
  'send': LucideIcons.Send,
  
  // Status & Info
  'check': LucideIcons.Check,
  'check-circle': LucideIcons.CheckCircle,
  'x': LucideIcons.X,
  'x-circle': LucideIcons.XCircle,
  'alert-circle': LucideIcons.AlertCircle,
  'alert-triangle': LucideIcons.AlertTriangle,
  'info': LucideIcons.Info,
  'help-circle': LucideIcons.HelpCircle,
  'lightbulb': LucideIcons.Lightbulb,
  
  // Security
  'lock': LucideIcons.Lock,
  'unlock': LucideIcons.Unlock,
  'key': LucideIcons.Key,
  'shield': LucideIcons.Shield,
  'shield-check': LucideIcons.ShieldCheck,
  'fingerprint': LucideIcons.Fingerprint,
  'eye': LucideIcons.Eye,
  'eye-off': LucideIcons.EyeOff,
  
  // Users & Teams
  'user': LucideIcons.User,
  'users': LucideIcons.Users,
  'user-plus': LucideIcons.UserPlus,
  'user-check': LucideIcons.UserCheck,
  'badge': LucideIcons.BadgeCheck,
  
  // Data & Analytics
  'chart': LucideIcons.BarChart3,
  'line-chart': LucideIcons.LineChart,
  'pie-chart': LucideIcons.PieChart,
  'trending-up': LucideIcons.TrendingUp,
  'activity': LucideIcons.Activity,
  'gauge': LucideIcons.Gauge,
  
  // Misc
  'star': LucideIcons.Star,
  'heart': LucideIcons.Heart,
  'bookmark': LucideIcons.Bookmark,
  'flag': LucideIcons.Flag,
  'tag': LucideIcons.Tag,
  'hash': LucideIcons.Hash,
  'link': LucideIcons.Link,
  'external-link': LucideIcons.ExternalLink,
  'globe': LucideIcons.Globe,
  'map': LucideIcons.Map,
  'compass': LucideIcons.Compass,
  'home': LucideIcons.Home,
  'building': LucideIcons.Building,
  'calendar': LucideIcons.Calendar,
  'clock': LucideIcons.Clock,
  'timer': LucideIcons.Timer,
  'hourglass': LucideIcons.Hourglass,
  
  // Arrows & Direction
  'arrow-right': LucideIcons.ArrowRight,
  'arrow-left': LucideIcons.ArrowLeft,
  'arrow-up': LucideIcons.ArrowUp,
  'arrow-down': LucideIcons.ArrowDown,
  'chevron-right': LucideIcons.ChevronRight,
  'chevron-down': LucideIcons.ChevronDown,
  'move': LucideIcons.Move,
  
  // Numbers (for steps)
  'circle-1': LucideIcons.Circle,
  'circle-2': LucideIcons.Circle,
  'circle-3': LucideIcons.Circle,
  'list-ordered': LucideIcons.ListOrdered,
  'list': LucideIcons.List,
  'list-checks': LucideIcons.ListChecks,
};

// Icon categories for the picker
export const ICON_CATEGORIES = [
  { 
    name: 'Documents', 
    icons: ['file-text', 'file-code', 'file-json', 'file', 'folder', 'folder-open', 'book', 'book-open', 'notebook', 'scroll'] 
  },
  { 
    name: 'Development', 
    icons: ['code', 'code-2', 'terminal', 'bug', 'git-branch', 'git-commit', 'database', 'server', 'cloud', 'api', 'brackets', 'function', 'variable'] 
  },
  { 
    name: 'Actions', 
    icons: ['rocket', 'zap', 'sparkles', 'play', 'settings', 'sliders', 'wrench', 'hammer', 'puzzle', 'blocks', 'layers', 'box', 'package', 'download', 'upload', 'refresh'] 
  },
  { 
    name: 'UI', 
    icons: ['layout', 'layout-grid', 'layout-list', 'table', 'columns', 'rows', 'sidebar', 'component', 'palette', 'image'] 
  },
  { 
    name: 'Status', 
    icons: ['check', 'check-circle', 'x', 'x-circle', 'alert-circle', 'alert-triangle', 'info', 'help-circle', 'lightbulb'] 
  },
  { 
    name: 'Security', 
    icons: ['lock', 'unlock', 'key', 'shield', 'shield-check', 'fingerprint', 'eye', 'eye-off'] 
  },
  { 
    name: 'Users', 
    icons: ['user', 'users', 'user-plus', 'user-check', 'badge'] 
  },
  { 
    name: 'Data', 
    icons: ['chart', 'line-chart', 'pie-chart', 'trending-up', 'activity', 'gauge'] 
  },
  { 
    name: 'Misc', 
    icons: ['star', 'heart', 'bookmark', 'flag', 'tag', 'hash', 'link', 'external-link', 'globe', 'map', 'compass', 'home', 'building', 'calendar', 'clock', 'timer'] 
  },
];

/**
 * Get icon component by name
 * Handles both kebab-case and PascalCase names
 */
export const getIcon = (iconName) => {
  if (!iconName) return LucideIcons.FileText;
  
  // Try exact match first
  if (DOC_ICONS[iconName]) return DOC_ICONS[iconName];
  
  // Try lowercase
  const lowerName = iconName.toLowerCase();
  if (DOC_ICONS[lowerName]) return DOC_ICONS[lowerName];
  
  // Try converting PascalCase to kebab-case (e.g., "Download" -> "download", "FileText" -> "file-text")
  const kebabName = iconName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  if (DOC_ICONS[kebabName]) return DOC_ICONS[kebabName];
  
  // Fallback
  return LucideIcons.FileText;
};

/**
 * Render an icon by name
 */
export const Icon = ({ name, className = '', size = 16 }) => {
  const IconComponent = getIcon(name);
  return <IconComponent className={className} size={size} />;
};

/**
 * Icon Picker Component
 */
export const IconPicker = ({ 
  value, 
  onChange, 
  onClose,
  className = '' 
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredIcons = useMemo(() => {
    if (search) {
      return Object.keys(DOC_ICONS).filter(name => 
        name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedCategory) {
      return ICON_CATEGORIES.find(c => c.name === selectedCategory)?.icons || [];
    }
    return Object.keys(DOC_ICONS);
  }, [search, selectedCategory]);

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden ${className}`}>
      {/* Search */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedCategory(null);
            }}
            className="w-full h-9 pl-9 pr-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand"
            autoFocus
          />
        </div>
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              !selectedCategory ? 'bg-brand text-zinc-950 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            All
          </button>
          {ICON_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat.name ? 'bg-brand text-zinc-950 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Icons Grid */}
      <div className="p-3 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {filteredIcons.map(iconName => {
            const IconComp = DOC_ICONS[iconName];
            if (!IconComp) return null;
            return (
              <button
                key={iconName}
                onClick={() => {
                  onChange(iconName);
                  onClose?.();
                }}
                className={`p-2.5 rounded-lg transition-colors ${
                  value === iconName 
                    ? 'bg-brand text-zinc-950 dark:text-white' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'
                }`}
                title={iconName}
              >
                <IconComp className="w-5 h-5" />
              </button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No icons found
          </div>
        )}
      </div>

      {/* Selected */}
      {value && (
        <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Icon name={value} size={16} />
            <span>{value}</span>
          </div>
          <button
            onClick={() => onChange(null)}
            className="text-xs text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Icon Button - Click to open picker
 */
export const IconButton = ({ 
  value, 
  onChange, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const IconComp = value ? getIcon(value) : LucideIcons.Image;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center transition-colors ${
          value 
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white' 
            : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white hover:border-slate-600'
        } ${className}`}
        title="Choose icon"
      >
        <IconComp className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 top-full mt-2 z-50 w-96">
            <IconPicker
              value={value}
              onChange={onChange}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default IconPicker;
