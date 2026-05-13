/**
 * UnifiedEditor - Mintlify-style editor with bi-directional sync
 * Content is always stored as Markdown, converted for WYSIWYG view
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, 
  Quote, Code, Image as ImageIcon, Youtube as YoutubeIcon, Link as LinkIcon,
  Undo, Redo, Loader2, X, Upload, Monitor, Smartphone, Tablet,
  FileCode, Info, AlertTriangle, Lightbulb, CheckCircle, Plus,
  Table, Minus, ExternalLink
} from 'lucide-react';
import { API } from '@/App';
import axios from 'axios';
import { htmlToMarkdown, markdownToHtml } from '@/lib/content-sync';

// Toolbar Button
const ToolBtn = ({ onClick, active, disabled, children, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-md transition-all ${
      active ? 'bg-brand text-zinc-950 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700/50 mx-1" />;

// Image Dialog
const ImageDialog = ({ isOpen, onClose, onInsert, projectId }) => {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
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
      onInsert(res.data.url, file.name.replace(/\.[^.]+$/, ''));
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-950 dark:text-white">Insert Image</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('url')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'url' ? 'bg-brand text-zinc-950 dark:text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}>URL</button>
            <button onClick={() => setTab('upload')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'upload' ? 'bg-brand text-zinc-950 dark:text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}>Upload</button>
          </div>
          {tab === 'url' ? (
            <div className="space-y-3">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/image.png" className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500" />
              <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt text (optional)" className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500" />
              <button onClick={() => { if(url) { onInsert(url, alt); onClose(); setUrl(''); setAlt(''); }}} disabled={!url} className="w-full py-2.5 bg-brand hover:bg-brand-600 disabled:opacity-50 text-zinc-950 dark:text-white rounded-lg text-sm font-medium transition-colors">Insert Image</button>
            </div>
          ) : (
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center cursor-pointer hover:border-brand transition-colors">
              {uploading ? <Loader2 className="w-8 h-8 text-brand mx-auto animate-spin" /> : (
                <>
                  <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-950 dark:text-white font-medium mb-1">Click to upload</p>
                  <p className="text-zinc-500 text-sm">PNG, JPG, GIF, WebP up to 10MB</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// YouTube Dialog
const YoutubeDialog = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState('');
  
  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-950 dark:text-white">Embed YouTube Video</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500" />
          <button onClick={() => { 
            const id = extractVideoId(url);
            if(id) { onInsert(`https://www.youtube.com/embed/${id}`); onClose(); setUrl(''); }
            else alert('Invalid YouTube URL');
          }} disabled={!url} className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-zinc-950 dark:text-white rounded-lg text-sm font-medium transition-colors">Embed Video</button>
        </div>
      </div>
    </div>
  );
};

// Link Dialog  
const LinkDialog = ({ isOpen, onClose, onInsert, initialUrl = '' }) => {
  const [url, setUrl] = useState(initialUrl);
  useEffect(() => setUrl(initialUrl), [initialUrl]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-950 dark:text-white">Insert Link</h3>
          <button onClick={onClose} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-950 dark:text-white text-sm placeholder:text-zinc-500" />
          <div className="flex gap-2">
            <button onClick={() => { onInsert(''); onClose(); }} className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white rounded-lg text-sm font-medium">Remove Link</button>
            <button onClick={() => { onInsert(url); onClose(); }} className="flex-1 py-2.5 bg-brand hover:bg-brand-600 text-zinc-950 dark:text-white rounded-lg text-sm font-medium">Save Link</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component Inserter Menu
const InsertMenu = ({ isOpen, onClose, editor, onImageClick, onYoutubeClick }) => {
  if (!isOpen) return null;
  
  const items = [
    { icon: Heading1, label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: Heading2, label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { type: 'divider' },
    { icon: List, label: 'Bullet List', action: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: 'Numbered List', action: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, label: 'Quote', action: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: FileCode, label: 'Code Block', action: () => editor.chain().focus().toggleCodeBlock().run() },
    { type: 'divider' },
    { icon: ImageIcon, label: 'Image', action: onImageClick },
    { icon: YoutubeIcon, label: 'YouTube Video', action: onYoutubeClick },
    { icon: Minus, label: 'Divider', action: () => editor.chain().focus().setHorizontalRule().run() },
    { type: 'divider' },
    { icon: Info, label: 'Info Callout', action: () => editor.chain().focus().insertContent('<blockquote>[!INFO] Your info here</blockquote>').run() },
    { icon: Lightbulb, label: 'Tip Callout', action: () => editor.chain().focus().insertContent('<blockquote>[!TIP] Your tip here</blockquote>').run() },
    { icon: AlertTriangle, label: 'Warning Callout', action: () => editor.chain().focus().insertContent('<blockquote>[!WARNING] Your warning here</blockquote>').run() },
  ];
  
  return (
    <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
      {items.map((item, i) => item.type === 'divider' ? (
        <div key={i} className="border-t border-zinc-200 dark:border-zinc-800 my-1" />
      ) : (
        <button
          key={i}
          onClick={() => { item.action(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white transition-colors"
        >
          <item.icon className="w-4 h-4 text-zinc-500" />
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

/**
 * UnifiedEditor - Main component
 */
export const UnifiedEditor = ({ 
  content,
  onChange,
  projectId,
  className = '' 
}) => {
  const [imageOpen, setImageOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [devicePreview, setDevicePreview] = useState('desktop');
  const lastSyncedContent = useRef(content);
  const isInternalChange = useRef(false);

  // Convert Markdown to HTML for editor
  const initialHtml = useMemo(() => {
    if (!content) return '';
    return markdownToHtml(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image.configure({ 
        HTMLAttributes: { class: 'rounded-lg max-w-full my-4 border border-zinc-200 dark:border-zinc-800' } 
      }),
      Link.configure({ 
        openOnClick: false, 
        HTMLAttributes: { class: 'text-brand hover:text-brand-600 underline underline-offset-2' } 
      }),
      Placeholder.configure({ 
        placeholder: 'Start writing your documentation...' 
      }),
      Youtube.configure({ 
        HTMLAttributes: { class: 'rounded-lg w-full aspect-video my-4 border border-zinc-200 dark:border-zinc-800' } 
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-[400px]',
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML back to Markdown
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      
      // Only trigger onChange if content actually changed
      if (markdown !== lastSyncedContent.current) {
        lastSyncedContent.current = markdown;
        isInternalChange.current = true;
        onChange?.(markdown);
      }
    },
  });

  // Sync external content changes to editor
  useEffect(() => {
    if (!editor || isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    
    if (content !== lastSyncedContent.current) {
      lastSyncedContent.current = content;
      const html = markdownToHtml(content || '');
      editor.commands.setContent(html);
    }
  }, [content, editor]);

  const insertImage = useCallback((url, alt = '') => {
    if (url && editor) {
      editor.chain().focus().setImage({ src: url, alt }).run();
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

  const previewWidth = { desktop: '100%', tablet: '768px', mobile: '375px' }[devicePreview];

  return (
    <div className={`unified-editor flex flex-col h-full bg-[#0a0a0f] ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-[#0f0f15]">
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Insert Menu */}
          <div className="relative">
            <ToolBtn onClick={() => setInsertOpen(!insertOpen)} title="Insert block">
              <Plus className="w-4 h-4" />
            </ToolBtn>
            <InsertMenu 
              isOpen={insertOpen} 
              onClose={() => setInsertOpen(false)} 
              editor={editor}
              onImageClick={() => { setInsertOpen(false); setImageOpen(true); }}
              onYoutubeClick={() => { setInsertOpen(false); setYoutubeOpen(true); }}
            />
          </div>
          
          <Divider />
          
          {/* Text Formatting */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
            <Bold className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
            <Italic className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
            <Code className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => setLinkOpen(true)} active={editor.isActive('link')} title="Link">
            <LinkIcon className="w-4 h-4" />
          </ToolBtn>
          
          <Divider />
          
          {/* Headings */}
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 className="w-4 h-4" />
          </ToolBtn>
          
          <Divider />
          
          {/* Lists & Blocks */}
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
          
          <Divider />
          
          {/* Media */}
          <ToolBtn onClick={() => setImageOpen(true)} title="Insert Image">
            <ImageIcon className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => setYoutubeOpen(true)} title="Embed YouTube">
            <YoutubeIcon className="w-4 h-4" />
          </ToolBtn>
          
          <Divider />
          
          {/* Undo/Redo */}
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (⌘Z)">
            <Undo className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (⌘⇧Z)">
            <Redo className="w-4 h-4" />
          </ToolBtn>
        </div>
        
        {/* Device Preview */}
        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setDevicePreview('desktop')}
            className={`p-1.5 rounded transition-colors ${devicePreview === 'desktop' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}
            title="Desktop preview"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevicePreview('tablet')}
            className={`p-1.5 rounded transition-colors ${devicePreview === 'tablet' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}
            title="Tablet preview"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevicePreview('mobile')}
            className={`p-1.5 rounded transition-colors ${devicePreview === 'mobile' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:text-white'}`}
            title="Mobile preview"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto bg-[#0a0a0f] flex justify-center py-6 px-4">
        <div 
          className={`bg-[#0f0f18] transition-all duration-300 rounded-xl ${devicePreview !== 'desktop' ? 'border border-zinc-200 dark:border-zinc-800 shadow-2xl' : ''}`}
          style={{ width: previewWidth, maxWidth: '100%' }}
        >
          <div className="p-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ImageDialog isOpen={imageOpen} onClose={() => setImageOpen(false)} onInsert={insertImage} projectId={projectId} />
      <YoutubeDialog isOpen={youtubeOpen} onClose={() => setYoutubeOpen(false)} onInsert={insertYoutube} />
      <LinkDialog isOpen={linkOpen} onClose={() => setLinkOpen(false)} onInsert={setLink} initialUrl={editor.getAttributes('link').href || ''} />
    </div>
  );
};

export default UnifiedEditor;
