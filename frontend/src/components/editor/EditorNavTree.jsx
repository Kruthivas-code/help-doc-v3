/**
 * EditorNavTree — sortable Tab > Group > Page tree for the admin editor sidebar.
 *
 * Capabilities:
 *   - Drag-and-drop within siblings at every level (tabs, groups, pages).
 *   - Inline rename for Tab labels and Group labels (click pencil or label).
 *   - Add new Tab (top button), new Group (per-tab +), new Page (per-group +).
 *   - 3-dot menus on Tabs and Groups for Rename / Delete (with confirm).
 *   - Page rows get a 3-dot button -> PageMetaDialog for full metadata edits.
 *
 * Persistence (parent-supplied callbacks):
 *   onSaveNavConfig(newConfig) -> PUT  /projects/{pid}/config
 *   onSaveDocument(id, updates) -> PUT  /projects/{pid}/documents/{id}
 *   onDeleteDocument(id)        -> DELETE /projects/{pid}/documents/{id}
 *   onCreatePage(slug, title, tabIndex, groupIndex)
 *                              -> POST /projects/{pid}/documents + nav append.
 */
import { useState, useCallback, useMemo, useRef, useEffect, Fragment } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown, ChevronRight, FolderOpen, FileText,
  GripVertical, MoreHorizontal, Loader2,
  Plus, Pencil, Trash2,
} from 'lucide-react';
import { getIcon } from '@/components/docs/IconPicker';
import { PageMetaDialog } from './PageMetaDialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const cx = (...c) => c.filter(Boolean).join(' ');

// ----- Tiny inline-edit input that swaps in over a label -----
const InlineEditable = ({ value, onCommit, onCancel, autoFocus = true, placeholder }) => {
  const ref = useRef(null);
  const [draft, setDraft] = useState(value || '');
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [autoFocus]);
  const commit = () => onCommit((draft || '').trim() || value);
  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
      }}
      placeholder={placeholder}
      className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white"
      onClick={(e) => e.stopPropagation()}
    />
  );
};

// ---------- Sortable Page Row ----------
const SortablePage = ({
  page, pageId, doc, isActive, isMissing, isDeleting,
  onSelect, onOpenMeta, onRemovePage,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pageId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const slug = typeof page === 'string' ? page : page.page;
  const PageIcon = doc?.icon ? getIcon(doc.icon) : (page.icon ? getIcon(page.icon) : FileText);
  const pageTitle = doc?.title || (typeof page === 'string' ? page : page.title) || (typeof page === 'string' ? page : page.page);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        'group flex items-center gap-1 rounded-lg transition-colors pr-1',
        isActive
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white'
          : isMissing
            ? 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/30'
            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-white',
      )}
      data-testid={`nav-page-${(typeof page === 'string' ? page : page.page)}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="px-1 py-1.5 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Drag to reorder"
        data-testid="page-drag-handle"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => doc && onSelect(doc.id)}
        disabled={isMissing}
        className="flex-1 flex items-center gap-2 px-1 py-1.5 text-left min-w-0"
        title={isMissing ? `Document "${typeof page === 'string' ? page : page.page}" not found` : pageTitle}
      >
        <PageIcon className={cx('w-3.5 h-3.5 flex-shrink-0', isMissing && 'text-rose-600 dark:text-rose-400/50')} />
        <span className={cx('text-sm truncate', isMissing && 'italic')}>{pageTitle}</span>
        {isMissing && <span className="text-[10px] text-rose-600 dark:text-rose-400/70">missing</span>}
      </button>
      {doc && !isDeleting && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenMeta(doc); }}
          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all flex-shrink-0"
          title="Page settings"
          data-testid={`page-menu-${doc.slug}`}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}
      {doc && isDeleting && (
        <div className="p-1.5 flex-shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
        </div>
      )}
      {isMissing && onRemovePage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Remove "${slug}" from the navigation? There is no document behind this entry, so nothing else is deleted.`)) {
              onRemovePage();
            }
          }}
          className="p-1.5 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all flex-shrink-0"
          title="Remove missing page from navigation"
          data-testid={`remove-missing-page-${slug}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// ---------- Sortable Group ----------
const SortableGroup = ({
  group, groupId, tabPath,
  documents, docId, expanded, setExpanded,
  deletingDocId, onSelect, onOpenMeta, onPagesReorder,
  onRenameGroup, onDeleteGroup, onCreatePage, onRemovePage,
}) => {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: groupId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const isOpen = expanded[groupId] !== false;
  const pages = group.pages || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const getDocForSlug = (slug) => documents.find((d) => d.slug?.toLowerCase() === slug?.toLowerCase());

  const handlePageDrag = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = pages.map((p, i) => `${groupId}::page::${i}::${typeof p === 'string' ? p : p.page}`);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onPagesReorder(tabPath, group, arrayMove(pages, oldIndex, newIndex));
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div className="group flex items-center gap-1 pr-1">
        <button
          {...attributes}
          {...listeners}
          className="px-1 py-1.5 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Drag group"
          data-testid="group-drag-handle"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        {editing ? (
          <div className="flex-1 flex items-center gap-1 py-1">
            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
            <InlineEditable
              value={group.group || ''}
              onCommit={(v) => { setEditing(false); if (v !== group.group) onRenameGroup?.(tabPath, v); }}
              onCancel={() => setEditing(false)}
              placeholder="Group name"
            />
          </div>
        ) : (
          <button
            onClick={() => setExpanded((prev) => ({ ...prev, [groupId]: !isOpen }))}
            onDoubleClick={() => setEditing(true)}
            className="flex-1 flex items-center gap-2 px-1 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors min-w-0"
            data-testid={`group-${group.group || 'unnamed'}`}
            title="Double-click to rename"
          >
            {isOpen ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
            <span className="text-xs font-medium truncate">{group.group || 'Unnamed Group'}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-auto flex-shrink-0">{pages.length}</span>
          </button>
        )}
        {!editing && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onCreatePage?.(tabPath); }}
              className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
              title="New page in this group"
              data-testid={`group-add-page-${group.group || 'unnamed'}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                  onClick={(e) => e.stopPropagation()}
                  title="Group menu"
                  data-testid={`group-menu-${group.group || 'unnamed'}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-zinc-900">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-rose-600 dark:text-rose-400 focus:text-rose-700"
                  onClick={() => {
                    if (window.confirm(`Delete group "${group.group}"? Pages inside it will become unlinked but won't be deleted.`)) {
                      onDeleteGroup?.(tabPath);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="ml-4 space-y-0.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageDrag}>
            <SortableContext
              items={pages.map((p, i) => `${groupId}::page::${i}::${typeof p === 'string' ? p : p.page}`)}
              strategy={verticalListSortingStrategy}
            >
              {pages.map((page, idx) => {
                const slug = typeof page === 'string' ? page : page.page;
                const doc = getDocForSlug(slug);
                const pageId = `${groupId}::page::${idx}::${slug}`;
                return (
                  <SortablePage
                    key={pageId}
                    pageId={pageId}
                    page={page}
                    doc={doc}
                    isActive={doc?.id === docId}
                    isMissing={!doc}
                    isDeleting={deletingDocId === doc?.id}
                    onSelect={onSelect}
                    onOpenMeta={onOpenMeta}
                    onRemovePage={onRemovePage ? () => onRemovePage(tabPath, slug) : undefined}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

// ---------- Sortable Tab ----------
const SortableTab = ({
  tab, tabId, tabIndex,
  documents, docId, expanded, setExpanded,
  deletingDocId, onSelect, onOpenMeta, onGroupsReorder, onPagesReorder,
  onRenameTab, onDeleteTab, onAddGroup,
  onRenameGroup, onDeleteGroup, onCreatePage, onRemovePage,
}) => {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tabId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const isOpen = expanded[tabId] !== false;
  const groups = tab.groups || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleGroupDrag = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = groups.map((g, i) => `${tabId}::group::${i}::${g.group || ''}`);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onGroupsReorder(tabIndex, arrayMove(groups, oldIndex, newIndex));
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <div className="group flex items-center gap-1 pr-1">
        <button
          {...attributes}
          {...listeners}
          className="px-1 py-1.5 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Drag tab"
          data-testid="tab-drag-handle"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        {editing ? (
          <div className="flex-1 flex items-center gap-1 py-1">
            <span className="px-1.5 py-0.5 bg-brand/10 rounded text-[10px] text-brand">TAB</span>
            <InlineEditable
              value={tab.label || tab.id || ''}
              onCommit={(v) => { setEditing(false); if (v !== tab.label) onRenameTab?.(tabIndex, v); }}
              onCancel={() => setEditing(false)}
              placeholder="Tab name"
            />
          </div>
        ) : (
          <button
            onClick={() => setExpanded((prev) => ({ ...prev, [tabId]: !isOpen }))}
            onDoubleClick={() => setEditing(true)}
            className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-brand uppercase tracking-wider hover:text-brand-600 min-w-0"
            title="Double-click to rename"
            data-testid={`tab-${tab.id || tab.label}`}
          >
            {isOpen ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
            <span className="px-1.5 py-0.5 bg-brand/10 rounded text-[10px] flex-shrink-0">TAB</span>
            <span className="truncate">{tab.label || tab.id}</span>
          </button>
        )}
        {!editing && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onAddGroup?.(tabIndex); }}
              className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
              title="New folder in this tab"
              data-testid={`tab-add-group-${tab.id || tab.label}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                  onClick={(e) => e.stopPropagation()}
                  title="Tab menu"
                  data-testid={`tab-menu-${tab.id || tab.label}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-zinc-900">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-rose-600 dark:text-rose-400 focus:text-rose-700"
                  onClick={() => {
                    if (window.confirm(`Delete tab "${tab.label}"? Its folders and page references will be removed (documents themselves stay).`)) {
                      onDeleteTab?.(tabIndex);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete tab
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {isOpen && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDrag}>
          <SortableContext
            items={groups.map((g, i) => `${tabId}::group::${i}::${g.group || ''}`)}
            strategy={verticalListSortingStrategy}
          >
            {groups.map((group, gIdx) => {
              const groupId = `${tabId}::group::${gIdx}::${group.group || ''}`;
              return (
                <SortableGroup
                  key={groupId}
                  groupId={groupId}
                  group={group}
                  tabPath={{ tabIndex, groupIndex: gIdx }}
                  documents={documents}
                  docId={docId}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  deletingDocId={deletingDocId}
                  onSelect={onSelect}
                  onOpenMeta={onOpenMeta}
                  onPagesReorder={onPagesReorder}
                  onRenameGroup={onRenameGroup}
                  onDeleteGroup={onDeleteGroup}
                  onCreatePage={onCreatePage}
                  onRemovePage={onRemovePage}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

// ---------- Top-level EditorNavTree ----------
export const EditorNavTree = ({
  navConfig,
  documents,
  docId,
  deletingDocId,
  onSelect,           // (docId) => void
  onSaveNavConfig,    // (newConfig) => Promise<void>
  onSaveDocument,     // (docId, updates) => Promise<void>
  onDeleteDocument,   // (docId) => Promise<void>
  onCreatePage,       // (tabPath) => Promise<void>  - creates a new doc + appends slug to nav
}) => {
  const [expanded, setExpanded] = useState({});
  const [metaDocId, setMetaDocId] = useState(null);
  const metaDoc = useMemo(
    () => documents.find((d) => d.id === metaDocId) || null,
    [metaDocId, documents],
  );

  const tabs = useMemo(() => navConfig?.tabs || [], [navConfig]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleTabDrag = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = tabs.map((t, i) => `tab::${i}::${t.id || t.label || ''}`);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newTabs = arrayMove(tabs, oldIndex, newIndex);
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  const handleGroupsReorder = useCallback((tabIndex, newGroups) => {
    const newTabs = tabs.map((t, i) => (i === tabIndex ? { ...t, groups: newGroups } : t));
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  const handlePagesReorder = useCallback((tabPath, _group, newPages) => {
    const { tabIndex, groupIndex } = tabPath;
    const newTabs = tabs.map((t, ti) => {
      if (ti !== tabIndex) return t;
      const newGroups = (t.groups || []).map((g, gi) =>
        gi === groupIndex ? { ...g, pages: newPages } : g,
      );
      return { ...t, groups: newGroups };
    });
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  // ----- Tab mutators -----
  const handleAddTab = useCallback(() => {
    const newTab = {
      id: `tab-${Date.now()}`,
      label: 'New Tab',
      groups: [{ group: 'New Group', pages: [] }],
    };
    onSaveNavConfig({ ...(navConfig || {}), tabs: [...tabs, newTab] });
  }, [tabs, navConfig, onSaveNavConfig]);

  const handleRenameTab = useCallback((tabIndex, newLabel) => {
    const newTabs = tabs.map((t, i) => (i === tabIndex ? { ...t, label: newLabel } : t));
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  const handleDeleteTab = useCallback((tabIndex) => {
    const newTabs = tabs.filter((_, i) => i !== tabIndex);
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  // ----- Group mutators -----
  const handleAddGroup = useCallback((tabIndex) => {
    const newTabs = tabs.map((t, i) => {
      if (i !== tabIndex) return t;
      return { ...t, groups: [...(t.groups || []), { group: 'New Group', pages: [] }] };
    });
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  const handleRenameGroup = useCallback((tabPath, newName) => {
    const { tabIndex, groupIndex } = tabPath;
    const newTabs = tabs.map((t, ti) => {
      if (ti !== tabIndex) return t;
      const newGroups = (t.groups || []).map((g, gi) =>
        gi === groupIndex ? { ...g, group: newName } : g,
      );
      return { ...t, groups: newGroups };
    });
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  const handleDeleteGroup = useCallback((tabPath) => {
    const { tabIndex, groupIndex } = tabPath;
    const newTabs = tabs.map((t, ti) => {
      if (ti !== tabIndex) return t;
      const newGroups = (t.groups || []).filter((_, gi) => gi !== groupIndex);
      return { ...t, groups: newGroups };
    });
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  const handleCreatePage = useCallback((tabPath) => {
    onCreatePage?.(tabPath);
  }, [onCreatePage]);

  // Remove a page slug from a specific group (used for "missing" nav entries
  // that have no backing document). Only mutates the navigation config.
  const handleRemovePage = useCallback((tabPath, pageSlug) => {
    const { tabIndex, groupIndex } = tabPath;
    const newTabs = tabs.map((t, ti) => {
      if (ti !== tabIndex) return t;
      const newGroups = (t.groups || []).map((g, gi) => {
        if (gi !== groupIndex) return g;
        const newPages = (g.pages || []).filter(
          (p) => (typeof p === 'string' ? p : p.page) !== pageSlug,
        );
        return { ...g, pages: newPages };
      });
      return { ...t, groups: newGroups };
    });
    onSaveNavConfig({ ...navConfig, tabs: newTabs });
  }, [tabs, navConfig, onSaveNavConfig]);

  return (
    <Fragment>
      {/* + New Tab — always at top so the tree is never an empty dead-end */}
      <div className="px-2 pb-2 mb-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={handleAddTab}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-md transition-colors"
          data-testid="add-tab-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          New Tab
        </button>
      </div>

      {!tabs.length ? (
        <div className="px-4 py-6 text-center text-xs text-zinc-500">
          No tabs yet. Click <strong className="text-zinc-700 dark:text-zinc-300">New Tab</strong> above to start.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTabDrag}>
          <SortableContext
            items={tabs.map((t, i) => `tab::${i}::${t.id || t.label || ''}`)}
            strategy={verticalListSortingStrategy}
          >
            {tabs.map((tab, tIdx) => {
              const tabId = `tab::${tIdx}::${tab.id || tab.label || ''}`;
              return (
                <SortableTab
                  key={tabId}
                  tabId={tabId}
                  tabIndex={tIdx}
                  tab={tab}
                  documents={documents}
                  docId={docId}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  deletingDocId={deletingDocId}
                  onSelect={onSelect}
                  onOpenMeta={(doc) => setMetaDocId(doc.id)}
                  onGroupsReorder={handleGroupsReorder}
                  onPagesReorder={handlePagesReorder}
                  onRenameTab={handleRenameTab}
                  onDeleteTab={handleDeleteTab}
                  onAddGroup={handleAddGroup}
                  onRenameGroup={handleRenameGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onCreatePage={handleCreatePage}
                  onRemovePage={handleRemovePage}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      )}

      <PageMetaDialog
        open={Boolean(metaDoc)}
        doc={metaDoc}
        onClose={() => setMetaDocId(null)}
        onSave={async (updates) => {
          await onSaveDocument(metaDoc.id, updates);
          setMetaDocId(null);
        }}
        onDelete={async () => {
          await onDeleteDocument(metaDoc.id);
          setMetaDocId(null);
        }}
      />
    </Fragment>
  );
};

export default EditorNavTree;
