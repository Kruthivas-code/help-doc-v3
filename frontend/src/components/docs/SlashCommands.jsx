import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ListOrdered, AlertCircle, Code, LayoutGrid, MessageSquare,
  ChevronRight, Table, Image, Minus, Quote, List, Hash,
  Info, Lightbulb, AlertTriangle, XCircle, CheckCircle, Play, Film
} from 'lucide-react';

/**
 * Slash Command Menu - Appears when user types "/"
 */

const COMMANDS = [
  {
    category: 'Basic',
    items: [
      { 
        id: 'h1', 
        label: 'Heading 1', 
        icon: Hash,
        description: 'Large section heading',
        insert: '# '
      },
      { 
        id: 'h2', 
        label: 'Heading 2', 
        icon: Hash,
        description: 'Medium section heading',
        insert: '## '
      },
      { 
        id: 'h3', 
        label: 'Heading 3', 
        icon: Hash,
        description: 'Small section heading',
        insert: '### '
      },
      { 
        id: 'bullet', 
        label: 'Bullet List', 
        icon: List,
        description: 'Create a bullet list',
        insert: '- '
      },
      { 
        id: 'numbered', 
        label: 'Numbered List', 
        icon: ListOrdered,
        description: 'Create a numbered list',
        insert: '1. '
      },
      { 
        id: 'quote', 
        label: 'Quote', 
        icon: Quote,
        description: 'Capture a quote',
        insert: '> '
      },
      { 
        id: 'divider', 
        label: 'Divider', 
        icon: Minus,
        description: 'Horizontal rule',
        insert: '\n---\n'
      },
    ]
  },
  {
    category: 'Code',
    items: [
      { 
        id: 'code-js', 
        label: 'JavaScript Code', 
        icon: Code,
        description: 'JavaScript code block',
        insert: '```javascript\n// Your code here\n```'
      },
      { 
        id: 'code-ts', 
        label: 'TypeScript Code', 
        icon: Code,
        description: 'TypeScript code block',
        insert: '```typescript\n// Your code here\n```'
      },
      { 
        id: 'code-python', 
        label: 'Python Code', 
        icon: Code,
        description: 'Python code block',
        insert: '```python\n# Your code here\n```'
      },
      { 
        id: 'code-bash', 
        label: 'Bash/Terminal', 
        icon: Code,
        description: 'Shell command block',
        insert: '```bash\n$ your-command\n```'
      },
      { 
        id: 'code-json', 
        label: 'JSON', 
        icon: Code,
        description: 'JSON data block',
        insert: '```json\n{\n  "key": "value"\n}\n```'
      },
    ]
  },
  {
    category: 'Callouts',
    items: [
      { 
        id: 'note', 
        label: 'Note', 
        icon: Info,
        description: 'Highlight important info',
        insert: '> [!NOTE]\n> Your note here'
      },
      { 
        id: 'tip', 
        label: 'Tip', 
        icon: Lightbulb,
        description: 'Share a helpful tip',
        insert: '> [!TIP]\n> Your tip here'
      },
      { 
        id: 'warning', 
        label: 'Warning', 
        icon: AlertTriangle,
        description: 'Warn about something',
        insert: '> [!WARNING]\n> Your warning here'
      },
      { 
        id: 'error', 
        label: 'Error/Danger', 
        icon: XCircle,
        description: 'Critical warning',
        insert: '> [!ERROR]\n> Your error message here'
      },
      { 
        id: 'success', 
        label: 'Success', 
        icon: CheckCircle,
        description: 'Success message',
        insert: '> [!SUCCESS]\n> Your success message here'
      },
    ]
  },
  {
    category: 'Components',
    items: [
      { 
        id: 'steps', 
        label: 'Steps', 
        icon: ListOrdered,
        description: 'Step-by-step guide',
        insert: '<Steps>\n  <Step title="First Step">\n    Description of first step.\n  </Step>\n  <Step title="Second Step">\n    Description of second step.\n  </Step>\n  <Step title="Third Step">\n    Description of third step.\n  </Step>\n</Steps>'
      },
      { 
        id: 'table', 
        label: 'Table', 
        icon: Table,
        description: 'Data table',
        insert: '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |'
      },
      { 
        id: 'cards', 
        label: 'Card Grid', 
        icon: LayoutGrid,
        description: 'Grid of linked cards',
        insert: '<CardGroup>\n  <Card title="First Card" icon="rocket">\n    Description of first card.\n  </Card>\n  <Card title="Second Card" icon="code">\n    Description of second card.\n  </Card>\n</CardGroup>'
      },
      { 
        id: 'tabs', 
        label: 'Tabs', 
        icon: LayoutGrid,
        description: 'Tabbed content',
        insert: '<Tabs>\n  <Tab label="Tab 1">\n    Content for tab 1.\n  </Tab>\n  <Tab label="Tab 2">\n    Content for tab 2.\n  </Tab>\n</Tabs>'
      },
      { 
        id: 'accordion', 
        label: 'Accordion/FAQ', 
        icon: MessageSquare,
        description: 'Collapsible sections',
        insert: '<details>\n<summary>Click to expand</summary>\n\nHidden content goes here.\n\n</details>'
      },
    ]
  },
  {
    category: 'Media',
    items: [
      { 
        id: 'image', 
        label: 'Image (Browse)', 
        icon: Image,
        description: 'Browse stock images or upload',
        action: 'open-image-picker',
        insert: '![Alt text](https://example.com/image.png)'
      },
      { 
        id: 'image-url', 
        label: 'Image (URL)', 
        icon: Image,
        description: 'Insert image from URL',
        insert: '![Alt text](https://example.com/image.png)'
      },
      { 
        id: 'image-caption', 
        label: 'Image with Caption', 
        icon: Image,
        description: 'Image with description',
        insert: '<Figure src="https://example.com/image.png" alt="Description" caption="Image caption here" />'
      },
      { 
        id: 'gif', 
        label: 'GIF (Browse)', 
        icon: Image,
        description: 'Browse and embed animated GIF',
        action: 'open-gif-picker',
        insert: '![Animation](https://example.com/animation.gif)'
      },
      { 
        id: 'youtube', 
        label: 'YouTube Video', 
        icon: Image,
        description: 'Embed a YouTube video',
        insert: '<YouTube id="VIDEO_ID" title="Video Title" />'
      },
      { 
        id: 'video', 
        label: 'Video (MP4)', 
        icon: Image,
        description: 'Embed a video file',
        insert: '<Video src="https://example.com/video.mp4" title="Video Title" />'
      },
      { 
        id: 'loom', 
        label: 'Loom Video', 
        icon: Image,
        description: 'Embed a Loom recording',
        insert: '<Loom id="LOOM_ID" title="Loom Recording" />'
      },
    ]
  },
];

export const SlashCommandMenu = ({ 
  isOpen, 
  position, 
  searchQuery, 
  onSelect, 
  onClose,
  selectedIndex 
}) => {
  const menuRef = useRef(null);
  
  // Filter commands based on search
  const filteredCommands = COMMANDS.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  // Flatten for keyboard navigation
  const flatItems = filteredCommands.flatMap(cat => cat.items);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const selectedEl = menuRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen || flatItems.length === 0) return null;

  let currentIndex = 0;

  return (
    <div 
      ref={menuRef}
      className="absolute z-50 w-80 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl"
      style={{ 
        left: position.x, 
        top: position.y,
      }}
    >
      <div className="p-2">
        {filteredCommands.map((category, catIndex) => (
          <div key={category.category}>
            {catIndex > 0 && <div className="h-px bg-slate-800 my-2" />}
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {category.category}
            </div>
            {category.items.map((item) => {
              const itemIndex = currentIndex++;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  data-index={itemIndex}
                  onClick={() => onSelect(item)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                    selectedIndex === itemIndex 
                      ? 'bg-indigo-600/20 text-white' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                    selectedIndex === itemIndex ? 'bg-indigo-600/30' : 'bg-slate-800'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-slate-500 truncate">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Hook for slash command functionality
 */
export const useSlashCommands = (textareaRef, onInsert, onAction) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slashPosition, setSlashPosition] = useState(null);

  const flatItems = COMMANDS.flatMap(cat => cat.items).filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openMenu = useCallback((cursorPos) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Get approximate cursor position
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;
    const charInLine = lines[lines.length - 1].length;
    
    // Rough position calculation
    const lineHeight = 24;
    const charWidth = 8;
    
    setPosition({
      x: Math.min(charInLine * charWidth, rect.width - 320),
      y: Math.min(currentLine * lineHeight + 30, rect.height - 200)
    });
    
    setSlashPosition(cursorPos);
    setIsOpen(true);
    setSearchQuery('');
    setSelectedIndex(0);
  }, [textareaRef]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSlashPosition(null);
    setSearchQuery('');
    setSelectedIndex(0);
  }, []);

  const selectItem = useCallback((item) => {
    if (!textareaRef.current || slashPosition === null) return;
    
    // Check if item has a special action
    if (item.action && onAction) {
      // Remove the "/" and any search text first
      const textarea = textareaRef.current;
      const value = textarea.value;
      const cursorPos = textarea.selectionStart;
      const beforeSlash = value.substring(0, slashPosition - 1);
      const afterCursor = value.substring(cursorPos);
      const newValue = beforeSlash + afterCursor;
      onInsert(newValue, beforeSlash.length);
      
      // Then trigger the action
      onAction(item.action);
      closeMenu();
      return;
    }
    
    const textarea = textareaRef.current;
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // Remove the "/" and any search text
    const beforeSlash = value.substring(0, slashPosition - 1);
    const afterCursor = value.substring(cursorPos);
    
    const newValue = beforeSlash + item.insert + afterCursor;
    onInsert(newValue, beforeSlash.length + item.insert.length);
    
    closeMenu();
  }, [textareaRef, slashPosition, onInsert, onAction, closeMenu]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Will be handled in onChange
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          selectItem(flatItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          selectItem(flatItems[selectedIndex]);
        }
        break;
    }
  }, [isOpen, flatItems, selectedIndex, selectItem, closeMenu]);

  const handleChange = useCallback((value, cursorPos) => {
    if (!isOpen) {
      // Check if user just typed "/"
      const charBefore = value[cursorPos - 1];
      const charBeforeThat = value[cursorPos - 2];
      
      if (charBefore === '/' && (charBeforeThat === undefined || charBeforeThat === '\n' || charBeforeThat === ' ')) {
        openMenu(cursorPos);
      }
    } else if (slashPosition !== null) {
      // Update search query
      const searchText = value.substring(slashPosition, cursorPos);
      if (searchText.includes(' ') || searchText.includes('\n')) {
        closeMenu();
      } else {
        setSearchQuery(searchText);
        setSelectedIndex(0);
      }
    }
  }, [isOpen, slashPosition, openMenu, closeMenu]);

  return {
    isOpen,
    position,
    searchQuery,
    selectedIndex,
    handleKeyDown,
    handleChange,
    selectItem,
    closeMenu,
  };
};

export default SlashCommandMenu;
