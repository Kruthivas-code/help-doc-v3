import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth, API } from "@/App";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { 
  Book, Plus, ChevronRight, FileText, Search, Menu, X,
  Edit3, Trash2, Home
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { DocContent } from "@/components/docs/DocContent";
import { SearchDialog, SearchTrigger } from "@/components/docs/SearchDialog";
import { getIcon } from "@/components/docs/IconPicker";

const DocsView = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { projectId, docSlug } = useParams();
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toc, setToc] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, docsRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}`),
        axios.get(`${API}/projects/${projectId}/documents`)
      ]);
      setProject(projectRes.data);
      setDocuments(docsRes.data);
    } catch (error) {
      console.error("Failed to fetch:", error);
      if (error.response?.status === 404) navigate("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (documents.length > 0) {
      if (docSlug) {
        const doc = documents.find(d => d.slug === docSlug || d.id === docSlug);
        if (doc) setSelectedDoc(doc);
        else setSelectedDoc(documents[0]);
      } else {
        setSelectedDoc(documents[0]);
      }
    }
  }, [docSlug, documents]);

  const deleteDoc = async () => {
    if (!docToDelete) return;
    try {
      await axios.delete(`${API}/projects/${projectId}/documents/${docToDelete.id}`);
      const newDocs = documents.filter(d => d.id !== docToDelete.id);
      setDocuments(newDocs);
      if (selectedDoc?.id === docToDelete.id) {
        setSelectedDoc(newDocs[0] || null);
      }
      setDeleteOpen(false);
      setDocToDelete(null);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // Handle navigation from concept nav
  const handleNavSelect = useCallback((node) => {
    const doc = documents.find(d => d.id === node.id);
    if (doc) {
      setSelectedDoc(doc);
      navigate(`/admin/docs/${projectId}/${doc.slug}`);
      setMobileMenuOpen(false);
    }
  }, [documents, projectId, navigate]);

  // Handle navigation from search
  const handleSearchNavigate = useCallback((slug, anchor) => {
    navigate(`/admin/docs/${projectId}/${slug}${anchor ? `#${anchor}` : ''}`);
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [projectId, navigate]);

  // Handle TOC updates from DocContent
  const handleHeadings = useCallback((headings) => {
    setToc(headings);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SelectedDocIcon = selectedDoc?.icon ? getIcon(selectedDoc.icon) : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" data-testid="docs-view-page">
      {/* Top Bar */}
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-4 bg-slate-950 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Book className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
          
          <ChevronRight className="w-4 h-4 text-slate-700" />
          
          <span className="text-white font-medium">{project?.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Trigger */}
          <SearchTrigger onClick={() => setSearchOpen(true)} />
          
          <button
            onClick={() => navigate(`/admin/editor/${projectId}`)}
            className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            data-testid="new-doc-button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Doc</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with Concept Navigation */}
        <aside className={`
          ${mobileMenuOpen ? 'fixed inset-0 top-14 z-40' : 'hidden'} 
          lg:relative lg:block lg:w-72 bg-slate-950 border-r border-slate-800/50 flex-shrink-0
        `}>
          <div className="flex flex-col h-full">
            {/* Nav Header */}
            <div className="px-4 py-3 border-b border-slate-800/50">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Documentation
              </span>
            </div>

            {/* Concept-based Navigation */}
            <ScrollArea className="flex-1 p-2">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No documents</p>
                </div>
              ) : (
                <nav className="space-y-0.5">
                  {documents.map((doc) => {
                    const DocIcon = doc.icon ? getIcon(doc.icon) : FileText;
                    return (
                      <div
                        key={doc.id}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedDoc?.id === doc.id 
                            ? 'bg-indigo-600/10 text-indigo-400' 
                            : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                        }`}
                        onClick={() => handleNavSelect({ id: doc.id })}
                        data-testid={`doc-item-${doc.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <DocIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{doc.title}</span>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-800 transition-all">
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 w-32">
                            <DropdownMenuItem 
                              className="text-slate-400 focus:text-white focus:bg-slate-800 cursor-pointer text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/editor/${projectId}/${doc.id}`);
                              }}
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-400 focus:text-red-400 focus:bg-slate-800 cursor-pointer text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocToDelete(doc);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </nav>
              )}
            </ScrollArea>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {selectedDoc ? (
            <div className="max-w-4xl mx-auto px-6 lg:px-12 py-10 page-transition">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <button onClick={() => navigate("/admin/dashboard")} className="hover:text-white transition-colors">
                  <Home className="w-4 h-4" />
                </button>
                <ChevronRight className="w-3 h-3" />
                <span>{project?.name}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-300">{selectedDoc.title}</span>
              </div>

              {/* Title & Actions */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                  {SelectedDocIcon && (
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                      <SelectedDocIcon className="w-5 h-5" />
                    </div>
                  )}
                  <h1 className="text-3xl font-bold text-white tracking-tight">{selectedDoc.title}</h1>
                </div>
                <button
                  onClick={() => navigate(`/admin/editor/${projectId}/${selectedDoc.id}`)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  data-testid="edit-current-doc"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Content with AST-based rendering */}
              <DocContent 
                content={selectedDoc.content}
                onHeadings={handleHeadings}
                data-testid="doc-content"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No documents yet</h3>
                <p className="text-slate-500 text-sm mb-6">Create your first document to get started</p>
                <button
                  onClick={() => navigate(`/admin/editor/${projectId}`)}
                  className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
                  data-testid="create-first-doc"
                >
                  <Plus className="w-4 h-4" />
                  Create Document
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Table of Contents - Desktop Only */}
        {selectedDoc && toc.length > 0 && (
          <aside className="hidden xl:block w-56 flex-shrink-0 border-l border-slate-800/50 p-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">On this page</h4>
            <nav className="space-y-2">
              {toc.map((item, i) => (
                <a
                  key={i}
                  href={`#${item.id}`}
                  className={`block text-sm text-slate-400 hover:text-white transition-colors ${
                    item.level === 3 ? 'pl-3' : ''
                  }`}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>

      {/* Search Dialog */}
      <SearchDialog
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        documents={documents}
        onNavigate={handleSearchNavigate}
        projectId={projectId}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete document?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete "{docToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={deleteDoc} className="bg-red-600 hover:bg-red-500 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocsView;
