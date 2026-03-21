'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { fetchCourseDetail, enrollInCourse } from '@/lib/api/learner';
import { LearnerCourseDetail } from '@/types';
import { CourseOverviewTab } from '@/components/learner/CourseOverviewTab';
import { ReviewsTab } from '@/components/learner/ReviewsTab';
import { PaymentModal } from '@/components/learner/PaymentModal';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/formatDuration';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Play, FileText, Image as ImageIcon, ClipboardList,
    Clock, BookOpen, ChevronLeft, Loader2,
    Link2, FileDown, X, ChevronRight, Download,
    CheckCircle, Circle, Trophy, ArrowRight,
    Users, Lock,
} from 'lucide-react';
import { LessonType } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonMeta {
    id: number;
    title: string;
    type: LessonType;
    order: number;
    duration: number | null;
    videoStatus: string | null;
}

interface LessonTimestamp { time: number; label: string; description?: string; }

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
    attachments: { id: number; type: 'FILE' | 'LINK'; label: string; filePath: string | null; externalUrl: string | null }[];
}

interface QuizMeta {
    id: number;
    title: string;
    rewards: { attempt1Points: number; attempt2Points: number; attempt3Points: number; attempt4PlusPoints: number } | null;
}

interface CourseViewData {
    id: number; title: string; description: string | null; coverImage: string | null;
    tags: string[]; instructorName: string; lessons: LessonMeta[];
    completedLessonIds: number[];
}

type PageTab = 'overview' | 'reviews';
type ContentTab = 'description' | 'images' | 'documents' | 'chapters' | 'resources';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i;

function getDownloadUrl(url: string, filename: string): string {
    if (url.includes('res.cloudinary.com')) {
        const baseName = filename.replace(/\.[^.]+$/, '');
        return url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(baseName)}/`);
    }
    return url;
}


// ─── Rich Lesson Content (original design, fully restored) ───────────────────

function LessonContent({
    lesson, course, onNavigate, completedIds, onMarkComplete, onMarkIncomplete, marking,
}: {
    lesson: LessonDetail; course: CourseViewData; onNavigate: (id: number) => void;
    completedIds: Set<number>; onMarkComplete: (id: number) => Promise<void>;
    onMarkIncomplete: (id: number) => Promise<void>; marking: boolean;
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
    const isCompleted = completedIds.has(lesson.id);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
            {/* Video player */}
            {lesson.videoStatus === 'READY' && lesson.videoUrl ? (
                <VideoPlayer src={lesson.videoUrl} poster={lesson.thumbnailUrl ?? undefined} title={lesson.title} timestamps={lesson.timestamps ?? undefined} className="w-full shadow-lg" />
            ) : lesson.videoStatus === 'PROCESSING' ? (
                <div className="aspect-video rounded-xl bg-muted flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-amber-500" />
                    <p className="text-sm font-medium">Video is being processed</p>
                    <p className="text-xs">Check back in a few minutes</p>
                </div>
            ) : null}

            {/* Image lesson */}
            {lesson.type === 'IMAGE' && lesson.filePath && (
                <img src={lesson.filePath} alt={lesson.title} className="w-full rounded-xl object-contain max-h-[500px] border" />
            )}

            {/* Document lesson */}
            {lesson.type === 'DOCUMENT' && lesson.filePath && (
                <div className="flex items-center gap-3 p-4 border rounded-xl bg-muted/30">
                    <FileText className="size-8 text-muted-foreground shrink-0" />
                    <span className="flex-1 font-medium text-sm truncate">{lesson.title}</span>
                    {lesson.allowDownload && (
                        <a href={getDownloadUrl(lesson.filePath, lesson.title)} download={lesson.title} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline"><Download className="size-3.5 mr-1" />Download</Button>
                        </a>
                    )}
                </div>
            )}

            {/* Title + meta */}
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold">{lesson.title}</h2>
                {lesson.duration && (
                    <Badge variant="neutral" className="text-xs">
                        <Clock className="size-3 mr-1" />{formatDuration(lesson.duration)}
                    </Badge>
                )}
            </div>

            {/* Content tabs */}
            {visibleTabs.length > 0 && (
                <>
                    <div className="flex border-b overflow-x-auto">
                        {visibleTabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                                    activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.icon}{tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="min-h-[120px]">
                        {activeTab === 'description' && lesson.description && (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.description }} />
                        )}
                        {activeTab === 'images' && images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {images.map((a, i) => (
                                    <button key={a.id} onClick={() => setLightboxIndex(i)} className="rounded-xl overflow-hidden border bg-muted/30 aspect-[4/3] group cursor-pointer">
                                        <img src={a.filePath!} alt={a.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeTab === 'documents' && docs.length > 0 && (
                            <ul className="flex flex-col gap-2">
                                {docs.map(a => (
                                    <li key={a.id}>
                                        <a href={lesson.allowDownload ? getDownloadUrl(a.filePath!, a.label) : a.filePath!} target="_blank" rel="noopener noreferrer" download={lesson.allowDownload ? a.label : undefined}
                                            className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-sm group w-full">
                                            <FileText className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                            <span className="flex-1 truncate font-medium">{a.label}</span>
                                            {lesson.allowDownload && <FileDown className="size-4 text-muted-foreground group-hover:text-primary shrink-0" />}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {activeTab === 'chapters' && chapters.length > 0 && (
                            <div className="flex flex-col divide-y rounded-xl border overflow-hidden">
                                {chapters.sort((a, b) => a.time - b.time).map((ts, i) => {
                                    const h = Math.floor(ts.time / 3600), m = Math.floor((ts.time % 3600) / 60), s = Math.floor(ts.time % 60);
                                    const label = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
                                    return (
                                        <div key={i} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
                                            <span className="font-mono text-xs tabular-nums text-primary pt-0.5 shrink-0 min-w-[48px]">{label}</span>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium">{ts.label}</span>
                                                {ts.description && <span className="text-xs text-muted-foreground mt-0.5">{ts.description}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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

            {/* Mark complete + prev/next */}
            <div className="flex flex-col gap-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                    {isCompleted ? (
                        <>
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <CheckCircle className="size-5" />
                                <span className="text-sm font-medium">Lesson completed</span>
                            </div>
                            <button onClick={() => onMarkIncomplete(lesson.id)} disabled={marking}
                                className="text-xs text-muted-foreground hover:text-foreground underline ml-2 disabled:opacity-50">
                                Undo
                            </button>
                        </>
                    ) : (
                        <Button onClick={async () => { await onMarkComplete(lesson.id); if (next) onNavigate(next.id); }} disabled={marking} className="gap-2">
                            {marking ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                            {next ? 'Complete & Continue' : 'Mark as Complete'}
                            {next && <ArrowRight className="size-4" />}
                        </Button>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    {prev ? (
                        <button onClick={() => onNavigate(prev.id)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronLeft className="size-4" /><span className="hidden sm:inline">Previous:</span> {prev.title}
                        </button>
                    ) : <div />}
                    {next && (
                        <button onClick={() => onNavigate(next.id)} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ml-auto">
                            Next: {next.title}<ChevronLeft className="size-4 rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && images[lightboxIndex] && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
                    <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"><X className="size-5" /></button>
                    <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-mono">{lightboxIndex + 1} / {images.length}</span>
                    {lesson.allowDownload && (
                        <a href={getDownloadUrl(images[lightboxIndex].filePath!, images[lightboxIndex].label)} download={images[lightboxIndex].label} onClick={e => e.stopPropagation()} className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
                            <Download className="size-5" />
                        </a>
                    )}
                    {lightboxIndex > 0 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
                            <ChevronLeft className="size-6" />
                        </button>
                    )}
                    {lightboxIndex < images.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
                            <ChevronRight className="size-6" />
                        </button>
                    )}
                    <img src={images[lightboxIndex].filePath!} alt={images[lightboxIndex].label} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                    <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm max-w-[80vw] truncate">{images[lightboxIndex].label}</p>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    const { isAuthenticated } = useAuth();

    // Overview data (from learner API — for enrollment, hero, reviews)
    const [overviewData, setOverviewData] = useState<LearnerCourseDetail | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [pageTab, setPageTab] = useState<PageTab>('overview');
    const [enrolling, setEnrolling] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);

    // Player data (from view API — for lesson content, progress)
    const [courseView, setCourseView] = useState<CourseViewData | null>(null);
    const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
    const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
    const [lesson, setLesson] = useState<LessonDetail | null>(null);
    const [lessonLoading, setLessonLoading] = useState(false);
    const [marking, setMarking] = useState(false);

    // Load overview (learner API)
    const loadOverview = useCallback(async () => {
        try {
            const data = await fetchCourseDetail(Number(courseId));
            setOverviewData(data);
        } catch {
            toast.error('Course not found');
            router.push('/');
        } finally {
            setOverviewLoading(false);
        }
    }, [courseId, router]);

    // Load course view (progress API)
    const loadCourseView = useCallback(async () => {
        try {
            const [courseData, quizData] = await Promise.all([
                api.get(`/courses/${courseId}/view`),
                api.get(`/courses/${courseId}/quizzes`).catch(() => []),
            ]);
            const c: CourseViewData = courseData.course ?? courseData;
            setCourseView(c);
            setQuizzes(Array.isArray(quizData) ? quizData : (quizData.quizzes ?? []));
            const ids = new Set<number>(c.completedLessonIds ?? []);
            setCompletedIds(ids);
            if (c.lessons.length > 0 && !activeLessonId) {
                const first = c.lessons.find(l => !ids.has(l.id)) ?? c.lessons[0];
                setActiveLessonId(first.id);
            }
        } catch { /* non-fatal */ }
    }, [courseId]);

    useEffect(() => { loadOverview(); }, [loadOverview]);
    useEffect(() => { if (isAuthenticated) loadCourseView(); }, [isAuthenticated, loadCourseView]);

    // Load lesson detail
    useEffect(() => {
        if (!activeLessonId) return;
        setLessonLoading(true);
        setLesson(null);
        api.get(`/courses/${courseId}/lessons/${activeLessonId}/view`)
            .then(data => setLesson(data.lesson ?? data))
            .catch(() => setLesson(null))
            .finally(() => setLessonLoading(false));
    }, [activeLessonId, courseId]);

    const handleMarkComplete = useCallback(async (lessonId: number) => {
        setMarking(true);
        try {
            await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`, {});
            setCompletedIds(prev => new Set([...prev, lessonId]));
        } catch { }
        finally { setMarking(false); }
    }, [courseId]);

    const handleMarkIncomplete = useCallback(async (lessonId: number) => {
        setMarking(true);
        try {
            await api.delete(`/courses/${courseId}/lessons/${lessonId}/complete`);
            setCompletedIds(prev => { const n = new Set(prev); n.delete(lessonId); return n; });
        } catch { }
        finally { setMarking(false); }
    }, [courseId]);

    const handleEnroll = async () => {
        if (!isAuthenticated) { router.push('/login'); return; }
        setEnrolling(true);
        try {
            await enrollInCourse(Number(courseId));
            toast.success('Enrolled successfully!');
            await Promise.all([loadOverview(), loadCourseView()]);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Enrollment failed');
        } finally { setEnrolling(false); }
    };

    const handlePaymentSuccess = async () => {
        toast.success('Payment successful! You are now enrolled.');
        await Promise.all([loadOverview(), loadCourseView()]);
    };

    // ─── Derived ──────────────────────────────────────────────────────────────

    const isEnrolled = !!overviewData?.enrollment;
    const enrollment = overviewData?.enrollment;
    const totalDuration = courseView?.lessons.reduce((s, l) => s + (l.duration ?? 0), 0) ?? 0;
    const progressPct = courseView && courseView.lessons.length > 0
        ? Math.round((completedIds.size / courseView.lessons.length) * 100)
        : 0;

    const renderCTA = () => {
        if (!overviewData) return null;
        if (isEnrolled) {
            if (enrollment?.status === 'COMPLETED') {
                return (
                    <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                        <CheckCircle className="size-4 mr-2" /> Completed
                    </Button>
                );
            }
            return (
                <Button onClick={() => activeLessonId && setActiveLessonId(activeLessonId)}>
                    <Play className="size-4 mr-2 fill-current" />
                    {enrollment?.completedLessons === 0 ? 'Start Learning' : 'Continue'}
                </Button>
            );
        }
        if (overviewData.accessRule === 'ON_PAYMENT') {
            return (
                <Button onClick={() => { if (!isAuthenticated) { router.push('/login'); return; } setPaymentOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
                    Buy ₹{overviewData.price}
                </Button>
            );
        }
        if (overviewData.accessRule === 'ON_INVITATION') {
            return <Button disabled variant="outline"><Lock className="size-4 mr-2" /> Invitation Only</Button>;
        }
        return (
            <Button onClick={handleEnroll} disabled={enrolling}>
                {enrolling ? <Loader2 className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
                {enrolling ? 'Enrolling...' : 'Enroll for Free'}
            </Button>
        );
    };

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (overviewLoading) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
            </div>
        );
    }

    if (!overviewData) return null;

    // ─── Player mode (enrolled + lesson selected) ─────────────────────────────

    if (isEnrolled && activeLessonId) {
        return (
            <div className="flex flex-col min-h-screen">
                {/* Slim course header */}
                <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-3">
                    <button onClick={() => setActiveLessonId(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeft className="size-3.5" /> Overview
                    </button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-sm font-medium truncate">{overviewData.title}</span>
                    {progressPct > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
                            {completedIds.size}/{courseView?.lessons.length ?? 0} completed
                        </span>
                    )}
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-72 xl:w-80 border-r bg-muted/20 flex flex-col shrink-0 overflow-y-auto">
                        <div className="p-5 border-b">
                            <h1 className="font-semibold text-sm leading-snug line-clamp-2 mb-1">{overviewData.title}</h1>
                            {overviewData.instructor?.name && <p className="text-xs text-muted-foreground mb-3">by {overviewData.instructor.name}</p>}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><BookOpen className="size-3" />{courseView?.lessons.length ?? 0} lessons</span>
                                {totalDuration > 0 && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{formatDuration(totalDuration)}</span>}
                            </div>
                            {(courseView?.lessons.length ?? 0) > 0 && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium tabular-nums">{completedIds.size}/{courseView?.lessons.length}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={cn('h-full rounded-full transition-all duration-500', progressPct >= 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${progressPct}%` }} />
                                    </div>
                                    {progressPct >= 100 && (
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                                            <Trophy className="size-3.5" /> Course completed!
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <nav className="flex-1 py-2">
                            {courseView?.lessons.map((l, index) => {
                                const isActive = l.id === activeLessonId;
                                const isProcessing = l.type === 'VIDEO' && l.videoStatus === 'PROCESSING';
                                const isDone = completedIds.has(l.id);
                                return (
                                    <button key={l.id} onClick={() => setActiveLessonId(l.id)} disabled={isProcessing}
                                        className={cn(
                                            'w-full flex items-start gap-3 px-5 py-3 text-left transition-colors text-sm border-b border-border/50',
                                            isActive ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-muted/60 border-l-2 border-l-transparent',
                                            isProcessing && 'opacity-60 cursor-not-allowed',
                                        )}
                                    >
                                        <span className={cn('mt-0.5 shrink-0', isDone ? 'text-green-500' : isActive ? 'text-primary' : 'text-muted-foreground')}>
                                            {isDone ? <CheckCircle className="size-4" /> : <Circle className="size-4" />}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className={cn('block truncate font-medium', isDone && !isActive && 'text-muted-foreground line-through decoration-1', isActive && 'text-primary')}>
                                                {index + 1}. {l.title}
                                            </span>
                                            <span className="flex items-center gap-2 mt-0.5">
                                                {l.duration && <span className="text-[11px] text-muted-foreground">{formatDuration(l.duration)}</span>}
                                                {isProcessing && <span className="text-[10px] text-amber-500 inline-flex items-center gap-0.5"><Loader2 className="size-2.5 animate-spin" /> Processing</span>}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}

                            {quizzes.length > 0 && (
                                <>
                                    <div className="flex items-center gap-2 px-5 py-2 mt-1 border-t border-border/50">
                                        <ClipboardList className="size-3 text-muted-foreground" />
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quizzes</span>
                                    </div>
                                    {quizzes.map(q => (
                                        <Link key={q.id} href={`/courses/${courseId}/quiz/${q.id}`}
                                            className="w-full flex items-start gap-3 px-5 py-3 text-left transition-colors text-sm border-b border-border/50 border-l-2 border-l-transparent hover:bg-muted/60 hover:border-l-primary/40 group">
                                            <Trophy className="size-4 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="flex-1 min-w-0">
                                                <span className="block truncate font-medium group-hover:text-primary transition-colors">{q.title}</span>
                                                {q.rewards && <span className="text-[11px] text-muted-foreground font-mono">{q.rewards.attempt1Points} pts</span>}
                                            </span>
                                        </Link>
                                    ))}
                                </>
                            )}
                        </nav>
                    </aside>

                    {/* Main lesson content */}
                    <main className="flex-1 overflow-y-auto">
                        {lessonLoading && <div className="flex items-center justify-center h-64"><Loader2 className="size-6 animate-spin text-primary" /></div>}
                        {!lessonLoading && lesson && (
                            <LessonContent
                                lesson={lesson} course={courseView!}
                                onNavigate={setActiveLessonId}
                                completedIds={completedIds}
                                onMarkComplete={handleMarkComplete}
                                onMarkIncomplete={handleMarkIncomplete}
                                marking={marking}
                            />
                        )}
                    </main>
                </div>
            </div>
        );
    }

    // ─── Overview mode (new design) ───────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background">
            {/* Hero banner */}
            <div className="relative w-full h-56 md:h-72 bg-linear-to-br from-primary/20 via-primary/10 to-muted overflow-hidden">
                {overviewData.coverImage && (
                    <img src={overviewData.coverImage} alt={overviewData.title} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            {overviewData.accessRule === 'ON_PAYMENT' && (
                                <Badge className="bg-amber-500 text-white border-0 text-xs">Paid</Badge>
                            )}
                            {overviewData.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="neutral" className="bg-white/10 text-white border-white/20 text-xs">{tag}</Badge>
                            ))}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">{overviewData.title}</h1>
                        {overviewData.instructor?.name && <p className="text-sm text-white/70 mt-1">by {overviewData.instructor.name}</p>}
                    </div>
                    <div className="shrink-0">{renderCTA()}</div>
                </div>
            </div>

            {/* Stats */}
            <div className="border-b bg-muted/30">
                <div className="max-w-5xl mx-auto px-6 py-3 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><BookOpen className="size-4" />{overviewData._count.lessons} lessons</span>
                    <span className="flex items-center gap-1.5"><Users className="size-4" />{overviewData._count.enrollments} enrolled</span>
                    {overviewData.quizzes.length > 0 && (
                        <span className="flex items-center gap-1.5">
                            <ClipboardList className="size-4" />{overviewData.quizzes.reduce((s, q) => s + q._count.questions, 0)} quiz questions
                        </span>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-6">
                {/* Page tabs */}
                <div className="flex border-b mb-6">
                    {(['overview', 'reviews'] as PageTab[]).map(t => (
                        <button key={t} onClick={() => setPageTab(t)}
                            className={cn(
                                'py-2.5 px-1 mr-8 text-sm font-medium border-b-2 -mb-px transition-colors',
                                pageTab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t === 'overview' ? 'Course Overview' : 'Ratings & Reviews'}
                        </button>
                    ))}
                </div>

                {pageTab === 'overview' && (
                    <CourseOverviewTab
                        course={overviewData}
                        enrollment={enrollment}
                        onLessonClick={lessonId => {
                            if (!isEnrolled) {
                                toast.error('Enroll in this course to access lessons');
                                return;
                            }
                            setActiveLessonId(lessonId);
                        }}
                    />
                )}
                {pageTab === 'reviews' && (
                    <ReviewsTab courseId={Number(courseId)} isEnrolled={isEnrolled} />
                )}
            </div>

            {overviewData.accessRule === 'ON_PAYMENT' && (
                <PaymentModal
                    courseId={Number(courseId)} courseTitle={overviewData.title}
                    price={overviewData.price ?? '0'} open={paymentOpen}
                    onOpenChange={setPaymentOpen} onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
