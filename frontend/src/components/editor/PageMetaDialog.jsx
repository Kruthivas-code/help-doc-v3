/**
 * PageMetaDialog — modal for editing a document's metadata.
 * Fields: title, slug, icon, description, plus delete.
 */
import { useEffect, useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { IconButton } from '@/components/docs/IconPicker';

export const PageMetaDialog = ({ open, doc, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title || '');
    setSlug(doc.slug || '');
    setIcon(doc.icon || '');
    setDescription(doc.description || '');
    setConfirmDelete(false);
  }, [doc]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || doc.title,
        slug: slug.trim() || doc.slug,
        icon: icon || null,
        description: description.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 max-w-md" data-testid="page-meta-dialog">
        <DialogHeader>
          <DialogTitle className="text-zinc-950 dark:text-white">Page Settings</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Edit metadata for this documentation page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="meta-title-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
              Slug <span className="text-zinc-400 dark:text-zinc-500 font-normal">— URL identifier</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase())}
              className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="meta-slug-input"
            />
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              Changing the slug will break any existing links to this page.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">Icon</label>
            <IconButton value={icon} onChange={setIcon} />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
              Description <span className="text-zinc-400 dark:text-zinc-500 font-normal">— used in SEO + nav previews</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="One-sentence summary of the page…"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              data-testid="meta-description-input"
            />
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1 text-right">{description.length}/280</p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 !flex-row">
          <div>
            {confirmDelete ? (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md disabled:opacity-60"
                data-testid="meta-delete-confirm"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirm Delete
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md"
                data-testid="meta-delete-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete page
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !slug.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-zinc-950 dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-md disabled:opacity-60"
              data-testid="meta-save-btn"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PageMetaDialog;
