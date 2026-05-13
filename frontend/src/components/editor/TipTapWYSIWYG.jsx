/**
 * TipTapWYSIWYG — clean Markdown WYSIWYG built on TipTap v3.
 *
 *  • Loads markdown -> HTML via `marked` -> TipTap setContent
 *  • Emits markdown back via `turndown` on every change (debounced)
 *  • Bubble menu for inline formatting (bold / italic / code / link)
 *  • Top toolbar for blocks (heading, list, quote, code-block, image, link)
 *  • Slash command not included here (kept simple — the markdown editor's
 *    slash command lives in /SlashCommands.jsx). Visual mode is for
 *    WYSIWYG editing; structured content can be inserted via the toolbar.
 */
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import {
    Bold, Italic, Code, Strikethrough, Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Code2, Link2, Image as ImageIcon, Minus,
    Undo, Redo,
} from 'lucide-react';

// Configure markdown parser
marked.setOptions({ gfm: true, breaks: false });

// Configure HTML -> Markdown converter
const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '_',
});
// Preserve fenced code language
turndown.addRule('fencedCodeBlock', {
    filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
    replacement: (_content, node) => {
        const code = node.firstChild;
        const lang = (code.className || '').match(/language-([\w-]+)/)?.[1] || '';
        const text = code.textContent.replace(/\n+$/, '');
        return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    },
});
// Preserve custom JSX-ish components (Callout, CardGroup, Steps, Tabs etc.)
turndown.keep((node) => {
    if (node.nodeType !== 1) return false;
    const tag = node.tagName?.toLowerCase();
    return ['callout', 'card', 'cardgroup', 'columns', 'steps', 'step', 'tabs', 'tab', 'accordion', 'accordionitem'].includes(tag);
});

const ToolbarButton = ({ active, onClick, title, children, testId }) => (
    <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={title}
        data-testid={testId}
        className={`btn-press inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            active
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white'
        }`}
    >
        {children}
    </button>
);

const Divider = () => <span className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />;

export const TipTapWYSIWYG = ({ content, onChange, placeholder = 'Start writing — markdown shortcuts work too…' }) => {
    const lastEmittedMd = useRef(content || '');
    const debounceRef = useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                codeBlock: { HTMLAttributes: { class: 'tiptap-code-block' } },
            }),
            Placeholder.configure({ placeholder }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-brand underline underline-offset-2' },
            }),
            Image.configure({
                HTMLAttributes: { class: 'rounded-lg my-4 border border-zinc-200 dark:border-zinc-800' },
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'tiptap-wysiwyg prose prose-zinc dark:prose-invert max-w-none focus:outline-none px-6 py-8 min-h-full',
                'data-testid': 'tiptap-editor',
            },
        },
        onUpdate: ({ editor }) => {
            // Convert HTML -> markdown and emit. Debounce to avoid thrashing on every keystroke.
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                const html = editor.getHTML();
                const md = turndown.turndown(html).trim();
                lastEmittedMd.current = md;
                onChange?.(md);
            }, 180);
        },
    });

    // Sync incoming markdown content -> editor when it changes externally
    // (e.g. when user types in the markdown side of the split view).
    useEffect(() => {
        if (!editor) return;
        const incoming = content || '';
        if (incoming === lastEmittedMd.current) return; // came from our own edit
        const html = marked.parse(incoming);
        editor.commands.setContent(html, { emitUpdate: false });
        lastEmittedMd.current = incoming;
    }, [content, editor]);

    const insertLink = useCallback(() => {
        const previousUrl = editor?.getAttributes('link').href;
        const url = window.prompt('Link URL', previousUrl || 'https://');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const insertImage = useCallback(() => {
        const url = window.prompt('Image URL', 'https://');
        if (!url) return;
        const alt = window.prompt('Alt text (optional)', '');
        editor.chain().focus().setImage({ src: url, alt: alt || undefined }).run();
    }, [editor]);

    if (!editor) {
        return (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                Loading editor…
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10 overflow-x-auto">
                <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} testId="tt-undo">
                    <Undo className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} testId="tt-redo">
                    <Redo className="h-4 w-4" />
                </ToolbarButton>
                <Divider />

                <ToolbarButton
                    title="Heading 1"
                    active={editor.isActive('heading', { level: 1 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    testId="tt-h1"
                >
                    <Heading1 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Heading 2"
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    testId="tt-h2"
                >
                    <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Heading 3"
                    active={editor.isActive('heading', { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    testId="tt-h3"
                >
                    <Heading3 className="h-4 w-4" />
                </ToolbarButton>
                <Divider />

                <ToolbarButton
                    title="Bold (⌘B)"
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    testId="tt-bold"
                >
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Italic (⌘I)"
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    testId="tt-italic"
                >
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Strikethrough"
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <Strikethrough className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Inline code"
                    active={editor.isActive('code')}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                >
                    <Code className="h-4 w-4" />
                </ToolbarButton>
                <Divider />

                <ToolbarButton
                    title="Bulleted list"
                    active={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Numbered list"
                    active={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Quote"
                    active={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Code block"
                    active={editor.isActive('codeBlock')}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                    <Code2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    title="Divider"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                    <Minus className="h-4 w-4" />
                </ToolbarButton>
                <Divider />

                <ToolbarButton title="Insert link" active={editor.isActive('link')} onClick={insertLink} testId="tt-link">
                    <Link2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Insert image" onClick={insertImage} testId="tt-image">
                    <ImageIcon className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Bubble menu */}
            <BubbleMenu
                editor={editor}
                tippyOptions={{ duration: 100 }}
                className="flex items-center gap-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-1 py-1 shadow-lg"
            >
                <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
                    <Code className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Link" active={editor.isActive('link')} onClick={insertLink}>
                    <Link2 className="h-3.5 w-3.5" />
                </ToolbarButton>
            </BubbleMenu>

            {/* Editor surface */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
                <div className="max-w-3xl mx-auto">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
};

export default TipTapWYSIWYG;
