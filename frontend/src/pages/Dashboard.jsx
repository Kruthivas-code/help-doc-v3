import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
    Book, Plus, LogOut, Sparkles, Trash2, MoreHorizontal, Clock, ArrowRight, Inbox,
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
import { ThemeToggle } from "@/components/ui/theme-toggle";

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

    useEffect(() => { fetchProjects(); }, []);

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
            const response = await axios.post(`${API}/projects`, { name: projectName, slug, description: "" });
            setProjects([response.data, ...projects]);
            setCreateOpen(false);
            setProjectName("");
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
        <div className="min-h-screen bg-zinc-50/40 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100" data-testid="dashboard-page">
            {/* Sticky header */}
            <header className="sticky top-0 z-30 h-14 backdrop-blur-md bg-white/85 dark:bg-zinc-950/85 border-b border-zinc-200 dark:border-zinc-800">
                <div className="h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 dark:bg-white">
                            <Book className="h-3.5 w-3.5 text-white dark:text-zinc-950" />
                        </div>
                        <span className="font-heading text-base font-black tracking-tight">Emergent Docs</span>
                        <span className="hidden sm:inline-flex items-center text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">Console</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate("/admin/review")}
                            className="btn-press hidden sm:inline-flex h-9 px-3 items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            data-testid="review-console-nav"
                        >
                            <Inbox className="h-4 w-4 text-brand" />
                            Review Console
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/admin/generator")}
                            className="btn-press hidden sm:inline-flex h-9 px-3 items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            data-testid="ai-generator-nav"
                        >
                            <Sparkles className="h-4 w-4 text-brand" />
                            AI Generator
                        </button>
                        <ThemeToggle compact />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white text-xs font-bold"
                                    data-testid="user-menu"
                                >
                                    {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{currentUser?.name}</p>
                                    <p className="text-xs text-zinc-500 truncate">{currentUser?.email}</p>
                                </div>
                                <DropdownMenuItem
                                    onClick={logout}
                                    className="text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer"
                                    data-testid="logout-button"
                                >
                                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
                <div className="flex items-end justify-between gap-4 mb-10 fade-up">
                    <div>
                        <p className="eyebrow text-zinc-500 mb-2">Workspace</p>
                        <h1 className="h-display text-3xl sm:text-4xl text-zinc-950 dark:text-white">Documentation</h1>
                        <p className="text-sm text-zinc-500 mt-2">Create, organize, and publish your documentation projects.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="btn-press inline-flex h-10 items-center gap-2 px-4 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-bold hover:opacity-90 whitespace-nowrap"
                        data-testid="create-project-button"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New project</span>
                        <span className="sm:hidden">New</span>
                    </button>
                </div>

                {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div
                        className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center fade-up"
                        data-testid="empty-state"
                    >
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4">
                            <Book className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="h-section text-lg text-zinc-950 dark:text-white mb-1">No projects yet</h3>
                        <p className="text-sm text-zinc-500 mb-6">Spin up your first documentation project to get started.</p>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="btn-press inline-flex h-10 items-center gap-2 px-4 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-bold hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" /> New project
                        </button>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project, idx) => (
                            <button
                                key={project.id}
                                type="button"
                                onClick={() => navigate(`/admin/docs/${project.id}`)}
                                className={`card-lift group relative text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 fade-up delay-${Math.min(idx, 5)}`}
                                data-testid={`project-card-${project.id}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white font-heading font-bold"
                                        style={{ backgroundColor: project.primary_color || '#1588FC' }}
                                    >
                                        {project.name.charAt(0).toUpperCase()}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <span
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                                            </span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                            <DropdownMenuItem
                                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProject(project);
                                                    setDeleteOpen(true);
                                                }}
                                                data-testid={`delete-project-${project.id}`}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete project
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white tracking-tight mb-1">
                                    {project.name}
                                </h3>
                                <p className="text-sm text-zinc-500 line-clamp-2 min-h-[2.5rem]">
                                    {project.description || "No description"}
                                </p>

                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                                        <Clock className="h-3 w-3" />
                                        {new Date(project.created_at).toLocaleDateString()}
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 sm:max-w-md" data-testid="create-project-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-heading font-black text-zinc-950 dark:text-white text-xl tracking-tight">New project</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createProject} className="mt-4">
                        <label className="eyebrow text-zinc-500 mb-2 block">Project name</label>
                        <input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g. Platform API Reference"
                            className="adm-input2"
                            autoFocus
                            data-testid="project-name-input"
                        />
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => setCreateOpen(false)}
                                className="btn-press h-10 px-4 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating || !projectName.trim()}
                                className="btn-press h-10 px-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-md text-sm font-bold disabled:opacity-50 hover:opacity-90"
                                data-testid="submit-project-button"
                            >
                                {creating ? "Creating…" : "Create project"}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading font-black text-zinc-950 dark:text-white">Delete project?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-500">
                            This will permanently delete <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{selectedProject?.name}"</span> and all of its documents. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={deleteProject}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
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
