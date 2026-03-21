'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
    BookOpen, Users, BarChart3, ArrowRight,
    TrendingUp, GraduationCap, ClipboardList, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardStats {
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    completions: number;
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
    href,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number | string;
    sub?: string;
    color: string;
    href?: string;
}) {
    const inner = (
        <div className="border rounded-xl p-5 bg-card flex flex-col gap-4 hover:shadow-sm transition-shadow">
            <div className={cn('size-10 rounded-lg flex items-center justify-center', color)}>
                <Icon className="size-5" />
            </div>
            <div>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
                <p className="text-sm font-medium mt-0.5">{label}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickAction({
    href,
    icon: Icon,
    label,
    desc,
}: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    desc: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/40 transition-colors group"
        >
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>
    );
}

export default function BackofficeDashboard() {
    const { user, role } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentCourses, setRecentCourses] = useState<any[]>([]);

    useEffect(() => {
        // Fetch courses to derive stats
        api.get('/courses')
            .then((data: any) => {
                const courses: any[] = Array.isArray(data) ? data : (data.courses ?? []);
                const published = courses.filter((c: any) => c.isPublished);
                setStats({
                    totalCourses: courses.length,
                    publishedCourses: published.length,
                    totalEnrollments: courses.reduce((s: number, c: any) => s + (c.enrollmentCount ?? 0), 0),
                    completions: courses.reduce((s: number, c: any) => s + (c.completionCount ?? 0), 0),
                });
                setRecentCourses(courses.slice(0, 5));
            })
            .catch(() => {
                setStats({ totalCourses: 0, publishedCourses: 0, totalEnrollments: 0, completions: 0 });
            });
    }, []);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = user?.name?.split(' ')[0] ?? 'there';

    return (
        <div className="px-6 py-8 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">{greeting()},</p>
                    <h1 className="text-2xl font-semibold mt-0.5">{firstName}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Here's what's happening with your platform today.
                    </p>
                </div>
                <Link href="/backoffice/courses">
                    <Button size="sm" className="gap-2">
                        <Plus className="size-4" />
                        New Course
                    </Button>
                </Link>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={BookOpen}
                    label="Total Courses"
                    value={stats?.totalCourses ?? '—'}
                    sub={stats ? `${stats.publishedCourses} published` : undefined}
                    color="bg-primary/10 text-primary"
                    href="/backoffice/courses"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Published"
                    value={stats?.publishedCourses ?? '—'}
                    sub="Live on platform"
                    color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                />
                <StatCard
                    icon={Users}
                    label="Enrollments"
                    value={stats?.totalEnrollments ?? '—'}
                    sub="Across all courses"
                    color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    href={role === 'ADMIN' ? '/backoffice/reporting' : undefined}
                />
                <StatCard
                    icon={GraduationCap}
                    label="Completions"
                    value={stats?.completions ?? '—'}
                    sub="Courses finished"
                    color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    href={role === 'ADMIN' ? '/backoffice/reporting' : undefined}
                />
            </div>

            {/* Main content: recent courses + quick actions */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent courses */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">Your Courses</h2>
                        <Link href="/backoffice/courses" className="text-sm text-primary hover:underline flex items-center gap-1">
                            View all <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    {recentCourses.length === 0 ? (
                        <div className="border rounded-xl p-10 flex flex-col items-center gap-3 text-center bg-card">
                            <BookOpen className="size-10 text-muted-foreground/30" strokeWidth={1.5} />
                            <p className="text-sm font-medium">No courses yet</p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Create your first course and start publishing content for learners.
                            </p>
                            <Link href="/backoffice/courses">
                                <Button size="sm" variant="outline" className="mt-1">
                                    <Plus className="size-4 mr-1.5" /> Create a course
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden bg-card divide-y">
                            {recentCourses.map((course: any) => (
                                <Link
                                    key={course.id}
                                    href={`/backoffice/courses/${course.id}/edit`}
                                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors group"
                                >
                                    <div className="size-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                                        <BookOpen className="size-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{course.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {course.lessonCount ?? 0} lessons
                                            {course.enrollmentCount ? ` · ${course.enrollmentCount} enrolled` : ''}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        'text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0',
                                        course.isPublished
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-muted text-muted-foreground',
                                    )}>
                                        {course.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick actions */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-base font-semibold">Quick Actions</h2>
                    <div className="flex flex-col gap-2">
                        <QuickAction
                            href="/backoffice/courses"
                            icon={BookOpen}
                            label="Manage Courses"
                            desc="Create, edit and publish"
                        />
                        {role === 'ADMIN' && (
                            <QuickAction
                                href="/backoffice/reporting"
                                icon={BarChart3}
                                label="View Reporting"
                                desc="Learner progress & stats"
                            />
                        )}
                        <QuickAction
                            href="/courses"
                            icon={GraduationCap}
                            label="Learner View"
                            desc="See the platform as a learner"
                        />
                        <QuickAction
                            href="/backoffice/users"
                            icon={Users}
                            label="Manage Users"
                            desc="Coming soon"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
