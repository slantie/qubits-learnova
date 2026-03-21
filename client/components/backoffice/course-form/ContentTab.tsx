'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Play, FileText, Image as ImageIcon, ClipboardText, DotsThreeVertical, Plus, DotsSixVertical } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { LessonEditorModal } from './LessonEditorModal';
import { Lesson, LessonType } from '@/types';

interface ContentTabProps {
    courseId: string;
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function LessonTypeIcon({ type }: { type: LessonType }) {
    const cls = 'size-4 shrink-0';
    switch (type) {
        case 'VIDEO':
            return <Play className={cls} />;
        case 'DOCUMENT':
            return <FileText className={cls} />;
        case 'IMAGE':
            return <ImageIcon className={cls} />;
        case 'QUIZ':
            return <ClipboardText className={cls} />;
    }
}

export function ContentTab({ courseId }: ContentTabProps) {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/courses/${courseId}/lessons`);
            setLessons(data.lessons ?? data ?? []);
        } catch {
            toast.error('Failed to load lessons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, [courseId]);

    const handleDelete = async (lessonId: number) => {
        if (!confirm('Delete this lesson?')) return;
        try {
            await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
            setLessons((prev) => prev.filter((l) => l.id !== lessonId));
            toast.success('Lesson deleted');
        } catch {
            toast.error('Failed to delete lesson');
        }
    };

    const handleEdit = (lesson: Lesson) => {
        setEditingLesson(lesson);
        setEditorOpen(true);
    };

    const handleAdd = () => {
        setEditingLesson(null);
        setEditorOpen(true);
    };

    const handleEditorClose = () => {
        setEditorOpen(false);
        setEditingLesson(null);
    };

    const handleEditorSave = () => {
        setEditorOpen(false);
        setEditingLesson(null);
        fetchLessons();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground">
                    <ClipboardText className="size-10 opacity-40" />
                    <p className="text-sm">No lessons yet. Add your first lesson.</p>
                </div>
            ) : (
                <ol className="flex flex-col gap-2">
                    {lessons.map((lesson, index) => (
                        <li
                            key={lesson.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                        >
                            <DotsSixVertical className="size-4 text-muted-foreground/40 shrink-0" />
                            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                                {index + 1}
                            </span>
                            <div className="text-muted-foreground shrink-0">
                                <LessonTypeIcon type={lesson.type} />
                            </div>
                            <span className="flex-1 text-sm font-medium truncate">{lesson.title}</span>
                            {lesson.type === 'VIDEO' && lesson.duration != null && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDuration(lesson.duration)}
                                </span>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger className="shrink-0 inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                        <DotsThreeVertical className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(lesson)}>
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => handleDelete(lesson.id)}
                                    >
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </li>
                    ))}
                </ol>
            )}

            <Button
                variant="outline"
                size="sm"
                onClick={handleAdd}
                className="self-start"
            >
                <Plus className="size-4 mr-1.5" />
                Add Content
            </Button>

            {editorOpen && (
                <LessonEditorModal
                    courseId={courseId}
                    lesson={editingLesson}
                    onSave={handleEditorSave}
                    onClose={handleEditorClose}
                />
            )}
        </div>
    );
}
