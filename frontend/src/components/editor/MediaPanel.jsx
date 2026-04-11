/**
 * MediaPanel - Images and Media asset management
 * Handles file uploads to Supabase storage
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, Folder, FolderOpen, Image, FileText, Film, Trash2, 
  Plus, Loader2, Copy, Check, X, ChevronRight, RefreshCw
} from 'lucide-react';
import { API } from '@/App';
import axios from 'axios';

const FileIcon = ({ type }) => {
  switch (type) {
    case 'image': return <Image className="w-4 h-4 text-emerald-400" />;
    case 'video': return <Film className="w-4 h-4 text-purple-400" />;
    default: return <FileText className="w-4 h-4 text-slate-400" />;
  }
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const MediaPanel = ({ projectId, onClose }) => {
  const [folders, setFolders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('/');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/folders`);
      setFolders(res.data);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      setFolders([
        { path: '/', name: 'Root', count: 0 },
        { path: '/images', name: 'images', count: 0 },
        { path: '/logo', name: 'logo', count: 0 }
      ]);
    }
  }, [projectId]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/projects/${projectId}/assets`, {
        params: { folder: selectedFolder }
      });
      setAssets(res.data);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedFolder]);

  useEffect(() => {
    fetchFolders();
    fetchAssets();
  }, [fetchFolders, fetchAssets]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', selectedFolder);
      
      try {
        await axios.post(`${API}/projects/${projectId}/assets`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    
    setUploading(false);
    fetchAssets();
    fetchFolders();
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteAsset = async (asset) => {
    if (!confirm(`Delete "${asset.name}"?`)) return;
    
    try {
      await axios.delete(`${API}/projects/${projectId}/assets/${asset.id}`);
      setAssets(assets.filter(a => a.id !== asset.id));
      if (selectedAsset?.id === asset.id) setSelectedAsset(null);
      fetchFolders();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const copyUrl = async (url) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col" data-testid="media-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
        <h3 className="font-semibold text-white">Images and Media</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAssets}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Folder List */}
        <div className="w-48 border-r border-slate-800/50 overflow-auto p-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mb-2">
            Assets
          </div>
          {folders.map((folder) => (
            <button
              key={folder.path}
              onClick={() => setSelectedFolder(folder.path)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                selectedFolder === folder.path
                  ? 'bg-indigo-600/10 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {selectedFolder === folder.path ? (
                <FolderOpen className="w-4 h-4" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
              <span className="text-sm flex-1 truncate">{folder.name}</span>
              <span className="text-xs text-slate-500">{folder.count}</span>
            </button>
          ))}
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mt-4 mb-2">
            Other Folders
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Image className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-slate-500 text-sm">No files in this folder</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  Upload files
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedAsset?.id === asset.id
                        ? 'bg-indigo-600/10 border border-indigo-500/30'
                        : 'hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    {asset.file_type === 'image' && asset.url ? (
                      <img 
                        src={asset.url} 
                        alt={asset.name}
                        className="w-10 h-10 rounded object-cover bg-slate-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center">
                        <FileIcon type={asset.file_type} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{asset.name}</p>
                      <p className="text-xs text-slate-500">{formatSize(asset.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAsset(asset); }}
                      className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-slate-800 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {selectedAsset && (
          <div className="w-64 border-l border-slate-800/50 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview</span>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {selectedAsset.file_type === 'image' && (
              <img 
                src={selectedAsset.url} 
                alt={selectedAsset.name}
                className="w-full rounded-lg bg-slate-800 mb-4"
              />
            )}
            
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500">Name</span>
                <p className="text-sm text-white truncate">{selectedAsset.name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Size</span>
                <p className="text-sm text-white">{formatSize(selectedAsset.size)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Type</span>
                <p className="text-sm text-white">{selectedAsset.mime_type}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">URL</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={selectedAsset.url}
                    readOnly
                    className="flex-1 px-2 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-400 truncate"
                  />
                  <button
                    onClick={() => copyUrl(selectedAsset.url)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => deleteAsset(selectedAsset)}
              className="w-full mt-4 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPanel;
