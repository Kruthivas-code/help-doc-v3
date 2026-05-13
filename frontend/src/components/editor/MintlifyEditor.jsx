/**
 * MintlifyEditor - Clean WYSIWYG editor matching Mintlify style
 * Minimal toolbar, clean content area, device preview
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, 
  Quote, Code, Image as ImageIcon, Youtube as YoutubeIcon, Link as LinkIcon,
  Undo, Redo, Loader2, X, Upload, Monitor, Smartphone, Tablet,
  Type, AlignLeft, Minus, FileCode, Info, AlertTriangle, Lightbulb
} from 'lucide-react';
import { API } from '@/App';
import axios from 'axios';

// Minimal Toolbar Button
const ToolBtn = ({ onClick, active, disabled, children, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-md transition-colors ${
      active ? 'bg-brand text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

// Image Dialog
const ImageDialog = ({ isOpen, onClose, onInsert, projectId }) => {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('url');
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
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-950 dark:text-white">Insert Image</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('url')} className={`px-3 py-1.5 rounded text-sm ${tab === 'url' ? 'bg-brand text-zinc-950 dark:text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>URL</button>
          <button onClick={() => setTab('upload')} className={`px-3 py-1.5 rounded text-sm ${tab === 'upload' ? 'bg-brand text-zinc-950 dark:text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>Upload</button>
        </div>
        {tab === 'url' ? (
          <div className="space-y-3">
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm" />
            <button onClick={() => { if(url) { onInsert(url); onClose(); }}} disabled={!url} className="w-full py-2 bg-brand hover:bg-brand-600 disabled:opacity-50 text-zinc-950 dark:text-white rounded-lg text-sm font-medium">Insert</button>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center cursor-pointer hover:border-brand">
            {uploading ? <Loader2 className="w-6 h-6 text-brand mx-auto animate-spin" /> : (
              <><Upload className="w-6 h-6 text-zinc-500 mx-auto mb-2" /><p className="text-zinc-600 dark:text-zinc-400 text-sm">Click to upload</p></>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
};

// YouTube Dialog
const YoutubeDialog = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-950 dark:text-white">Embed YouTube</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"><X className="w-5 h-5" /></button>
        </div>
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm mb-3" />
        <button onClick={() => { if(url) { onInsert(url); onClose(); }}} disabled={!url} className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-zinc-950 dark:text-white rounded-lg text-sm font-medium">Embed</button>
      </div>
    </div>
  );
};

// Callout inserter
const CalloutMenu = ({ editor, onClose }) => {
  const callouts = [
    { type: 'info', icon: Info, label: 'Info', color: 'blue' },
    { type: 'tip', icon: Lightbulb, label: 'Tip', color: 'green' },
    { type: 'warning', icon: AlertTriangle, label: 'Warning', color: 'yellow' },
  ];
  
  const insertCallout = (type) => {
    editor.chain().focus().insertContent(`<blockquote>[!${type.toUpperCase()}] Your message here</blockquote>`).run();
    onClose();
  };
  
  return (
    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-1 z-50">
      {callouts.map(c => (
        <button key={c.type} onClick={() => insertCallout(c.type)} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
          <c.icon className="w-4 h-4" />{c.label}
        </button>
      ))}
    </div>
  );
};

/**
 * MintlifyEditor - Main component
 */
export const MintlifyEditor = ({ 
  content, 
  onChange, 
  projectId,
  title,
  onTitleChange,
  className = '' 
}) => {
  const [imageOpen, setImageOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [calloutOpen, setCalloutOpen] = useState(false);
  const [devicePreview, setDevicePreview] = useState('desktop'); // desktop, tablet, mobile

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full my-4' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-brand underline' } }),
      Placeholder.configure({ placeholder: 'Start writing your documentation...' }),
      Youtube.configure({ HTMLAttributes: { class: 'rounded-lg w-full aspect-video my-4' } }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px]',
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const insertImage = useCallback((url) => {
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const insertYoutube = useCallback((url) => {
    if (url && editor) editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  if (!editor) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>;

  // Device preview widths
  const previewWidth = { desktop: '100%', tablet: '768px', mobile: '375px' }[devicePreview];

  return (
    <div className={`mintlify-editor flex flex-col h-full ${className}`}>
      {/* Compact Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-[#0a0a0f]">
        <div className="flex items-center gap-0.5">
          {/* Text formatting */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
            <Code className="w-4 h-4" />
          </ToolBtn>
          
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1.5" />
          
          {/* Headings */}
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1">
            <Heading1 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">
            <Heading2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3">
            <Heading3 className="w-4 h-4" />
          </ToolBtn>
          
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1.5" />
          
          {/* Lists */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <List className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
            <FileCode className="w-4 h-4" />
          </ToolBtn>
          
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1.5" />
          
          {/* Media */}
          <ToolBtn onClick={() => setImageOpen(true)} title="Insert Image">
            <ImageIcon className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => setYoutubeOpen(true)} title="Embed YouTube">
            <YoutubeIcon className="w-4 h-4" />
          </ToolBtn>
          <div className="relative">
            <ToolBtn onClick={() => setCalloutOpen(!calloutOpen)} title="Insert Callout">
              <Info className="w-4 h-4" />
            </ToolBtn>
            {calloutOpen && <CalloutMenu editor={editor} onClose={() => setCalloutOpen(false)} />}
          </div>
          
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1.5" />
          
          {/* Undo/Redo */}
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo className="w-4 h-4" />
          </ToolBtn>
        </div>
        
        {/* Device Preview Toggle */}
        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setDevicePreview('desktop')}
            className={`p-1.5 rounded ${devicePreview === 'desktop' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}
            title="Desktop view"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevicePreview('tablet')}
            className={`p-1.5 rounded ${devicePreview === 'tablet' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}
            title="Tablet view"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevicePreview('mobile')}
            className={`p-1.5 rounded ${devicePreview === 'mobile' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}
            title="Mobile view"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content with Device Frame */}
      <div className="flex-1 overflow-auto bg-[#0f0f15] flex justify-center py-8">
        <div 
          className={`bg-[#0a0a0f] transition-all duration-300 ${devicePreview !== 'desktop' ? 'border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl' : ''}`}
          style={{ width: previewWidth, maxWidth: '100%' }}
        >
          {/* Title */}
          <div className="px-8 pt-8">
            <input
              type="text"
              value={title || ''}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Page title"
              className="w-full text-3xl font-bold text-zinc-950 dark:text-white bg-transparent placeholder:text-zinc-400 dark:text-zinc-600 focus:outline-none mb-6"
            />
          </div>
          
          {/* Content */}
          <div className="px-8 pb-8 mintlify-content">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ImageDialog isOpen={imageOpen} onClose={() => setImageOpen(false)} onInsert={insertImage} projectId={projectId} />
      <YoutubeDialog isOpen={youtubeOpen} onClose={() => setYoutubeOpen(false)} onInsert={insertYoutube} />
    </div>
  );
};

export default MintlifyEditor;
