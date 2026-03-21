'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    fetchCourseDetail,
    enrollInCourse,
    markLessonComplete,
} from '@/lib/api/learner';
import { LearnerCourseDetail, LearnerEnrollment } from '@/types';
import { CourseOverviewTab } from '@/components/learner/CourseOverviewTab';
import { ReviewsTab } from '@/components/learner/ReviewsTab';
import { PaymentModal } from '@/components/learner/PaymentModal';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    BookOpen, Users, ClipboardList, CheckCircle2,
    Play, FileText, ChevronLeft, Loader2, Lock, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PageTab = 'overview' | 'reviews';

interface LessonDetail {
    id: number;
    title: string;
    type: string;
    videoUrl: string | null;
    videoStatus: string | null;
    thumbnailUrl: string | null;
    filePath: string | null;
    description: string | null;
    duration: number | null;
    allowDownload: boolean;
    attachments: { id: number; type: string; label: string; externalUrl: string | null; filePath: string | null }[];
}

export default function CourseDetailPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const [course, setCourse] = useState<LearnerCourseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<PageTab>('overview');
    const [enrolling, setEnrolling] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [activeLesson, setActiveLesson] = useState<LessonDetail | null>(null);
    const [lessonLoading, setLessonLoading] = useState(false);
    const [completingLesson, setCompletingLesson] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await fetchCourseDetail(Number(courseId));
            setCourse(data);
        } catch {
            toast.error('Course not found');
            router.push('/');
        } finally {
            setLoading(false);
        }
    }, [courseId, router]);

    useEffect(() => { load(); }, [load]);

    const handleEnroll = async () => {
        if (!isAuthenticated) { router.push('/login'); return; }
        setEnrolling(true);
        try {
            await enrollInCourse(Number(courseId));
            toast.success('Enrolled successfully!');
            await load();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Enrollment failed');
        } finally {
            setEnrolling(false);
        }
    };

    const handlePaymentSuccess = async () => {
        toast.success('Payment successful! You are now enrolled.');
        await load();
    };

    const handleLessonClick = async (lessonId: number) => {
        if (!course?.enrollment) return;
        setLessonLoading(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`${API_URL}/courses/${courseId}/lessons/${lessonId}/view`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setActiveLesson(data.lesson ?? data);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            toast.error('Failed to load lesson');
        } finally {
            setLessonLoading(false);
        }
    };

    const handleMarkComplete = async () => {
        if (!activeLesson || !course) return;
        setCompletingLesson(true);
        try {
            await markLessonComplete(Number(courseId), activeLesson.id);
            toast.success('Lesson marked as complete!');
            await load();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to mark complete');
        } finally {
            setCompletingLesson(false);
        }
    };

    const isEnrolled = !!course?.enrollment;
    const enrollment = course?.enrollment;
    const isCompletedLesson = activeLesson
        ? course?.lessons.find(l => l.id === activeLesson.id)?.isCompleted
        : false;

    const renderCTA = () => {
        if (!course) return null;

        if (isEnrolled) {
            if (enrollment?.status === 'COMPLETED') {
                return (
                    <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                        <CheckCircle2 className="size-4 mr-2" /> Completed
                    </Button>
                );
            }
            const firstIncomplete = course.lessons.find(l => !l.isCompleted);
            return (
                <Button onClick={() => firstIncomplete && handleLessonClick(firstIncomplete.id)}>
                    <Play className="size-4 mr-2 fill-current" />
                    {enrollment?.completedLessons === 0 ? 'Start Learning' : 'Continue'}
                </Button>
            );
        }

        if (course.accessRule === 'ON_PAYMENT') {
            return (
                <Button
                    onClick={() => { if (!isAuthenticated) { router.push('/login'); return; } setPaymentOpen(true); }}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                    Buy ₹{course.price}
                </Button>
            );
        }

        if (course.accessRule === 'ON_INVITATION') {
            return (
                <Button disabled variant="outline">
                    <Lock className="size-4 mr-2" /> Invitation Only
                </Button>
            );
        }

        return (
            <Button onClick={handleEnroll} disabled={enrolling}>
                {enrolling ? <Loader2 className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
                {enrolling ? 'Enrolling...' : 'Enroll for Free'}
            </Button>
        );
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        );
    }

    if (!course) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Hero banner */}
            <div className="relative w-full h-56 md:h-72 bg-gradient-to-br from-primary/20 via-primary/10 to-muted overflow-hidden">
                {course.coverImage && (
                    <img src={course.coverImage} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            {course.accessRule === 'ON_PAYMENT' && (
                                <Badge className="bg-amber-500 text-white border-0 text-xs">Paid</Badge>
                            )}
                            {course.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="neutral" className="bg-white/10 text-white border-white/20 text-xs">{tag}</Badge>
                            ))}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">{course.title}</h1>
                        {course.instructor?.name && (
                            <p className="text-sm text-white/70 mt-1">by {course.instructor.name}</p>
                        )}
                    </div>
                    <div className="shrink-0">{renderCTA()}</div>
                </div>
            </div>

            {/* Stats */}
            <div className="border-b bg-muted/30">
                <div className="max-w-5xl mx-auto px-6 py-3 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><BookOpen className="size-4" />{course._count.lessons} lessons</span>
                    <span className="flex items-center gap-1.5"><Users className="size-4" />{course._count.enrollments} enrolled</span>
                    {course.quizzes.length > 0 && (
                        <span className="flex items-center gap-1.5">
                            <ClipboardList className="size-4" />
                            {course.quizzes.reduce((s, q) => s + q._count.questions, 0)} quiz questions
                        </span>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-6">
                {/* Tabs */}
                <div className="flex border-b mb-6">
                    {(['overview', 'reviews'] as PageTab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                'py-2.5 px-1 mr-8 text-sm font-medium border-b-2 -mb-px transition-colors',
                                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t === 'overview' ? 'Course Overview' : 'Ratings & Reviews'}
                        </button>
                    ))}
                </div>

                {/* Active lesson player */}
                {activeLesson && (
                    <div className="mb-6 rounded-xl border bg-card overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                            <div className="flex items-center gap-2 min-w-0">
                                <button onClick={() => setActiveLesson(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                    <ChevronLeft className="size-5" />
                                </button>
                                <span className="font-medium text-sm truncate">{activeLesson.title}</span>
                            </div>
                            {!isCompletedLesson ? (
                                <Button size="sm" variant="outline" onClick={handleMarkComplete} disabled={completingLesson} className="shrink-0 ml-2">
                                    {completingLesson
                                        ? <Loader2 className="size-3.5 animate-spin" />
                                        : <><CheckCircle2 className="size-3.5 mr-1.5" />Mark Complete</>
                                    }
                                </Button>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium shrink-0 ml-2">
                                    <CheckCircle2 className="size-3.5" /> Completed
                                </span>
                            )}
                        </div>

                        <div className="p-4 space-y-4">
                            {activeLesson.type === 'VIDEO' && activeLesson.videoStatus === 'READY' && activeLesson.videoUrl && (
                                <VideoPlayer src={activeLesson.videoUrl} poster={activeLesson.thumbnailUrl ?? undefined} title={activeLesson.title} />
                            )}
                            {activeLesson.type === 'VIDEO' && activeLesson.videoStatus === 'PROCESSING' && (
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                    <div className="text-center space-y-2">
                                        <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                                        <p className="text-sm text-muted-foreground">Video is being processed…</p>
                                    </div>
                                </div>
                            )}
                            {activeLesson.type === 'IMAGE' && activeLesson.filePath && (
                                <img src={activeLesson.filePath} alt={activeLesson.title} className="w-full rounded-lg object-contain max-h-[500px]" />
                            )}
                            {activeLesson.type === 'DOCUMENT' && activeLesson.filePath && (
                                <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                                    <FileText className="size-8 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{activeLesson.title}</p>
                                    </div>
                                    {activeLesson.allowDownload && (
                                        <a href={activeLesson.filePath} download target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="outline"><Download className="size-3.5 mr-1" />Download</Button>
                                        </a>
                                    )}
                                </div>
                            )}
                            {activeLesson.description && (
                                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                                    {activeLesson.description.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                                </div>
                            )}
                            {activeLesson.attachments?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attachments</p>
                                    {activeLesson.attachments.map(att => (
                                        <a
                                            key={att.id}
                                            href={att.externalUrl ?? att.filePath ?? '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                                        >
                                            {att.type === 'LINK' ? '🔗' : '📄'} {att.label}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {lessonLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="size-7 animate-spin text-primary" />
                    </div>
                )}

                {!lessonLoading && (
                    <>
                        {tab === 'overview' && (
                            <CourseOverviewTab course={course} enrollment={enrollment} onLessonClick={handleLessonClick} />
                        )}
                        {tab === 'reviews' && (
                            <ReviewsTab courseId={Number(courseId)} isEnrolled={isEnrolled} />
                        )}
                    </>
                )}
            </div>

            {course.accessRule === 'ON_PAYMENT' && (
                <PaymentModal
                    courseId={Number(courseId)}
                    courseTitle={course.title}
                    price={course.price ?? '0'}
                    open={paymentOpen}
                    onOpenChange={setPaymentOpen}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
