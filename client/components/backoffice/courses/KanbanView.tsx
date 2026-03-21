'use client';

import { Course } from '@/types';
import { CourseCard } from './CourseCard';
import {
    KanbanBoardProvider,
    KanbanBoard,
    KanbanBoardColumn,
    KanbanBoardColumnHeader,
    KanbanBoardColumnList,
    KanbanBoardColumnListItem
} from '@/components/kanban';
import { api, ApiError } from '@/lib/api';
import { toast } from 'sonner';

export function KanbanView({ courses, onRefresh }: { courses: Course[]; onRefresh: () => void }) {
    const drafts = courses.filter((c) => !c.isPublished);
    const published = courses.filter((c) => c.isPublished);

    const handleDrop = async (data: string, columnId: string) => {
        let course: Course;
        try {
            course = JSON.parse(data) as Course;
        } catch {
            return; // silently ignore malformed drag data
        }

        const targetIsPublished = columnId === 'published';

        // No-op if already in the right column
        if (course.isPublished === targetIsPublished) return;

        try {
            await api.patch(`/courses/${course.id}/publish`, { isPublished: targetIsPublished });
            toast.success(targetIsPublished ? 'Course published!' : 'Course moved to drafts');
            onRefresh();
        } catch (e) {
            // Always refresh on failure so the card snaps back to its correct column visually
            onRefresh();

            if (e instanceof ApiError && e.status === 422) {
                // Backend: websiteUrl must be set before publishing
                toast.error('Set a Website URL before publishing', {
                    description: 'Open the course editor and fill in the Website URL field.',
                    action: {
                        label: 'Edit course',
                        onClick: () => {
                            window.location.href = `/backoffice/courses/${course.id}/edit`;
                        },
                    },
                    duration: 6000,
                });
            } else {
                toast.error(e instanceof Error ? e.message : 'Failed to update course status');
            }
        }
    };

    const renderCard = (course: Course) => (
        <KanbanBoardColumnListItem
            key={course.id}
            cardId={course.id.toString()}
            onDropOverListItem={(data) => handleDrop(data, course.isPublished ? 'published' : 'drafts')}
            className="p-0 border-none mb-0 last:mb-0 hover:z-10 focus-within:z-10"
        >
            <div
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('kanban-board-card', JSON.stringify(course));
                }}
                className="cursor-move"
            >
                <CourseCard course={course} onDelete={onRefresh} />
            </div>
        </KanbanBoardColumnListItem>
    );

    return (
        <KanbanBoardProvider>
            <KanbanBoard className="gap-6 h-full pb-10">

                {/* Drafts Column */}
                <KanbanBoardColumn
                    columnId="drafts"
                    className="bg-muted/10 w-full sm:w-[45%] md:w-[400px] border-none shadow-none"
                    onDropOverColumn={(data) => handleDrop(data, 'drafts')}
                >
                    <KanbanBoardColumnHeader className="px-0">
                        <h2 className="font-medium text-lg flex items-center justify-between w-full">
                            Drafts
                            <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs font-semibold">
                                {drafts.length}
                            </span>
                        </h2>
                    </KanbanBoardColumnHeader>

                    <KanbanBoardColumnList className="p-4 gap-4 flex flex-col bg-muted/30 rounded-xl min-h-[500px]">
                        {drafts.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10 text-sm">
                                No drafts — drag a published course here to unpublish it.
                            </div>
                        ) : (
                            drafts.map(renderCard)
                        )}
                    </KanbanBoardColumnList>
                </KanbanBoardColumn>

                {/* Published Column */}
                <KanbanBoardColumn
                    columnId="published"
                    className="bg-muted/10 w-full sm:w-[45%] md:w-[400px] border-none shadow-none"
                    onDropOverColumn={(data) => handleDrop(data, 'published')}
                >
                    <KanbanBoardColumnHeader className="px-0">
                        <h2 className="font-medium text-lg flex items-center justify-between w-full">
                            Published
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-semibold">
                                {published.length}
                            </span>
                        </h2>
                    </KanbanBoardColumnHeader>

                    <KanbanBoardColumnList className="p-4 gap-4 flex flex-col bg-muted/30 rounded-xl min-h-[500px]">
                        {published.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10 text-sm">
                                Drag a draft here to publish it. Make sure to set a Website URL first.
                            </div>
                        ) : (
                            published.map(renderCard)
                        )}
                    </KanbanBoardColumnList>
                </KanbanBoardColumn>

            </KanbanBoard>
        </KanbanBoardProvider>
    );
}
