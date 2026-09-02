import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth, API } from "@/App";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { 
  ChevronLeft, ChevronDown, ChevronRight, Save, Eye, Code2, 
  Loader2, FileText, FolderOpen, Plus, Settings, Image as ImageIcon, 
  Check, Monitor, Sun, Moon, MoreHorizontal,
  Share2, Upload, Trash2, GripVertical, X, Edit3, Smartphone, Tablet,
  History, Pencil, Download
} from "lucide-react";
import { DocContent } from "@/components/docs/DocContent";
import { SlashCommandMenu, useSlashCommands, COMMANDS } from "@/components/docs/SlashCommands";
import { IconButton, Icon, getIcon } from "@/components/docs/IconPicker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfigurationsPanel } from "@/components/editor/ConfigurationsPanel";
import { UnifiedEditor } from "@/components/editor/UnifiedEditor";
import { VersionHistoryPanel } from "@/components/editor/VersionHistoryPanel";
import { EditorNavTree } from "@/components/editor/EditorNavTree";
import { LiveEditor } from "@/components/editor/LiveEditor";
import { TipTapWYSIWYG } from "@/components/editor/TipTapWYSIWYG";
import { WritingAssistant, WritingAssistantTrigger } from "@/components/editor/WritingAssistant";
import { ImagePickerModal } from "@/components/editor/ImagePickerModal";
import { AnchorsMenu } from "@/components/editor/AnchorsMenu";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Navigation Group Component for hierarchical document list
const NavGroup = ({ 
  group, 
  groupKey, 
  documents, 
  docId, 
  projectId, 
  navigate, 
  expandedSections, 
  setExpandedSections,
  deletingDocId,
  handleDeleteDocument,
  depth = 0
}) => {
  const isExpanded = expandedSections[groupKey] !== false;
  const pages = group.pages || [];
  const subgroups = group.groups || [];
  
  // Find documents that match this group's pages
  const getDocForSlug = (slug) => documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
  
  return (
    <div className={depth > 0 ? 'ml-3' : ''}>
      {/* Group Header */}
      <button
        onClick={() => setExpandedSections(prev => ({
          ...prev,
          [groupKey]: !prev[groupKey]
        }))}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
        )}
        <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
        <span className="text-xs font-medium truncate">{group.group || 'Unnamed Group'}</span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-auto">{pages.length}</span>
      </button>
      
      {isExpanded && (
        <div className="ml-4 space-y-0.5">
          {/* Pages in this group */}
          {pages.map((page, pageIndex) => {
            const slug = typeof page === 'string' ? page : page.page;
            const pageTitle = typeof page === 'string' ? page : page.title;
            const doc = getDocForSlug(slug);
            const PageIcon = doc?.icon ? getIcon(doc.icon) : (page.icon ? getIcon(page.icon) : FileText);
            const isActive = doc?.id === docId;
            const isDeleting = deletingDocId === doc?.id;
            const isMissing = !doc;
            
            return (
              <div
                key={pageIndex}
                className={`group flex items-center gap-1 rounded-lg transition-colors pr-1 ${
                  isActive 
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white' 
                    : isMissing
                      ? 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/30'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <button
                  onClick={() => doc && navigate(`/admin/editor/${projectId}/${doc.id}`)}
                  disabled={isMissing}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left min-w-0"
                  title={isMissing ? `Document "${slug}" not found` : pageTitle}
                >
                  <PageIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isMissing ? 'text-rose-600 dark:text-rose-400/50' : ''}`} />
                  <span className={`text-sm truncate ${isMissing ? 'italic' : ''}`}>
                    {pageTitle || slug}
                  </span>
                  {isMissing && <span className="text-[10px] text-rose-600 dark:text-rose-400/70">missing</span>}
                </button>
                {doc && !isDeleting && (
                  <button
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded transition-all flex-shrink-0"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {doc && isDeleting && (
                  <div className="p-1.5 flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Nested subgroups */}
          {subgroups.map((subgroup, subIndex) => (
            <NavGroup
              key={subIndex}
              group={subgroup}
              groupKey={`${groupKey}-sub-${subIndex}`}
              documents={documents}
              docId={docId}
              projectId={projectId}
              navigate={navigate}
              expandedSections={expandedSections}
              setExpandedSections={setExpandedSections}
              deletingDocId={deletingDocId}
              handleDeleteDocument={handleDeleteDocument}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Editor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projectId, docId } = useParams();
  const isNew = !docId;
  
  // Document state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [icon, setIcon] = useState(null);
  const [slug, setSlug] = useState(null); // Preserve original slug to prevent breaking nav links
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('markdown'); // 'markdown' | 'split' | 'visual'
  const [theme, setTheme] = useState('dark');
  const [activePanel, setActivePanel] = useState(null); // null | 'config' | 'media' | 'files' | 'github' | 'history'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerMode, setImagePickerMode] = useState('image'); // 'image' | 'gif'
  const [colorPickerCursor, setColorPickerCursor] = useState(null);
  const colorInputRef = useRef(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(isNew ? { title: '', content: '', icon: null } : null);
  const [docStatus, setDocStatus] = useState('draft'); // draft | in_review | published
  const [publishedSnapshot, setPublishedSnapshot] = useState(null); // {content,title} when published
  const [publishing, setPublishing] = useState(false);
  const isOwner = !!(user?.is_owner || user?.role === 'owner');
  
  // Project & docs state
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [navConfig, setNavConfig] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [deletingDocId, setDeletingDocId] = useState(null);
  
  const textareaRef = useRef(null);

  // Slash commands
  const handleInsert = useCallback((newValue, cursorPos) => {
    setContent(newValue);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  }, []);

  // Handle slash command actions (like opening image picker)
  const handleSlashAction = useCallback((action) => {
    switch (action) {
      case 'open-image-picker':
        setImagePickerMode('image');
        setImagePickerOpen(true);
        break;
      case 'open-gif-picker':
        setImagePickerMode('gif');
        setImagePickerOpen(true);
        break;
      case 'open-color-picker':
        // Remember cursor so we can insert the hex at the right spot
        setColorPickerCursor(textareaRef.current?.selectionStart ?? null);
        // Trigger native color input
        setTimeout(() => colorInputRef.current?.click(), 0);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, []);

  // Insert hex string at remembered cursor position
  const handleColorPicked = useCallback((hex) => {
    if (!hex) return;
    const cursor = colorPickerCursor;
    setColorPickerCursor(null);
    setContent((prev) => {
      if (cursor == null) return prev + hex;
      return prev.slice(0, cursor) + hex + prev.slice(cursor);
    });
    setTimeout(() => {
      if (textareaRef.current && cursor != null) {
        textareaRef.current.focus();
        const newPos = cursor + hex.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [colorPickerCursor]);

  const slashCommands = useSlashCommands(textareaRef, handleInsert, handleSlashAction);

  // Insert text at the current cursor position in the markdown textarea
  const insertAtCursor = useCallback((text) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((prev) => prev + text);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? start;
    const newContent = content.slice(0, start) + text + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = start + text.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [content]);

  // Handle a component picked from the visible "Insert" toolbar menu
  const handleInsertComponent = useCallback((item) => {
    setInsertMenuOpen(false);
    if (item.action) {
      handleSlashAction(item.action);
      return;
    }
    if (item.insert) insertAtCursor(item.insert);
  }, [handleSlashAction, insertAtCursor]);

  // Fetch data
  const fetchProjectData = useCallback(async () => {
    try {
      const [projectRes, docsRes, configRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}`),
        axios.get(`${API}/projects/${projectId}/documents`),
        axios.get(`${API}/projects/${projectId}/config`).catch(() => ({ data: null }))
      ]);
      setProject(projectRes.data);
      setDocuments(docsRes.data);
      setNavConfig(configRes.data?.navigation || null);
    } catch (error) {
      console.error("Failed to fetch project:", error);
    }
  }, [projectId]);

  const fetchDocument = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}/documents/${docId}`);
      setTitle(response.data.title);
      setContent(response.data.content);
      setIcon(response.data.icon);
      setSlug(response.data.slug); // Store original slug to preserve nav links
      setSavedSnapshot({ title: response.data.title, content: response.data.content, icon: response.data.icon });
      setDocStatus(response.data.status || 'draft');
      setPublishedSnapshot(response.data.status === 'published'
        ? { content: response.data.published_content ?? response.data.content, title: response.data.published_title ?? response.data.title }
        : null);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to fetch:", error);
      navigate(`/admin/editor/${projectId}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, docId, navigate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    if (docId) fetchDocument();
  }, [docId, fetchDocument]);

  const generateSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const response = await axios.post(`${API}/projects/${projectId}/documents`, {
          title, slug: generateSlug(title), content, icon
        });
        setSlug(response.data.slug); // Store the new slug
        setSavedSnapshot({ title, content, icon });
        setLastSaved(new Date());
        toast.success("Draft saved");
        // Refresh docs list
        fetchProjectData();
        // Navigate to edit this doc
        navigate(`/admin/editor/${projectId}/${response.data.id}`, { replace: true });
      } else {
        // IMPORTANT: Preserve existing slug to prevent breaking navigation links
        // Only generate new slug for NEW documents, not updates
        await axios.put(`${API}/projects/${projectId}/documents/${docId}`, {
          title, slug: slug, content, icon  // Use existing slug, not regenerated
        });
        setSavedSnapshot({ title, content, icon });
        setLastSaved(new Date());
        toast.success("Changes saved");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [title, content, icon, slug, isNew, projectId, docId, fetchProjectData, navigate]);

  // ---- Review Mode: publish gate ----
  const gotoAfterDelete = useCallback((deletedId) => {
    const sibling = documents.find(d => d.id !== deletedId);
    navigate(sibling ? `/admin/editor/${projectId}/${sibling.id}` : `/admin/editor/${projectId}`);
  }, [documents, projectId, navigate]);

  const hasUnpublishedChanges = useMemo(() => {
    if (docStatus !== 'published' || !publishedSnapshot) return false;
    return publishedSnapshot.content !== content || publishedSnapshot.title !== title;
  }, [docStatus, publishedSnapshot, content, title]);

  const handlePublish = useCallback(async () => {
    if (isNew || !docId) { toast.error('Save the page first'); return; }
    setPublishing(true);
    try {
      await axios.put(`${API}/projects/${projectId}/documents/${docId}`, { title, slug, content, icon });
      await axios.post(`${API}/projects/${projectId}/documents/${docId}/publish`);
      setSavedSnapshot({ title, content, icon });
      setPublishedSnapshot({ content, title });
      setDocStatus('published');
      setLastSaved(new Date());
      toast.success('Published — now live');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Publish failed');
    } finally { setPublishing(false); }
  }, [isNew, docId, projectId, title, slug, content, icon]);

  const handleTakedown = useCallback(async () => {
    if (!docId) return;
    if (!window.confirm('Take this page down for rework? It will be removed from the public site until re-published.')) return;
    setPublishing(true);
    try {
      await axios.post(`${API}/projects/${projectId}/documents/${docId}/unpublish`);
      setDocStatus('in_review');
      setPublishedSnapshot(null);
      toast.success('Taken down — back in review');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Take down failed');
    } finally { setPublishing(false); }
  }, [docId, projectId]);

  // Track unsaved changes
  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return savedSnapshot.title !== title ||
      savedSnapshot.content !== content ||
      (savedSnapshot.icon || null) !== (icon || null);
  }, [savedSnapshot, title, content, icon]);

  // Warn before leaving the tab with unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Auto-save on Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Delete document handler
  const handleDeleteDocument = async (docIdToDelete, e) => {
    e.stopPropagation(); // Prevent navigation
    
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }
    
    setDeletingDocId(docIdToDelete);
    try {
      await axios.delete(`${API}/projects/${projectId}/documents/${docIdToDelete}`);
      
      // Remove from local state
      setDocuments(prev => prev.filter(d => d.id !== docIdToDelete));
      
      // If we're deleting the current document, jump to a sibling page (stay in editor)
      if (docIdToDelete === docId) {
        gotoAfterDelete(docIdToDelete);
      }
      fetchProjectData(); // refresh nav (backend prunes the slug from config)
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  // State for link modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [docToLink, setDocToLink] = useState(null);
  const [linking, setLinking] = useState(false);

  // Get all missing pages from navigation config
  const getMissingPages = () => {
    if (!navConfig) return [];
    
    const missingPages = [];
    
    const extractMissing = (groups, path = []) => {
      if (!groups) return;
      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const group = groups[gIdx];
        if (group.pages) {
          for (let pIdx = 0; pIdx < group.pages.length; pIdx++) {
            const page = group.pages[pIdx];
            const slug = typeof page === 'string' ? page : page.page;
            const pageTitle = typeof page === 'string' ? page : page.title;
            const doc = documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
            if (!doc) {
              missingPages.push({
                slug,
                title: pageTitle || slug,
                groupName: group.group,
                path: [...path, gIdx, pIdx]
              });
            }
          }
        }
        if (group.groups) {
          extractMissing(group.groups, [...path, gIdx, 'groups']);
        }
      }
    };
    
    if (navConfig.tabs) {
      for (let tIdx = 0; tIdx < navConfig.tabs.length; tIdx++) {
        extractMissing(navConfig.tabs[tIdx].groups, ['tabs', tIdx, 'groups']);
      }
    } else if (navConfig.groups) {
      extractMissing(navConfig.groups, ['groups']);
    }
    
    return missingPages;
  };

  // Handle linking a document to a missing page
  const handleLinkDocument = async (missingPage) => {
    if (!docToLink || !navConfig) return;
    
    setLinking(true);
    try {
      // Deep clone the nav config
      const newNavConfig = JSON.parse(JSON.stringify(navConfig));
      
      // Navigate to the target using the path and update the page
      const path = missingPage.path;
      
      // Find the target groups array and indices
      // Path format: ['tabs', tabIdx, 'groups', groupIdx, pageIdx] or ['groups', groupIdx, pageIdx]
      // or with nested groups: ['tabs', tabIdx, 'groups', groupIdx, 'groups', subGroupIdx, pageIdx]
      
      let target = newNavConfig;
      
      // Navigate through the path, stopping before the last two elements (groupIdx, pageIdx)
      for (let i = 0; i < path.length - 2; i++) {
        target = target[path[i]];
      }
      
      // Now target should be the groups array containing our target group
      const groupIdx = path[path.length - 2];
      const pageIdx = path[path.length - 1];
      
      // Get the page and update it
      const page = target[groupIdx].pages[pageIdx];
      
      // Update the page slug to match the document
      if (typeof page === 'string') {
        target[groupIdx].pages[pageIdx] = {
          page: docToLink.slug,
          title: docToLink.title,
          icon: docToLink.icon || null
        };
      } else {
        page.page = docToLink.slug;
        page.title = docToLink.title;
        if (docToLink.icon) page.icon = docToLink.icon;
      }
      
      // Save the updated config
      await axios.put(`${API}/projects/${projectId}/config`, {
        navigation: newNavConfig
      });
      
      // Update local state and refresh documents list
      setNavConfig(newNavConfig);
      setLinkModalOpen(false);
      setDocToLink(null);
      
      // Refresh to update the UI
      await fetchProjectData();
      
    } catch (error) {
      console.error('Failed to link document:', error);
      toast.error('Failed to link document');
    } finally {
      setLinking(false);
    }
  };

  const handleContentChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(newValue);
    slashCommands.handleChange(newValue, cursorPos);
  };

  // Save reordered navigation config to backend
  const handleSaveNavConfig = useCallback(async (newConfig) => {
    setNavConfig(newConfig); // optimistic
    try {
      await axios.put(`${API}/projects/${projectId}/config`, { navigation: newConfig });
    } catch (err) {
      console.error('Failed to save nav config:', err);
      toast.error(err.response?.data?.detail || 'Failed to update navigation');
      // Re-fetch to revert on failure
      await fetchProjectData();
    }
  }, [projectId, fetchProjectData]);

  // Save document metadata edits (from PageMetaDialog)
  const handleSaveDocMetadata = useCallback(async (id, updates) => {
    try {
      const res = await axios.put(`${API}/projects/${projectId}/documents/${id}`, updates);
      setDocuments((prev) => prev.map((d) => (d.id === id ? res.data : d)));
      // If slug changed, mirror that change into the nav config so the page stays linked
      if (updates.slug && navConfig?.tabs) {
        const oldSlug = documents.find((d) => d.id === id)?.slug;
        if (oldSlug && oldSlug !== updates.slug) {
          const remapTabs = (tabs) => tabs.map((t) => ({
            ...t,
            groups: (t.groups || []).map((g) => ({
              ...g,
              pages: (g.pages || []).map((p) => {
                if (typeof p === 'string') return p === oldSlug ? updates.slug : p;
                return p.page === oldSlug ? { ...p, page: updates.slug } : p;
              }),
            })),
          }));
          await handleSaveNavConfig({ ...navConfig, tabs: remapTabs(navConfig.tabs) });
        }
      }
      // If we're editing the current document, sync local title/slug
      if (id === docId) {
        if (updates.title) setTitle(updates.title);
        if (updates.slug) setSlug(updates.slug);
        if (updates.icon !== undefined) setIcon(updates.icon);
      }
    } catch (err) {
      console.error('Failed to save document metadata:', err);
      toast.error('Failed to save metadata');
    }
  }, [projectId, navConfig, documents, docId, handleSaveNavConfig]);

  // Delete from PageMetaDialog (different signature than the sidebar trash button)
  const handleDeleteFromDialog = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/projects/${projectId}/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (id === docId) gotoAfterDelete(id);
      fetchProjectData(); // refresh nav (backend prunes the slug from config)
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error('Failed to delete document');
    }
  }, [projectId, docId, gotoAfterDelete, fetchProjectData]);

  // Create a fresh document and link it under the given nav group
  const handleCreatePageInGroup = useCallback(async (tabPath) => {
    try {
      // Build a sensible default slug & title (admin can rename via 3-dots after)
      const ts = Date.now().toString(36);
      const newTitle = 'Untitled Page';
      const newSlug = `untitled-${ts}`;
      const { data: doc } = await axios.post(`${API}/projects/${projectId}/documents`, {
        title: newTitle,
        slug: newSlug,
        content: '',
      });
      // Append slug to the selected group's pages
      const { tabIndex, groupIndex } = tabPath;
      const cfg = navConfig || {};
      const tabs = cfg.tabs || [];
      const newTabs = tabs.map((t, ti) => {
        if (ti !== tabIndex) return t;
        const groups = (t.groups || []).map((g, gi) =>
          gi === groupIndex ? { ...g, pages: [...(g.pages || []), newSlug] } : g,
        );
        return { ...t, groups };
      });
      await handleSaveNavConfig({ ...cfg, tabs: newTabs });
      // Refresh local docs and jump into the new page
      setDocuments((prev) => [...prev, doc]);
      if (doc?.id) navigate(`/admin/editor/${projectId}/${doc.id}`);
    } catch (err) {
      console.error('Failed to create page:', err);
      toast.error(err?.response?.data?.detail || 'Failed to create new page');
    }
  }, [projectId, navConfig, handleSaveNavConfig, navigate]);

  // Export the whole project (config + all documents) as a single JSON file
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/projects/${projectId}/export`, { responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `${project?.slug || 'project'}-export.json`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e) {
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  }, [projectId, project]);

  const IconComponent = icon ? getIcon(icon) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-background flex" data-testid="editor-page">
      {/* Left Sidebar - Mintlify Style */}
      <aside className={`${sidebarCollapsed ? 'w-0' : 'w-72'} flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 flex flex-col transition-all overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/50">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Main Menu</span>
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Navigation</span>
          </div>
          
          <ScrollArea className="flex-1 px-2 pr-3 [&_[data-radix-scroll-area-viewport]>div]:!block">
            <nav className="space-y-1 pb-4">
              {/* Sortable Tab > Group > Page tree with per-page metadata menu */}
              <EditorNavTree
                navConfig={navConfig}
                documents={documents}
                docId={docId}
                deletingDocId={deletingDocId}
                readOnly={!isOwner}
                onSelect={(id) => navigate(`/admin/editor/${projectId}/${id}`)}
                onSaveNavConfig={handleSaveNavConfig}
                onSaveDocument={handleSaveDocMetadata}
                onDeleteDocument={handleDeleteFromDialog}
                onCreatePage={handleCreatePageInGroup}
              />
              
              {/* Unlinked Documents Section — owner cleanup tooling */}
              {isOwner && navConfig && (() => {
                // Find documents not in any navigation group
                const linkedSlugs = new Set();
                const extractSlugs = (groups) => {
                  if (!groups) return;
                  for (const g of groups) {
                    if (g.pages) g.pages.forEach(p => linkedSlugs.add((typeof p === 'string' ? p : p.page)?.toLowerCase()));
                    if (g.groups) extractSlugs(g.groups);
                  }
                };
                if (navConfig.tabs) navConfig.tabs.forEach(t => extractSlugs(t.groups));
                if (navConfig.groups) extractSlugs(navConfig.groups);
                
                const unlinkedDocs = documents.filter(d => !linkedSlugs.has(d.slug?.toLowerCase()));
                const missingPages = getMissingPages();
                
                if (unlinkedDocs.length === 0) return null;
                
                return (
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
                    <div className="px-2 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-amber-500/70 uppercase tracking-wider flex items-center gap-2">
                          <FolderOpen className="w-3 h-3" />
                          Unlinked Documents
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">({unlinkedDocs.length})</span>
                      </div>
                      {unlinkedDocs.length > 1 && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete all ${unlinkedDocs.length} unlinked documents? This cannot be undone.`)) {
                              return;
                            }
                            for (const doc of unlinkedDocs) {
                              try {
                                await axios.delete(`${API}/projects/${projectId}/documents/${doc.id}`);
                                setDocuments(prev => prev.filter(d => d.id !== doc.id));
                              } catch (error) {
                                console.error(`Failed to delete ${doc.title}:`, error);
                              }
                            }
                          }}
                          className="px-2 py-0.5 text-[10px] text-rose-600 dark:text-rose-400 hover:text-red-300 hover:bg-rose-500/10 rounded transition-colors"
                          title="Delete all unlinked documents"
                        >
                          Delete All
                        </button>
                      )}
                    </div>
                    <p className="px-2 text-[10px] text-zinc-400 dark:text-zinc-600 mb-2">
                      {missingPages.length > 0 
                        ? `Click "Link" to map to ${missingPages.length} missing page${missingPages.length > 1 ? 's' : ''}`
                        : 'No missing pages in navigation'}
                    </p>
                    {unlinkedDocs.map((doc) => {
                      const DocIcon = doc.icon ? getIcon(doc.icon) : FileText;
                      const isActive = doc.id === docId;
                      const isDeleting = deletingDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          data-testid={`unlinked-doc-${doc.id}`}
                          className={`group flex items-center gap-1 rounded-lg transition-colors ml-2 pr-1 ${
                            isActive 
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white' 
                              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-white'
                          }`}
                        >
                          <button
                            onClick={() => navigate(`/admin/editor/${projectId}/${doc.id}`)}
                            className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left min-w-0"
                          >
                            <DocIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm truncate">{doc.title}</span>
                          </button>
                          {missingPages.length > 0 && (
                            <button
                              onClick={() => {
                                setDocToLink(doc);
                                setLinkModalOpen(true);
                              }}
                              className="px-2 py-1 text-[10px] bg-brand/10 text-brand hover:bg-brand/20 rounded transition-colors flex-shrink-0"
                              title="Link to a navigation page"
                            >
                              Link
                            </button>
                          )}
                          {!isDeleting && (
                            <button
                              onClick={(e) => handleDeleteDocument(doc.id, e)}
                              className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded transition-all flex-shrink-0"
                              title="Delete document"
                              data-testid={`delete-unlinked-${doc.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isDeleting && (
                            <div className="p-1.5 flex-shrink-0">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
              {/* Add New */}
              <button
                onClick={() => {
                  setTitle('');
                  setContent('');
                  setIcon(null);
                  navigate(`/admin/editor/${projectId}`);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add new</span>
              </button>
            </nav>
          </ScrollArea>
        </div>

        {/* Settings Section */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/50">
          <div className="px-4 py-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Settings</span>
          </div>
          <nav className="px-2 pb-2 space-y-0.5">
            {isOwner && (
            <button 
              data-testid="configurations-btn"
              onClick={() => setActivePanel(activePanel === 'config' ? null : 'config')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                activePanel === 'config' 
                  ? 'bg-brand/10 text-brand' 
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Configurations</span>
            </button>
            )}
            {isOwner && docId && (
              <button 
                data-testid="version-history-btn"
                onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  activePanel === 'history' 
                    ? 'bg-brand/10 text-brand' 
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span className="text-sm">Version History</span>
              </button>
            )}
          </nav>
          
          {/* Theme toggle (new design system) */}
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800/50 flex items-center justify-between">
            <span className="eyebrow text-zinc-500">Theme</span>
            <ThemeToggle compact />
          </div>
        </div>
      </aside>

      {/* Settings Panels */}
      {activePanel && (
        <aside className="w-96 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800/50 flex-shrink-0 h-screen overflow-y-auto">
          <div className="h-full relative">
            {activePanel === 'config' && (
              <ConfigurationsPanel projectId={projectId} onClose={() => setActivePanel(null)} />
            )}
            {activePanel === 'history' && docId && (
              <VersionHistoryPanel 
                projectId={projectId} 
                documentId={docId}
                documentTitle={title}
                onClose={() => setActivePanel(null)}
                onRestore={() => {
                  // Refresh document content after restore
                  fetchDocument();
                }}
              />
            )}
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar — sticky within column */}
        <header className="h-14 flex-shrink-0 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/50 bg-background">
          <div className="flex items-center gap-4">
            {/* Document Title */}
            <span className="text-zinc-950 dark:text-white font-medium truncate max-w-[200px]">
              {title || 'Untitled'}
            </span>
            
            {/* Save Status */}
            {saving ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm" data-testid="save-status-saving">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : isDirty ? (
              <div className="flex items-center gap-2 text-amber-500 text-sm" data-testid="save-status-unsaved">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Unsaved changes</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-2 text-brand text-sm" data-testid="save-status-saved">
                <Check className="w-4 h-4" />
                <span>Saved</span>
              </div>
            ) : null}

            {/* Publish status pill */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                docStatus === 'published'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : docStatus === 'in_review'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
              data-testid="doc-status-pill"
            >
              {docStatus === 'published' ? 'Published' : docStatus === 'in_review' ? 'In review' : 'Draft'}
            </span>
            {hasUnpublishedChanges && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                data-testid="unpublished-badge"
              >
                Unpublished changes
              </span>
            )}

            {/* Publish gate actions */}
            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 text-zinc-700 dark:text-zinc-200 text-sm font-medium rounded-md transition-colors"
                data-testid="save-draft-button"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : 'Save draft'}</span>
              </button>
              {isOwner && !isNew && (
                <button
                  onClick={handlePublish}
                  disabled={publishing || saving}
                  className="flex items-center gap-2 px-4 py-1.5 bg-brand hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                  data-testid="publish-button"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{docStatus === 'published' ? 'Publish update' : 'Publish'}</span>
                </button>
              )}
              {isOwner && docStatus === 'published' && (
                <button
                  onClick={handleTakedown}
                  disabled={publishing}
                  className="flex items-center gap-2 px-3 py-1.5 border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 text-sm font-medium rounded-md transition-colors"
                  data-testid="takedown-button"
                >
                  <span>Take down</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Anchors menu */}
            <AnchorsMenu content={content} onContentChange={setContent} slug={slug} />

            {/* View Mode Toggle — Markdown / Split / Visual */}
            <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('markdown')}
                className={`btn-press flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  viewMode === 'markdown'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
                title="Markdown editor"
                data-testid="view-mode-markdown"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Markdown</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`btn-press flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
                title="Split — markdown + preview"
                data-testid="view-mode-split"
              >
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`btn-press flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
                title="Visual WYSIWYG editor"
                data-testid="view-mode-visual"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visual</span>
              </button>
            </div>

            {/* Writing Assistant trigger - Only in Markdown view */}
            {(viewMode === 'markdown' || viewMode === 'split') && (
              <WritingAssistantTrigger onOpen={() => setAssistantOpen(true)} />
            )}

            {/* Insert Component menu - visible alternative to the "/" shortcut */}
            {(viewMode === 'markdown' || viewMode === 'split') && (
              <Popover open={insertMenuOpen} onOpenChange={setInsertMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-sm rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    data-testid="insert-component-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Insert</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0" data-testid="insert-component-menu">
                  <ScrollArea className="max-h-96">
                    <div className="p-2">
                      {COMMANDS.map((category) => (
                        <div key={category.category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            {category.category}
                          </div>
                          {category.items.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleInsertComponent(item)}
                                className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                data-testid={`insert-item-${item.id}`}
                              >
                                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{item.label}</div>
                                  <div className="text-xs text-zinc-500 truncate">{item.description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}

            {/* Image Picker Button - Only shown in Markdown view */}
            {(viewMode === 'markdown' || viewMode === 'split') && (
              <button
                onClick={() => {
                  setImagePickerMode('image');
                  setImagePickerOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-sm rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                data-testid="image-picker-btn"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Add Image</span>
              </button>
            )}

            {/* Copy Link Button */}
            <button 
              onClick={async () => {
                const url = `${window.location.origin}/p/${project?.slug}`;
                await navigator.clipboard.writeText(url);
                toast.success('Link copied to clipboard');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Copy Link</span>
            </button>

            {/* Export all documents as JSON */}
            {isOwner && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              data-testid="export-all-btn"
              title="Download all pages as a single JSON file"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export all</span>
            </button>
            )}
          </div>
        </header>

        {/* Content Editor */}
        <div className="flex-1 flex overflow-hidden">
          {/* Markdown Editor Panel */}
          {(viewMode === 'markdown' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-zinc-200 dark:border-zinc-800/50' : 'flex-1'} flex flex-col overflow-hidden`}>
              {/* Title Bar */}
              <div className="px-8 pt-8 pb-4">
                <div className="flex items-start gap-4">
                  <IconButton value={icon} onChange={setIcon} />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Untitled"
                      className="w-full text-3xl font-bold text-zinc-950 dark:text-white bg-transparent placeholder:text-zinc-400 dark:text-zinc-600 focus:outline-none"
                      data-testid="doc-title-input"
                    />
                    <p className="text-sm text-zinc-500 mt-1">
                      Type <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-500">/</kbd> for commands
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 overflow-hidden relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  onKeyDown={slashCommands.handleKeyDown}
                  placeholder="Start writing your documentation..."
                  className="w-full h-full px-8 py-4 bg-transparent text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[14px] leading-relaxed resize-none focus:outline-none font-mono"
                  style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                  data-testid="content-editor"
                />
                
                <SlashCommandMenu
                  isOpen={slashCommands.isOpen}
                  position={slashCommands.position}
                  searchQuery={slashCommands.searchQuery}
                  selectedIndex={slashCommands.selectedIndex}
                  onSelect={slashCommands.selectItem}
                  onClose={slashCommands.closeMenu}
                />
              </div>
            </div>
          )}

          {/* Visual Editor Panel — TipTap WYSIWYG */}
          {viewMode === 'visual' && (
            <div className="flex-1 overflow-hidden bg-background">
              <TipTapWYSIWYG content={content} onChange={setContent} />
            </div>
          )}

          {/* (Preview mode removed — Split view shows live preview alongside markdown.) */}

          {/* Split View Preview Panel */}
          {viewMode === 'split' && (
            <div className="w-1/2 overflow-auto bg-background">
              <div className="max-w-3xl mx-auto px-8 py-8">
                {/* Preview Header */}
                <div className="flex items-center gap-3 mb-6">
                  {IconComponent && (
                    <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center text-brand">
                      <IconComponent className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-zinc-950 dark:text-white">{title || 'Untitled'}</h1>
                  </div>
                </div>
                
                {/* Content Preview */}
                <DocContent content={content} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onInsert={(markdown, image) => {
          // Insert at cursor position or at end
          if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const newContent = content.slice(0, start) + '\n' + markdown + '\n' + content.slice(end);
            setContent(newContent);
            
            // Set cursor after inserted content
            setTimeout(() => {
              if (textareaRef.current) {
                const newPos = start + markdown.length + 2;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newPos, newPos);
              }
            }, 0);
          } else {
            setContent(content + '\n' + markdown + '\n');
          }
        }}
        projectId={projectId}
        mode={imagePickerMode}
      />

      {/* Hidden native color picker — triggered by /color slash command and TipTap toolbar */}
      <input
        ref={colorInputRef}
        type="color"
        defaultValue="#1588FC"
        onChange={(e) => handleColorPicked(e.target.value.toUpperCase())}
        style={{ position: 'fixed', left: -9999, top: -9999, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
        data-testid="hex-color-input"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Writing Assistant slide-over */}
      <WritingAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        content={content}
        onApplyContent={(md) => setContent(md)}
        onApplySelection={(replacement, start, end) => {
          setContent((prev) => prev.slice(0, start) + replacement + prev.slice(end));
        }}
        selection={(() => {
          const el = textareaRef.current;
          if (!el) return null;
          const start = el.selectionStart ?? 0;
          const end = el.selectionEnd ?? 0;
          if (start === end) return null;
          return { start, end, text: content.slice(start, end) };
        })()}
        projectId={projectId}
        navConfig={navConfig}
        onAfterCreatePage={async (newDoc) => {
          // Refresh local document list and navigate to the new page
          await fetchProjectData();
          if (newDoc?.id) navigate(`/admin/editor/${projectId}/${newDoc.id}`);
        }}
      />

      {/* Link Document Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-950 dark:text-white">Link Document</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {docToLink 
                ? `Select a missing page to link "${docToLink.title}" to.`
                : 'Select an unlinked document first.'}
            </DialogDescription>
          </DialogHeader>
          
          {docToLink && (
            <div className="space-y-3" data-testid="link-modal-content">
              {/* Document being linked */}
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 mb-1">Document to link:</p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand" />
                  <span className="text-zinc-950 dark:text-white font-medium">{docToLink.title}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-mono">slug: {docToLink.slug}</p>
              </div>
              
              {/* Missing pages list */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Link to navigation page:</p>
                <ScrollArea className="h-[200px] pr-2">
                  <div className="space-y-1">
                    {getMissingPages().length > 0 ? (
                      getMissingPages().map((missing, index) => (
                        <button
                          key={index}
                          onClick={() => handleLinkDocument(missing)}
                          disabled={linking}
                          className="w-full p-2 text-left rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-brand hover:bg-brand-600/10 transition-colors disabled:opacity-50"
                          data-testid={`missing-page-${index}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-zinc-950 dark:text-white">{missing.title}</p>
                              <p className="text-xs text-zinc-500">
                                <span className="text-rose-600 dark:text-rose-400/70">missing:</span>{' '}
                                <span className="font-mono">{missing.slug}</span>
                              </p>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-600">in &quot;{missing.groupName}&quot;</p>
                            </div>
                            {linking ? (
                              <Loader2 className="w-4 h-4 animate-spin text-brand" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-zinc-500 text-sm">
                        No missing pages in navigation config.
                        <br />
                        <span className="text-xs">Add pages in the Configurations panel first.</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Device Frame Component for Preview Mode
const DeviceFrame = ({ device, children }) => {
  const deviceConfigs = {
    desktop: {
      width: 1280,
      height: 800,
      bezel: 'rounded-lg',
      label: 'Desktop - 1280×800'
    },
    tablet: {
      width: 768,
      height: 1024,
      bezel: 'rounded-[2rem]',
      label: 'Tablet - 768×1024'
    },
    mobile: {
      width: 375,
      height: 812,
      bezel: 'rounded-[2.5rem]',
      label: 'Mobile - 375×812'
    }
  };

  const config = deviceConfigs[device];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Device Label */}
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        {device === 'desktop' && <Monitor className="w-4 h-4" />}
        {device === 'tablet' && <Tablet className="w-4 h-4" />}
        {device === 'mobile' && <Smartphone className="w-4 h-4" />}
        <span>{config.label}</span>
      </div>
      
      {/* Device Frame */}
      <div 
        className={`relative bg-zinc-100 dark:bg-zinc-800 ${config.bezel} shadow-2xl overflow-hidden transition-all duration-300`}
        style={{
          width: `min(${config.width}px, 100%)`,
          height: device === 'desktop' ? '70vh' : `min(${config.height}px, 80vh)`,
          padding: device === 'mobile' ? '12px' : device === 'tablet' ? '16px' : '8px'
        }}
      >
        {/* Screen Notch for Mobile */}
        {device === 'mobile' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-white dark:bg-zinc-900 rounded-full z-20" />
        )}
        
        {/* Screen */}
        <div className={`w-full h-full bg-[#020617] overflow-hidden ${
          device === 'mobile' ? 'rounded-[1.5rem]' : device === 'tablet' ? 'rounded-xl' : 'rounded-md'
        }`}>
          {children}
        </div>
        
        {/* Home Indicator for Mobile */}
        {device === 'mobile' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
        )}
      </div>
    </div>
  );
};

export default Editor;
