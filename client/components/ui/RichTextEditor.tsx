'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';
import { cn } from '@/lib/utils';
import {
    TextB, TextItalic, TextStrikethrough, Code, TextHOne, TextHTwo, TextHThree,
    ListBullets, ListNumbers, Quotes, Minus, ArrowCounterClockwise, ArrowClockwise,
    Link as LinkIcon, Image as ImageIcon, TextAlignLeft, TextAlignCenter, TextAlignRight,
    Table as TableIcon, Paragraph,
} from '@phosphor-icons/react';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

function ToolbarButton({
    onClick,
    active,
    disabled,
    children,
    title,
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                'p-1.5 rounded-md transition-colors',
                active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                disabled && 'opacity-40 cursor-not-allowed',
            )}
        >
            {children}
        </button>
    );
}

function ToolbarDivider() {
    return <div className="w-px h-5 bg-border mx-0.5" />;
}

function Toolbar({ editor }: { editor: Editor }) {
    const addImage = () => {
        const url = window.prompt('Image URL:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
    };

    const setLink = () => {
        if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        const url = window.prompt('Link URL:');
        if (url) editor.chain().focus().setLink({ href: url }).run();
    };

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    const s = 'size-4';

    return (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                <TextB className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                <TextItalic className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
                <TextStrikethrough className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
                <Code className={s} />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
                <TextHOne className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                <TextHTwo className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                <TextHThree className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">
                <Paragraph className={s} />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
                <ListBullets className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
                <ListNumbers className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
                <Quotes className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
                <Minus className={s} />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
                <TextAlignLeft className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
                <TextAlignCenter className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
                <TextAlignRight className={s} />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link">
                <LinkIcon className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="Image">
                <ImageIcon className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={addTable} title="Insert table">
                <TableIcon className={s} />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                <ArrowCounterClockwise className={s} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                <ArrowClockwise className={s} />
            </ToolbarButton>
        </div>
    );
}

export function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ codeBlock: false }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
            Image.configure({ inline: false, allowBase64: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Placeholder.configure({ placeholder: placeholder ?? 'Start writing...' }),
            CodeBlockLowlight.configure({ lowlight }),
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader,
        ],
        content,
        onUpdate: ({ editor: e }) => onChange(e.getHTML()),
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none px-3 py-2 min-h-[180px] focus:outline-none',
            },
        },
    });

    if (!editor) return null;

    return (
        <div className={cn('rounded-lg border border-input overflow-hidden focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50', className)}>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
}
