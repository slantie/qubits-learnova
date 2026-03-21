'use client';

import { formatDuration } from '@/lib/formatDuration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Course } from '@/types';
import { Share, PencilSimple, Trash, BookOpen, Clock } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function CourseCard({ course, onDelete }: { course: Course; onDelete: () => void }) {
    const router = useRouter();

    const handleShare = async () => {
        try {
            const { url } = await api.post(`/courses/${course.id}/share-link`);
            await navigator.clipboard.writeText(url);
            toast.success('Link copied!');
        } catch (error) {
            toast.error('Failed to get share link');
        }
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this course?')) {
            try {
                await api.delete(`/courses/${course.id}`);
                toast.success('Course deleted');
                onDelete();
            } catch (error) {
                toast.error('Failed to delete course');
            }
        }
    };

    return (
        <div className="bg-card text-card-foreground border rounded-lg shadow-sm overflow-hidden flex items-center gap-3 px-3 py-2.5 hover:border-primary/50 transition-colors group">
            {/* Thumbnail */}
            <div className="size-11 rounded-md bg-muted shrink-0 overflow-hidden">
                {course.coverImage ? (
                    <img src={course.coverImage} alt={course.title} className="object-cover w-full h-full" />
                ) : (
                    <div className="flex items-center justify-center w-full h-full">
                        <BookOpen className="size-4 text-muted-foreground/40" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-normal truncate">{course.title}</p>
                    {course.isPublished && (
                        <Badge variant="primary" className="text-[10px] px-1.5 py-0 shrink-0">Live</Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <BookOpen className="size-3" />
                        {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(course.totalDuration)}
                    </span>
                </div>
            </div>

            {/* Actions — visible on hover */}
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/backoffice/courses/${course.id}/edit`)} title="Edit">
                    <PencilSimple className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={handleShare} title="Share link">
                    <Share className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} title="Delete">
                    <Trash className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
