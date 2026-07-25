"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Minus,
  Undo2,
  Redo2,
  Link2,
} from "lucide-react";

interface Props {
  content: unknown | null;
  readOnly?: boolean;
  placeholder?: string;
  onSave: (json: JSONContent, html: string) => void;
}

/** WYSIWYG notes editor (TipTap). Debounces saves 800ms after typing stops. */
export function NotesEditor({ content, readOnly, placeholder, onSave }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? "Add notes — cabling details, maintenance history, contacts…",
      }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: (content as JSONContent) ?? "",
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onSave(editor.getJSON(), editor.getHTML());
      }, 800);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!editor) {
    return <div className="rounded-xl border border-edge bg-sunken min-h-32" />;
  }

  const btn = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${
      active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-sunken hover:text-ink"
    }`;

  function setLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor!.chain().focus().unsetLink().run();
    else editor!.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="rounded-xl border border-edge bg-raised overflow-hidden">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-edge px-2 py-1.5">
          <button className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 size={15} /></button>
          <button className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 size={15} /></button>
          <span className="w-px h-4 bg-edge mx-1" />
          <button className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold size={15} /></button>
          <button className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic size={15} /></button>
          <button className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={15} /></button>
          <button className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code"><Code size={15} /></button>
          <button className={btn(editor.isActive("link"))} onClick={setLink} title="Link"><Link2 size={15} /></button>
          <span className="w-px h-4 bg-edge mx-1" />
          <button className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List size={15} /></button>
          <button className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered size={15} /></button>
          <button className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote size={15} /></button>
          <button className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={15} /></button>
          <span className="flex-1" />
          <button className={btn(false)} onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 size={15} /></button>
          <button className={btn(false)} onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 size={15} /></button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
