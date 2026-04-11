import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Book, Plus, LogOut, Sparkles, Trash2, MoreHorizontal, Clock, ArrowRight 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const Dashboard = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setUser]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    try {
      const response = await axios.post(`${API}/projects`, {
        name: projectName,
        slug,
        description: ""
      });
      setProjects([response.data, ...projects]);
      setCreateOpen(false);
      setProjectName("");
      // Navigate directly to the new project
      navigate(`/admin/docs/${response.data.id}`);
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async () => {
    if (!selectedProject) return;
    try {
      await axios.delete(`${API}/projects/${selectedProject.id}`);
      setProjects(projects.filter(p => p.id !== selectedProject.id));
      setDeleteOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const currentUser = user || location.state?.user;

  return (
    <div className="min-h-screen bg-slate-950" data-testid="dashboard-page">
      {/* Header */}
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Book className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-semibold">Emergent Docs</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/generator")}
            className="h-8 px-3 text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
            data-testid="ai-generator-nav"
          >
            <Sparkles className="w-4 h-4" />
            AI Generator
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium"
                data-testid="user-menu"
              >
                {currentUser?.name?.charAt(0) || "U"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 w-48">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
              </div>
              <DropdownMenuItem 
                onClick={logout}
                className="text-slate-400 focus:text-white focus:bg-slate-800 cursor-pointer"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Documentation</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your documentation projects</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            data-testid="create-project-button"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Book className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-slate-500 text-sm mb-6">Create your first documentation project</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-slate-900/50 hover:bg-slate-900 border border-slate-800/50 hover:border-slate-700 rounded-xl p-5 transition-all cursor-pointer"
                onClick={() => navigate(`/admin/docs/${project.id}`)}
                data-testid={`project-card-${project.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: project.primary_color || '#6366f1' }}
                  >
                    {project.name.charAt(0)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-800 flex items-center justify-center transition-all">
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                      <DropdownMenuItem 
                        className="text-red-400 focus:text-red-400 focus:bg-slate-800 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                          setDeleteOpen(true);
                        }}
                        data-testid={`delete-project-${project.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="text-white font-medium mb-1">{project.name}</h3>
                <p className="text-slate-500 text-sm truncate-2">{project.description || "No description"}</p>
                
                <div className="flex items-center gap-1 mt-4 text-slate-600 text-xs">
                  <Clock className="w-3 h-3" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
                
                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-md" data-testid="create-project-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={createProject} className="mt-4">
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full h-11 px-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
              data-testid="project-name-input"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !projectName.trim()}
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                data-testid="submit-project-button"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete project?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete "{selectedProject?.name}" and all its documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProject}
              className="bg-red-600 hover:bg-red-500 text-white"
              data-testid="confirm-delete-button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
