/**
 * ConfigurationsPanel - Site configuration settings
 * Full docs.json schema with theme, branding, logo, favicon, and navigation
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Palette, Type, Image, Link2, Layout, Sun, Moon, 
  Check, Loader2, ChevronDown, ChevronRight, ExternalLink, Navigation,
  Plus, Trash2, FolderTree, FileText, Globe, Megaphone, Menu,
  Upload, X, Grid3X3, Circle, RefreshCw, GripVertical
} from 'lucide-react';
import { API } from '@/App';
import axios from 'axios';
import { IconButton, getIcon } from '@/components/docs/IconPicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ColorPicker = ({ label, value, onChange, description }) => {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-zinc-600 dark:text-zinc-400">{label}</label>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#1588FC'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-zinc-200 dark:border-zinc-800"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1588FC"
          className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm font-mono"
        />
      </div>
    </div>
  );
};

const ThemeCard = ({ theme, selected, onClick, accentColor }) => {
  const themes = {
    default: { name: 'Default', bg: '#020617', accent: accentColor || '#1588FC' },
    mint: { name: 'Mint', bg: '#020617', accent: '#10b981' },
    dark: { name: 'Dark', bg: '#030712', accent: '#3b82f6' },
    light: { name: 'Light', bg: '#f8fafc', accent: accentColor || '#1588FC' }
  };
  
  const t = themes[theme];
  if (!t) return null;
  
  return (
    <button
      onClick={() => onClick(theme)}
      className={`relative p-3 rounded-xl border-2 transition-all ${
        selected ? 'border-[#1588FC] bg-brand/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:border-zinc-600'
      }`}
      data-testid={`theme-${theme}`}
    >
      <div className="flex gap-1.5 mb-2">
        <div className="w-6 h-6 rounded-md border border-white/10" style={{ backgroundColor: t.bg }} />
        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: t.accent }} />
      </div>
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.name}</span>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-zinc-950 dark:text-white" />
        </div>
      )}
    </button>
  );
};

const BackgroundPatternPicker = ({ value, onChange }) => {
  const patterns = [
    { id: 'none', name: 'None', icon: Circle },
    { id: 'grid', name: 'Grid', icon: Grid3X3 },
    { id: 'dots', name: 'Dots', icon: Circle }
  ];
  
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-600 dark:text-zinc-400">Background Pattern</label>
      <div className="flex gap-2">
        {patterns.map(pattern => (
          <button
            key={pattern.id}
            onClick={() => onChange(pattern.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              value === pattern.id 
                ? 'border-[#1588FC] bg-brand/10 text-zinc-950 dark:text-white' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-600'
            }`}
          >
            <pattern.icon className="w-4 h-4" />
            <span className="text-sm">{pattern.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ImageUploader = ({ label, value, onChange, description, projectId }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', '/branding');
      
      const res = await axios.post(`${API}/projects/${projectId}/assets`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onChange(res.data.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-600 dark:text-zinc-400">{label}</label>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
      
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative group">
            <img 
              src={value} 
              alt={label} 
              className="h-12 w-auto max-w-[120px] object-contain bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 border border-zinc-200 dark:border-zinc-800"
            />
            <button
              onClick={() => onChange('')}
              className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-zinc-950 dark:text-white" />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-12 w-24 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center cursor-pointer hover:border-zinc-300 dark:border-zinc-600 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            ) : (
              <Upload className="w-5 h-5 text-zinc-500" />
            )}
          </div>
        )}
        
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or upload"
          className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm"
        />
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};

// Navigation Group Editor - Supports nested groups
const NavGroupEditor = ({ group, index, onChange, onRemove, depth = 0, onCreateDocument, isDragging }) => {
  const [expanded, setExpanded] = useState(true);
  const [creatingDoc, setCreatingDoc] = useState(null); // Track which page index is being created
  
  const pages = group.pages || [];
  const subgroups = group.groups || [];
  
  const updateGroup = (key, value) => {
    onChange(index, { ...group, [key]: value });
  };
  
  const addPage = () => {
    const newPages = [...pages, { page: '', title: '' }];
    updateGroup('pages', newPages);
  };
  
  const updatePage = (pageIndex, key, value) => {
    const newPages = [...pages];
    newPages[pageIndex] = { ...newPages[pageIndex], [key]: value };
    updateGroup('pages', newPages);
  };
  
  // Create document when title input loses focus (not on every keystroke)
  const handleTitleBlur = async (pageIndex) => {
    const page = pages[pageIndex];
    if (page?.page && page?.title && onCreateDocument) {
      setCreatingDoc(pageIndex);
      try {
        await onCreateDocument(page.page, page.title);
      } catch (error) {
        console.error('Failed to create document:', error);
      } finally {
        setCreatingDoc(null);
      }
    }
  };
  
  const removePage = (pageIndex) => {
    const newPages = pages.filter((_, i) => i !== pageIndex);
    updateGroup('pages', newPages);
  };
  
  const addSubgroup = () => {
    const newSubgroups = [...subgroups, { group: 'New Subgroup', pages: [], groups: [] }];
    updateGroup('groups', newSubgroups);
  };
  
  const updateSubgroup = (subIndex, updatedSubgroup) => {
    const newSubgroups = [...subgroups];
    newSubgroups[subIndex] = updatedSubgroup;
    updateGroup('groups', newSubgroups);
  };
  
  const removeSubgroup = (subIndex) => {
    const newSubgroups = subgroups.filter((_, i) => i !== subIndex);
    updateGroup('groups', newSubgroups);
  };
  
  const canAddSubgroup = depth < 2;
  
  return (
    <div 
      className={`bg-zinc-100 dark:bg-zinc-800/30 rounded-lg p-3 space-y-2 ${depth > 0 ? 'ml-4 border-l-2 border-zinc-200 dark:border-zinc-800' : ''}`} 
      data-testid={`nav-group-${depth}-${index}`}
    >
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="p-0.5">
          {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
        </button>
        <FolderTree className={`w-4 h-4 ${depth === 0 ? 'text-[#1588FC]' : depth === 1 ? 'text-blue-400' : 'text-brand'}`} />
        <input
          type="text"
          value={group.group || ''}
          onChange={(e) => updateGroup('group', e.target.value)}
          placeholder={depth === 0 ? "Section name" : "Subgroup name"}
          className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
        />
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400 transition-colors"
          title="Remove group"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {expanded && (
        <div className="pl-4 space-y-3 mt-2">
          {pages.map((page, pageIndex) => {
            const PageIcon = page.icon ? getIcon(page.icon) : null;
            return (
              <div key={`page-${pageIndex}`} className="p-2 bg-zinc-100 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  {/* Icon Picker for Page */}
                  <IconButton
                    value={page.icon}
                    onChange={(icon) => updatePage(pageIndex, 'icon', icon)}
                    className="w-8 h-8 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={page.title || ''}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const newPages = [...pages];
                      // Generate slug, but prevent it from starting with "api" (reserved for backend routes)
                      let slug = newPages[pageIndex].page || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      if (slug.startsWith('api')) {
                        slug = 'page-' + slug;
                      }
                      newPages[pageIndex] = { 
                        ...newPages[pageIndex], 
                        title: newTitle,
                        page: slug
                      };
                      updateGroup('pages', newPages);
                    }}
                    onBlur={() => handleTitleBlur(pageIndex)}
                    placeholder="Page Title"
                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
                  />
                  {creatingDoc === pageIndex ? (
                    <div className="p-2 flex-shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1588FC]" />
                    </div>
                  ) : (
                    <button
                      onClick={() => removePage(pageIndex)}
                      className="p-2 text-zinc-500 hover:text-rose-600 dark:text-rose-400 flex-shrink-0 transition-colors"
                      title="Remove page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 pl-10">
                  <span className="text-xs text-zinc-500">slug:</span>
                  <input
                    type="text"
                    value={page.page || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Warn if slug starts with "api"
                      if (value.startsWith('api')) {
                        value = 'page-' + value;
                      }
                      updatePage(pageIndex, 'page', value);
                    }}
                    placeholder="page-slug (URL path)"
                    className={`flex-1 px-2 py-1.5 bg-white dark:bg-zinc-900 border rounded text-zinc-600 dark:text-zinc-400 text-xs placeholder:text-zinc-400 dark:text-zinc-600 font-mono ${
                      page.page?.startsWith('api') ? 'border-red-500/50' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  />
                  {page.page?.startsWith('api') && (
                    <span className="text-xs text-rose-600 dark:text-rose-400">Slug cannot start with "api"</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {subgroups.map((subgroup, subIndex) => (
            <NavGroupEditor
              key={`subgroup-${subIndex}`}
              group={subgroup}
              index={subIndex}
              onChange={updateSubgroup}
              onRemove={removeSubgroup}
              depth={depth + 1}
              onCreateDocument={onCreateDocument}
            />
          ))}
          
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={addPage}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Page
            </button>
            {canAddSubgroup && (
              <button
                onClick={addSubgroup}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#1588FC] hover:text-brand-600 transition-colors"
              >
                <FolderTree className="w-3 h-3" />
                Add Subgroup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Sortable Tab Item
const SortableTabItem = ({ tab, index, activeTabIndex, setActiveTabIndex, updateTab, removeTab, tabsLength }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id || `tab-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const TabIcon = tab.icon ? getIcon(tab.icon) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
        activeTabIndex === index 
          ? 'border-[#1588FC] bg-brand/10' 
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:border-zinc-600'
      } ${isDragging ? 'shadow-lg' : ''}`}
      onClick={() => setActiveTabIndex(index)}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-700 dark:text-zinc-300"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      {/* Tab Icon Picker */}
      <div onClick={(e) => e.stopPropagation()}>
        <IconButton
          value={tab.icon}
          onChange={(icon) => updateTab(index, { icon })}
          className="w-9 h-9"
        />
      </div>
      
      {/* Tab Label */}
      <input
        type="text"
        value={tab.label || ''}
        onChange={(e) => updateTab(index, { label: e.target.value })}
        placeholder="Tab label"
        className="flex-1 px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm"
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Delete Tab */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeTab(index);
        }}
        className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400 transition-colors"
        disabled={tabsLength <= 1}
        title="Remove tab"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// Sortable Group Item
const SortableGroupItem = ({ group, index, updateGroup, removeGroup, onCreateDocument }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <NavGroupEditorWithHandle
        group={group}
        index={index}
        onChange={updateGroup}
        onRemove={removeGroup}
        depth={0}
        onCreateDocument={onCreateDocument}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

// NavGroupEditor with drag handle
const NavGroupEditorWithHandle = ({ group, index, onChange, onRemove, depth = 0, onCreateDocument, isDragging, dragHandleProps }) => {
  const [expanded, setExpanded] = useState(true);
  const [creatingDoc, setCreatingDoc] = useState(null);
  
  const pages = group.pages || [];
  const subgroups = group.groups || [];
  
  const updateGroup = (key, value) => {
    onChange(index, { ...group, [key]: value });
  };
  
  const addPage = () => {
    const newPages = [...pages, { page: '', title: '' }];
    updateGroup('pages', newPages);
  };
  
  const updatePage = (pageIndex, key, value) => {
    const newPages = [...pages];
    newPages[pageIndex] = { ...newPages[pageIndex], [key]: value };
    updateGroup('pages', newPages);
  };
  
  const handleTitleBlur = async (pageIndex) => {
    const page = pages[pageIndex];
    if (page?.page && page?.title && onCreateDocument) {
      setCreatingDoc(pageIndex);
      try {
        await onCreateDocument(page.page, page.title);
      } catch (error) {
        console.error('Failed to create document:', error);
      } finally {
        setCreatingDoc(null);
      }
    }
  };
  
  const removePage = (pageIndex) => {
    const newPages = pages.filter((_, i) => i !== pageIndex);
    updateGroup('pages', newPages);
  };
  
  const addSubgroup = () => {
    const newSubgroups = [...subgroups, { group: 'New Subgroup', pages: [], groups: [] }];
    updateGroup('groups', newSubgroups);
  };
  
  const updateSubgroup = (subIndex, updatedSubgroup) => {
    const newSubgroups = [...subgroups];
    newSubgroups[subIndex] = updatedSubgroup;
    updateGroup('groups', newSubgroups);
  };
  
  const removeSubgroup = (subIndex) => {
    const newSubgroups = subgroups.filter((_, i) => i !== subIndex);
    updateGroup('groups', newSubgroups);
  };
  
  const canAddSubgroup = depth < 2;

  return (
    <div 
      className={`bg-zinc-100 dark:bg-zinc-800/30 rounded-lg p-3 space-y-2 ${depth > 0 ? 'ml-4 border-l-2 border-zinc-200 dark:border-zinc-800' : ''} ${isDragging ? 'shadow-lg ring-2 ring-[#1588FC]' : ''}`} 
      data-testid={`nav-group-${depth}-${index}`}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle - only for top-level groups */}
        {depth === 0 && dragHandleProps && (
          <button
            {...dragHandleProps}
            className="p-1 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-700 dark:text-zinc-300"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => setExpanded(!expanded)} className="p-0.5">
          {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
        </button>
        <FolderTree className={`w-4 h-4 ${depth === 0 ? 'text-[#1588FC]' : depth === 1 ? 'text-blue-400' : 'text-brand'}`} />
        <input
          type="text"
          value={group.group || ''}
          onChange={(e) => updateGroup('group', e.target.value)}
          placeholder={depth === 0 ? "Section name" : "Subgroup name"}
          className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
        />
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400 transition-colors"
          title="Remove group"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {expanded && (
        <div className="pl-4 space-y-3 mt-2">
          {pages.map((page, pageIndex) => {
            const PageIcon = page.icon ? getIcon(page.icon) : null;
            return (
              <div key={`page-${pageIndex}`} className="p-2 bg-zinc-100 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <IconButton
                    value={page.icon}
                    onChange={(icon) => updatePage(pageIndex, 'icon', icon)}
                    className="w-8 h-8 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={page.title || ''}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const newPages = [...pages];
                      // Generate slug, prevent "api" prefix
                      let slug = newPages[pageIndex].page || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      if (slug.startsWith('api')) {
                        slug = 'page-' + slug;
                      }
                      newPages[pageIndex] = { 
                        ...newPages[pageIndex], 
                        title: newTitle,
                        page: slug
                      };
                      updateGroup('pages', newPages);
                    }}
                    onBlur={() => handleTitleBlur(pageIndex)}
                    placeholder="Page title"
                    className="flex-1 px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
                  />
                  {creatingDoc === pageIndex && (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  )}
                  <button
                    onClick={() => removePage(pageIndex)}
                    className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400 transition-colors"
                    title="Remove page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 ml-10">
                  <span className="text-xs text-zinc-500">slug:</span>
                  <input
                    type="text"
                    value={page.page || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.startsWith('api')) {
                        value = 'page-' + value;
                      }
                      updatePage(pageIndex, 'page', value);
                    }}
                    onBlur={() => handleTitleBlur(pageIndex)}
                    placeholder="page-slug"
                    className={`flex-1 px-2 py-1 bg-white dark:bg-zinc-900 border rounded text-zinc-600 dark:text-zinc-400 text-xs font-mono ${
                      page.page?.startsWith('api') ? 'border-red-500/50' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  />
                  {page.page?.startsWith('api') && (
                    <span className="text-xs text-rose-600 dark:text-rose-400 whitespace-nowrap">Cannot start with "api"</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {subgroups.map((subgroup, subIndex) => (
            <NavGroupEditor
              key={`subgroup-${subIndex}`}
              group={subgroup}
              index={subIndex}
              onChange={updateSubgroup}
              onRemove={removeSubgroup}
              depth={depth + 1}
              onCreateDocument={onCreateDocument}
            />
          ))}
          
          <div className="flex items-center gap-2">
            <button
              onClick={addPage}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Page
            </button>
            {canAddSubgroup && (
              <button
                onClick={addSubgroup}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#1588FC] hover:text-brand-600 transition-colors"
              >
                <FolderTree className="w-3 h-3" />
                Add Subgroup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Navigation Editor Component - Supports tabs-based structure
const NavigationEditor = ({ navigation, onChange, onCreateDocument }) => {
  const [viewMode, setViewMode] = useState('visual');
  const [jsonError, setJsonError] = useState(null);
  const [localJson, setLocalJson] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Support both old (groups only) and new (tabs with groups) structure
  const tabs = navigation?.tabs || [{ id: 'docs', label: 'Documentation', groups: navigation?.groups || [] }];
  const jsonValue = JSON.stringify(navigation || { tabs: [] }, null, 2);
  
  
  const handleViewModeChange = (mode) => {
    if (mode === 'json') {
      setLocalJson(jsonValue);
      setJsonError(null);
    }
    setViewMode(mode);
  };
  
  // Tab management
  const addTab = () => {
    const newTabs = [...tabs, { id: `tab-${Date.now()}`, label: 'New Section', icon: '', groups: [] }];
    onChange({ ...navigation, tabs: newTabs });
  };
  
  const updateTab = (index, updates) => {
    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], ...updates };
    onChange({ ...navigation, tabs: newTabs });
  };
  
  const removeTab = (index) => {
    const newTabs = tabs.filter((_, i) => i !== index);
    onChange({ ...navigation, tabs: newTabs });
    if (activeTabIndex >= newTabs.length) {
      setActiveTabIndex(Math.max(0, newTabs.length - 1));
    }
  };
  
  // Group management within active tab
  const addGroup = () => {
    const newTabs = [...tabs];
    const currentGroups = newTabs[activeTabIndex]?.groups || [];
    newTabs[activeTabIndex] = {
      ...newTabs[activeTabIndex],
      groups: [...currentGroups, { group: 'New Group', pages: [] }]
    };
    onChange({ ...navigation, tabs: newTabs });
  };
  
  const updateGroup = (groupIndex, updatedGroup) => {
    const newTabs = [...tabs];
    const groups = [...(newTabs[activeTabIndex]?.groups || [])];
    groups[groupIndex] = updatedGroup;
    newTabs[activeTabIndex] = { ...newTabs[activeTabIndex], groups };
    onChange({ ...navigation, tabs: newTabs });
  };
  
  const removeGroup = (groupIndex) => {
    const newTabs = [...tabs];
    const groups = (newTabs[activeTabIndex]?.groups || []).filter((_, i) => i !== groupIndex);
    newTabs[activeTabIndex] = { ...newTabs[activeTabIndex], groups };
    onChange({ ...navigation, tabs: newTabs });
  };
  
  // Handle tab reordering
  const handleTabDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = tabs.findIndex(t => (t.id || `tab-${tabs.indexOf(t)}`) === active.id);
    const newIndex = tabs.findIndex(t => (t.id || `tab-${tabs.indexOf(t)}`) === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newTabs = arrayMove(tabs, oldIndex, newIndex);
      onChange({ ...navigation, tabs: newTabs });
      // Update active tab index if needed
      if (activeTabIndex === oldIndex) {
        setActiveTabIndex(newIndex);
      } else if (oldIndex < activeTabIndex && newIndex >= activeTabIndex) {
        setActiveTabIndex(activeTabIndex - 1);
      } else if (oldIndex > activeTabIndex && newIndex <= activeTabIndex) {
        setActiveTabIndex(activeTabIndex + 1);
      }
    }
  };
  
  // Handle group reordering within active tab
  const handleGroupDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const groups = currentTab.groups || [];
    const oldIndex = parseInt(active.id.replace('group-', ''));
    const newIndex = parseInt(over.id.replace('group-', ''));
    
    if (!isNaN(oldIndex) && !isNaN(newIndex)) {
      const newGroups = arrayMove(groups, oldIndex, newIndex);
      const newTabs = [...tabs];
      newTabs[activeTabIndex] = { ...newTabs[activeTabIndex], groups: newGroups };
      onChange({ ...navigation, tabs: newTabs });
    }
  };
  
  const handleJsonChange = (value) => {
    setLocalJson(value);
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);
      onChange(parsed);
    } catch (e) {
      setJsonError('Invalid JSON');
    }
  };
  
  const currentTab = tabs[activeTabIndex] || { groups: [] };
  
  return (
    <div className="space-y-4" data-testid="navigation-editor">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => handleViewModeChange('visual')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            viewMode === 'visual' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
          data-testid="nav-visual-mode-btn"
        >
          Visual
        </button>
        <button
          onClick={() => handleViewModeChange('json')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            viewMode === 'json' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
          data-testid="nav-json-mode-btn"
        >
          JSON
        </button>
      </div>
      
      {viewMode === 'visual' ? (
        <div className="space-y-4">
          {/* Top Tabs Section */}
          <div className="bg-zinc-100 dark:bg-zinc-800/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Top Navigation Tabs
              </label>
              <span className="text-xs text-zinc-400 dark:text-zinc-600 flex items-center gap-1">
                <GripVertical className="w-3 h-3" /> Drag to reorder
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Each tab shows different content in the left sidebar. Users click tabs to switch sections.
            </p>
            
            {/* Tab List - Sortable */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTabDragEnd}
            >
              <SortableContext
                items={tabs.map((t, i) => t.id || `tab-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 mb-3">
                  {tabs.map((tab, index) => (
                    <SortableTabItem
                      key={tab.id || `tab-${index}`}
                      tab={tab}
                      index={index}
                      activeTabIndex={activeTabIndex}
                      setActiveTabIndex={setActiveTabIndex}
                      updateTab={updateTab}
                      removeTab={removeTab}
                      tabsLength={tabs.length}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            <button
              onClick={addTab}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#1588FC] hover:text-brand-600"
            >
              <Plus className="w-3 h-3" />
              Add Tab
            </button>
          </div>
          
          {/* Groups for Active Tab */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                "{currentTab.label}" Sidebar Content
              </label>
              <span className="text-xs text-zinc-400 dark:text-zinc-600 flex items-center gap-1">
                <GripVertical className="w-3 h-3" /> Drag to reorder
              </span>
            </div>
            
            {/* Groups - Sortable */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGroupDragEnd}
            >
              <SortableContext
                items={(currentTab.groups || []).map((_, i) => `group-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {(currentTab.groups || []).map((group, index) => (
                    <SortableGroupItem
                      key={`group-${index}`}
                      group={group}
                      index={index}
                      updateGroup={updateGroup}
                      removeGroup={removeGroup}
                      onCreateDocument={onCreateDocument}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
              
            <button
              onClick={addGroup}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:border-zinc-600 transition-colors"
              data-testid="add-nav-group-btn"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Group to "{currentTab.label}"</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={localJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={`w-full h-80 px-3 py-2 bg-white dark:bg-zinc-900 border rounded-lg text-zinc-700 dark:text-zinc-300 font-mono text-xs resize-none ${
              jsonError ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'
            }`}
            spellCheck="false"
            data-testid="nav-json-textarea"
          />
          {jsonError && <p className="text-xs text-rose-600 dark:text-rose-400">{jsonError}</p>}
          <p className="text-xs text-zinc-500">
            Structure: {`{ "tabs": [{ "id": "...", "label": "Tab Name", "icon": "book", "groups": [...] }] }`}
          </p>
        </div>
      )}
    </div>
  );
};

// Top Navigation (Navbar) Editor
const NavbarEditor = ({ navbar, onChange }) => {
  const links = navbar?.links || [];
  const primary = navbar?.primary || {};
  
  const addLink = () => {
    const newLinks = [...links, { label: '', href: '' }];
    onChange({ ...navbar, links: newLinks });
  };
  
  const updateLink = (index, key, value) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [key]: value };
    onChange({ ...navbar, links: newLinks });
  };
  
  const removeLink = (index) => {
    const newLinks = links.filter((_, i) => i !== index);
    onChange({ ...navbar, links: newLinks });
  };
  
  const updatePrimary = (key, value) => {
    onChange({ ...navbar, primary: { ...primary, [key]: value } });
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
          Header Links
        </label>
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(index, 'label', e.target.value)}
                placeholder="Label"
                className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
              />
              <input
                type="text"
                value={link.href}
                onChange={(e) => updateLink(index, 'href', e.target.value)}
                placeholder="https://..."
                className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
              />
              <button onClick={() => removeLink(index)} className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addLink}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          >
            <Plus className="w-3 h-3" />
            Add Link
          </button>
        </div>
      </div>
      
      <div>
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
          Primary CTA Button
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={primary.label || ''}
            onChange={(e) => updatePrimary('label', e.target.value)}
            placeholder="Get Started"
            className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
          />
          <input
            type="text"
            value={primary.href || ''}
            onChange={(e) => updatePrimary('href', e.target.value)}
            placeholder="https://..."
            className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500"
          />
        </div>
      </div>
    </div>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${checked ? 'translate-x-4' : ''}`} />
    </button>
  </div>
);

export const ConfigurationsPanel = ({ projectId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({});
  const [activeSection, setActiveSection] = useState('details');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/config`);
      setConfig(res.data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setConfig({
        site_title: '',
        site_description: '',
        primary_color: '#1588FC',
        theme: 'default',
        background_pattern: 'grid',
        toc_enabled: true,
        search_enabled: true,
        navigation: { groups: [] }
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/projects/${projectId}/config`, config);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Create a blank document when a page is added in navigation
  const createDocument = async (slug, title) => {
    try {
      // Check if document with this slug already exists
      const checkRes = await axios.get(`${API}/projects/${projectId}/documents`);
      const existingDoc = checkRes.data.find(d => d.slug === slug);
      
      if (existingDoc) {
        console.log(`Document "${slug}" already exists, skipping creation`);
        return existingDoc;
      }
      
      // Create new blank document
      const response = await axios.post(`${API}/projects/${projectId}/documents`, {
        title: title,
        slug: slug,
        content: `# ${title}\n\nStart writing your documentation here...`
      });
      
      console.log(`Created document "${title}" with slug "${slug}"`);
      return response.data;
    } catch (error) {
      console.error('Failed to create document:', error);
      throw error;
    }
  };

  // Sync all pages from navigation config - create missing documents
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const syncAllPages = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      // Get all existing documents
      const docsRes = await axios.get(`${API}/projects/${projectId}/documents`);
      const existingSlugs = new Set(docsRes.data.map(d => d.slug?.toLowerCase().trim()).filter(Boolean));
      
      console.log('Existing slugs:', [...existingSlugs]);
      
      // Extract all UNIQUE pages from navigation config
      const pageMap = new Map(); // Use Map to deduplicate by slug
      
      const extractPages = (groups) => {
        if (!groups) return;
        for (const group of groups) {
          if (group.pages) {
            for (const page of group.pages) {
              const slug = page.page?.toLowerCase().trim();
              const title = page.title?.trim();
              
              // Only add if slug and title exist and slug not already in map
              if (slug && title && !pageMap.has(slug)) {
                pageMap.set(slug, { slug: page.page.trim(), title });
              }
            }
          }
          if (group.groups) {
            extractPages(group.groups);
          }
        }
      };
      
      // Check both tabs structure and direct groups
      if (config.navigation?.tabs) {
        for (const tab of config.navigation.tabs) {
          extractPages(tab.groups);
        }
      }
      if (config.navigation?.groups) {
        extractPages(config.navigation.groups);
      }
      
      const allPages = [...pageMap.values()];
      console.log('Unique pages to sync:', allPages);
      
      // Create missing documents
      let created = 0;
      let skipped = 0;
      const createdSlugs = new Set(); // Track what we've created in this session
      
      for (const page of allPages) {
        const normalizedSlug = page.slug.toLowerCase().trim();
        
        // Skip if exists in DB or already created in this sync
        if (existingSlugs.has(normalizedSlug) || createdSlugs.has(normalizedSlug)) {
          skipped++;
          console.log(`Skipped (exists): ${page.slug}`);
          continue;
        }
        
        try {
          await axios.post(`${API}/projects/${projectId}/documents`, {
            title: page.title,
            slug: page.slug,
            content: `# ${page.title}\n\nStart writing your documentation here...`
          });
          created++;
          createdSlugs.add(normalizedSlug); // Mark as created
          console.log(`Created: ${page.slug}`);
        } catch (err) {
          // Check if it's a duplicate error from backend
          if (err.response?.status === 400 && err.response?.data?.detail?.includes('exists')) {
            skipped++;
            console.log(`Skipped (backend says exists): ${page.slug}`);
          } else {
            console.error(`Failed to create ${page.slug}:`, err);
          }
        }
      }
      
      setSyncResult({ created, skipped, total: allPages.length });
    } catch (error) {
      console.error('Failed to sync pages:', error);
      setSyncResult({ error: 'Failed to sync pages' });
    } finally {
      setSyncing(false);
    }
  };

  const sections = [
    { id: 'details', icon: Type, label: 'Site Details' },
    { id: 'branding', icon: Image, label: 'Branding & Logo' },
    { id: 'theme', icon: Palette, label: 'Theme & Colors' },
    { id: 'layout', icon: Layout, label: 'Layout Options' },
    { id: 'navbar', icon: Menu, label: 'Top Navigation' },
    { id: 'navigation', icon: FolderTree, label: 'Sidebar Navigation' }
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-600 dark:text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold text-zinc-950 dark:text-white">Site Configuration</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand hover:bg-brand-600-600 disabled:opacity-50 text-zinc-950 dark:text-white text-sm rounded-md transition-colors"
            data-testid="save-config-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {sections.map(section => (
          <section key={section.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === section.id ? '' : section.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span className="flex items-center gap-3 text-zinc-950 dark:text-white font-medium">
                <section.icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                {section.label}
              </span>
              <ChevronDown className={`w-4 h-4 text-zinc-600 dark:text-zinc-400 transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`} />
            </button>
            
            {activeSection === section.id && (
              <div className="p-4 space-y-4 border-t border-zinc-200 dark:border-zinc-800">
                {section.id === 'details' && (
                  <>
                    <div>
                      <label className="text-sm text-zinc-600 dark:text-zinc-400 mb-1 block">Site Title</label>
                      <input
                        type="text"
                        value={config.site_title || ''}
                        onChange={(e) => updateConfig('site_title', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm"
                        placeholder="Emergent Docs"
                        data-testid="site-title-input"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-600 dark:text-zinc-400 mb-1 block">Description</label>
                      <textarea
                        value={config.site_description || ''}
                        onChange={(e) => updateConfig('site_description', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm resize-none"
                        rows={3}
                        placeholder="Documentation for your platform"
                      />
                    </div>
                  </>
                )}

                {section.id === 'branding' && (
                  <>
                    <ImageUploader
                      label="Logo (Dark Mode)"
                      description="Used when dark theme is active"
                      value={config.logo_dark_url}
                      onChange={(url) => updateConfig('logo_dark_url', url)}
                      projectId={projectId}
                    />
                    <ImageUploader
                      label="Logo (Light Mode)"
                      description="Used when light theme is active (optional)"
                      value={config.logo_light_url}
                      onChange={(url) => updateConfig('logo_light_url', url)}
                      projectId={projectId}
                    />
                    <ImageUploader
                      label="Favicon"
                      description="Browser tab icon (32x32 recommended)"
                      value={config.favicon_url}
                      onChange={(url) => updateConfig('favicon_url', url)}
                      projectId={projectId}
                    />
                    <div>
                      <label className="text-sm text-zinc-600 dark:text-zinc-400 mb-1 block">Logo Link</label>
                      <input
                        type="text"
                        value={config.logo_link || '/'}
                        onChange={(e) => updateConfig('logo_link', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm"
                        placeholder="/"
                      />
                    </div>
                  </>
                )}

                {section.id === 'theme' && (
                  <>
                    <div>
                      <label className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 block">Theme Preset</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['default', 'mint', 'dark', 'light'].map(theme => (
                          <ThemeCard
                            key={theme}
                            theme={theme}
                            selected={config.theme === theme}
                            onClick={(t) => updateConfig('theme', t)}
                            accentColor={config.primary_color}
                          />
                        ))}
                      </div>
                    </div>
                    <ColorPicker
                      label="Primary Accent Color"
                      description="Used for highlights, links, and active states"
                      value={config.primary_color || '#1588FC'}
                      onChange={(c) => updateConfig('primary_color', c)}
                    />
                    <BackgroundPatternPicker
                      value={config.background_pattern || 'grid'}
                      onChange={(p) => updateConfig('background_pattern', p)}
                    />
                  </>
                )}

                {section.id === 'layout' && (
                  <>
                    <ToggleSwitch
                      label="Table of Contents (Right Sidebar)"
                      checked={config.toc_enabled !== false}
                      onChange={(v) => updateConfig('toc_enabled', v)}
                    />
                    <ToggleSwitch
                      label="Search (⌘K)"
                      checked={config.search_enabled !== false}
                      onChange={(v) => updateConfig('search_enabled', v)}
                    />
                    <ToggleSwitch
                      label="Top Navigation Bar"
                      checked={config.top_nav_enabled !== false}
                      onChange={(v) => updateConfig('top_nav_enabled', v)}
                    />
                  </>
                )}

                {section.id === 'navbar' && (
                  <NavbarEditor
                    navbar={config.navbar}
                    onChange={(nav) => updateConfig('navbar', nav)}
                  />
                )}

                {section.id === 'navigation' && (
                  <>
                    <p className="text-xs text-zinc-500 mb-3">
                      Define the sidebar navigation structure. Supports up to 3 levels of nesting. Adding a page title will automatically create a blank document.
                    </p>
                    
                    {/* Sync All Pages Button */}
                    <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Sync Missing Pages</p>
                          <p className="text-xs text-zinc-500">Create blank documents for all pages in navigation that don't exist yet</p>
                        </div>
                        <button
                          onClick={syncAllPages}
                          disabled={syncing}
                          className="flex items-center gap-2 px-3 py-1.5 bg-brand hover:bg-brand-600 disabled:opacity-50 text-zinc-950 dark:text-white text-xs rounded-md transition-colors"
                          data-testid="sync-pages-btn"
                        >
                          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          {syncing ? 'Syncing...' : 'Sync Pages'}
                        </button>
                      </div>
                      {syncResult && (
                        <div className={`mt-2 text-xs ${syncResult.error ? 'text-rose-600 dark:text-rose-400' : 'text-brand'}`}>
                          {syncResult.error 
                            ? syncResult.error 
                            : `✓ Created ${syncResult.created} new pages (${syncResult.skipped} already existed)`
                          }
                        </div>
                      )}
                    </div>
                    
                    <NavigationEditor
                      navigation={config.navigation}
                      onChange={(nav) => updateConfig('navigation', nav)}
                      onCreateDocument={createDocument}
                    />
                  </>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default ConfigurationsPanel;
