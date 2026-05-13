/**
 * GitHubPanel - GitHub integration for import/export
 * Allows connecting GitHub account and syncing docs with repositories
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  Github, Link2, Unlink, Download, Upload, RefreshCw, 
  Folder, FileText, Check, X, ChevronRight, Loader2,
  ExternalLink, AlertCircle
} from 'lucide-react';
import { API } from '@/App';
import axios from 'axios';

export const GitHubPanel = ({ projectId, onClose }) => {
  const [status, setStatus] = useState({ loading: true, connected: false });
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoContents, setRepoContents] = useState([]);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [link, setLink] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

  // Check GitHub connection status
  const checkStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/github/status`);
      setStatus({ loading: false, ...res.data });
    } catch (error) {
      setStatus({ loading: false, connected: false });
    }
  }, []);

  // Check if project is linked to a repo
  const checkLink = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/github/link`);
      if (res.data.linked) {
        setLink(res.data.link);
      }
    } catch (error) {
      console.error('Failed to check link:', error);
    }
  }, [projectId]);

  useEffect(() => {
    checkStatus();
    checkLink();
  }, [checkStatus, checkLink]);

  // Listen for GitHub OAuth callback
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'github-connected') {
        checkStatus();
        setMessage({ type: 'success', text: `Connected to GitHub as ${event.data.username}` });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkStatus]);

  const connectGitHub = async () => {
    try {
      const res = await axios.get(`${API}/github/auth`);
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        res.data.auth_url,
        'github-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initiate GitHub connection' });
    }
  };

  const disconnectGitHub = async () => {
    try {
      await axios.delete(`${API}/github/disconnect`);
      setStatus({ loading: false, connected: false });
      setRepos([]);
      setLink(null);
      setMessage({ type: 'success', text: 'GitHub disconnected' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect GitHub' });
    }
  };

  const loadRepos = async () => {
    setReposLoading(true);
    try {
      const res = await axios.get(`${API}/github/repos`);
      setRepos(res.data.repositories);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load repositories' });
    } finally {
      setReposLoading(false);
    }
  };

  const loadRepoContents = async (owner, name, path = '') => {
    setContentsLoading(true);
    try {
      const res = await axios.get(`${API}/github/repos/${owner}/${name}/contents`, {
        params: { path }
      });
      setRepoContents(Array.isArray(res.data) ? res.data : [res.data]);
      setCurrentPath(path);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load repository contents' });
    } finally {
      setContentsLoading(false);
    }
  };

  const selectRepo = (repo) => {
    setSelectedRepo(repo);
    loadRepoContents(repo.full_name.split('/')[0], repo.name);
  };

  const importFromPath = async () => {
    if (!selectedRepo) return;
    setImporting(true);
    try {
      const [owner, name] = selectedRepo.full_name.split('/');
      const res = await axios.post(`${API}/projects/${projectId}/github/import`, {
        repo_owner: owner,
        repo_name: name,
        branch: selectedRepo.default_branch,
        path: currentPath
      });
      setMessage({ type: 'success', text: res.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import documents' });
    } finally {
      setImporting(false);
    }
  };

  const exportToRepo = async () => {
    if (!selectedRepo) return;
    setExporting(true);
    try {
      const [owner, name] = selectedRepo.full_name.split('/');
      const res = await axios.post(`${API}/projects/${projectId}/github/export`, {
        repo_owner: owner,
        repo_name: name,
        branch: selectedRepo.default_branch,
        path: currentPath || 'docs',
        commit_message: 'Update documentation from DocuMint'
      });
      setMessage({ type: 'success', text: res.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export documents' });
    } finally {
      setExporting(false);
    }
  };

  const linkRepo = async () => {
    if (!selectedRepo) return;
    try {
      const [owner, name] = selectedRepo.full_name.split('/');
      const res = await axios.post(`${API}/projects/${projectId}/github/link`, {
        repo_owner: owner,
        repo_name: name,
        branch: selectedRepo.default_branch,
        docs_path: currentPath || 'docs'
      });
      setLink(res.data.link);
      setMessage({ type: 'success', text: 'Repository linked' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to link repository' });
    }
  };

  const unlinkRepo = async () => {
    try {
      await axios.delete(`${API}/projects/${projectId}/github/link`);
      setLink(null);
      setMessage({ type: 'success', text: 'Repository unlinked' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unlink repository' });
    }
  };

  if (status.loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-600 dark:text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900" data-testid="github-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-zinc-950 dark:text-white" />
          <h2 className="font-semibold text-zinc-950 dark:text-white">GitHub Integration</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
          <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-brand/20 text-green-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Connection Status */}
        <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.connected ? (
                <>
                  <img 
                    src={status.avatar_url} 
                    alt={status.github_username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="text-zinc-950 dark:text-white font-medium">{status.github_username}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Connected</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-zinc-950 dark:text-white font-medium">Not Connected</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Connect your GitHub account</p>
                </div>
              )}
            </div>
            {status.connected ? (
              <button
                onClick={disconnectGitHub}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors"
              >
                <Unlink className="w-4 h-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectGitHub}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:bg-zinc-600 text-zinc-950 dark:text-white rounded-md transition-colors"
              >
                <Github className="w-4 h-4" />
                Connect GitHub
              </button>
            )}
          </div>
        </div>

        {/* Linked Repository */}
        {link && (
          <div className="bg-brand/10 border border-brand/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-brand" />
                <span className="text-brand font-medium">Linked Repository</span>
              </div>
              <button
                onClick={unlinkRepo}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"
              >
                Unlink
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-zinc-950 dark:text-white">{link.repo_full_name}</span>
              <span className="text-xs text-zinc-500">/{link.docs_path}</span>
              <a 
                href={`https://github.com/${link.repo_full_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Repository Browser */}
        {status.connected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Repositories</h3>
              <button
                onClick={loadRepos}
                disabled={reposLoading}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"
              >
                <RefreshCw className={`w-3 h-3 ${reposLoading ? 'animate-spin' : ''}`} />
                {repos.length > 0 ? 'Refresh' : 'Load'}
              </button>
            </div>

            {repos.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-auto">
                {repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => selectRepo(repo)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedRepo?.id === repo.id 
                        ? 'bg-brand/10 text-zinc-950 dark:text-white' 
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <Github className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate text-sm">{repo.full_name}</span>
                    {repo.private && (
                      <span className="text-xs px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400">private</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Repository Contents */}
            {selectedRepo && (
              <div className="bg-zinc-100 dark:bg-zinc-800/30 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Browsing:</span>
                  <span className="text-zinc-950 dark:text-white font-medium">{selectedRepo.full_name}</span>
                  {currentPath && (
                    <>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-700 dark:text-zinc-300">{currentPath}</span>
                    </>
                  )}
                </div>

                {/* Breadcrumb navigation */}
                {currentPath && (
                  <button
                    onClick={() => {
                      const parentPath = currentPath.split('/').slice(0, -1).join('/');
                      loadRepoContents(selectedRepo.full_name.split('/')[0], selectedRepo.name, parentPath);
                    }}
                    className="text-xs text-brand hover:text-brand-600"
                  >
                    ← Go back
                  </button>
                )}

                {contentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-600 dark:text-zinc-400" />
                  </div>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {repoContents.map((item) => (
                      <button
                        key={item.sha}
                        onClick={() => {
                          if (item.type === 'dir') {
                            loadRepoContents(
                              selectedRepo.full_name.split('/')[0], 
                              selectedRepo.name, 
                              item.path
                            );
                          }
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm ${
                          item.type === 'dir' 
                            ? 'hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' 
                            : 'text-zinc-500'
                        }`}
                        disabled={item.type !== 'dir'}
                      >
                        {item.type === 'dir' ? (
                          <Folder className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span className="truncate">{item.name}</span>
                        {item.name.endsWith('.md') && (
                          <span className="ml-auto text-xs text-green-400">markdown</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={importFromPath}
                    disabled={importing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand hover:bg-brand-600 disabled:opacity-50 text-zinc-950 dark:text-white text-sm rounded-md transition-colors"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Import from here
                  </button>
                  <button
                    onClick={exportToRepo}
                    disabled={exporting}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand hover:bg-brand-600 disabled:opacity-50 text-zinc-950 dark:text-white text-sm rounded-md transition-colors"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Export here
                  </button>
                </div>

                {!link && (
                  <button
                    onClick={linkRepo}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-zinc-300 dark:border-zinc-600 hover:border-slate-500 text-zinc-700 dark:text-zinc-300 text-sm rounded-md transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    Link this repository
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help text */}
        {!status.connected && (
          <div className="text-sm text-zinc-500 space-y-2">
            <p>Connect your GitHub account to:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>Import documentation from repositories</li>
              <li>Export your docs to GitHub</li>
              <li>Keep docs in sync with your code</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubPanel;
