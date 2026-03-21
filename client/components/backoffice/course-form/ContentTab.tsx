'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DotsLoader } from '@/components/ui/dots-loader';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
    Play, FileText, Image as ImageIcon, ClipboardText, DotsThreeVertical,
    Plus, DotsSixVertical, CaretDown, CaretRight, Lock, LockOpen,
    FileAudio, Link as Link2Icon, Code, CheckSquare, ChartBar as ChartBar3, Chat,
    PencilSimple, Trash, FolderPlus, FilePlus, Warning,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BlockEditorModal } from './BlockEditorModal';
import type { LessonType, Section } from '@/types';

interface ContentTabProps { courseId: string; }

interface LessonRow {
    id: number;
    title: string;
    type: LessonType;
    order: number;
    sectionId: number | null;
    duration: number | null;
    videoStatus?: string | null;
}

interface SectionData extends Section {
    lessons: LessonRow[];
}

const BLOCK_TYPES: { type: LessonType; label: string; icon: React.ElementType; desc: string }[] = [
    { type: 'VIDEO',        label: 'Video',           icon: Play,          desc: 'Upload & stream video' },
    { type: 'ARTICLE',      label: 'Article',         icon: FileText,      desc: 'Rich text content' },
    { type: 'PDF',          label: 'PDF',             icon: FileText,      desc: 'Upload a PDF document' },
    { type: 'IMAGE',        label: 'Image',           icon: ImageIcon,     desc: 'Display an image' },
    { type: 'AUDIO',        label: 'Audio',           icon: FileAudio,     desc: 'Audio lesson or podcast' },
    { type: 'LINK_BLOCK',   label: 'Link',            icon: Link2Icon,     desc: 'External resource link' },
    { type: 'IFRAME',       label: 'Embed / iFrame',  icon: Code,          desc: 'Embed any URL or tool' },
    { type: 'QUIZ_BLOCK',   label: 'Quiz Block',      icon: ClipboardText, desc: 'Attach an existing quiz' },
    { type: 'ASSIGNMENT',   label: 'Assignment',      icon: CheckSquare,   desc: 'Checklist assignment' },
    { type: 'SURVEY',       label: 'Survey / Poll',   icon: ChartBar3,     desc: 'Gather learner feedback' },
    { type: 'FEEDBACK_GATE',label: 'Feedback Gate',   icon: Chat,          desc: 'Gate progress behind feedback' },
];

function blockIcon(type: LessonType) {
    const found = BLOCK_TYPES.find(b => b.type === type);
    if (found) return found.icon;
    return FileText;
}

function blockLabel(type: LessonType) {
    const found = BLOCK_TYPES.find(b => b.type === type);
    return found?.label ?? type;
}

function formatDuration(s: number | null) {
    if (!s) return '';
    const m = Math.floor(s / 60), sec = s % 60;
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

// ── Drag state shared across sections ────────────────────────────────────────
interface DragItem { lessonId: number; fromSectionId: number | null }

export function ContentTab({ courseId }: ContentTabProps) {
    const [sections, setSections] = useState<SectionData[]>([]);
    const [orphans, setOrphans] = useState<LessonRow[]>([]); // lessons with no section
    const [quizzes, setQuizzes] = useState<{ id: number; title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

    // Block editor modal
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<LessonRow | null>(null);
    const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
    const [pendingType, setPendingType] = useState<LessonType | null>(null);

    // Section rename inline
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Drag state
    const drag = useRef<DragItem | null>(null);
    const [dragOverLesson, setDragOverLesson] = useState<number | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/courses/${courseId}/sections`);
            const sectionList: SectionData[] = (data.sections ?? []).map((s: any) => ({
                ...s,
                lessons: s.lessons ?? [],
            }));
            setSections(sectionList);

            // Also fetch orphan lessons
            const lessonData = await api.get(`/courses/${courseId}/lessons`);
            const all: LessonRow[] = lessonData.lessons ?? [];
            setOrphans(all.filter(l => l.sectionId === null));

            // Fetch quizzes for QUIZ_BLOCK selector
            try {
                const qData = await api.get(`/courses/${courseId}/quizzes`);
                setQuizzes(qData.quizzes ?? qData ?? []);
            } catch { /* non-fatal */ }
        } catch {
            toast.error('Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [courseId]);

    // ── Section actions ──────────────────────────────────────────────────────
    const addSection = async () => {
        try {
            const data = await api.post(`/courses/${courseId}/sections`, { title: 'New Section' });
            setSections(prev => [...prev, { ...data.section, lessons: [] }]);
            setRenamingId(data.section.id);
            setRenameValue('New Section');
        } catch { toast.error('Failed to add section'); }
    };

    const commitRename = async (id: number) => {
        const val = renameValue.trim();
        if (!val) { setRenamingId(null); return; }
        try {
            await api.patch(`/courses/${courseId}/sections/${id}`, { title: val });
            setSections(prev => prev.map(s => s.id === id ? { ...s, title: val } : s));
        } catch { toast.error('Failed to rename section'); }
        setRenamingId(null);
    };

    const toggleLock = async (s: SectionData) => {
        try {
            await api.patch(`/courses/${courseId}/sections/${s.id}`, { isLocked: !s.isLocked });
            setSections(prev => prev.map(sec => sec.id === s.id ? { ...sec, isLocked: !s.isLocked } : sec));
        } catch { toast.error('Failed to update lock'); }
    };

    const deleteSection = async (id: number) => {
        if (!confirm('Delete section? Its lessons will become unsectioned.')) return;
        try {
            await api.delete(`/courses/${courseId}/sections/${id}`);
            setSections(prev => prev.filter(s => s.id !== id));
            fetchAll(); // refresh orphans
        } catch { toast.error('Failed to delete section'); }
    };

    // ── Block actions ────────────────────────────────────────────────────────
    const openAdd = (sectionId: number | null, type: LessonType) => {
        setEditingLesson(null);
        setTargetSectionId(sectionId);
        setPendingType(type);
        setEditorOpen(true);
    };

    const openEdit = (lesson: LessonRow) => {
        setEditingLesson(lesson as any);
        setTargetSectionId(lesson.sectionId);
        setPendingType(null);
        setEditorOpen(true);
    };

    const deleteLesson = async (lessonId: number, sectionId: number | null) => {
        if (!confirm('Delete this block?')) return;
        try {
            await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
            if (sectionId === null) {
                setOrphans(prev => prev.filter(l => l.id !== lessonId));
            } else {
                setSections(prev => prev.map(s =>
                    s.id === sectionId ? { ...s, lessons: s.lessons.filter(l => l.id !== lessonId) } : s,
                ));
            }
            toast.success('Block deleted');
        } catch { toast.error('Failed to delete block'); }
    };

    const handleEditorSave = () => {
        setEditorOpen(false);
        fetchAll();
    };

    // ── Drag & drop ──────────────────────────────────────────────────────────
    const handleDragStart = (lessonId: number, fromSectionId: number | null) => {
        drag.current = { lessonId, fromSectionId };
    };

    const handleDrop = async (toSectionId: number | null, afterLessonId: number | null) => {
        if (!drag.current) return;
        const { lessonId } = drag.current;
        drag.current = null;
        setDragOverLesson(null);

        try {
            // Determine new order
            const targetList = toSectionId === null
                ? orphans
                : sections.find(s => s.id === toSectionId)?.lessons ?? [];

            let newOrder = 1;
            if (afterLessonId) {
                const idx = targetList.findIndex(l => l.id === afterLessonId);
                newOrder = idx >= 0 ? targetList[idx].order + 1 : targetList.length + 1;
            }

            await api.post(`/courses/${courseId}/sections/move-lesson`, {
                lessonId, sectionId: toSectionId, order: newOrder,
            });
            fetchAll();
        } catch { toast.error('Failed to move block'); }
    };

    // ── Section drag-to-reorder ──────────────────────────────────────────────
    const sectionDrag = useRef<number | null>(null);
    const [sectionDragOver, setSectionDragOver] = useState<number | null>(null);

    const handleSectionDrop = async (targetId: number) => {
        if (sectionDrag.current === null || sectionDrag.current === targetId) return;
        const ids = sections.map(s => s.id);
        const fromIdx = ids.indexOf(sectionDrag.current);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        const reordered = [...ids];
        reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, sectionDrag.current);

        setSections(prev => {
            const map = Object.fromEntries(prev.map(s => [s.id, s]));
            return reordered.map(id => map[id]);
        });
        sectionDrag.current = null;
        setSectionDragOver(null);

        try {
            await api.patch(`/courses/${courseId}/sections/reorder`, { sectionIds: reordered });
        } catch { toast.error('Failed to reorder sections'); fetchAll(); }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-12"><DotsLoader size="sm" /></div>;
    }

    const allEmpty = sections.length === 0 && orphans.length === 0;

    return (
        <div className="flex flex-col gap-3">
            {allEmpty && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
                    <FolderPlus className="size-10 opacity-30" />
                    <p className="text-sm font-medium">No content yet</p>
                    <p className="text-xs opacity-60">Add a section to organise your content, then add blocks inside it.</p>
                </div>
            )}

            {/* ── Orphan blocks (no section) ─────────────────────────────── */}
            {orphans.length > 0 && (
                <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Warning className="size-3.5" /> Unsectioned blocks
                    </p>
                    <LessonList
                        lessons={orphans}
                        sectionId={null}
                        courseId={courseId}
                        drag={drag}
                        dragOverLesson={dragOverLesson}
                        setDragOverLesson={setDragOverLesson}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onEdit={openEdit}
                        onDelete={l => deleteLesson(l.id, null)}
                    />
                </div>
            )}

            {/* ── Sections ──────────────────────────────────────────────────── */}
            {sections.map((section) => {
                const isCollapsed = collapsed.has(section.id);
                const isRenamingThis = renamingId === section.id;
                const isDragOverThis = sectionDragOver === section.id;

                return (
                    <div
                        key={section.id}
                        draggable
                        onDragStart={() => { sectionDrag.current = section.id; }}
                        onDragOver={e => { e.preventDefault(); setSectionDragOver(section.id); }}
                        onDragLeave={() => setSectionDragOver(null)}
                        onDrop={() => handleSectionDrop(section.id)}
                        className={cn(
                            'rounded-xl border bg-card transition-all',
                            isDragOverThis && 'ring-2 ring-primary/40 border-primary/40',
                        )}
                    >
                        {/* Section header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
                            <DotsSixVertical className="size-4 text-muted-foreground/40 shrink-0 cursor-grab" />

                            <button
                                type="button"
                                onClick={() => setCollapsed(p => { const n = new Set(p); n.has(section.id) ? n.delete(section.id) : n.add(section.id); return n; })}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {isCollapsed
                                    ? <CaretRight className="size-4" />
                                    : <CaretDown className="size-4" />}
                            </button>

                            {isRenamingThis ? (
                                <Input
                                    autoFocus
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    onBlur={() => commitRename(section.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') commitRename(section.id); if (e.key === 'Escape') setRenamingId(null); }}
                                    className="h-7 text-sm flex-1 font-semibold"
                                />
                            ) : (
                                <span
                                    className="flex-1 text-sm font-semibold cursor-pointer select-none"
                                    onDoubleClick={() => { setRenamingId(section.id); setRenameValue(section.title); }}
                                >
                                    {section.title}
                                </span>
                            )}

                            <span className="text-xs text-muted-foreground shrink-0">
                                {section.lessons.length} block{section.lessons.length !== 1 ? 's' : ''}
                            </span>

                            {/* Lock toggle */}
                            <button
                                type="button"
                                onClick={() => toggleLock(section)}
                                title={section.isLocked ? 'Section is locked (click to unlock)' : 'Section is open (click to lock)'}
                                className={cn(
                                    'shrink-0 transition-colors',
                                    section.isLocked ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-muted-foreground',
                                )}
                            >
                                {section.isLocked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                            </button>

                            {/* Section menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger className="shrink-0 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <DotsThreeVertical className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setRenamingId(section.id); setRenameValue(section.title); }}>
                                        <PencilSimple className="size-3.5 mr-2" /> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onClick={() => deleteSection(section.id)}>
                                        <Trash className="size-3.5 mr-2" /> Delete Section
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Section body */}
                        {!isCollapsed && (
                            <div className="px-3 py-2 flex flex-col gap-2">
                                <LessonList
                                    lessons={section.lessons}
                                    sectionId={section.id}
                                    courseId={courseId}
                                    drag={drag}
                                    dragOverLesson={dragOverLesson}
                                    setDragOverLesson={setDragOverLesson}
                                    onDragStart={handleDragStart}
                                    onDrop={handleDrop}
                                    onEdit={openEdit}
                                    onDelete={l => deleteLesson(l.id, section.id)}
                                />

                                {/* Add block button */}
                                <AddBlockMenu
                                    onSelect={type => openAdd(section.id, type)}
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* ── Add section ───────────────────────────────────────────────── */}
            <Button variant="outline" size="sm" onClick={addSection} className="self-start mt-1">
                <FolderPlus className="size-4 mr-1.5" />
                Add Section
            </Button>

            {/* Block editor */}
            {editorOpen && (
                <BlockEditorModal
                    courseId={courseId}
                    lesson={editingLesson as any}
                    initialType={pendingType ?? editingLesson?.type ?? 'VIDEO'}
                    sectionId={targetSectionId}
                    quizzes={quizzes}
                    onSave={handleEditorSave}
                    onClose={() => setEditorOpen(false)}
                />
            )}
        </div>
    );
}

// ── LessonList component ─────────────────────────────────────────────────────
function LessonList({
    lessons, sectionId, courseId,
    drag, dragOverLesson, setDragOverLesson,
    onDragStart, onDrop, onEdit, onDelete,
}: {
    lessons: LessonRow[];
    sectionId: number | null;
    courseId: string;
    drag: React.MutableRefObject<DragItem | null>;
    dragOverLesson: number | null;
    setDragOverLesson: (id: number | null) => void;
    onDragStart: (id: number, sectionId: number | null) => void;
    onDrop: (sectionId: number | null, afterId: number | null) => void;
    onEdit: (l: LessonRow) => void;
    onDelete: (l: LessonRow) => void;
}) {
    if (lessons.length === 0) {
        return (
            <div
                className="py-4 text-center text-xs text-muted-foreground/50 border-2 border-dashed border-muted-foreground/10 rounded-lg"
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(sectionId, null)}
            >
                Drop blocks here or add below
            </div>
        );
    }

    return (
        <ol className="flex flex-col gap-1.5">
            {lessons.map((lesson) => {
                const Icon = blockIcon(lesson.type);
                const isDragOver = dragOverLesson === lesson.id;
                return (
                    <li
                        key={lesson.id}
                        draggable
                        onDragStart={() => onDragStart(lesson.id, sectionId)}
                        onDragOver={e => { e.preventDefault(); setDragOverLesson(lesson.id); }}
                        onDragLeave={() => setDragOverLesson(null)}
                        onDrop={() => onDrop(sectionId, lesson.id)}
                        className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-background hover:border-primary/30 transition-colors cursor-grab active:cursor-grabbing',
                            isDragOver && 'ring-2 ring-primary/30 border-primary/40',
                        )}
                    >
                        <DotsSixVertical className="size-3.5 text-muted-foreground/30 shrink-0" />
                        <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="size-3.5 text-primary" />
                        </div>
                        <span className="flex-1 text-sm font-medium truncate">{lesson.title}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                            {blockLabel(lesson.type)}
                        </span>
                        {lesson.duration != null && (
                            <span className="text-xs text-muted-foreground shrink-0">{formatDuration(lesson.duration)}</span>
                        )}
                        {lesson.type === 'VIDEO' && lesson.videoStatus === 'PROCESSING' && (
                            <span className="text-[10px] text-amber-500 shrink-0">Processing…</span>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <DotsThreeVertical className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(lesson)}>
                                    <PencilSimple className="size-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => onDelete(lesson)}>
                                    <Trash className="size-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </li>
                );
            })}
        </ol>
    );
}

// ── AddBlockMenu ─────────────────────────────────────────────────────────────
function AddBlockMenu({ onSelect }: { onSelect: (type: LessonType) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="self-start h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md hover:bg-muted transition-colors">
                <FilePlus className="size-3.5" />
                Add Block
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {BLOCK_TYPES.map(({ type, label, icon: Icon, desc }) => (
                    <DropdownMenuItem key={type} onClick={() => onSelect(type)} className="flex items-start gap-2.5 py-2">
                        <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="size-3.5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium leading-none">{label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
