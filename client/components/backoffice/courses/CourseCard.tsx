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
        <div className="bg-card text-card-foreground border rounded-lg shadow-sm overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
            <div className="aspect-video bg-muted relative">
                {course.coverImage ? (
                    <img src={course.coverImage} alt={course.title} className="object-cover w-full h-full" />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground bg-muted/50 border-b">
                        No cover image
                    </div>
                )}
                {course.isPublished && (
                    <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600">Published</Badge>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <h3 className=" text-lg line-clamp-2 mb-2">{course.title}</h3>
                <div className="flex flex-wrap gap-1 mb-4">
                    {course.tags.map((tag: string) => (
                        <Badge variant="neutral" key={tag} className="text-xs">{tag}</Badge>
                    ))}
                    {course.tags.length === 0 && <span className="text-xs text-muted-foreground italic">No tags</span>}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                    <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(course.totalDuration)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t p-2 flex bg-muted/20 items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/backoffice/courses/${course.id}/edit`)}>
                    <PencilSimple className="w-4 h-4 mr-2" />
                    Edit
                </Button>
                <div className="flex">
                    <Button variant="ghost" size="icon" onClick={handleShare} title="Share link">
                        <Share className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} title="Delete Course">
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
