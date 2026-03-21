'use client';

import { Course } from '@/types';
import { formatDuration } from '@/lib/formatDuration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PencilSimple, Share, Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export function ListView({ courses, onDelete }: { courses: Course[]; onDelete: () => void }) {
    const router = useRouter();

    const handleShare = async (course: Course) => {
        try {
            const { url } = await api.post(`/courses/${course.id}/share-link`);
            await navigator.clipboard.writeText(url);
            toast.success('Link copied!');
        } catch (error) {
            toast.error('Failed to get share link');
        }
    };

    const handleDelete = async (course: Course) => {
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
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Lessons</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {courses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No courses found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        courses.map((course) => (
                            <TableRow key={course.id}>
                                <TableCell className="font-medium max-w-[300px] truncate" title={course.title}>
                                    {course.title}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {course.tags.slice(0, 2).map((tag: string) => (
                                            <Badge variant="neutral" key={tag} className="text-[10px] py-0">{tag}</Badge>
                                        ))}
                                        {course.tags.length > 2 && <span className="text-xs text-muted-foreground">+{course.tags.length - 2}</span>}
                                    </div>
                                </TableCell>
                                <TableCell>{course.lessonCount}</TableCell>
                                <TableCell>{formatDuration(course.totalDuration)}</TableCell>
                                <TableCell>
                                    {course.isPublished ? (
                                        <Badge variant="success" className="bg-green-500 hover:bg-green-600">Published</Badge>
                                    ) : (
                                        <Badge variant="neutral">Draft</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => router.push(`/backoffice/courses/${course.id}/edit`)}>
                                            <PencilSimple className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleShare(course)}>
                                            <Share className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(course)}>
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
