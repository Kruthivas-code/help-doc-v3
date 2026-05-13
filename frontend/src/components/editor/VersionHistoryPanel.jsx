/**
 * VersionHistoryPanel - Document version history and restore
 * Allows creating named snapshots and restoring previous versions
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  History, Clock, RotateCcw, Trash2, Plus, X, 
  Check, AlertCircle, Loader2, ChevronDown, Eye, FileText
} from 'lucide-react';
import { API } from '@/App';
import axios from 'axios';

export const VersionHistoryPanel = ({ projectId, documentId, documentTitle, onClose, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [message, setMessage] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const loadVersions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/documents/${documentId}/versions`);
      setVersions(res.data.versions);
    } catch (error) {
      console.error('Failed to load versions:', error);
      setMessage({ type: 'error', text: 'Failed to load version history' });
    } finally {
      setLoading(false);
    }
  }, [projectId, documentId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const createVersion = async () => {
    if (!newVersionName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a version name' });
      return;
    }

    setCreating(true);
    try {
      await axios.post(`${API}/projects/${projectId}/documents/${documentId}/versions`, {
        version_name: newVersionName.trim()
      });
      setMessage({ type: 'success', text: 'Version created successfully' });
      setNewVersionName('');
      setShowCreateForm(false);
      loadVersions();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create version' });
    } finally {
      setCreating(false);
    }
  };

  const restoreVersion = async (versionId) => {
    setRestoring(true);
    try {
      await axios.post(`${API}/projects/${projectId}/documents/${documentId}/restore`, {
        version_id: versionId
      });
      setMessage({ type: 'success', text: 'Document restored successfully' });
      if (onRestore) onRestore();
      loadVersions(); // Reload to show the auto-backup
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to restore version' });
    } finally {
      setRestoring(false);
    }
  };

  const deleteVersion = async (versionId) => {
    if (!confirm('Are you sure you want to delete this version?')) return;
    
    try {
      await axios.delete(`${API}/projects/${projectId}/documents/${documentId}/versions/${versionId}`);
      setMessage({ type: 'success', text: 'Version deleted' });
      setVersions(versions.filter(v => v.id !== versionId));
      if (selectedVersion?.id === versionId) {
        setSelectedVersion(null);
        setPreviewContent(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete version' });
    }
  };

  const previewVersion = async (version) => {
    setSelectedVersion(version);
    try {
      const res = await axios.get(
        `${API}/projects/${projectId}/documents/${documentId}/versions/${version.id}`
      );
      setPreviewContent(res.data.content);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load version preview' });
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900" data-testid="version-history-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-zinc-950 dark:text-white" />
          <h2 className="font-semibold text-zinc-950 dark:text-white">Version History</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
          <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* Document Info */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <span className="text-zinc-700 dark:text-zinc-300 truncate">{documentTitle}</span>
        </div>
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

      {/* Create Version */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        {showCreateForm ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="Version name (e.g., v1.0, Before refactor)"
              className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-brand"
              onKeyDown={(e) => e.key === 'Enter' && createVersion()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={createVersion}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-brand hover:bg-brand-600 disabled:opacity-50 text-zinc-950 dark:text-white text-sm rounded-md transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewVersionName('');
                }}
                className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Version Snapshot
          </button>
        )}
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600 dark:text-zinc-400" />
          </div>
        ) : versions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <History className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">No versions yet</p>
            <p className="text-zinc-500 text-xs mt-1">
              Create a snapshot to save the current state
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 transition-colors ${
                  selectedVersion?.id === version.id ? 'bg-zinc-100 dark:bg-zinc-800/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-zinc-950 dark:text-white truncate">
                        {version.version_name}
                      </h4>
                      {version.version_name.startsWith('Auto-backup') && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                          auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span title={formatDate(version.created_at)}>
                        {formatRelativeTime(version.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => previewVersion(version)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:bg-zinc-700 rounded transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => restoreVersion(version.id)}
                      disabled={restoring}
                      className="p-1.5 text-zinc-500 hover:text-green-400 hover:bg-brand/20 rounded transition-colors"
                      title="Restore"
                    >
                      {restoring ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteVersion(version.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                {selectedVersion?.id === version.id && previewContent !== null && (
                  <div className="mt-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 max-h-48 overflow-auto">
                    <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                      {previewContent.slice(0, 500)}
                      {previewContent.length > 500 && '...'}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/30">
        <p className="text-xs text-zinc-500">
          💡 Tip: Creating versions before major changes helps you recover if something goes wrong
        </p>
      </div>
    </div>
  );
};

export default VersionHistoryPanel;
