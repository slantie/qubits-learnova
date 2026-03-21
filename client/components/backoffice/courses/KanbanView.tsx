'use client';

import { Course } from '@/types';
import { CourseCard } from './CourseCard';
import {
    KanbanBoardProvider,
    KanbanBoard,
    KanbanBoardColumn,
    KanbanBoardColumnHeader,
    KanbanBoardColumnTitle,
    KanbanBoardColumnList,
    KanbanBoardColumnListItem
} from '@/components/kanban';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function KanbanView({ courses, onDelete }: { courses: Course[]; onDelete: () => void }) {
    const drafts = courses.filter((c) => !c.isPublished);
    const published = courses.filter((c) => c.isPublished);

    const handleDrop = async (data: string, columnId: string) => {
        try {
            const course = JSON.parse(data) as Course;
            const targetIsPublished = columnId === 'published';

            if (course.isPublished !== targetIsPublished) {
                await api.patch(`/courses/${course.id}/publish`, { isPublished: targetIsPublished });
                toast.success(`Course ${targetIsPublished ? 'published' : 'moved to drafts'}`);
                onDelete(); // refresh
            }
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : 'Failed to update course status');
        }
    };

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
                        <h2 className="font-semibold text-lg flex items-center justify-between w-full">
                            Drafts
                            <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">
                                {drafts.length}
                            </span>
                        </h2>
                    </KanbanBoardColumnHeader>

                    <KanbanBoardColumnList className="p-4 gap-4 flex flex-col bg-muted/30 rounded-xl min-h-[500px]">
                        {drafts.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">No drafts</div>
                        ) : (
                            drafts.map((course) => (
                                <KanbanBoardColumnListItem
                                    key={course.id}
                                    cardId={course.id.toString()}
                                    onDropOverListItem={(data) => handleDrop(data, 'drafts')}
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
                                        <CourseCard course={course} onDelete={onDelete} />
                                    </div>
                                </KanbanBoardColumnListItem>
                            ))
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
                        <h2 className="font-semibold text-lg flex items-center justify-between w-full">
                            Published
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                                {published.length}
                            </span>
                        </h2>
                    </KanbanBoardColumnHeader>

                    <KanbanBoardColumnList className="p-4 gap-4 flex flex-col bg-muted/30 rounded-xl min-h-[500px]">
                        {published.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">No published courses</div>
                        ) : (
                            published.map((course) => (
                                <KanbanBoardColumnListItem
                                    key={course.id}
                                    cardId={course.id.toString()}
                                    onDropOverListItem={(data) => handleDrop(data, 'published')}
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
                                        <CourseCard course={course} onDelete={onDelete} />
                                    </div>
                                </KanbanBoardColumnListItem>
                            ))
                        )}
                    </KanbanBoardColumnList>
                </KanbanBoardColumn>

            </KanbanBoard>
        </KanbanBoardProvider>
    );
}
