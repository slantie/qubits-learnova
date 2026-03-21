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
    Clock, BookOpen, ChevronLeft, Loader2,
    Link2, FileDown, AlertCircle, X, ChevronRight, Download,
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

interface LessonTimestamp {
    time: number;
    label: string;
    description?: string;
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
    timestamps: LessonTimestamp[] | null;
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

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i;

type ContentTab = 'description' | 'images' | 'documents' | 'chapters' | 'resources';

function LessonContent({
    lesson,
    course,
    onNavigate,
}: {
    lesson: LessonDetail;
    course: CourseView;
    onNavigate: (id: number) => void;
}) {
    const [activeTab, setActiveTab] = useState<ContentTab>('description');
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const images = lesson.attachments.filter(a => a.type === 'FILE' && a.filePath && IMAGE_EXT.test(a.filePath));
    const docs = lesson.attachments.filter(a => a.type === 'FILE' && a.filePath && !IMAGE_EXT.test(a.filePath));
    const links = lesson.attachments.filter(a => a.type === 'LINK');
    const chapters = lesson.timestamps ?? [];

    const tabs: { key: ContentTab; label: string; icon: React.ReactNode; count?: number; show: boolean }[] = [
        { key: 'description', label: 'Description', icon: <FileText className="size-3.5" />, show: !!lesson.description },
        { key: 'images', label: 'Images', icon: <ImageIcon className="size-3.5" />, count: images.length, show: images.length > 0 },
        { key: 'documents', label: 'Documents', icon: <FileDown className="size-3.5" />, count: docs.length, show: docs.length > 0 },
        { key: 'chapters', label: 'Chapters', icon: <Clock className="size-3.5" />, count: chapters.length, show: chapters.length > 0 },
        { key: 'resources', label: 'Resources', icon: <Link2 className="size-3.5" />, count: links.length, show: links.length > 0 },
    ];

    const visibleTabs = tabs.filter(t => t.show);

    useEffect(() => {
        if (visibleTabs.length > 0 && !visibleTabs.find(t => t.key === activeTab)) {
            setActiveTab(visibleTabs[0].key);
        }
        setLightboxIndex(null);
    }, [lesson.id]);

    useEffect(() => {
        if (lightboxIndex === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxIndex(null);
            else if (e.key === 'ArrowRight' && lightboxIndex < images.length - 1) setLightboxIndex(lightboxIndex + 1);
            else if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxIndex, images.length]);

    const idx = course.lessons.findIndex(l => l.id === lesson.id);
    const prev = course.lessons[idx - 1];
    const next = course.lessons[idx + 1];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
            {/* Video player */}
            {lesson.videoStatus === 'READY' && lesson.videoUrl ? (
                <VideoPlayer
                    src={lesson.videoUrl}
                    poster={lesson.thumbnailUrl ?? undefined}
                    title={lesson.title}
                    timestamps={lesson.timestamps ?? undefined}
                    className="w-full shadow-lg"
                />
            ) : lesson.videoStatus === 'PROCESSING' ? (
                <div className="aspect-video rounded-xl bg-muted flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-amber-500" />
                    <p className="text-sm font-medium">Video is being processed</p>
                    <p className="text-xs">Check back in a few minutes</p>
                </div>
            ) : null}

            {/* Title + meta */}
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold">{lesson.title}</h2>
                {lesson.duration && (
                    <Badge variant="neutral" className="text-xs">
                        <Clock className="size-3 mr-1" />
                        {formatDuration(lesson.duration)}
                    </Badge>
                )}
            </div>

            {/* Tabs */}
            {visibleTabs.length > 0 && (
                <>
                    <div className="flex border-b overflow-x-auto">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                                    activeTab === tab.key
                                        ? 'border-primary text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={cn(
                                        'text-[10px] px-1.5 py-0.5 rounded-full',
                                        activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="min-h-[120px]">
                        {/* Description */}
                        {activeTab === 'description' && lesson.description && (
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: lesson.description }}
                            />
                        )}

                        {/* Images */}
                        {activeTab === 'images' && images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {images.map((a, i) => (
                                    <button
                                        key={a.id}
                                        onClick={() => setLightboxIndex(i)}
                                        className="rounded-xl overflow-hidden border bg-muted/30 aspect-[4/3] group cursor-pointer text-left"
                                    >
                                        <img src={a.filePath!} alt={a.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Documents */}
                        {activeTab === 'documents' && docs.length > 0 && (
                            <ul className="flex flex-col gap-2">
                                {docs.map(a => (
                                    <li key={a.id}>
                                        <a href={a.filePath!} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-sm group w-full"
                                            {...(lesson.allowDownload ? { download: true } : {})}
                                        >
                                            <FileText className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                            <span className="flex-1 truncate font-medium">{a.label}</span>
                                            {lesson.allowDownload && <FileDown className="size-4 text-muted-foreground group-hover:text-primary shrink-0" />}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Chapters */}
                        {activeTab === 'chapters' && chapters.length > 0 && (
                            <div className="flex flex-col divide-y rounded-xl border overflow-hidden">
                                {chapters.sort((a, b) => a.time - b.time).map((ts, i) => (
                                    <div key={i} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
                                        <span className="font-mono text-xs tabular-nums text-primary pt-0.5 shrink-0 min-w-[48px]">
                                            {(() => {
                                                const h = Math.floor(ts.time / 3600);
                                                const m = Math.floor((ts.time % 3600) / 60);
                                                const s = Math.floor(ts.time % 60);
                                                return h > 0
                                                    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                                                    : `${m}:${String(s).padStart(2, '0')}`;
                                            })()}
                                        </span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium">{ts.label}</span>
                                            {ts.description && (
                                                <span className="text-xs text-muted-foreground mt-0.5">{ts.description}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Resources / Links */}
                        {activeTab === 'resources' && links.length > 0 && (
                            <ul className="flex flex-col gap-2">
                                {links.map(a => (
                                    <li key={a.id}>
                                        <a href={a.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-sm group">
                                            <Link2 className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span>{a.label}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
                {prev ? (
                    <button
                        onClick={() => onNavigate(prev.id)}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="size-4" />
                        <span className="hidden sm:inline">Previous:</span> {prev.title}
                    </button>
                ) : <div />}
                {next && (
                    <button
                        onClick={() => onNavigate(next.id)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ml-auto"
                    >
                        Next: {next.title}
                        <ChevronLeft className="size-4 rotate-180" />
                    </button>
                )}
            </div>

            {/* ── Image Lightbox ──────────────────────────────────────────── */}
            {lightboxIndex !== null && images[lightboxIndex] && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setLightboxIndex(null)}
                >
                    {/* Close */}
                    <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
                        <X className="size-5" />
                    </button>

                    {/* Counter */}
                    <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-mono tabular-nums">
                        {lightboxIndex + 1} / {images.length}
                    </span>

                    {/* Download */}
                    {lesson.allowDownload && (
                        <a
                            href={images[lightboxIndex].filePath!}
                            download
                            onClick={e => e.stopPropagation()}
                            className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        >
                            <Download className="size-5" />
                        </a>
                    )}

                    {/* Prev */}
                    {lightboxIndex > 0 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        >
                            <ChevronLeft className="size-6" />
                        </button>
                    )}

                    {/* Next */}
                    {lightboxIndex < images.length - 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        >
                            <ChevronRight className="size-6" />
                        </button>
                    )}

                    {/* Image */}
                    <img
                        src={images[lightboxIndex].filePath!}
                        alt={images[lightboxIndex].label}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    />

                    {/* Label */}
                    <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm max-w-[80vw] truncate">
                        {images[lightboxIndex].label}
                    </p>
                </div>
            )}
        </div>
    );
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
                    <LessonContent
                        lesson={lesson}
                        course={course}
                        onNavigate={setActiveLessonId}
                    />
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
