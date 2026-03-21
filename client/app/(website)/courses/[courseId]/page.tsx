'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/formatDuration';
import {
    Play, FileText, Image as ImageIcon, ClipboardList,
    Clock, BookOpen, ChevronLeft, Lock, Loader2,
    Link2, FileDown, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LessonType } from '@/types';

interface LessonMeta {
    id: number;
    title: string;
    type: LessonType;
    order: number;
    duration: number | null;
    videoStatus: string | null;
}

interface LessonDetail {
    id: number;
    title: string;
    type: LessonType;
    description: string | null;
    videoUrl: string | null;
    videoStatus: string | null;
    thumbnailUrl: string | null;
    filePath: string | null;
    allowDownload: boolean;
    duration: number | null;
    attachments: {
        id: number;
        type: 'FILE' | 'LINK';
        label: string;
        filePath: string | null;
        externalUrl: string | null;
    }[];
}

interface CourseView {
    id: number;
    title: string;
    description: string | null;
    coverImage: string | null;
    tags: string[];
    instructorName: string;
    lessons: LessonMeta[];
}

function LessonIcon({ type }: { type: LessonType }) {
    const cls = 'size-4 shrink-0';
    switch (type) {
        case 'VIDEO': return <Play className={cls} />;
        case 'DOCUMENT': return <FileText className={cls} />;
        case 'IMAGE': return <ImageIcon className={cls} />;
        case 'QUIZ': return <ClipboardList className={cls} />;
    }
}

export default function CourseViewPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<CourseView | null>(null);
    const [courseLoading, setCourseLoading] = useState(true);
    const [courseError, setCourseError] = useState<string | null>(null);

    const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
    const [lesson, setLesson] = useState<LessonDetail | null>(null);
    const [lessonLoading, setLessonLoading] = useState(false);

    // Load course
    useEffect(() => {
        setCourseLoading(true);
        api.get(`/courses/${courseId}/view`)
            .then((data) => {
                const c: CourseView = data.course ?? data;
                setCourse(c);
                // Auto-select first lesson
                if (c.lessons.length > 0) setActiveLessonId(c.lessons[0].id);
            })
            .catch((err) => {
                setCourseError(err?.data?.message ?? 'Failed to load course');
            })
            .finally(() => setCourseLoading(false));
    }, [courseId]);

    // Load lesson detail when active lesson changes
    useEffect(() => {
        if (!activeLessonId) return;
        setLessonLoading(true);
        setLesson(null);
        api.get(`/courses/${courseId}/lessons/${activeLessonId}/view`)
            .then((data) => setLesson(data.lesson ?? data))
            .catch(() => setLesson(null))
            .finally(() => setLessonLoading(false));
    }, [activeLessonId, courseId]);

    if (courseLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="size-7 animate-spin text-primary" />
            </div>
        );
    }

    if (courseError || !course) {
        return (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
                <AlertCircle className="size-10 text-muted-foreground" />
                <p className="text-lg font-medium">{courseError ?? 'Course not found'}</p>
                <Link href="/courses">
                    <Button variant="outline" size="sm">Browse courses</Button>
                </Link>
            </div>
        );
    }

    const totalDuration = course.lessons.reduce((s, l) => s + (l.duration ?? 0), 0);

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className="w-full lg:w-72 xl:w-80 border-b lg:border-b-0 lg:border-r bg-muted/20 flex flex-col shrink-0">
                {/* Course info */}
                <div className="p-5 border-b">
                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
                    >
                        <ChevronLeft className="size-3.5" />
                        All courses
                    </Link>
                    <h1 className="font-semibold text-base leading-snug line-clamp-3 mb-1">
                        {course.title}
                    </h1>
                    <p className="text-xs text-muted-foreground mb-3">by {course.instructorName}</p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <BookOpen className="size-3" />
                            {course.lessons.length} lessons
                        </span>
                        {totalDuration > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatDuration(totalDuration)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Lesson list */}
                <nav className="flex-1 overflow-y-auto py-2">
                    {course.lessons.map((l, index) => {
                        const isActive = l.id === activeLessonId;
                        const isProcessing = l.type === 'VIDEO' && l.videoStatus === 'PROCESSING';
                        return (
                            <button
                                key={l.id}
                                onClick={() => setActiveLessonId(l.id)}
                                disabled={isProcessing}
                                className={cn(
                                    'w-full flex items-start gap-3 px-5 py-3 text-left transition-colors text-sm border-b border-border/50',
                                    isActive
                                        ? 'bg-primary/8 border-l-2 border-l-primary'
                                        : 'hover:bg-muted/60 border-l-2 border-l-transparent',
                                    isProcessing && 'opacity-60 cursor-not-allowed',
                                )}
                            >
                                <span className={cn(
                                    'mt-0.5 shrink-0',
                                    isActive ? 'text-primary' : 'text-muted-foreground',
                                )}>
                                    <LessonIcon type={l.type} />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1.5">
                                        <span className={cn('truncate font-medium', isActive && 'text-primary')}>
                                            {index + 1}. {l.title}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-2 mt-0.5">
                                        {l.duration && (
                                            <span className="text-[11px] text-muted-foreground">
                                                {formatDuration(l.duration)}
                                            </span>
                                        )}
                                        {isProcessing && (
                                            <span className="text-[10px] text-amber-500 inline-flex items-center gap-0.5">
                                                <Loader2 className="size-2.5 animate-spin" /> Processing
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
                {lessonLoading && (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="size-6 animate-spin text-primary" />
                    </div>
                )}

                {!lessonLoading && lesson && (
                    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8">
                        {/* VIDEO lesson */}
                        {lesson.type === 'VIDEO' && (
                            <>
                                {lesson.videoStatus === 'READY' && lesson.videoUrl ? (
                                    <VideoPlayer
                                        src={lesson.videoUrl}
                                        poster={lesson.thumbnailUrl ?? undefined}
                                        title={lesson.title}
                                        className="w-full shadow-lg"
                                    />
                                ) : lesson.videoStatus === 'PROCESSING' ? (
                                    <div className="aspect-video rounded-xl bg-muted flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                        <Loader2 className="size-8 animate-spin text-amber-500" />
                                        <p className="text-sm font-medium">Video is being processed</p>
                                        <p className="text-xs">Check back in a few minutes</p>
                                    </div>
                                ) : (
                                    <div className="aspect-video rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Lock className="size-8 opacity-30" />
                                            <p className="text-sm">Video not available</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* IMAGE lesson */}
                        {lesson.type === 'IMAGE' && lesson.filePath && (
                            <div className="rounded-xl overflow-hidden border bg-muted/30">
                                <img
                                    src={lesson.filePath}
                                    alt={lesson.title}
                                    className="w-full object-contain max-h-[70vh]"
                                />
                            </div>
                        )}

                        {/* DOCUMENT lesson */}
                        {lesson.type === 'DOCUMENT' && lesson.filePath && (
                            <div className="rounded-xl border bg-muted/20 p-6 flex flex-col items-center gap-4">
                                <FileText className="size-12 text-muted-foreground/40" />
                                <p className="text-sm font-medium">{lesson.title}</p>
                                {lesson.allowDownload && (
                                    <a
                                        href={lesson.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                    >
                                        <FileDown className="size-4" /> Download
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Lesson title + meta */}
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl font-semibold">{lesson.title}</h2>
                                {lesson.duration && (
                                    <Badge variant="neutral" className="text-xs">
                                        <Clock className="size-3 mr-1" />
                                        {formatDuration(lesson.duration)}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {lesson.description && (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                {lesson.description.split('\n').map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </div>
                        )}

                        {/* Attachments */}
                        {lesson.attachments.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <p className="text-sm font-semibold">Attachments</p>
                                <ul className="flex flex-col gap-2">
                                    {lesson.attachments.map((a) => (
                                        <li key={a.id}>
                                            <a
                                                href={a.externalUrl ?? a.filePath ?? '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={a.type === 'FILE' || undefined}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-sm group"
                                            >
                                                {a.type === 'LINK'
                                                    ? <Link2 className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    : <FileDown className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                }
                                                <span>{a.label}</span>
                                                <Badge variant="neutral" className="ml-auto text-[10px]">{a.type}</Badge>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Lesson navigation */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            {(() => {
                                const idx = course.lessons.findIndex(l => l.id === lesson.id);
                                const prev = course.lessons[idx - 1];
                                const next = course.lessons[idx + 1];
                                return (
                                    <>
                                        {prev ? (
                                            <button
                                                onClick={() => setActiveLessonId(prev.id)}
                                                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <ChevronLeft className="size-4" />
                                                <span className="hidden sm:inline">Previous:</span> {prev.title}
                                            </button>
                                        ) : <div />}

                                        {next && (
                                            <button
                                                onClick={() => setActiveLessonId(next.id)}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ml-auto"
                                            >
                                                Next: {next.title}
                                                <ChevronLeft className="size-4 rotate-180" />
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {!lessonLoading && !lesson && activeLessonId && (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                        Select a lesson to begin
                    </div>
                )}
            </main>
        </div>
    );
}
