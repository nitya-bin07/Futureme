'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Highlighter,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
  Quote, Undo2, Redo2, Link2
} from 'lucide-react';

interface RichEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

function ToolbarButton({ onClick, active, title, children }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center transition-all duration-150 text-xs
        ${active
          ? 'bg-gold/20 text-gold border border-gold/30'
          : 'text-parchment/40 hover:text-parchment hover:bg-white/5'
        }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[#2a2a3e] mx-0.5 self-center" />;
}

export default function RichEditor({ content, onChange, placeholder = 'Begin your letter...', readOnly = false }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      CharacterCount,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[320px] text-parchment/80 font-serif text-base leading-relaxed px-1',
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content]);

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  if (!editor) return null;

  const wordCount = editor.storage.characterCount?.words() || 0;

  return (
    <div className="rounded-xl border border-[#2a2a3e] bg-[#0d0d14] overflow-hidden focus-within:border-gold/30 transition-colors duration-200">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#2a2a3e] bg-[#16161f]">
          {/* Text style */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <UnderlineIcon size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
            <Highlighter size={13} />
          </ToolbarButton>

          <Divider />

          {/* Alignment */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
            <AlignLeft size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
            <AlignCenter size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
            <AlignRight size={13} />
          </ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <List size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            <ListOrdered size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote size={13} />
          </ToolbarButton>

          <Divider />

          {/* Link */}
          <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Add Link">
            <Link2 size={13} />
          </ToolbarButton>

          <Divider />

          {/* History */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
            <Undo2 size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">
            <Redo2 size={13} />
          </ToolbarButton>

          {/* Word count */}
          <div className="ml-auto text-parchment/20 text-xs font-sans">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>
        </div>
      )}

      <div className="p-5">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .prose-editor h1 { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #f5f0e8; margin-bottom: 0.5rem; }
        .prose-editor h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #f5f0e8; margin-bottom: 0.4rem; }
        .prose-editor h3 { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #f5f0e8; }
        .prose-editor p { margin-bottom: 0.75rem; }
        .prose-editor strong { color: #f5f0e8; font-weight: 600; }
        .prose-editor em { color: #d4c5a9; font-style: italic; }
        .prose-editor u { text-decoration: underline; text-decoration-color: #c9a96e80; }
        .prose-editor mark { background: rgba(201,169,110,0.2); color: #f5f0e8; padding: 0 2px; border-radius: 2px; }
        .prose-editor blockquote { border-left: 3px solid #c9a96e; padding-left: 1rem; color: #b8b4ae; font-style: italic; margin: 1rem 0; }
        .prose-editor ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .prose-editor ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .prose-editor li { margin-bottom: 0.25rem; }
        .prose-editor a { color: #c9a96e; text-decoration: underline; }
        .prose-editor .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgba(245, 240, 232, 0.2);
          pointer-events: none;
          float: left;
          height: 0;
          font-style: italic;
        }
        .prose-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
        }
      `}</style>
    </div>
  );
}
