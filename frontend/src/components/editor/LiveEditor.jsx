/**
 * LiveEditor - WYSIWYG editor that looks exactly like the final documentation
 * Content is rendered in its final form but becomes editable when clicked
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, GripVertical, Settings, Type, Image as ImageIcon,
  Code, CheckCircle, AlertCircle, Info, Lightbulb, AlertTriangle,
  Rocket, FileCode, Key, Users, Webhook, Gauge, ChevronDown, ChevronUp,
  LayoutGrid, ListOrdered, Quote, Minus, Bold, Italic, Link2, Search,
  // Extended icon set for cards
  Home, Star, Heart, Bell, Mail, MessageCircle, Phone, Calendar, Clock,
  MapPin, Globe, Link, ExternalLink, Download, Upload, File, Folder,
  Database, Server, Cloud, Cpu, Terminal, GitBranch, Github, Zap,
  Shield, Lock, Unlock, Eye, EyeOff, Edit, Copy, Clipboard, Save,
  Share, Send, Bookmark, Tag, Hash, AtSign, DollarSign, CreditCard,
  ShoppingCart, Package, Truck, Gift, Award, Trophy, Target, Flag,
  Compass, Navigation, Map, Layers, Grid, List, BarChart, PieChart,
  TrendingUp, Activity, Wifi, Bluetooth, Battery, Volume2, Music,
  Video, Camera, Mic, Headphones, Monitor, Smartphone, Tablet, Watch,
  Printer, Tv, Speaker, Radio, Gamepad2, Joystick, Box, Archive,
  Briefcase, Building, Store, Factory, Warehouse, Landmark, School,
  Hospital, Hotel, Church, TreePine, Flower2, Sun, Moon, CloudRain,
  Snowflake, Wind, Thermometer, Umbrella, Coffee, Pizza, Apple, Cake,
  Wine, Beer, Utensils, ChefHat, Plane, Car, Bus, Train, Ship, Bike,
  Footprints, Baby, User, UserPlus, UserMinus, UserCheck, UserX,
  Users2, UsersRound, Contact, PersonStanding, Accessibility, Brain,
  Dna, Pill, Stethoscope, Syringe, TestTube, Microscope, Atom, Beaker,
  FlaskConical, Magnet, Wrench, Hammer, Screwdriver, Paintbrush, Palette,
  Pencil, PenTool, Eraser, Scissors, Ruler, Scale, Calculator, Binary,
  Braces, Brackets, Code2, FileJson, FileText, FileImage, FileVideo,
  FileAudio, FilePlus, FileSearch, FolderOpen, FolderPlus, HardDrive,
  MemoryStick, UsbIcon, CircuitBoard, Plug, Power, PowerOff, RotateCw,
  RefreshCw, Repeat, Shuffle, PlayCircle, PauseCircle, StopCircle,
  SkipBack, SkipForward, FastForward, Rewind, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, Maximize, Minimize,
  Expand, Shrink, ZoomIn, ZoomOut, FullscreenIcon, Crosshair, Focus,
  ScanLine, QrCode, Barcode, Fingerprint, ScanFace, BadgeCheck, Verified,
  CircleDot, Circle, Square, Triangle, Hexagon, Octagon, Pentagon,
  Diamond, Gem, Crown, Sparkles, PartyPopper, Confetti, Flame, Droplet,
  Waves, Mountain, Sunrise, Sunset, Rainbow, Eclipse, Orbit, Satellite,
  Antenna, Signal, Rss, Cast, Airplay, ScreenShare, Presentation,
  Kanban, Workflow, Network, Share2, Merge, Split, Filter, SortAsc,
  SortDesc, ArrowUpDown, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent, WrapText, Pilcrow, Heading1, Heading2, Heading3,
  Bold as BoldIcon, Italic as ItalicIcon, Underline, Strikethrough,
  Subscript, Superscript, Quote as QuoteIcon, ListIcon, ListOrdered as ListOrderedIcon,
  CheckSquare, ToggleLeft, ToggleRight, Sliders, SlidersHorizontal,
  Cog, Settings2, Tool, Wand2, Sparkle, Bot, BrainCircuit, Cpu as CpuIcon,
  CircuitBoard as CircuitBoardIcon, Microchip, Blocks, Component, Puzzle,
  Extension, PlugZap, Cable, Router, Combine, Ungroup, Group, Shapes,
  PanelLeft, PanelRight, PanelTop, PanelBottom, LayoutDashboard, LayoutTemplate,
  AppWindow, Columns, Rows, Table, TableProperties, FormInput, TextCursor,
  MousePointer, MousePointer2, Hand, Grab, Move3d, Rotate3d, FlipHorizontal,
  FlipVertical, RotateCcw, History, Undo, Redo, Loader, Loader2, Hourglass,
  Timer, TimerOff, Stopwatch, AlarmClock, CalendarDays, CalendarRange,
  CalendarCheck, CalendarX, CalendarPlus, CalendarMinus, CalendarClock,
  Clock1, Clock2, Clock3, Clock4, Clock12, Watch as WatchIcon
} from 'lucide-react';

// Icon mapping for cards - comprehensive set organized by category
const CARD_ICONS = {
  // Popular / Common
  rocket: Rocket,
  code: Code,
  key: Key,
  users: Users,
  settings: Settings,
  star: Star,
  heart: Heart,
  zap: Zap,
  shield: Shield,
  globe: Globe,
  
  // Development
  terminal: Terminal,
  'git-branch': GitBranch,
  github: Github,
  database: Database,
  server: Server,
  cloud: Cloud,
  cpu: Cpu,
  'file-code': FileCode,
  braces: Braces,
  brackets: Brackets,
  
  // Files & Folders
  file: File,
  'file-text': FileText,
  folder: Folder,
  'folder-open': FolderOpen,
  archive: Archive,
  download: Download,
  upload: Upload,
  
  // Communication
  mail: Mail,
  'message-circle': MessageCircle,
  phone: Phone,
  bell: Bell,
  send: Send,
  share: Share2,
  
  // UI Elements
  home: Home,
  search: Search,
  bookmark: Bookmark,
  link: Link,
  'external-link': ExternalLink,
  eye: Eye,
  edit: Edit,
  copy: Copy,
  save: Save,
  
  // Charts & Data
  'bar-chart': BarChart,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  activity: Activity,
  target: Target,
  gauge: Gauge,
  
  // Security
  lock: Lock,
  unlock: Unlock,
  'shield-check': Shield,
  fingerprint: Fingerprint,
  'badge-check': BadgeCheck,
  
  // Commerce
  'credit-card': CreditCard,
  'shopping-cart': ShoppingCart,
  package: Package,
  gift: Gift,
  'dollar-sign': DollarSign,
  
  // Media
  image: ImageIcon,
  video: Video,
  camera: Camera,
  music: Music,
  mic: Mic,
  headphones: Headphones,
  
  // Devices
  monitor: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
  tv: Tv,
  printer: Printer,
  
  // Navigation
  compass: Compass,
  map: Map,
  'map-pin': MapPin,
  navigation: Navigation,
  
  // Time
  calendar: Calendar,
  clock: Clock,
  timer: Timer,
  hourglass: Hourglass,
  
  // Nature
  sun: Sun,
  moon: Moon,
  'cloud-rain': CloudRain,
  snowflake: Snowflake,
  flame: Flame,
  droplet: Droplet,
  mountain: Mountain,
  
  // People
  user: User,
  'user-plus': UserPlus,
  'users-round': UsersRound,
  contact: Contact,
  baby: Baby,
  
  // Buildings
  building: Building,
  store: Store,
  landmark: Landmark,
  school: School,
  hospital: Hospital,
  
  // Transport
  plane: Plane,
  car: Car,
  train: Train,
  ship: Ship,
  bike: Bike,
  
  // Tools
  wrench: Wrench,
  hammer: Hammer,
  paintbrush: Paintbrush,
  pencil: Pencil,
  scissors: Scissors,
  
  // Science
  atom: Atom,
  beaker: Beaker,
  microscope: Microscope,
  dna: Dna,
  brain: Brain,
  
  // Fun
  gamepad: Gamepad2,
  trophy: Trophy,
  award: Award,
  crown: Crown,
  sparkles: Sparkles,
  'party-popper': PartyPopper,
  
  // Misc
  lightbulb: Lightbulb,
  info: Info,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  bot: Bot,
  wand: Wand2,
  puzzle: Puzzle,
  layers: Layers,
  webhook: Webhook,
};

// Icon categories for organized display
const ICON_CATEGORIES = {
  'Popular': ['rocket', 'code', 'key', 'users', 'settings', 'star', 'heart', 'zap', 'shield', 'globe'],
  'Development': ['terminal', 'git-branch', 'github', 'database', 'server', 'cloud', 'cpu', 'file-code', 'braces', 'brackets'],
  'Files': ['file', 'file-text', 'folder', 'folder-open', 'archive', 'download', 'upload'],
  'Communication': ['mail', 'message-circle', 'phone', 'bell', 'send', 'share'],
  'UI': ['home', 'search', 'bookmark', 'link', 'external-link', 'eye', 'edit', 'copy', 'save'],
  'Data': ['bar-chart', 'pie-chart', 'trending-up', 'activity', 'target', 'gauge'],
  'Security': ['lock', 'unlock', 'shield-check', 'fingerprint', 'badge-check'],
  'Commerce': ['credit-card', 'shopping-cart', 'package', 'gift', 'dollar-sign'],
  'Media': ['image', 'video', 'camera', 'music', 'mic', 'headphones'],
  'Devices': ['monitor', 'smartphone', 'tablet', 'tv', 'printer'],
  'Navigation': ['compass', 'map', 'map-pin', 'navigation'],
  'Time': ['calendar', 'clock', 'timer', 'hourglass'],
  'Nature': ['sun', 'moon', 'cloud-rain', 'snowflake', 'flame', 'droplet', 'mountain'],
  'People': ['user', 'user-plus', 'users-round', 'contact', 'baby'],
  'Buildings': ['building', 'store', 'landmark', 'school', 'hospital'],
  'Transport': ['plane', 'car', 'train', 'ship', 'bike'],
  'Tools': ['wrench', 'hammer', 'paintbrush', 'pencil', 'scissors'],
  'Science': ['atom', 'beaker', 'microscope', 'dna', 'brain'],
  'Fun': ['gamepad', 'trophy', 'award', 'crown', 'sparkles', 'party-popper'],
  'Misc': ['lightbulb', 'info', 'alert-circle', 'alert-triangle', 'check-circle', 'bot', 'wand', 'puzzle', 'layers', 'webhook'],
};

// Callout configurations
const CALLOUT_TYPES = {
  note: { icon: Info, color: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  tip: { icon: Lightbulb, color: 'green', bg: 'bg-brand/10', border: 'border-green-500/30', text: 'text-green-400' },
  warning: { icon: AlertTriangle, color: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  error: { icon: AlertCircle, color: 'red', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-600 dark:text-rose-400' },
  success: { icon: CheckCircle, color: 'green', bg: 'bg-brand/10', border: 'border-green-500/30', text: 'text-green-400' },
};

// Editable Text Component
const EditableText = ({ value, onChange, className, placeholder, as: Tag = 'p', multiline = false }) => {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${className} bg-transparent border-none outline-none ring-2 ring-brand/50 rounded px-1 -mx-1 resize-none`}
          placeholder={placeholder}
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} bg-transparent border-none outline-none ring-2 ring-brand/50 rounded px-1 -mx-1 w-full`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <Tag 
      className={`${className} cursor-text hover:ring-2 hover:ring-brand/30 rounded px-1 -mx-1 transition-all ${!localValue ? 'text-zinc-500 italic' : ''}`}
      onClick={() => setEditing(true)}
    >
      {localValue || placeholder}
    </Tag>
  );
};

// Block Wrapper with controls - stays visible on click
const BlockWrapper = ({ children, onDelete, onMoveUp, onMoveDown, showControls = true }) => {
  const [selected, setSelected] = useState(false);
  const wrapperRef = useRef(null);

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setSelected(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={wrapperRef}
      className={`relative group ${selected ? 'ring-1 ring-brand/30 rounded-lg' : ''}`}
      onClick={() => setSelected(true)}
    >
      {/* Controls - visible on hover OR when selected */}
      {showControls && (
        <div className={`absolute -left-14 top-0 flex flex-col gap-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-lg p-1 shadow-lg transition-all ${
          selected ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
        }`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:bg-zinc-700 rounded transition-colors"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white cursor-grab rounded-md"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:bg-zinc-700 rounded transition-colors"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="border-t border-zinc-200 dark:border-zinc-800 my-1" />
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
            title="Delete block"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
};

// Heading Block
const HeadingBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const sizes = {
    h1: 'text-4xl font-bold',
    h2: 'text-3xl font-bold',
    h3: 'text-2xl font-semibold',
  };

  return (
    <BlockWrapper onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="flex items-start gap-3 mb-6">
        {block.icon && (
          <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">{block.icon}</span>
          </div>
        )}
        <EditableText
          value={block.content}
          onChange={(content) => onChange({ ...block, content })}
          className={`${sizes[block.level] || sizes.h1} text-zinc-950 dark:text-white flex-1`}
          placeholder="Heading text..."
          as={block.level || 'h1'}
        />
      </div>
    </BlockWrapper>
  );
};

// Paragraph Block
const ParagraphBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown }) => {
  return (
    <BlockWrapper onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <EditableText
        value={block.content}
        onChange={(content) => onChange({ ...block, content })}
        className="text-zinc-700 dark:text-zinc-300 text-base leading-relaxed mb-4"
        placeholder="Start typing..."
        multiline
      />
    </BlockWrapper>
  );
};

// Callout Block
const CalloutBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const type = CALLOUT_TYPES[block.calloutType] || CALLOUT_TYPES.note;
  const Icon = type.icon;

  return (
    <BlockWrapper onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className={`${type.bg} border ${type.border} rounded-xl p-4 mb-6 relative`}>
        {/* Type selector */}
        <div className="absolute top-2 right-2">
          <button 
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
          {showTypeSelector && (
            <div className="absolute right-0 top-8 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-2 z-10">
              {Object.keys(CALLOUT_TYPES).map(t => {
                const TypeIcon = CALLOUT_TYPES[t].icon;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      onChange({ ...block, calloutType: t });
                      setShowTypeSelector(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm capitalize hover:bg-zinc-200 dark:bg-zinc-700 ${
                      block.calloutType === t ? 'bg-zinc-200 dark:bg-zinc-700' : ''
                    }`}
                  >
                    <TypeIcon className={`w-4 h-4 ${CALLOUT_TYPES[t].text}`} />
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${type.text} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <EditableText
              value={block.title}
              onChange={(title) => onChange({ ...block, title })}
              className={`font-semibold ${type.text} mb-1`}
              placeholder="Callout title..."
            />
            <EditableText
              value={block.content}
              onChange={(content) => onChange({ ...block, content })}
              className="text-zinc-700 dark:text-zinc-300 text-sm"
              placeholder="Callout content..."
              multiline
            />
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
};

// Card Component (used in CardGroup)
const CardItem = ({ card, onChange }) => {
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Popular');
  const iconPickerRef = useRef(null);
  const IconComponent = CARD_ICONS[card.icon] || Code;

  // Close icon picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target)) {
        setShowIconSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter icons based on search
  const filteredIcons = iconSearch.trim()
    ? Object.keys(CARD_ICONS).filter(name => 
        name.toLowerCase().includes(iconSearch.toLowerCase())
      )
    : ICON_CATEGORIES[activeCategory] || [];

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-300 dark:border-zinc-600 transition-colors">
      {/* Icon */}
      <div className="relative mb-4" ref={iconPickerRef}>
        <button
          onClick={() => setShowIconSelector(!showIconSelector)}
          className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700/50 rounded-lg flex items-center justify-center hover:bg-zinc-200 dark:bg-zinc-700 transition-colors"
          title="Click to change icon"
        >
          <IconComponent className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
        </button>
        
        {showIconSelector && (
          <div className="absolute left-0 top-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-20 w-80">
            {/* Search */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-brand"
                  autoFocus
                />
              </div>
            </div>

            {/* Categories (only show when not searching) */}
            {!iconSearch.trim() && (
              <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-1">
                {Object.keys(ICON_CATEGORIES).map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      activeCategory === category 
                        ? 'bg-brand text-zinc-950 dark:text-white' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* Icons Grid */}
            <div className="p-3 max-h-64 overflow-auto">
              <div className="grid grid-cols-6 gap-1">
                {filteredIcons.map(iconName => {
                  const Icon = CARD_ICONS[iconName];
                  if (!Icon) return null;
                  return (
                    <button
                      key={iconName}
                      onClick={() => {
                        onChange({ ...card, icon: iconName });
                        setShowIconSelector(false);
                        setIconSearch('');
                      }}
                      className={`p-2 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 transition-colors group ${
                        card.icon === iconName ? 'bg-brand/20 ring-1 ring-brand' : ''
                      }`}
                      title={iconName}
                    >
                      <Icon className={`w-5 h-5 ${card.icon === iconName ? 'text-brand' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white'}`} />
                    </button>
                  );
                })}
              </div>
              {filteredIcons.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">No icons found</p>
              )}
            </div>

            {/* Current selection */}
            <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Selected: <span className="text-zinc-700 dark:text-zinc-300">{card.icon}</span></span>
              <button
                onClick={() => setShowIconSelector(false)}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <EditableText
        value={card.title}
        onChange={(title) => onChange({ ...card, title })}
        className="font-semibold text-zinc-950 dark:text-white text-lg mb-2"
        placeholder="Card title..."
      />

      {/* Description */}
      <EditableText
        value={card.description}
        onChange={(description) => onChange({ ...card, description })}
        className="text-zinc-600 dark:text-zinc-400 text-sm"
        placeholder="Card description..."
        multiline
      />
    </div>
  );
};

// CardGroup Block
const CardGroupBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const cards = block.cards || [
    { id: '1', icon: 'rocket', title: 'First Card', description: 'Description of first card.' },
    { id: '2', icon: 'code', title: 'Second Card', description: 'Description of second card.' },
  ];

  const updateCard = (index, updatedCard) => {
    const newCards = [...cards];
    newCards[index] = updatedCard;
    onChange({ ...block, cards: newCards });
  };

  const addCard = () => {
    const newCards = [...cards, { 
      id: Date.now().toString(), 
      icon: 'code', 
      title: 'New Card', 
      description: 'Card description.' 
    }];
    onChange({ ...block, cards: newCards });
  };

  const removeCard = (index) => {
    const newCards = cards.filter((_, i) => i !== index);
    onChange({ ...block, cards: newCards });
  };

  return (
    <BlockWrapper onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="mb-6">
        <div className={`grid gap-4 ${cards.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {cards.map((card, index) => (
            <div key={card.id || index} className="relative group/card">
              <CardItem 
                card={card} 
                onChange={(updated) => updateCard(index, updated)} 
              />
              {cards.length > 1 && (
                <button
                  onClick={() => removeCard(index)}
                  className="absolute -top-2 -right-2 p-1 bg-rose-500 rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-zinc-950 dark:text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addCard}
          className="mt-3 flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:border-zinc-600 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Card
        </button>
      </div>
    </BlockWrapper>
  );
};

// Code Block
const CodeBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const [editing, setEditing] = useState(false);

  return (
    <BlockWrapper onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="mb-6 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <input
              type="text"
              value={block.language || 'javascript'}
              onChange={(e) => onChange({ ...block, language: e.target.value })}
              className="bg-transparent text-zinc-600 dark:text-zinc-400 text-sm w-24 outline-none"
              placeholder="language"
            />
          </div>
          <button className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white flex items-center gap-1">
            Copy
          </button>
        </div>
        {/* Code */}
        <div className="bg-white dark:bg-zinc-900 p-4">
          {editing ? (
            <textarea
              value={block.content}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              onBlur={() => setEditing(false)}
              className="w-full bg-transparent text-zinc-700 dark:text-zinc-300 font-mono text-sm outline-none resize-none"
              rows={5}
              autoFocus
            />
          ) : (
            <pre 
              className="text-zinc-700 dark:text-zinc-300 font-mono text-sm cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded p-1 -m-1"
              onClick={() => setEditing(true)}
            >
              {block.content || 'Click to add code...'}
            </pre>
          )}
        </div>
      </div>
    </BlockWrapper>
  );
};

// Steps Block
const StepsBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const steps = block.steps || [
    { id: '1', title: 'First Step', content: 'Description of first step.' },
    { id: '2', title: 'Second Step', content: 'Description of second step.' },
  ];

  const updateStep = (index, updatedStep) => {
    const newSteps = [...steps];
    newSteps[index] = updatedStep;
    onChange({ ...block, steps: newSteps });
  };

  const addStep = () => {
    const newSteps = [...steps, { 
      id: Date.now().toString(), 
      title: 'New Step', 
      content: 'Step description.' 
    }];
    onChange({ ...block, steps: newSteps });
  };

  const removeStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index);
    onChange({ ...block, steps: newSteps });
  };

  return (
    <BlockWrapper onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="mb-6 relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-zinc-200 dark:bg-zinc-700" />
        
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id || index} className="flex gap-4 relative group/step">
              {/* Step number */}
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-zinc-950 dark:text-white font-semibold text-sm z-10 flex-shrink-0">
                {index + 1}
              </div>
              
              {/* Content */}
              <div className="flex-1 pt-1">
                <EditableText
                  value={step.title}
                  onChange={(title) => updateStep(index, { ...step, title })}
                  className="font-semibold text-zinc-950 dark:text-white mb-1"
                  placeholder="Step title..."
                />
                <EditableText
                  value={step.content}
                  onChange={(content) => updateStep(index, { ...step, content })}
                  className="text-zinc-600 dark:text-zinc-400 text-sm"
                  placeholder="Step description..."
                  multiline
                />
              </div>

              {/* Remove button */}
              {steps.length > 1 && (
                <button
                  onClick={() => removeStep(index)}
                  className="absolute -right-2 top-0 p-1 text-zinc-500 hover:text-rose-600 dark:text-rose-400 opacity-0 group-hover/step:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="mt-4 ml-12 flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:border-zinc-600 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>
      </div>
    </BlockWrapper>
  );
};

// Add Block Menu
const AddBlockMenu = ({ onAdd, position }) => {
  const [open, setOpen] = useState(false);

  const blockTypes = [
    { type: 'heading', icon: Type, label: 'Heading', default: { type: 'heading', level: 'h2', content: '' } },
    { type: 'paragraph', icon: Type, label: 'Paragraph', default: { type: 'paragraph', content: '' } },
    { type: 'callout', icon: Info, label: 'Callout', default: { type: 'callout', calloutType: 'note', title: 'Note', content: '' } },
    { type: 'cardgroup', icon: LayoutGrid, label: 'Card Group', default: { type: 'cardgroup', cards: [] } },
    { type: 'code', icon: Code, label: 'Code Block', default: { type: 'code', language: 'javascript', content: '' } },
    { type: 'steps', icon: ListOrdered, label: 'Steps', default: { type: 'steps', steps: [] } },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-2 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:border-zinc-600 rounded-lg transition-colors opacity-0 hover:opacity-100"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add block</span>
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 z-20 min-w-[200px]">
          {blockTypes.map(({ type, icon: Icon, label, default: defaultBlock }) => (
            <button
              key={type}
              onClick={() => {
                onAdd(position, { ...defaultBlock, id: Date.now().toString() });
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:bg-zinc-700 rounded-lg transition-colors"
            >
              <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Live Editor Component
export const LiveEditor = ({ content, onChange, className = '' }) => {
  const [blocks, setBlocks] = useState([]);

  // Parse markdown to blocks on mount
  useEffect(() => {
    if (content) {
      const parsed = parseMarkdownToBlocks(content);
      setBlocks(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Convert blocks to markdown when they change
  useEffect(() => {
    const markdown = blocksToMarkdown(blocks);
    onChange(markdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const updateBlock = (index, updatedBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    setBlocks(newBlocks);
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
  };

  const moveBlock = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const addBlock = (position, block) => {
    const newBlocks = [...blocks];
    newBlocks.splice(position + 1, 0, block);
    setBlocks(newBlocks);
  };

  const renderBlock = (block, index) => {
    const props = {
      block,
      onChange: (updated) => updateBlock(index, updated),
      onDelete: () => deleteBlock(index),
      onMoveUp: () => moveBlock(index, -1),
      onMoveDown: () => moveBlock(index, 1),
    };

    switch (block.type) {
      case 'heading':
        return <HeadingBlock key={block.id} {...props} />;
      case 'paragraph':
        return <ParagraphBlock key={block.id} {...props} />;
      case 'callout':
        return <CalloutBlock key={block.id} {...props} />;
      case 'cardgroup':
        return <CardGroupBlock key={block.id} {...props} />;
      case 'code':
        return <CodeBlock key={block.id} {...props} />;
      case 'steps':
        return <StepsBlock key={block.id} {...props} />;
      default:
        return <ParagraphBlock key={block.id} {...props} />;
    }
  };

  return (
    <div className={`live-editor ${className}`}>
      <div className="max-w-3xl mx-auto px-12 py-8">
        {blocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 mb-4">Start building your documentation</p>
            <AddBlockMenu onAdd={(_, block) => setBlocks([block])} position={-1} />
          </div>
        ) : (
          <>
            {blocks.map((block, index) => (
              <div key={block.id || index}>
                {renderBlock(block, index)}
                <AddBlockMenu onAdd={addBlock} position={index} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// Parse markdown content to blocks
function parseMarkdownToBlocks(markdown) {
  if (!markdown) return [];
  
  const blocks = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = `h${match[1].length}`;
        blocks.push({ 
          id: Date.now().toString() + blocks.length, 
          type: 'heading', 
          level, 
          content: match[2] 
        });
      }
      i++;
      continue;
    }

    // Callout
    if (line.startsWith('<Callout') || line.startsWith('[!')) {
      let calloutType = 'note';
      let title = 'Note';
      let content = '';

      if (line.startsWith('<Callout')) {
        const typeMatch = line.match(/type="(\w+)"/);
        if (typeMatch) calloutType = typeMatch[1].toLowerCase();
        
        // Find content until </Callout>
        i++;
        while (i < lines.length && !lines[i].includes('</Callout>')) {
          content += lines[i] + '\n';
          i++;
        }
        content = content.trim();
      } else if (line.match(/\[!(NOTE|TIP|WARNING|ERROR|SUCCESS)\]/i)) {
        const typeMatch = line.match(/\[!(\w+)\]/i);
        if (typeMatch) {
          calloutType = typeMatch[1].toLowerCase();
          title = calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
        }
        content = line.replace(/\[!\w+\]\s*/, '');
      }

      blocks.push({ 
        id: Date.now().toString() + blocks.length, 
        type: 'callout', 
        calloutType, 
        title, 
        content 
      });
      i++;
      continue;
    }

    // CardGroup
    if (line.startsWith('<CardGroup>')) {
      const cards = [];
      i++;
      while (i < lines.length && !lines[i].includes('</CardGroup>')) {
        if (lines[i].includes('<Card')) {
          const titleMatch = lines[i].match(/title="([^"]+)"/);
          const iconMatch = lines[i].match(/icon="([^"]+)"/);
          let cardContent = '';
          i++;
          while (i < lines.length && !lines[i].includes('</Card>')) {
            cardContent += lines[i].trim() + ' ';
            i++;
          }
          cards.push({
            id: Date.now().toString() + cards.length,
            title: titleMatch ? titleMatch[1] : 'Card',
            icon: iconMatch ? iconMatch[1] : 'code',
            description: cardContent.trim()
          });
        }
        i++;
      }
      blocks.push({ 
        id: Date.now().toString() + blocks.length, 
        type: 'cardgroup', 
        cards 
      });
      i++;
      continue;
    }

    // Steps
    if (line.startsWith('<Steps>')) {
      const steps = [];
      i++;
      while (i < lines.length && !lines[i].includes('</Steps>')) {
        if (lines[i].includes('<Step')) {
          const titleMatch = lines[i].match(/title="([^"]+)"/);
          let stepContent = '';
          i++;
          while (i < lines.length && !lines[i].includes('</Step>')) {
            stepContent += lines[i].trim() + ' ';
            i++;
          }
          steps.push({
            id: Date.now().toString() + steps.length,
            title: titleMatch ? titleMatch[1] : 'Step',
            content: stepContent.trim()
          });
        }
        i++;
      }
      blocks.push({ 
        id: Date.now().toString() + blocks.length, 
        type: 'steps', 
        steps 
      });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || 'javascript';
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      blocks.push({ 
        id: Date.now().toString() + blocks.length, 
        type: 'code', 
        language, 
        content: codeContent.trim() 
      });
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      blocks.push({ 
        id: Date.now().toString() + blocks.length, 
        type: 'paragraph', 
        content: line.trim() 
      });
    }
    i++;
  }

  return blocks;
}

// Convert blocks back to markdown
function blocksToMarkdown(blocks) {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading':
        const hashes = block.level === 'h1' ? '#' : block.level === 'h2' ? '##' : '###';
        return `${hashes} ${block.content}`;
      
      case 'paragraph':
        return block.content;
      
      case 'callout':
        return `<Callout type="${block.calloutType}">\n${block.content}\n</Callout>`;
      
      case 'cardgroup':
        const cardsMarkdown = (block.cards || []).map(card => 
          `  <Card title="${card.title}" icon="${card.icon}">\n    ${card.description}\n  </Card>`
        ).join('\n');
        return `<CardGroup>\n${cardsMarkdown}\n</CardGroup>`;
      
      case 'code':
        return `\`\`\`${block.language}\n${block.content}\n\`\`\``;
      
      case 'steps':
        const stepsMarkdown = (block.steps || []).map(step => 
          `  <Step title="${step.title}">\n    ${step.content}\n  </Step>`
        ).join('\n');
        return `<Steps>\n${stepsMarkdown}\n</Steps>`;
      
      default:
        return block.content || '';
    }
  }).join('\n\n');
}

export default LiveEditor;
