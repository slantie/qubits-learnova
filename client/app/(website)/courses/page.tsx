'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { BookOpen, Clock, Users, Search, ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/formatDuration';

interface PublicCourse {
    id: number;
    title: string;
    description: string | null;
    coverImage: string | null;
    tags: string[];
    lessonCount: number;
    totalDuration: number;
    instructorName: string;
}

function CourseCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
            <div className="h-44 bg-muted" />
            <div className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
            </div>
        </div>
    );
}

export default function CoursesPage() {
    const { user, isLoading } = useAuth();
    const [courses, setCourses] = useState<PublicCourse[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const data = await api.get(`/courses/public?search=${encodeURIComponent(search)}`);
                setCourses(Array.isArray(data) ? data : data?.courses ?? []);
            } catch {
                // Backend might not expose /courses/public yet — show empty state
                setCourses([]);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchCourses, 300);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            {/* Header */}
            <div className="mb-10">
                {!isLoading && user && (
                    <p className="text-primary font-medium text-sm mb-2">
                        Welcome back, {user.name?.split(' ')[0] ?? 'Learner'} 👋
                    </p>
                )}
                <h1 className="text-4xl font-medium tracking-tight mb-3">
                    Explore Courses
                </h1>
                <p className="text-muted-foreground text-lg max-w-xl">
                    Discover courses crafted by expert instructors. Start learning at your own pace.
                </p>
            </div>

            {/* Search */}
            <div className="relative mb-8 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    className="pl-10"
                    placeholder="Search courses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
                </div>
            ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <div className="size-16 rounded-full bg-muted/60 flex items-center justify-center">
                        <GraduationCap className="size-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="text-xl font-medium mb-1">
                            {search ? 'No courses found' : 'Courses coming soon'}
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-sm">
                            {search
                                ? `No courses match "${search}". Try a different search term.`
                                : 'Our instructors are preparing great content. Check back soon!'}
                        </p>
                    </div>
                    {search && (
                        <Button variant="outline" onClick={() => setSearch('')}>
                            Clear search
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <article key={course.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col">
                            {/* Cover */}
                            <div className="h-44 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                {course.coverImage ? (
                                    <img
                                        src={course.coverImage}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <BookOpen className="size-12 text-primary/30" strokeWidth={1.5} />
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-5 flex flex-col flex-1">
                                {/* Tags */}
                                {course.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {course.tags.slice(0, 3).map((tag) => (
                                            <Badge key={tag} variant="neutral" className="text-[11px]">{tag}</Badge>
                                        ))}
                                    </div>
                                )}

                                <h2 className="font-medium text-base leading-snug line-clamp-2 mb-1">
                                    {course.title}
                                </h2>

                                {course.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {course.description}
                                    </p>
                                )}

                                {/* Meta */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
                                    <span className="inline-flex items-center gap-1">
                                        <BookOpen className="size-3" />
                                        {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
                                    </span>
                                    {course.totalDuration > 0 && (
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="size-3" />
                                            {formatDuration(course.totalDuration)}
                                        </span>
                                    )}
                                </div>

                                <Link
                                    href={`/courses/${course.id}`}
                                    className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
                                >
                                    View course <ArrowRight className="size-3.5" />
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
