import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3, List, ListOrdered, Undo2, Redo2 } from 'lucide-react';

interface DraftEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export default function DraftEditor({ content, onChange, editable = true }: DraftEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable,
    editorProps: {
      attributes: {
        class:
          'report-text prose-sm max-w-none focus:outline-none min-h-[520px] text-[var(--color-text-secondary)] [&_h2]:underline [&_h2]:font-normal [&_h2]:text-[var(--color-text-primary)] [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:text-[var(--color-text-primary)] [&_h3]:text-sm [&_h3]:mt-3 [&_h3]:mb-2 [&_p]:text-sm [&_p]:my-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-sm [&_li]:my-1',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Hydrate editor when external content changes (e.g. report loaded after mount)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || '<p></p>', { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  const tbBtn = (active: boolean, disabled = false) =>
    `p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors ${
      active ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]' : ''
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`;

  return (
    <div>
      {editable && (
        <div className="flex items-center gap-1 mb-3 pb-3 border-b border-[var(--color-border)]">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={tbBtn(editor.isActive('bold'))} title="Bold"><Bold size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={tbBtn(editor.isActive('italic'))} title="Italic"><Italic size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={tbBtn(editor.isActive('underline'))} title="Underline"><UnderlineIcon size={14} /></button>
          <span className="w-px h-5 bg-[var(--color-border)] mx-1" />
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={tbBtn(editor.isActive('heading', { level: 2 }))} title="Section header (underlined)"><Heading2 size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={tbBtn(editor.isActive('heading', { level: 3 }))} title="Sub-header"><Heading3 size={14} /></button>
          <span className="w-px h-5 bg-[var(--color-border)] mx-1" />
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={tbBtn(editor.isActive('bulletList'))} title="Bullet list"><List size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={tbBtn(editor.isActive('orderedList'))} title="Numbered list"><ListOrdered size={14} /></button>
          <span className="flex-1" />
          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={tbBtn(false, !editor.can().undo())} title="Undo"><Undo2 size={14} /></button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={tbBtn(false, !editor.can().redo())} title="Redo"><Redo2 size={14} /></button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
