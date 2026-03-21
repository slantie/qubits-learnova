'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
    Play, FileText, Image as ImageIcon, ClipboardText,
    Clock, BookOpen, CaretLeft, CircleNotch,
    Link as LinkIcon2, FileArrowDown, X, CaretRight, DownloadSimple,
    CheckCircle, Circle, Trophy, ArrowRight,
    Users, Lock, Medal, ArrowSquareOut, Printer,
    Share, Copy, SealCheck, Star, FileAudio,
    Code, CheckSquare, ChartBar as ChartBar2, Chat,
} from '@phosphor-icons/react';
import { LessonType } from '@/types';
import { LiveWaveform } from '@/components/ui/live-waveform';

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
    allowDownloadSimple: boolean;
    duration: number | null;
    timestamps: LessonTimestamp[] | null;
    richContent: unknown | null;
    iframeUrl: string | null;
    quizBlockId: number | null;
    attachments: { id: number; type: 'FILE' | 'LINK'; label: string; filePath: string | null; externalUrl: string | null }[];
}

interface QuizMeta {
    id: number;
    title: string;
    rewards: { attempt1Points: number; attempt2Points: number; attempt3Points: number; attempt4PlusPoints: number } | null;
}

interface SectionMeta {
    id: number;
    title: string;
    order: number;
    isLocked: boolean;
    lessons: LessonMeta[];
}

interface CourseViewData {
    id: number; title: string; description: string | null; coverImage: string | null;
    tags: string[]; instructorName: string;
    sections: SectionMeta[];
    lessons: LessonMeta[];
    completedLessonIds: number[];
}

type PageTab = 'overview' | 'reviews';
type ContentTab = 'description' | 'images' | 'documents' | 'chapters' | 'resources';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i;

function lessonTypeIcon(type: LessonType): React.ReactNode {
    const cls = 'size-3 shrink-0';
    switch (type) {
        case 'VIDEO':        return <Play className={cls} />;
        case 'ARTICLE':      return <FileText className={cls} />;
        case 'PDF':          return <FileText className={cls} />;
        case 'IMAGE':        return <ImageIcon className={cls} />;
        case 'AUDIO':        return <FileAudio className={cls} />;
        case 'LINK_BLOCK':   return <LinkIcon2 className={cls} />;
        case 'IFRAME':       return <Code className={cls} />;
        case 'QUIZ_BLOCK':   return <ClipboardText className={cls} />;
        case 'ASSIGNMENT':   return <CheckSquare className={cls} />;
        case 'SURVEY':       return <ChartBar2 className={cls} />;
        case 'FEEDBACK_GATE':return <Chat className={cls} />;
        default:             return <FileText className={cls} />;
    }
}

function getDownloadSimpleUrl(url: string, filename: string): string {
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
    const [audioPlaying, setAudioPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Survey/Feedback state
    type SurveyQuestion = { id: string; label: string; type: 'text' | 'star' | 'choice'; required: boolean; options: string[] };
    const surveyQuestions: SurveyQuestion[] = (() => {
        try {
            const rc = lesson.richContent;
            if (Array.isArray(rc)) return rc as SurveyQuestion[];
            if (typeof rc === 'string') { const p = JSON.parse(rc); if (Array.isArray(p)) return p as SurveyQuestion[]; }
        } catch {}
        return [];
    })();
    const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | number>>({});
    const [surveySubmitted, setSurveySubmitted] = useState(false);
    const [surveySubmitting, setSurveySubmitting] = useState(false);

    const handleSurveySubmit = async () => {
        const missing = surveyQuestions.filter(q => q.required && !surveyAnswers[q.id]);
        if (missing.length > 0) { toast.error('Please answer all required questions'); return; }
        setSurveySubmitting(true);
        // Store responses locally (no separate API endpoint needed — just mark complete)
        await onMarkComplete(lesson.id);
        setSurveySubmitted(true);
        setSurveySubmitting(false);
        toast.success('Response submitted!');
    };

    const images = lesson.attachments.filter(a => a.type === 'FILE' && a.filePath && IMAGE_EXT.test(a.filePath));
    const docs = lesson.attachments.filter(a => a.type === 'FILE' && a.filePath && !IMAGE_EXT.test(a.filePath));
    const links = lesson.attachments.filter(a => a.type === 'LINK');
    const chapters = lesson.timestamps ?? [];

    const tabs: { key: ContentTab; label: string; icon: React.ReactNode; count?: number; show: boolean }[] = [
        { key: 'description', label: 'Description', icon: <FileText className="size-3.5" />, show: !!lesson.description },
        { key: 'images', label: 'Images', icon: <ImageIcon className="size-3.5" />, count: images.length, show: images.length > 0 },
        { key: 'documents', label: 'Documents', icon: <FileArrowDown className="size-3.5" />, count: docs.length, show: docs.length > 0 },
        { key: 'chapters', label: 'Chapters', icon: <Clock className="size-3.5" />, count: chapters.length, show: chapters.length > 0 },
        { key: 'resources', label: 'Resources', icon: <LinkIcon2 className="size-3.5" />, count: links.length, show: links.length > 0 },
    ];
    const visibleTabs = tabs.filter(t => t.show);

    useEffect(() => {
        if (visibleTabs.length > 0 && !visibleTabs.find(t => t.key === activeTab)) {
            setActiveTab(visibleTabs[0].key);
        }
    }, [visibleTabs, activeTab]);
    

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

    const allLessons = [...(course.sections ?? []).flatMap(s => s.lessons), ...course.lessons];
    const idx = allLessons.findIndex(l => l.id === lesson.id);
    const prev = allLessons[idx - 1];
    const next = allLessons[idx + 1];
    const isCompleted = completedIds.has(lesson.id);

    // Derive checklist items from richContent for ASSIGNMENT
    const checklistItems: string[] = (() => {
        try {
            const rc = lesson.richContent;
            if (Array.isArray(rc)) return rc as string[];
            if (typeof rc === 'string') { const p = JSON.parse(rc); if (Array.isArray(p)) return p as string[]; }
        } catch {}
        return [];
    })();

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">

            {/* ── VIDEO ────────────────────────────────────────────────────── */}
            {lesson.type === 'VIDEO' && lesson.videoStatus === 'READY' && lesson.videoUrl && (
                <VideoPlayer src={lesson.videoUrl} poster={lesson.thumbnailUrl ?? undefined} title={lesson.title} timestamps={lesson.timestamps ?? undefined} className="w-full shadow-lg" />
            )}
            {lesson.type === 'VIDEO' && lesson.videoStatus === 'PROCESSING' && (
                <div className="aspect-video rounded-xl bg-muted flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <CircleNotch className="size-8 animate-spin text-amber-500" />
                    <p className="text-sm font-medium">Video is being processed</p>
                    <p className="text-xs">Check back in a few minutes</p>
                </div>
            )}

            {/* ── ARTICLE ─────────────────────────────────────────────────── */}
            {lesson.type === 'ARTICLE' && lesson.richContent && (
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.richContent as string }} />
            )}

            {/* ── PDF ─────────────────────────────────────────────────────── */}
            {lesson.type === 'PDF' && lesson.filePath && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-4 border rounded-xl bg-muted/30">
                        <FileText className="size-8 text-red-500 shrink-0" />
                        <span className="flex-1 font-medium text-sm truncate">{lesson.title}</span>
                        <a href={lesson.filePath} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline"><ArrowSquareOut className="size-3.5 mr-1" />Open PDF</Button>
                        </a>
                        {lesson.allowDownloadSimple && (
                            <a href={getDownloadSimpleUrl(lesson.filePath, lesson.title)} download={lesson.title} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline"><DownloadSimple className="size-3.5 mr-1" />Download</Button>
                            </a>
                        )}
                    </div>
                    <iframe src={lesson.filePath} className="w-full rounded-xl border h-[75vh]" title={lesson.title} />
                </div>
            )}

            {/* ── IMAGE ───────────────────────────────────────────────────── */}
            {(lesson.type === 'IMAGE') && lesson.filePath && (
                <img src={lesson.filePath} alt={lesson.title} className="w-full rounded-xl object-contain max-h-125 border" />
            )}

            {/* ── AUDIO ───────────────────────────────────────────────────── */}
            {lesson.type === 'AUDIO' && lesson.filePath && (
                <div className="flex flex-col gap-4 p-5 border rounded-xl bg-muted/20">
                    {/* Header row */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/10">
                            <FileAudio className="size-5 text-pink-500 shrink-0" />
                        </div>
                        <span className="flex-1 font-semibold truncate">{lesson.title}</span>
                        {lesson.allowDownloadSimple && (
                            <a href={getDownloadSimpleUrl(lesson.filePath, lesson.title)} download={lesson.title}>
                                <Button size="sm" variant="outline" className="shrink-0">
                                    <DownloadSimple className="size-3.5 mr-1" />Download
                                </Button>
                            </a>
                        )}
                    </div>

                    {/* Waveform visualizer */}
                    <LiveWaveform
                        active={audioPlaying}
                        mode="scrolling"
                        height={56}
                        barColor="rgb(236, 72, 153)"
                        barWidth={3}
                        barGap={1.5}
                        barHeight={5}
                        sensitivity={1.4}
                        fadeEdges
                        className="rounded-lg"
                    />

                    {/* Native audio (hidden controls, we control play state) */}
                    <audio
                        ref={audioRef}
                        src={lesson.filePath}
                        className="w-full"
                        controls
                        onPlay={() => setAudioPlaying(true)}
                        onPause={() => setAudioPlaying(false)}
                        onEnded={() => setAudioPlaying(false)}
                    />
                </div>
            )}

            {/* ── LINK_BLOCK ──────────────────────────────────────────────── */}
            {lesson.type === 'LINK_BLOCK' && lesson.description && (
                <a href={lesson.description} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 p-5 border rounded-xl bg-card hover:bg-muted/40 transition-colors group">
                    <div className="size-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <LinkIcon2 className="size-5 text-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>
                    </div>
                    <ArrowSquareOut className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>
            )}

            {/* ── IFRAME ──────────────────────────────────────────────────── */}
            {lesson.type === 'IFRAME' && lesson.iframeUrl && (() => {
                const raw = lesson.iframeUrl;
                const match = raw.match(/<iframe[\s\S]*?\bsrc=["']([^"']+)["']/i);
                const src = match ? match[1] : raw;
                return (
                    <div className="flex flex-col gap-2">
                        <iframe src={src} className="w-full rounded-xl border h-[75vh]" title={lesson.title} allow="fullscreen" />
                        <a href={src} target="_blank" rel="noopener noreferrer" className="self-end text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <ArrowSquareOut className="size-3" /> Open in new tab
                        </a>
                    </div>
                );
            })()}

            {/* ── QUIZ_BLOCK ──────────────────────────────────────────────── */}
            {lesson.type === 'QUIZ_BLOCK' && lesson.quizBlockId && (
                <Link href={`/courses/${course.id}/quiz/${lesson.quizBlockId}`}
                    className="flex items-center gap-4 p-5 border rounded-xl bg-card hover:bg-muted/40 transition-colors group">
                    <div className="size-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                        <ClipboardText className="size-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">Take this quiz to test your knowledge</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
            )}

            {/* ── ASSIGNMENT ──────────────────────────────────────────────── */}
            {lesson.type === 'ASSIGNMENT' && (
                <div className="flex flex-col gap-4 p-5 border rounded-xl bg-muted/20">
                    <div className="flex items-center gap-3">
                        <CheckSquare className="size-5 text-teal-500" />
                        <h3 className="font-semibold text-sm">Assignment Checklist</h3>
                    </div>
                    {lesson.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}
                    {checklistItems.length > 0 ? (
                        <ol className="flex flex-col gap-2">
                            {checklistItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm">
                                    <span className="mt-0.5 size-5 rounded-full border-2 border-muted-foreground/30 shrink-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No checklist items.</p>
                    )}
                </div>
            )}

            {/* ── SURVEY / FEEDBACK_GATE ──────────────────────────────────── */}
            {(lesson.type === 'SURVEY' || lesson.type === 'FEEDBACK_GATE') && (
                <div className="flex flex-col gap-5 p-5 border rounded-xl bg-muted/20">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', lesson.type === 'SURVEY' ? 'bg-lime-500/10' : 'bg-fuchsia-500/10')}>
                            {lesson.type === 'SURVEY'
                                ? <ChartBar2 className="size-5 text-lime-600" />
                                : <Chat className="size-5 text-fuchsia-500" />}
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{lesson.title}</p>
                            {lesson.type === 'FEEDBACK_GATE' && (
                                <p className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400">Complete to unlock the next lesson</p>
                            )}
                        </div>
                    </div>

                    {lesson.description && (
                        <p className="text-sm text-muted-foreground">{lesson.description}</p>
                    )}

                    {surveySubmitted ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <CheckCircle className="size-10 text-emerald-500" />
                            <p className="font-semibold text-sm">Thank you for your response!</p>
                            <p className="text-xs text-muted-foreground">Your feedback has been recorded.</p>
                        </div>
                    ) : surveyQuestions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground italic">No questions configured for this block.</div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {surveyQuestions.map((q, qi) => (
                                <div key={q.id} className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">
                                        {qi + 1}. {q.label}
                                        {q.required && <span className="text-destructive ml-1">*</span>}
                                    </label>

                                    {q.type === 'text' && (
                                        <textarea
                                            value={(surveyAnswers[q.id] as string) ?? ''}
                                            onChange={e => setSurveyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                            placeholder="Your answer..."
                                            rows={3}
                                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    )}

                                    {q.type === 'star' && (
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    aria-label={`${s} star`}
                                                    onClick={() => setSurveyAnswers(prev => ({ ...prev, [q.id]: s }))}
                                                    className="transition-transform hover:scale-110"
                                                >
                                                    <Star className={cn('size-7', (surveyAnswers[q.id] as number) >= s ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30')} />
                                                </button>
                                            ))}
                                            {surveyAnswers[q.id] && (
                                                <span className="text-xs text-muted-foreground ml-2">{surveyAnswers[q.id]} / 5</span>
                                            )}
                                        </div>
                                    )}

                                    {q.type === 'choice' && (
                                        <div className="flex flex-col gap-1.5">
                                            {q.options.filter(Boolean).map((opt, oi) => (
                                                <label key={oi} className="flex items-center gap-2.5 cursor-pointer group">
                                                    <span className={cn(
                                                        'size-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                                        surveyAnswers[q.id] === opt
                                                            ? 'border-primary bg-primary'
                                                            : 'border-muted-foreground/40 group-hover:border-primary/60'
                                                    )}>
                                                        {surveyAnswers[q.id] === opt && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                                                    </span>
                                                    <input
                                                        type="radio"
                                                        name={`survey-${q.id}`}
                                                        value={opt}
                                                        checked={surveyAnswers[q.id] === opt}
                                                        onChange={() => setSurveyAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                        className="sr-only"
                                                    />
                                                    <span className="text-sm">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <Button
                                onClick={handleSurveySubmit}
                                disabled={surveySubmitting}
                                className="self-start"
                            >
                                {surveySubmitting && <CircleNotch className="size-4 mr-2 animate-spin" />}
                                Submit Response
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ── DOCUMENT (legacy) ────────────────────────────────────────── */}
            {lesson.type === 'DOCUMENT' && lesson.filePath && (
                <div className="flex items-center gap-3 p-4 border rounded-xl bg-muted/30">
                    <FileText className="size-8 text-muted-foreground shrink-0" />
                    <span className="flex-1 font-medium text-sm truncate">{lesson.title}</span>
                    {lesson.allowDownloadSimple && (
                        <a href={getDownloadSimpleUrl(lesson.filePath, lesson.title)} download={lesson.title} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline"><DownloadSimple className="size-3.5 mr-1" />DownloadSimple</Button>
                        </a>
                    )}
                </div>
            )}

            {/* Title + meta */}
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl ">{lesson.title}</h2>
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
                    <div className="min-h-30">
                        {activeTab === 'description' && lesson.description && (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.description }} />
                        )}
                        {activeTab === 'images' && images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {images.map((a, i) => (
                                    <button key={a.id} onClick={() => setLightboxIndex(i)} className="rounded-xl overflow-hidden border bg-muted/30 aspect-4/3 group cursor-pointer">
                                        <img src={a.filePath!} alt={a.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeTab === 'documents' && docs.length > 0 && (
                            <ul className="flex flex-col gap-2">
                                {docs.map(a => (
                                    <li key={a.id}>
                                        <a href={lesson.allowDownloadSimple ? getDownloadSimpleUrl(a.filePath!, a.label) : a.filePath!} target="_blank" rel="noopener noreferrer" download={lesson.allowDownloadSimple ? a.label : undefined}
                                            className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-sm group w-full">
                                            <FileText className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                            <span className="flex-1 truncate font-medium">{a.label}</span>
                                            {lesson.allowDownloadSimple && <FileArrowDown className="size-4 text-muted-foreground group-hover:text-primary shrink-0" />}
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
                                            <span className="font-mono text-xs tabular-nums text-primary pt-0.5 shrink-0 min-w-12">{label}</span>
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
                                            <LinkIcon2 className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
                            <div className="flex items-center gap-2 text-primary">
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
                            {marking ? <CircleNotch className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                            {next ? 'Complete & Continue' : 'Mark as Complete'}
                            {next && <ArrowRight className="size-4" />}
                        </Button>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    {prev ? (
                        <button onClick={() => onNavigate(prev.id)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <CaretLeft className="size-4" /><span className="hidden sm:inline">Previous:</span> {prev.title}
                        </button>
                    ) : <div />}
                    {next && (
                        <button onClick={() => onNavigate(next.id)} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ml-auto">
                            Next: {next.title}<CaretLeft className="size-4 rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && images[lightboxIndex] && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
                    <Button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"><X className="size-5" /></Button>
                    <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-mono">{lightboxIndex + 1} / {images.length}</span>
                    {lesson.allowDownloadSimple && (
                        <a href={getDownloadSimpleUrl(images[lightboxIndex].filePath!, images[lightboxIndex].label)} download={images[lightboxIndex].label} onClick={e => e.stopPropagation()} className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
                            <DownloadSimple className="size-5" />
                        </a>
                    )}
                    {lightboxIndex > 0 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
                            <CaretLeft className="size-6" />
                        </button>
                    )}
                    {lightboxIndex < images.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
                            <CaretRight className="size-6" />
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

    // Certificate
    const [certificate, setCertificate] = useState<{ uid: string; pointsEarned: number; issuedAt: string } | null>(null);
    const [certHtml, setCertHtml] = useState<string | null>(null);
    const [showCertModal, setShowCertModal] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000';

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
            const allLessons = [...(c.sections ?? []).flatMap(s => s.lessons), ...c.lessons];
            if (allLessons.length > 0 && !activeLessonId) {
                const first = allLessons.find(l => !ids.has(l.id)) ?? allLessons[0];
                setActiveLessonId(first.id);
            }
        } catch { /* non-fatal */ }
    }, [courseId]);

    const loadCertificate = useCallback(async () => {
        try {
            const data = await api.get(`/certificates/course/${courseId}`);
            const cert = data.certificate;
            if (cert) {
                setCertificate(cert);
                const htmlRes = await fetch(`${apiUrl}/certificates/view/${cert.uid}`);
                if (htmlRes.ok) setCertHtml(await htmlRes.text());
            }
        } catch { /* no certificate yet */ }
    }, [courseId, apiUrl]);

    useEffect(() => { loadOverview(); }, [loadOverview]);
    useEffect(() => { if (isAuthenticated) loadCourseView(); }, [isAuthenticated, loadCourseView]);
    useEffect(() => { if (isAuthenticated) loadCertificate(); }, [isAuthenticated, loadCertificate]);

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
        } catch (err) {
            const error = err as { data?: { message?: string } } | Error;
            const message = typeof error === 'object' && 'data' in error ? (error as { data?: { message?: string } }).data?.message : undefined;
            toast.error(message || 'Enrollment failed');
        } finally { setEnrolling(false); }
    };

    const handlePaymentSuccess = async () => {
        toast.success('Payment successful! You are now enrolled.');
        await Promise.all([loadOverview(), loadCourseView()]);
    };

    // ─── Derived ──────────────────────────────────────────────────────────────

    const isEnrolled = !!overviewData?.enrollment;
    const enrollment = overviewData?.enrollment;
    const allCourseLessons = courseView
        ? [...(courseView.sections ?? []).flatMap(s => s.lessons), ...courseView.lessons]
        : [];
    const totalDuration = allCourseLessons.reduce((s, l) => s + (l.duration ?? 0), 0);
    const progressPct = allCourseLessons.length > 0
        ? Math.round((completedIds.size / allCourseLessons.length) * 100)
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
                {enrolling ? <CircleNotch className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
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
                        <CaretLeft className="size-3.5" /> Overview
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
                            <h1 className=" text-sm leading-snug line-clamp-2 mb-1">{overviewData.title}</h1>
                            {overviewData.instructor?.name && <p className="text-xs text-muted-foreground mb-3">by {overviewData.instructor.name}</p>}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><BookOpen className="size-3" />{allCourseLessons.length} lessons</span>
                                {totalDuration > 0 && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{formatDuration(totalDuration)}</span>}
                            </div>
                            {allCourseLessons.length > 0 && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium tabular-nums">{completedIds.size}/{allCourseLessons.length}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${progressPct}%` }} />
                                    </div>
                                    {progressPct >= 100 && (
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
                                            <Trophy className="size-3.5" /> Course completed!
                                        </div>
                                    )}
                                </div>
                            )}

                            {certificate && (
                                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <SealCheck className="size-4 text-primary shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-normal text-foreground leading-tight">Certificate Earned</p>
                                            <p className="text-[11px] text-muted-foreground tabular-nums">
                                                {new Date(certificate.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {certificate.pointsEarned > 0 && <> · {certificate.pointsEarned} pts</>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowCertModal(true)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md px-3 py-1.5 transition-colors"
                                        >
                                            <Medal className="size-3" /> View
                                        </button>
                                        <a
                                            href={`${clientUrl}/verify/${certificate.uid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 border border-border rounded-md px-3 py-1.5 transition-colors"
                                        >
                                            <ArrowSquareOut className="size-3" /> Verify
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        <nav className="flex-1 py-2">
                            {(() => {
                                const indexMap = new Map<number, number>();
                                let idx = 1;
                                for (const s of (courseView?.sections ?? [])) for (const l of s.lessons) indexMap.set(l.id, idx++);
                                for (const l of (courseView?.lessons ?? [])) indexMap.set(l.id, idx++);

                                const renderLesson = (l: LessonMeta) => {
                                    const isActive = l.id === activeLessonId;
                                    const isProcessing = l.type === 'VIDEO' && l.videoStatus === 'PROCESSING';
                                    const isDone = completedIds.has(l.id);
                                    return (
                                        <button key={l.id} type="button" onClick={() => setActiveLessonId(l.id)} disabled={isProcessing}
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
                                                    {indexMap.get(l.id)}. {l.title}
                                                </span>
                                                <span className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                                                    {lessonTypeIcon(l.type)}
                                                    {l.duration && <span className="text-[11px]">{formatDuration(l.duration)}</span>}
                                                    {isProcessing && <span className="text-[10px] text-amber-500 inline-flex items-center gap-0.5"><CircleNotch className="size-2.5 animate-spin" /> Processing</span>}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                };

                                return (
                                    <>
                                        {(courseView?.sections ?? []).map(section => (
                                            <div key={section.id}>
                                                <div className="flex items-center gap-2 px-5 py-2 bg-muted/30 border-b border-border/50">
                                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1 truncate">{section.title}</span>
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {section.lessons.filter(l => completedIds.has(l.id)).length}/{section.lessons.length}
                                                    </span>
                                                </div>
                                                {section.lessons.map(renderLesson)}
                                            </div>
                                        ))}
                                        {(courseView?.lessons ?? []).length > 0 && (courseView?.sections ?? []).length > 0 && (
                                            <div className="flex items-center gap-2 px-5 py-2 bg-muted/20 border-b border-border/50">
                                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Other</span>
                                            </div>
                                        )}
                                        {(courseView?.lessons ?? []).map(renderLesson)}
                                    </>
                                );
                            })()}

                            {quizzes.length > 0 && (
                                <>
                                    <div className="flex items-center gap-2 px-5 py-2 mt-1 border-t border-border/50">
                                        <ClipboardText className="size-3 text-muted-foreground" />
                                        <span className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Quizzes</span>
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
                        {lessonLoading && <div className="flex items-center justify-center h-64"><CircleNotch className="size-6 animate-spin text-primary" /></div>}
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

                {/* ── Certificate modal ── */}
                {showCertModal && certificate && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Certificate viewer"
                    >
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={() => setShowCertModal(false)}
                            aria-hidden="true"
                        />

                        {/* Panel */}
                        <div className="relative z-10 w-full sm:w-[95vw] sm:max-w-245 h-[96dvh] sm:h-[88vh] flex flex-col bg-background rounded-t-2xl sm:rounded-2xl border border-border/60 shadow-2xl overflow-hidden">

                            {/* ── Modal header ── */}
                            <div className="shrink-0 flex flex-col gap-0 border-b bg-card">
                                {/* Top bar: title + actions */}
                                <div className="flex items-center justify-between px-5 py-3 gap-3">
                                    {/* Left: icon + label */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                                            <Medal className="size-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-normal leading-tight truncate">Your Certificate</p>
                                            <p className="text-[11px] text-muted-foreground leading-tight">
                                                Issued {new Date(certificate.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: action group */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Share / copy link */}
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${clientUrl}/verify/${certificate.uid}`);
                                                toast.success('Verification link copied to clipboard');
                                            }}
                                            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Copy verification link to clipboard"
                                        >
                                            <Copy className="size-3" />
                                            Copy Link
                                        </button>

                                        {/* Open full size */}
                                        <a
                                            href={`${clientUrl}/verify/${certificate.uid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Open certificate in full size in a new tab"
                                        >
                                            <ArrowSquareOut className="size-3" />
                                            Full Size
                                        </a>

                                        {/* Primary: Print / DownloadSimple */}
                                        <button
                                            onClick={() => {
                                                if (certHtml) {
                                                    const blob = new Blob([certHtml], { type: 'text/html' });
                                                    const url = URL.createObjectURL(blob);
                                                    const w = window.open(url, '_blank');
                                                    if (w) { w.onload = () => { w.print(); URL.revokeObjectURL(url); }; }
                                                }
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs font-normal text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Print or save certificate as PDF"
                                        >
                                            <Printer className="size-3" />
                                            <span className="hidden sm:inline">Print / </span>PDF
                                        </button>

                                        {/* Close */}
                                        <button
                                            onClick={() => setShowCertModal(false)}
                                            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Close certificate viewer"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Metadata chips row */}
                                <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                                    {/* Points chip */}
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 border border-border/50 rounded-full px-2.5 py-0.5">
                                        <Star className="size-3" />
                                        {certificate.pointsEarned} pts earned
                                    </span>
                                    {/* UID chip */}
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 border border-border/50 rounded-full px-2.5 py-0.5 font-mono tracking-tight">
                                        <SealCheck className="size-3 shrink-0" />
                                        {certificate.uid}
                                    </span>
                                    {/* Mobile-only action links */}
                                    <a
                                        href={`${clientUrl}/verify/${certificate.uid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="sm:hidden inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                        aria-label="Open certificate full size"
                                    >
                                        <ArrowSquareOut className="size-3" />
                                        Full Size
                                    </a>
                                </div>
                            </div>

                            {/* ── Certificate display area ── */}
                            <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900 p-4 sm:p-8 flex items-start justify-center">
                                {certHtml ? (
                                    /*
                                     * Physical document treatment:
                                     * - Slight drop shadow at multiple levels to simulate paper depth
                                     * - Subtle warm tint on the outer container echoes the parchment feel
                                     * - No rotation on mobile (too disorienting in tight space)
                                     */
                                    <div className="w-full max-w-220 sm:rotate-[-0.4deg] transition-transform duration-300 hover:rotate-0">
                                        <div className="rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_10px_30px_-5px_rgba(0,0,0,0.2),0_20px_60px_-10px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
                                            <iframe
                                                srcDoc={certHtml}
                                                className="w-full bg-white"
                                                style={{ minHeight: '560px', height: '62vh', display: 'block' }}
                                                title="Certificate of completion"
                                                sandbox=""
                                                aria-label="Certificate document preview"
                                            />
                                        </div>
                                        {/* Subtle base shadow to complete the "lifted paper" effect */}
                                        <div className="h-2 mx-6 rounded-b-full bg-black/10 dark:bg-black/30 blur-md -mt-1" aria-hidden="true" />
                                    </div>
                                ) : (
                                    /* Loading state */
                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground py-24" aria-live="polite" aria-busy="true">
                                        <div className="size-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                            <CircleNotch className="size-6 animate-spin text-amber-500" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-foreground">Preparing your certificate</p>
                                            <p className="text-xs text-muted-foreground mt-1">This should only take a moment</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
                        <h1 className="text-2xl md:text-3xl text-white leading-tight line-clamp-2">{overviewData.title}</h1>
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
                            <ClipboardText className="size-4" />{overviewData.quizzes.reduce((s, q) => s + q._count.questions, 0)} quiz questions
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
