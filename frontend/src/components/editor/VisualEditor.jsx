/**
 * VisualEditor - WYSIWYG editor using Tiptap
 * Live editing like Elementor with component palette
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  Youtube as YoutubeIcon, Undo, Redo, Plus, AlignLeft, AlignCenter, AlignRight,
  Type, FileCode, Loader2, X, Check, Upload
} from 'lucide-react';
import { API } from '@/App';
import axios from 'axios';

// Toolbar Button Component
const ToolbarButton = ({ onClick, active, disabled, children, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded-md transition-colors ${
      active 
        ? 'bg-brand text-zinc-950 dark:text-white' 
        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

// Divider
const Divider = () => <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />;

// Image Upload Dialog
const ImageUploadDialog = ({ isOpen, onClose, onInsert, projectId }) => {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('url'); // 'url' | 'upload'
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', '/images');

    try {
      const res = await axios.post(`${API}/projects/${projectId}/assets`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onInsert(res.data.url);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlInsert = () => {
    if (url.trim()) {
      onInsert(url.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">Insert Image</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('url')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'url' ? 'bg-brand text-zinc-950 dark:text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            URL
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'upload' ? 'bg-brand text-zinc-950 dark:text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Upload
          </button>
        </div>

        {tab === 'url' ? (
          <div className="space-y-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white placeholder:text-zinc-500"
            />
            <button
              onClick={handleUrlInsert}
              disabled={!url.trim()}
              className="w-full py-3 bg-brand hover:bg-brand-600 disabled:opacity-50 text-zinc-950 dark:text-white rounded-md font-medium"
            >
              Insert Image
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center cursor-pointer hover:border-brand transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-brand mx-auto animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-zinc-600 dark:text-zinc-400">Click to upload or drag and drop</p>
                  <p className="text-zinc-500 text-sm mt-1">PNG, JPG, GIF up to 10MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// YouTube Embed Dialog
const YoutubeDialog = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState('');

  const handleInsert = () => {
    if (url.trim()) {
      onInsert(url.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">Embed YouTube Video</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white placeholder:text-zinc-500"
          />
          <button
            onClick={handleInsert}
            disabled={!url.trim()}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-zinc-950 dark:text-white rounded-md font-medium"
          >
            Embed Video
          </button>
        </div>
      </div>
    </div>
  );
};

// Link Dialog
const LinkDialog = ({ isOpen, onClose, onInsert, initialUrl = '' }) => {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const handleInsert = () => {
    onInsert(url.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">Insert Link</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white placeholder:text-zinc-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onInsert(''); onClose(); }}
              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white rounded-lg font-medium"
            >
              Remove Link
            </button>
            <button
              onClick={handleInsert}
              className="flex-1 py-3 bg-brand hover:bg-brand-600 text-zinc-950 dark:text-white rounded-md font-medium"
            >
              Save Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component Palette - Insert blocks
const ComponentPalette = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);

  const components = [
    { 
      name: 'Heading 1', 
      icon: Heading1, 
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() 
    },
    { 
      name: 'Heading 2', 
      icon: Heading2, 
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() 
    },
    { 
      name: 'Heading 3', 
      icon: Heading3, 
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() 
    },
    { 
      name: 'Bullet List', 
      icon: List, 
      action: () => editor.chain().focus().toggleBulletList().run() 
    },
    { 
      name: 'Numbered List', 
      icon: ListOrdered, 
      action: () => editor.chain().focus().toggleOrderedList().run() 
    },
    { 
      name: 'Quote', 
      icon: Quote, 
      action: () => editor.chain().focus().toggleBlockquote().run() 
    },
    { 
      name: 'Code Block', 
      icon: FileCode, 
      action: () => editor.chain().focus().toggleCodeBlock().run() 
    },
    { 
      name: 'Divider', 
      icon: Minus, 
      action: () => editor.chain().focus().setHorizontalRule().run() 
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-brand text-zinc-950 dark:text-white hover:bg-brand"
        title="Add block"
      >
        <Plus className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
          {components.map((comp) => (
            <button
              key={comp.name}
              onClick={() => { comp.action(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white"
            >
              <comp.icon className="w-4 h-4" />
              <span className="text-sm">{comp.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * VisualEditor - Main component
 */
export const VisualEditor = ({ 
  content, 
  onChange, 
  projectId,
  className = '' 
}) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing... Use the toolbar to format or add blocks.',
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'rounded-lg w-full aspect-video',
        },
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-[400px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      // Convert to HTML and notify parent
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  // Sync content from parent
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const insertImage = useCallback((url) => {
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertYoutube = useCallback((url) => {
    if (url && editor) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  }, [editor]);

  const setLink = useCallback((url) => {
    if (editor) {
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className={`visual-editor bg-[#0a0a0f] rounded-xl border border-zinc-200 dark:border-zinc-800 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 flex-wrap">
        {/* Add Block */}
        <ComponentPalette editor={editor} />
        
        <Divider />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Cmd+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Cmd+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Media */}
        <ToolbarButton
          onClick={() => setLinkDialogOpen(true)}
          active={editor.isActive('link')}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setImageDialogOpen(true)}
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setYoutubeDialogOpen(true)}
          title="Embed YouTube"
        >
          <YoutubeIcon className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Cmd+Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Dialogs */}
      <ImageUploadDialog
        isOpen={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onInsert={insertImage}
        projectId={projectId}
      />
      <YoutubeDialog
        isOpen={youtubeDialogOpen}
        onClose={() => setYoutubeDialogOpen(false)}
        onInsert={insertYoutube}
      />
      <LinkDialog
        isOpen={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onInsert={setLink}
        initialUrl={editor.getAttributes('link').href || ''}
      />
    </div>
  );
};

export default VisualEditor;
