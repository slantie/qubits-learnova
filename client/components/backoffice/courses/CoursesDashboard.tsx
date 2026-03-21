'use client';

import { useState, useEffect } from 'react';
import { Course } from '@/types';
import { api } from '@/lib/api';
import { KanbanView } from './KanbanView';
import { ListView } from './ListView';
import { CreateCourseModal } from './CreateCourseModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutGrid, List, Search, Plus } from 'lucide-react';

export function CoursesDashboard() {
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [search, setSearch] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/courses?search=${encodeURIComponent(search)}`);
            setCourses(data.courses || []);
        } catch (error) {
            console.error('Failed to fetch courses', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchCourses();
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    return (
        <div className="px-6 py-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-semibold">Courses</h1>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex bg-muted p-1 rounded-md shrink-0">
                    <Button
                        variant={view === 'kanban' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('kanban')}
                        className="w-20"
                    >
                        <LayoutGrid className="w-4 h-4 mr-1" /> Kanban
                    </Button>
                    <Button
                        variant={view === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('list')}
                        className="w-20"
                    >
                        <List className="w-4 h-4 mr-1" /> List
                    </Button>
                </div>
            </div>

            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : view === 'kanban' ? (
                    <KanbanView courses={courses} onRefresh={fetchCourses} />
                ) : (
                    <ListView courses={courses} onDelete={fetchCourses} />
                )}
            </div>

            <CreateCourseModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={fetchCourses}
            />
        </div>
    );
}
