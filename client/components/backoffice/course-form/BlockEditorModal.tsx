'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { TimestampEditor, type Timestamp } from './TimestampEditor';
import {
    X, FileUp, Trash2, FileText, Image as ImageIcon, Video,
    Loader2, CheckCircle, AlertCircle, Upload, ChevronDown, ChevronRight,
    Plus, Eye, Link2, Code2, ClipboardList, CheckSquare, BarChart2,
    MessageSquare, FileAudio, Star, AlignLeft, List, ArrowUp, ArrowDown,
    GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LessonType, Attachment } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockEditorModalProps {
    courseId: number | string;
    lesson?: any;                      // null = creating new
    initialType: LessonType;
    sectionId?: number | null;
    quizzes?: { id: number; title: string }[];
    onSave: (lesson: any) => void;
    onClose: () => void;
}

type VideoUploadState =
    | { phase: 'idle' }
    | { phase: 'uploading'; progress: string }
    | { phase: 'processing' }
    | { phase: 'ready'; streamUrl: string; thumbnailUrl?: string }
    | { phase: 'failed'; message: string };

const VIDEO_SERVICE_URL =
    process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL ?? 'http://localhost:4001/api';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i;
const isImageFile = (url: string) => IMAGE_EXT.test(url);

// ─── Block type metadata ──────────────────────────────────────────────────────

const BLOCK_META: Record<LessonType, { label: string; icon: React.ElementType; color: string }> = {
    VIDEO:        { label: 'Video',          icon: Video,          color: 'text-blue-500' },
    ARTICLE:      { label: 'Article',        icon: FileText,       color: 'text-emerald-500' },
    PDF:          { label: 'PDF',            icon: FileText,       color: 'text-red-500' },
    IMAGE:        { label: 'Image',          icon: ImageIcon,      color: 'text-violet-500' },
    AUDIO:        { label: 'Audio',          icon: FileAudio,      color: 'text-pink-500' },
    DOCUMENT:     { label: 'Document',       icon: FileText,       color: 'text-amber-500' },
    LINK_BLOCK:   { label: 'Link',           icon: Link2,          color: 'text-cyan-500' },
    IFRAME:       { label: 'Embed',          icon: Code2,          color: 'text-indigo-500' },
    QUIZ_BLOCK:   { label: 'Quiz Block',     icon: ClipboardList,  color: 'text-orange-500' },
    ASSIGNMENT:   { label: 'Assignment',     icon: CheckSquare,    color: 'text-teal-500' },
    SURVEY:       { label: 'Survey',         icon: BarChart2,      color: 'text-lime-600' },
    FEEDBACK_GATE:{ label: 'Feedback Gate',  icon: MessageSquare,  color: 'text-fuchsia-500' },
    QUIZ:         { label: 'Quiz',           icon: ClipboardList,  color: 'text-orange-500' },
};

// ─── Collapsible section header ───────────────────────────────────────────────

function SectionHeader({
    icon: Icon, title, count, open, onToggle,
}: { icon: React.ElementType; title: string; count?: number; open: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center gap-2 py-2.5 text-sm font-semibold hover:text-primary transition-colors"
        >
            {open
                ? <ChevronDown className="size-4 text-muted-foreground" />
                : <ChevronRight className="size-4 text-muted-foreground" />}
            <Icon className="size-4" />
            {title}
            {count !== undefined && count > 0 && (
                <Badge variant="neutral" className="ml-auto text-[10px]">{count}</Badge>
            )}
        </button>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function BlockEditorModal({
    courseId,
    lesson,
    initialType,
    sectionId,
    quizzes = [],
    onSave,
    onClose,
}: BlockEditorModalProps) {
    const isEdit = !!lesson;
    const blockType = lesson?.type ?? initialType;
    const meta = BLOCK_META[blockType as LessonType] ?? BLOCK_META.VIDEO;
    const Icon = meta.icon;

    // ── Core fields ──────────────────────────────────────────────────────────
    const [title, setTitle] = useState<string>(lesson?.title ?? '');
    const [description, setDescription] = useState<string>(lesson?.description ?? lesson?.content ?? '');
    const [saving, setSaving] = useState(false);
    const [savedLessonId, setSavedLessonId] = useState<number | null>(lesson?.id ?? null);

    // ── Type-specific state ──────────────────────────────────────────────────

    // VIDEO
    const [allowDownload, setAllowDownload] = useState<boolean>(lesson?.allowDownload ?? false);
    const [timestamps, setTimestamps] = useState<Timestamp[]>(lesson?.timestamps ?? []);
    const [videoState, setVideoState] = useState<VideoUploadState>(() => {
        if (lesson?.videoStatus === 'READY' && lesson?.videoUrl)
            return { phase: 'ready', streamUrl: lesson.videoUrl, thumbnailUrl: lesson.thumbnailUrl };
        if (lesson?.videoStatus === 'PROCESSING') return { phase: 'processing' };
        if (lesson?.videoStatus === 'FAILED')
            return { phase: 'failed', message: 'Video processing failed. Try uploading again.' };
        return { phase: 'idle' };
    });
    const videoFileRef = useRef<HTMLInputElement>(null);
    const videoPlayerRef = useRef<{ seekTo: (time: number) => void }>(null);

    // VIDEO / ARTICLE — section visibility toggles
    const [videoOpen, setVideoOpen] = useState(true);
    const [descOpen, setDescOpen] = useState(true);
    const [linksOpen, setLinksOpen] = useState(false);

    // Attachments (shared docs/links)
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
    const [fileUploading, setFileUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkLabel, setNewLinkLabel] = useState('');
    const [linkAdding, setLinkAdding] = useState(false);

    // LINK_BLOCK
    const [linkUrl, setLinkUrl] = useState<string>(lesson?.description ?? '');
    const [linkLabel, setLinkLabel] = useState<string>(lesson?.title ?? '');

    // IFRAME — extract src if a full <iframe> tag was previously saved
    const [iframeUrl, setIframeUrl] = useState<string>(() => {
        const raw: string = lesson?.iframeUrl ?? '';
        const match = raw.match(/<iframe[\s\S]*?\bsrc=["']([^"']+)["']/i);
        return match ? match[1] : raw;
    });

    // QUIZ_BLOCK
    const [selectedQuizId, setSelectedQuizId] = useState<number | null>(lesson?.quizBlockId ?? null);

    // ARTICLE — rich content (TipTap stored as HTML)
    const [articleContent, setArticleContent] = useState<string>(
        typeof lesson?.richContent === 'string' ? lesson.richContent : ''
    );

    // ASSIGNMENT — checklist items
    const [checklistItems, setChecklistItems] = useState<string[]>(() => {
        try {
            const rc = lesson?.richContent;
            if (Array.isArray(rc)) return rc as string[];
            if (typeof rc === 'string') {
                const parsed = JSON.parse(rc);
                if (Array.isArray(parsed)) return parsed as string[];
            }
        } catch {}
        return [''];
    });

    // SURVEY / FEEDBACK_GATE — question list
    // Each question: { id: string; label: string; type: 'text' | 'star' | 'choice'; required: boolean; options?: string[] }
    type SurveyQuestion = {
        id: string;
        label: string;
        type: 'text' | 'star' | 'choice';
        required: boolean;
        options: string[];
    };
    const parseSurveyQuestions = (): SurveyQuestion[] => {
        try {
            const rc = lesson?.richContent;
            if (Array.isArray(rc)) return rc as SurveyQuestion[];
            if (typeof rc === 'string') {
                const parsed = JSON.parse(rc);
                if (Array.isArray(parsed)) return parsed as SurveyQuestion[];
            }
        } catch {}
        return [];
    };
    const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>(parseSurveyQuestions);

    const addSurveyQuestion = (type: SurveyQuestion['type']) => {
        setSurveyQuestions(prev => [
            ...prev,
            { id: Math.random().toString(36).slice(2), label: '', type, required: false, options: type === 'choice' ? ['', ''] : [] },
        ]);
    };
    const updateSurveyQuestion = (id: string, patch: Partial<SurveyQuestion>) => {
        setSurveyQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
    };
    const removeSurveyQuestion = (id: string) => {
        setSurveyQuestions(prev => prev.filter(q => q.id !== id));
    };
    const moveSurveyQuestion = (id: string, dir: -1 | 1) => {
        setSurveyQuestions(prev => {
            const i = prev.findIndex(q => q.id === id);
            if (i < 0) return prev;
            const next = [...prev];
            const target = i + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[i], next[target]] = [next[target], next[i]];
            return next;
        });
    };

    // ── Ensure lesson exists before uploading ────────────────────────────────
    const ensureLessonId = useCallback(async (): Promise<number | null> => {
        if (savedLessonId) return savedLessonId;
        const t = title.trim() || (blockType === 'LINK_BLOCK' ? linkLabel.trim() : '');
        if (!t) { toast.error('Enter a title first'); return null; }
        try {
            const created = await api.post(`/courses/${courseId}/lessons`, {
                title: t,
                type: blockType,
                sectionId: sectionId ?? undefined,
            });
            const id = created.id ?? created.lesson?.id;
            setSavedLessonId(id);
            return id;
        } catch {
            toast.error('Failed to create block');
            return null;
        }
    }, [savedLessonId, title, linkLabel, blockType, courseId, sectionId]);

    // ── Load attachments for edit ────────────────────────────────────────────
    useEffect(() => {
        if (!savedLessonId || attachmentsLoaded) return;
        api.get(`/courses/${courseId}/lessons/${savedLessonId}/attachments`)
            .then(d => setAttachments(d.attachments ?? d ?? []))
            .catch(() => {})
            .finally(() => setAttachmentsLoaded(true));
    }, [savedLessonId, courseId, attachmentsLoaded]);

    // ── Poll video status ────────────────────────────────────────────────────
    useEffect(() => {
        if (videoState.phase !== 'processing' || !savedLessonId) return;
        const interval = setInterval(async () => {
            try {
                const data = await api.get(`/courses/${courseId}/lessons/${savedLessonId}`);
                const ls = data.lesson ?? data;
                if (ls.videoStatus === 'READY' && ls.videoUrl) {
                    setVideoState({ phase: 'ready', streamUrl: ls.videoUrl, thumbnailUrl: ls.thumbnailUrl });
                    clearInterval(interval);
                } else if (ls.videoStatus === 'FAILED') {
                    setVideoState({ phase: 'failed', message: 'Video processing failed.' });
                    clearInterval(interval);
                }
            } catch {}
        }, 5000);
        return () => clearInterval(interval);
    }, [videoState.phase, savedLessonId, courseId]);

    // ── Video upload ─────────────────────────────────────────────────────────
    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const videoFile = e.target.files?.[0];
        if (!videoFile) return;
        const lessonId = await ensureLessonId();
        if (!lessonId) return;

        setVideoState({ phase: 'uploading', progress: 'Getting auth token...' });
        try {
            const { token } = await api.get('/videos/token');
            setVideoState({ phase: 'uploading', progress: `Uploading ${(videoFile.size / 1_000_000).toFixed(1)} MB...` });
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('autoProcess', 'true');
            const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000'}/api/webhooks/video`;
            formData.append('callbackUrl', callbackUrl);
            const uploadRes = await fetch(`${VIDEO_SERVICE_URL}/videos/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!uploadRes.ok) throw new Error(await uploadRes.text());
            const { videoId } = await uploadRes.json();
            await api.patch(`/courses/${courseId}/lessons/${lessonId}`, { videoId, videoStatus: 'PROCESSING' });
            setVideoState({ phase: 'processing' });
            toast.success('Video uploaded! Processing will take a few minutes.');
        } catch (err: any) {
            setVideoState({ phase: 'failed', message: err.message ?? 'Upload failed' });
            toast.error('Video upload failed');
        }
    };

    // ── Generic file upload (PDF, IMAGE, AUDIO) ──────────────────────────────
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const lessonId = await ensureLessonId();
        if (!lessonId) return;

        setFileUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('label', file.name);
                const data = await api.post(`/courses/${courseId}/lessons/${lessonId}/attachments`, fd);
                setAttachments(prev => [...prev, data.attachment ?? data]);
            }
            toast.success('File uploaded');
        } catch { toast.error('File upload failed'); }
        finally {
            setFileUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Add link attachment ──────────────────────────────────────────────────
    const handleAddLink = async () => {
        if (!newLinkUrl.trim()) return;
        const lessonId = await ensureLessonId();
        if (!lessonId) return;
        setLinkAdding(true);
        try {
            const data = await api.post(`/courses/${courseId}/lessons/${lessonId}/attachments`, {
                type: 'LINK',
                label: newLinkLabel.trim() || newLinkUrl,
                externalUrl: newLinkUrl,
            });
            setAttachments(prev => [...prev, data.attachment ?? data]);
            setNewLinkUrl('');
            setNewLinkLabel('');
            toast.success('Link added');
        } catch { toast.error('Failed to add link'); }
        finally { setLinkAdding(false); }
    };

    const handleDeleteAttachment = async (id: number) => {
        if (!savedLessonId || !confirm('Delete this attachment?')) return;
        try {
            await api.delete(`/courses/${courseId}/lessons/${savedLessonId}/attachments/${id}`);
            setAttachments(prev => prev.filter(a => a.id !== id));
        } catch { toast.error('Failed to delete'); }
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        // Derive effective title
        const effectiveTitle =
            blockType === 'LINK_BLOCK' ? (linkLabel.trim() || linkUrl) :
            blockType === 'IFRAME'     ? (title.trim() || iframeUrl) :
            title.trim();

        if (!effectiveTitle) { toast.error('Title is required'); return; }
        setSaving(true);
        try {
            const lessonId = await ensureLessonId();
            if (!lessonId) { setSaving(false); return; }

            const patch: Record<string, unknown> = {
                title: effectiveTitle,
                description: description || null,
            };

            if (blockType === 'VIDEO') {
                patch.allowDownload = allowDownload;
                patch.timestamps = timestamps.length > 0 ? timestamps : null;
            }
            if (blockType === 'ARTICLE') {
                patch.richContent = articleContent || null;
            }
            if (blockType === 'ASSIGNMENT') {
                const items = checklistItems.map(s => s.trim()).filter(Boolean);
                patch.richContent = items.length > 0 ? items : null;
            }
            if (blockType === 'LINK_BLOCK') {
                patch.description = linkUrl || null;
            }
            if (blockType === 'IFRAME') {
                patch.iframeUrl = iframeUrl || null;
            }
            if (blockType === 'QUIZ_BLOCK') {
                patch.quizBlockId = selectedQuizId;
            }
            if (blockType === 'SURVEY' || blockType === 'FEEDBACK_GATE') {
                const qs = surveyQuestions.filter(q => q.label.trim());
                patch.richContent = qs.length > 0 ? qs : null;
            }

            await api.patch(`/courses/${courseId}/lessons/${lessonId}`, patch);
            toast.success(isEdit ? 'Block updated' : 'Block created');
            onSave({ id: lessonId, title: effectiveTitle, type: blockType, sectionId });
        } catch { toast.error('Failed to save block'); }
        finally { setSaving(false); }
    };

    // ── File accept attributes ────────────────────────────────────────────────
    const fileAccept =
        blockType === 'PDF'   ? '.pdf' :
        blockType === 'IMAGE' ? 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml' :
        blockType === 'AUDIO' ? 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac' :
        '*/*';

    const fileHint =
        blockType === 'PDF'   ? 'PDF document' :
        blockType === 'IMAGE' ? 'JPEG, PNG, WebP, GIF' :
        blockType === 'AUDIO' ? 'MP3, WAV, OGG, AAC' :
        'File';

    const primaryFile = attachments.find(a => a.type === 'FILE');
    const linkAttachments = attachments.filter(a => a.type === 'LINK');

    // ── Can save? ─────────────────────────────────────────────────────────────
    const canSave =
        blockType === 'VIDEO'         ? videoState.phase !== 'uploading' :
        blockType === 'QUIZ_BLOCK'    ? !!selectedQuizId :
        blockType === 'LINK_BLOCK'    ? !!linkUrl.trim() :
        blockType === 'IFRAME'        ? !!iframeUrl.trim() :
        !!title.trim();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
                    <div className={cn('p-2 rounded-lg bg-primary/10', meta.color)}>
                        <Icon className="size-4" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-semibold">
                            {isEdit ? `Edit ${meta.label}` : `Add ${meta.label}`}
                        </h2>
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="flex flex-col gap-5">

                        {/* Title — most block types need it */}
                        {blockType !== 'LINK_BLOCK' && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium">
                                    Title <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder={`${meta.label} title`}
                                />
                            </div>
                        )}

                        <hr />

                        {/* ── VIDEO ────────────────────────────────────────────── */}
                        {blockType === 'VIDEO' && (
                            <>
                                <div>
                                    <SectionHeader icon={Video} title="Video" open={videoOpen} onToggle={() => setVideoOpen(o => !o)} />
                                    {videoOpen && (
                                        <div className="flex flex-col gap-4 pl-6 pt-1">
                                            {videoState.phase === 'idle' && (
                                                <div
                                                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors"
                                                    onClick={() => videoFileRef.current?.click()}
                                                >
                                                    <Upload className="size-7 text-muted-foreground/40" />
                                                    <p className="text-sm font-medium">Upload Video</p>
                                                    <p className="text-xs text-muted-foreground">MP4, MOV, WebM, MKV</p>
                                                    <input ref={videoFileRef} aria-label="Upload video file" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska" className="hidden" onChange={handleVideoUpload} />
                                                </div>
                                            )}
                                            {videoState.phase === 'uploading' && (
                                                <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-5">
                                                    <Loader2 className="size-7 text-primary animate-spin" />
                                                    <p className="text-sm font-medium">{videoState.progress}</p>
                                                </div>
                                            )}
                                            {videoState.phase === 'processing' && (
                                                <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-5">
                                                    <Loader2 className="size-7 text-amber-500 animate-spin" />
                                                    <p className="text-sm font-medium">Processing video...</p>
                                                    <p className="text-xs text-muted-foreground">Transcoding to HLS. This may take a few minutes.</p>
                                                </div>
                                            )}
                                            {videoState.phase === 'ready' && (
                                                <>
                                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                                        <CheckCircle className="size-4" /> Video ready
                                                    </div>
                                                    <VideoPlayer ref={videoPlayerRef} src={videoState.streamUrl} poster={videoState.thumbnailUrl} timestamps={timestamps} />
                                                    <button
                                                        type="button"
                                                        className="text-xs text-muted-foreground hover:text-foreground underline self-start"
                                                        onClick={() => { setVideoState({ phase: 'idle' }); if (videoFileRef.current) videoFileRef.current.value = ''; }}
                                                    >
                                                        Replace video
                                                    </button>
                                                </>
                                            )}
                                            {videoState.phase === 'failed' && (
                                                <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                                                    <div className="flex items-center gap-2 text-sm text-destructive">
                                                        <AlertCircle className="size-4" /> {videoState.message}
                                                    </div>
                                                    <Button type="button" variant="outline" size="sm"
                                                        onClick={() => { setVideoState({ phase: 'idle' }); if (videoFileRef.current) videoFileRef.current.value = ''; }}>
                                                        Try Again
                                                    </Button>
                                                </div>
                                            )}
                                            {(videoState.phase === 'ready' || videoState.phase === 'processing') && (
                                                <TimestampEditor
                                                    timestamps={timestamps}
                                                    onChange={setTimestamps}
                                                    videoDuration={lesson?.duration}
                                                    onSeek={time => videoPlayerRef.current?.seekTo(time)}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                                <hr />
                                <div>
                                    <SectionHeader icon={FileUp} title="Description / Notes" open={descOpen} onToggle={() => setDescOpen(o => !o)} />
                                    {descOpen && (
                                        <div className="pl-6 pt-1">
                                            <RichTextEditor content={description} onChange={setDescription} placeholder="Describe what learners will find in this lesson..." />
                                        </div>
                                    )}
                                </div>
                                <hr />
                                <div className="flex items-center gap-3">
                                    <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                                    <span className="text-sm">Allow learners to download files</span>
                                </div>
                            </>
                        )}

                        {/* ── ARTICLE ──────────────────────────────────────────── */}
                        {blockType === 'ARTICLE' && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium">Article Content</label>
                                <RichTextEditor
                                    content={articleContent}
                                    onChange={setArticleContent}
                                    placeholder="Write the article content here..."
                                />
                            </div>
                        )}

                        {/* ── PDF / IMAGE / AUDIO — file upload ─────────────────── */}
                        {(blockType === 'PDF' || blockType === 'IMAGE' || blockType === 'AUDIO') && (
                            <div className="flex flex-col gap-3">
                                {primaryFile ? (
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/20">
                                        {blockType === 'IMAGE'
                                            ? <img src={primaryFile.filePath!} alt={primaryFile.label} className="size-12 object-cover rounded-lg border" />
                                            : <FileText className="size-8 text-muted-foreground shrink-0" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{primaryFile.label}</p>
                                            <a href={primaryFile.filePath!} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                                Preview
                                            </a>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteAttachment(primaryFile.id)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="size-7 text-muted-foreground/40" />
                                        <p className="text-sm font-medium">Upload {meta.label}</p>
                                        <p className="text-xs text-muted-foreground">{fileHint}</p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    aria-label={`Upload ${meta.label} file`}
                                    type="file"
                                    accept={fileAccept}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={fileUploading}
                                />
                                {fileUploading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="size-4 animate-spin" /> Uploading...
                                    </div>
                                )}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Description (optional)</label>
                                    <RichTextEditor content={description} onChange={setDescription} placeholder="Describe this file..." />
                                </div>
                            </div>
                        )}

                        {/* ── LINK_BLOCK ──────────────────────────────────────── */}
                        {blockType === 'LINK_BLOCK' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Label / Title <span className="text-destructive">*</span></label>
                                    <Input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="e.g. MDN Documentation" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">URL <span className="text-destructive">*</span></label>
                                    <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." type="url" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Description (optional)</label>
                                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What will learners find here?" />
                                </div>
                            </div>
                        )}

                        {/* ── IFRAME ──────────────────────────────────────────── */}
                        {blockType === 'IFRAME' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Embed URL <span className="text-destructive">*</span></label>
                                    <Input
                                        value={iframeUrl}
                                        onChange={e => setIframeUrl(e.target.value)}
                                        onPaste={e => {
                                            const pasted = e.clipboardData.getData('text');
                                            // If the user pastes a full <iframe> tag, extract the src
                                            const match = pasted.match(/<iframe[\s\S]*?\bsrc=["']([^"']+)["']/i);
                                            if (match) {
                                                e.preventDefault();
                                                setIframeUrl(match[1]);
                                            }
                                        }}
                                        placeholder="https://... or paste an <iframe> embed code"
                                    />
                                    <p className="text-xs text-muted-foreground">Paste a URL or the full embed code — the src will be extracted automatically.</p>
                                </div>
                                {iframeUrl && (
                                    <div className="rounded-xl overflow-hidden border aspect-video bg-muted">
                                        <iframe src={iframeUrl} className="w-full h-full" allow="fullscreen" title="Preview" />
                                    </div>
                                )}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Description (optional)</label>
                                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this embed contain?" />
                                </div>
                            </div>
                        )}

                        {/* ── QUIZ_BLOCK ──────────────────────────────────────── */}
                        {blockType === 'QUIZ_BLOCK' && (
                            <div className="flex flex-col gap-3">
                                <label className="text-sm font-medium">Select Quiz <span className="text-destructive">*</span></label>
                                {quizzes.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-muted-foreground/30 p-5 text-center text-sm text-muted-foreground">
                                        No quizzes found. Create a quiz in the Quiz tab first.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {quizzes.map(q => (
                                            <button
                                                key={q.id}
                                                type="button"
                                                onClick={() => setSelectedQuizId(q.id)}
                                                className={cn(
                                                    'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors',
                                                    selectedQuizId === q.id
                                                        ? 'border-primary bg-primary/5 text-primary font-medium'
                                                        : 'border-border hover:border-primary/40 hover:bg-muted/30',
                                                )}
                                            >
                                                <ClipboardList className="size-4 shrink-0" />
                                                {q.title}
                                                {selectedQuizId === q.id && <CheckCircle className="size-4 ml-auto text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── ASSIGNMENT ──────────────────────────────────────── */}
                        {blockType === 'ASSIGNMENT' && (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Checklist Items</label>
                                    <p className="text-xs text-muted-foreground">Each item is a task the learner must complete. Press Enter to add the next item.</p>
                                </div>
                                <ol className="flex flex-col gap-2">
                                    {checklistItems.map((item, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                                            <Input
                                                value={item}
                                                onChange={e => setChecklistItems(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') { e.preventDefault(); setChecklistItems(prev => [...prev.slice(0, idx + 1), '', ...prev.slice(idx + 1)]); }
                                                    if (e.key === 'Backspace' && item === '' && checklistItems.length > 1) { e.preventDefault(); setChecklistItems(prev => prev.filter((_, i) => i !== idx)); }
                                                }}
                                                placeholder={`Task ${idx + 1}`}
                                                className="h-8 text-sm flex-1"
                                            />
                                            {checklistItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    aria-label={`Remove task ${idx + 1}`}
                                                    onClick={() => setChecklistItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="self-start"
                                    onClick={() => setChecklistItems(prev => [...prev, ''])}
                                >
                                    <Plus className="size-3.5 mr-1.5" /> Add Item
                                </Button>
                                <div className="flex flex-col gap-1.5 mt-2">
                                    <label className="text-sm font-medium">Instructions (optional)</label>
                                    <Input
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Describe the overall assignment goal..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── SURVEY / FEEDBACK_GATE ─────────────────────────── */}
                        {(blockType === 'SURVEY' || blockType === 'FEEDBACK_GATE') && (
                            <div className="flex flex-col gap-4">
                                {/* Description */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Instructions (optional)</label>
                                    <Input
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder={blockType === 'SURVEY'
                                            ? 'e.g. Please take a moment to share your feedback...'
                                            : 'e.g. Answer these questions to continue to the next section...'}
                                    />
                                </div>

                                {blockType === 'FEEDBACK_GATE' && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-900 text-xs text-fuchsia-700 dark:text-fuchsia-300">
                                        <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
                                        <span>Learners must complete all required questions to continue to the next lesson.</span>
                                    </div>
                                )}

                                {/* Question list */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">
                                            Questions
                                            {surveyQuestions.length > 0 && (
                                                <Badge variant="neutral" className="ml-2 text-[10px]">{surveyQuestions.length}</Badge>
                                            )}
                                        </span>
                                    </div>

                                    {surveyQuestions.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-muted-foreground/25 p-6 text-center">
                                            <p className="text-sm text-muted-foreground">No questions yet. Add one below.</p>
                                        </div>
                                    )}

                                    {surveyQuestions.map((q, qi) => (
                                        <div key={q.id} className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3">
                                            {/* Question header */}
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0" />
                                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                                                    Q{qi + 1} · {q.type === 'text' ? 'Text' : q.type === 'star' ? 'Star Rating' : 'Multiple Choice'}
                                                </span>
                                                <button type="button" aria-label="Move question up" onClick={() => moveSurveyQuestion(q.id, -1)} disabled={qi === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                                    <ArrowUp className="size-3.5" />
                                                </button>
                                                <button type="button" aria-label="Move question down" onClick={() => moveSurveyQuestion(q.id, 1)} disabled={qi === surveyQuestions.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                                    <ArrowDown className="size-3.5" />
                                                </button>
                                                <button type="button" aria-label="Remove question" onClick={() => removeSurveyQuestion(q.id)} className="text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>

                                            {/* Question label */}
                                            <Input
                                                value={q.label}
                                                onChange={e => updateSurveyQuestion(q.id, { label: e.target.value })}
                                                placeholder="Question text..."
                                                className="h-8 text-sm"
                                            />

                                            {/* Star preview */}
                                            {q.type === 'star' && (
                                                <div className="flex items-center gap-1 pl-1">
                                                    {[1,2,3,4,5].map(s => (
                                                        <Star key={s} className="size-4 text-amber-400 fill-amber-400" />
                                                    ))}
                                                    <span className="text-xs text-muted-foreground ml-1">1–5 star rating</span>
                                                </div>
                                            )}

                                            {/* Choice options */}
                                            {q.type === 'choice' && (
                                                <div className="flex flex-col gap-1.5 pl-1">
                                                    {q.options.map((opt, oi) => (
                                                        <div key={oi} className="flex items-center gap-2">
                                                            <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                                            <Input
                                                                value={opt}
                                                                onChange={e => {
                                                                    const opts = [...q.options];
                                                                    opts[oi] = e.target.value;
                                                                    updateSurveyQuestion(q.id, { options: opts });
                                                                }}
                                                                placeholder={`Option ${oi + 1}`}
                                                                className="h-7 text-sm flex-1"
                                                            />
                                                            {q.options.length > 2 && (
                                                                <button type="button" aria-label={`Remove option ${oi + 1}`} onClick={() => {
                                                                    const opts = q.options.filter((_, i) => i !== oi);
                                                                    updateSurveyQuestion(q.id, { options: opts });
                                                                }} className="text-muted-foreground hover:text-destructive shrink-0">
                                                                    <X className="size-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSurveyQuestion(q.id, { options: [...q.options, ''] })}
                                                        className="text-xs text-primary hover:underline self-start flex items-center gap-1 mt-0.5"
                                                    >
                                                        <Plus className="size-3" /> Add option
                                                    </button>
                                                </div>
                                            )}

                                            {/* Required toggle */}
                                            <label className="flex items-center gap-2 cursor-pointer self-start">
                                                <Switch
                                                    checked={q.required}
                                                    onCheckedChange={v => updateSurveyQuestion(q.id, { required: v })}
                                                />
                                                <span className="text-xs text-muted-foreground">Required</span>
                                            </label>
                                        </div>
                                    ))}

                                    {/* Add question buttons */}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => addSurveyQuestion('text')}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/40 hover:border-primary hover:text-primary transition-colors"
                                        >
                                            <AlignLeft className="size-3.5" /> Text Answer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addSurveyQuestion('star')}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/40 hover:border-amber-500 hover:text-amber-600 transition-colors"
                                        >
                                            <Star className="size-3.5" /> Star Rating
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addSurveyQuestion('choice')}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/40 hover:border-primary hover:text-primary transition-colors"
                                        >
                                            <List className="size-3.5" /> Multiple Choice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Shared external links section (non-link-block types) ── */}
                        {blockType !== 'LINK_BLOCK' && blockType !== 'IFRAME' && blockType !== 'QUIZ_BLOCK' && (
                            <>
                                <hr />
                                <div>
                                    <SectionHeader
                                        icon={Link2}
                                        title="External Links"
                                        count={linkAttachments.length}
                                        open={linksOpen}
                                        onToggle={() => setLinksOpen(o => !o)}
                                    />
                                    {linksOpen && (
                                        <div className="flex flex-col gap-3 pl-6 pt-1">
                                            {linkAttachments.length > 0 && (
                                                <ul className="flex flex-col gap-2">
                                                    {linkAttachments.map(a => (
                                                        <li key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/20 text-sm">
                                                            <Link2 className="size-4 text-muted-foreground shrink-0" />
                                                            <span className="flex-1 truncate">{a.label}</span>
                                                            <a href={a.externalUrl!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs shrink-0">Open</a>
                                                            <button type="button" aria-label={`Delete ${a.label}`} onClick={() => handleDeleteAttachment(a.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="flex flex-col gap-2 border rounded-lg p-3">
                                                <Input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} placeholder="Label (optional)" className="h-8 text-sm" />
                                                <div className="flex gap-2">
                                                    <Input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." type="url" className="h-8 text-sm" />
                                                    <Button type="button" variant="outline" size="sm" onClick={handleAddLink} disabled={linkAdding || !newLinkUrl.trim()} className="shrink-0 h-8">
                                                        {linkAdding ? <Loader2 className="size-3 animate-spin" /> : 'Add'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={saving || !canSave}>
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : `Create ${meta.label}`}
                    </Button>
                </div>

            </div>
        </div>
    );
}
