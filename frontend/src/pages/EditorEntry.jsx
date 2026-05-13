/**
 * EditorEntry — resolves the first project + first document and redirects
 * to the editor view. Used to short-circuit the dashboard / docs-view
 * intermediates so admin login lands directly in the editor.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import axios from 'axios';

const EditorEntry = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const resolve = async () => {
            try {
                // Fetch the user's projects (auth-protected)
                const projectsRes = await axios.get(`${API}/projects`);
                const projects = projectsRes.data || [];

                if (projects.length === 0) {
                    // No projects yet — fall back to dashboard so user can create one
                    navigate('/admin/dashboard', { replace: true });
                    return;
                }

                const project = projects[0];

                // Pick first doc
                const docsRes = await axios.get(`${API}/projects/${project.id}/documents`);
                const docs = docsRes.data || [];
                if (docs.length > 0) {
                    navigate(`/admin/editor/${project.id}/${docs[0].id}`, { replace: true });
                } else {
                    navigate(`/admin/editor/${project.id}`, { replace: true });
                }
            } catch (err) {
                console.error('EditorEntry failed:', err);
                navigate('/admin', { replace: true });
            }
        };
        resolve();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Opening editor…</span>
            </div>
        </div>
    );
};

export default EditorEntry;
