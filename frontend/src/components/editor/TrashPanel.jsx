import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Trash2, RotateCcw, X, Loader2 } from 'lucide-react';

export const TrashPanel = ({ projectId, onClose, onChange }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/projects/${projectId}/trash`);
      setItems(data.trash || []);
    } catch {
      toast.error('Failed to load Trash');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const restore = async (it) => {
    try {
      await axios.post(`${API}/projects/${projectId}/documents/${it.id}/restore-page`);
      toast.success(`Restored "${it.title || it.slug}"`);
      setItems((p) => p.filter((x) => x.id !== it.id));
      onChange && onChange();
    } catch {
      toast.error('Failed to restore');
    }
  };

  const purge = async (it) => {
    if (!window.confirm(`Permanently delete "${it.title || it.slug}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/projects/${projectId}/trash/${it.id}`);
      toast.success('Permanently deleted');
      setItems((p) => p.filter((x) => x.id !== it.id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="trash-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/50">
        <h3 className="font-semibold flex items-center gap-2 text-zinc-900 dark:text-white"><Trash2 className="w-4 h-4" /> Trash</h3>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" data-testid="trash-close"><X className="w-4 h-4" /></button>
      </div>
      <p className="px-4 pt-3 text-xs text-zinc-500">Deleted pages are kept for 90 days, then removed automatically.</p>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500" data-testid="trash-empty">Trash is empty.</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3" data-testid={`trash-item-${it.id}`}>
              <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">{it.title || it.slug}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Deleted by {it.deleted_by_name || it.deleted_by || 'someone'} · {it.days_left} day(s) left</div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => restore(it)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" data-testid={`trash-restore-${it.id}`}><RotateCcw className="w-3 h-3" /> Restore</button>
                <button onClick={() => purge(it)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" data-testid={`trash-purge-${it.id}`}><Trash2 className="w-3 h-3" /> Delete forever</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
