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
    X, Link, FileArrowUp, Trash, FileText, Image as ImageIcon, Video,
    CircleNotch, CheckCircle, Warning, Upload, CaretDown, CaretRight,
    Plus, Eye, FileArrowDown,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Attachment } from '@/types';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i;
const isImageFile = (url: string) => IMAGE_EXT.test(url);

type VideoUploadState =
    | { phase: 'idle' }
    | { phase: 'uploading'; progress: string }
    | { phase: 'processing' }
    | { phase: 'ready'; streamUrl: string; thumbnailUrl?: string }
    | { phase: 'failed'; message: string };

interface LessonEditorModalProps {
    courseId: number | string;
    lesson?: any;
    onSave: (lesson: any) => void;
    onClose: () => void;
}

const VIDEO_SERVICE_URL =
    process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL ?? 'http://localhost:4001/api';

function SectionHeader({
    icon: Icon,
    title,
    count,
    open,
    onToggle,
}: {
    icon: React.ElementType;
    title: string;
    count?: number;
    open: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center gap-2 py-2.5 text-sm font-normal hover:text-primary transition-colors"
        >
            {open ? <CaretDown className="size-4 text-muted-foreground" /> : <CaretRight className="size-4 text-muted-foreground" />}
            <Icon className="size-4" />
            {title}
            {count !== undefined && count > 0 && (
                <Badge variant="neutral" className="ml-auto text-[10px]">{count}</Badge>
            )}
        </button>
    );
}

export function LessonEditorModal({ courseId, lesson, onSave, onClose }: LessonEditorModalProps) {
    const isEdit = !!lesson;

    const [title, setTitle] = useState(lesson?.title ?? '');
    const [allowDownload, setAllowDownload] = useState(lesson?.allowDownload ?? false);
    const [timestamps, setTimestamps] = useState<Timestamp[]>(lesson?.timestamps ?? []);
    const [description, setDescription] = useState(lesson?.content ?? lesson?.description ?? '');

    const [savedLessonId, setSavedLessonId] = useState<number | null>(lesson?.id ?? null);
    const [saving, setSaving] = useState(false);

    // Section visibility
    const [videoOpen, setVideoOpen] = useState(true);
    const [docsOpen, setDocsOpen] = useState(true);
    const [imagesOpen, setImagesOpen] = useState(true);
    const [descOpen, setDescOpen] = useState(true);
    const [linksOpen, setLinksOpen] = useState(false);

    // Video state
    const [videoState, setVideoState] = useState<VideoUploadState>(() => {
        if (lesson?.videoStatus === 'READY' && lesson?.videoUrl) {
            return { phase: 'ready', streamUrl: lesson.videoUrl, thumbnailUrl: lesson.thumbnailUrl };
        }
        if (lesson?.videoStatus === 'PROCESSING') return { phase: 'processing' };
        if (lesson?.videoStatus === 'FAILED') return { phase: 'failed', message: 'Video processing failed. Try uploading again.' };
        return { phase: 'idle' };
    });
    const videoFileRef = useRef<HTMLInputElement>(null);
    const videoPlayerRef = useRef<{ seekTo: (time: number) => void }>(null);

    // Attachments (docs, images, links -- all from the same API)
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
    const [docUploading, setDocUploading] = useState(false);
    const [imgUploading, setImgUploading] = useState(false);
    const docInputRef = useRef<HTMLInputElement>(null);
    const imgInputRef = useRef<HTMLInputElement>(null);

    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkLabel, setNewLinkLabel] = useState('');
    const [linkAdding, setLinkAdding] = useState(false);

    const docAttachments = attachments.filter(a => a.type === 'FILE' && a.filePath && !isImageFile(a.filePath));
    const imgAttachments = attachments.filter(a => a.type === 'FILE' && a.filePath && isImageFile(a.filePath));
    const linkAttachments = attachments.filter(a => a.type === 'LINK');

    const ensureLessonId = useCallback(async (): Promise<number | null> => {
        if (savedLessonId) return savedLessonId;
        if (!title.trim()) { toast.error('Enter a title first'); return null; }
        try {
            const created = await api.post(`/courses/${courseId}/lessons`, { title });
            const id = created.id ?? created.lesson?.id;
            setSavedLessonId(id);
            return id;
        } catch {
            toast.error('Failed to create lesson');
            return null;
        }
    }, [savedLessonId, title, courseId]);

    // Load attachments on open
    useEffect(() => {
        if (!savedLessonId || attachmentsLoaded) return;
        api.get(`/courses/${courseId}/lessons/${savedLessonId}/attachments`)
            .then(data => setAttachments(data.attachments ?? data ?? []))
            .catch(() => {})
            .finally(() => setAttachmentsLoaded(true));
    }, [savedLessonId, courseId, attachmentsLoaded]);

    // Poll video status
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

    // ── Video upload ──────────────────────────────────────────────────────────
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

    // ── Document upload ───────────────────────────────────────────────────────
    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        const lessonId = await ensureLessonId();
        if (!lessonId) return;

        setDocUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('label', file.name);
                const data = await api.post(`/courses/${courseId}/lessons/${lessonId}/attachments`, fd);
                setAttachments(prev => [...prev, data.attachment ?? data]);
            }
            toast.success('Document(s) uploaded');
        } catch { toast.error('Document upload failed'); }
        finally {
            setDocUploading(false);
            if (docInputRef.current) docInputRef.current.value = '';
        }
    };

    // ── Image upload ──────────────────────────────────────────────────────────
    const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        const lessonId = await ensureLessonId();
        if (!lessonId) return;

        setImgUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('label', file.name);
                const data = await api.post(`/courses/${courseId}/lessons/${lessonId}/attachments`, fd);
                setAttachments(prev => [...prev, data.attachment ?? data]);
            }
            toast.success('Image(s) uploaded');
        } catch { toast.error('Image upload failed'); }
        finally {
            setImgUploading(false);
            if (imgInputRef.current) imgInputRef.current.value = '';
        }
    };

    // ── Add link ──────────────────────────────────────────────────────────────
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

    // ── Delete attachment ─────────────────────────────────────────────────────
    const handleDeleteAttachment = async (id: number) => {
        if (!savedLessonId || !confirm('Delete this attachment?')) return;
        try {
            await api.delete(`/courses/${courseId}/lessons/${savedLessonId}/attachments/${id}`);
            setAttachments(prev => prev.filter(a => a.id !== id));
            toast.success('Deleted');
        } catch { toast.error('Failed to delete'); }
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!title.trim()) { toast.error('Title is required'); return; }
        setSaving(true);
        try {
            const lessonId = await ensureLessonId();
            if (!lessonId) { setSaving(false); return; }

            await api.patch(`/courses/${courseId}/lessons/${lessonId}`, {
                title,
                description: description || null,
                allowDownload,
                timestamps: timestamps.length > 0 ? timestamps : null,
            });

            toast.success(isEdit ? 'Lesson updated' : 'Lesson created');
            onSave({ id: lessonId, title });
        } catch { toast.error('Failed to save lesson'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <h2 className="text-lg ">{isEdit ? 'Edit Lesson' : 'Add Lesson'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="flex flex-col gap-6">

                        {/* ── Title ─────────────────────────────────────────────── */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Lesson title" />
                        </div>

                        <hr />

                        {/* ── 1. Video Section ──────────────────────────────────── */}
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
                                            <CircleNotch className="size-7 text-primary animate-spin" />
                                            <p className="text-sm font-medium">{videoState.progress}</p>
                                        </div>
                                    )}
                                    {videoState.phase === 'processing' && (
                                        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-5">
                                            <CircleNotch className="size-7 text-amber-500 animate-spin" />
                                            <p className="text-sm font-medium">Processing video...</p>
                                            <p className="text-xs text-muted-foreground">Transcoding to HLS. This may take a few minutes.</p>
                                        </div>
                                    )}
                                    {videoState.phase === 'ready' && (
                                        <>
                                            <div className="flex items-center gap-2 text-sm text-primary">
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
                                                <Warning className="size-4" /> {videoState.message}
                                            </div>
                                            <Button type="button" variant="outline" size="sm"
                                                onClick={() => { setVideoState({ phase: 'idle' }); if (videoFileRef.current) videoFileRef.current.value = ''; }}>
                                                Try Again
                                            </Button>
                                        </div>
                                    )}

                                    {/* Timestamps -- show when video is ready or processing */}
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

                        {/* ── 2. Documents Section ──────────────────────────────── */}
                        <div>
                            <SectionHeader icon={FileText} title="Documents" count={docAttachments.length} open={docsOpen} onToggle={() => setDocsOpen(o => !o)} />
                            {docsOpen && (
                                <div className="flex flex-col gap-3 pl-6 pt-1">
                                    {docAttachments.length > 0 && (
                                        <ul className="flex flex-col gap-2">
                                            {docAttachments.map(a => (
                                                <li key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/20 text-sm">
                                                    <FileText className="size-4 text-muted-foreground shrink-0" />
                                                    <span className="flex-1 truncate">{a.label}</span>
                                                    <a href={a.filePath!} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${a.label}`} className="text-primary hover:underline shrink-0">
                                                        <Eye className="size-4" />
                                                    </a>
                                                    <button onClick={() => handleDeleteAttachment(a.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                                        <Trash className="size-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => docInputRef.current?.click()} disabled={docUploading}>
                                            {docUploading ? <CircleNotch className="size-3 mr-1 animate-spin" /> : <Plus className="size-3 mr-1" />}
                                            Upload Document
                                        </Button>
                                        <span className="text-xs text-muted-foreground">PDF, DOCX, PPTX, etc.</span>
                                        <input ref={docInputRef} aria-label="Upload document files" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip" className="hidden" onChange={handleDocUpload} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr />

                        {/* ── 3. Images Section ─────────────────────────────────── */}
                        <div>
                            <SectionHeader icon={ImageIcon} title="Images" count={imgAttachments.length} open={imagesOpen} onToggle={() => setImagesOpen(o => !o)} />
                            {imagesOpen && (
                                <div className="flex flex-col gap-3 pl-6 pt-1">
                                    {imgAttachments.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {imgAttachments.map(a => (
                                                <div key={a.id} className="relative group rounded-lg overflow-hidden border aspect-4/3 bg-muted">
                                                    <img src={a.filePath!} alt={a.label} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                        <a href={a.filePath!} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${a.label}`} className="p-1.5 rounded-full bg-white/90 text-black hover:bg-white">
                                                            <Eye className="size-3.5" />
                                                        </a>
                                                        <button onClick={() => handleDeleteAttachment(a.id)} className="p-1.5 rounded-full bg-white/90 text-destructive hover:bg-white">
                                                            <Trash className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => imgInputRef.current?.click()} disabled={imgUploading}>
                                            {imgUploading ? <CircleNotch className="size-3 mr-1 animate-spin" /> : <Plus className="size-3 mr-1" />}
                                            Upload Image
                                        </Button>
                                        <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF</span>
                                        <input ref={imgInputRef} aria-label="Upload image files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={handleImgUpload} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr />

                        {/* ── 4. Description (Tiptap) ───────────────────────────── */}
                        <div>
                            <SectionHeader icon={FileArrowUp} title="Description / Notes" open={descOpen} onToggle={() => setDescOpen(o => !o)} />
                            {descOpen && (
                                <div className="pl-6 pt-1">
                                    <RichTextEditor
                                        content={description}
                                        onChange={setDescription}
                                        placeholder="Describe what learners will find in this lesson..."
                                    />
                                </div>
                            )}
                        </div>

                        <hr />

                        {/* ── 5. Links Section ──────────────────────────────────── */}
                        <div>
                            <SectionHeader icon={Link} title="External Links" count={linkAttachments.length} open={linksOpen} onToggle={() => setLinksOpen(o => !o)} />
                            {linksOpen && (
                                <div className="flex flex-col gap-3 pl-6 pt-1">
                                    {linkAttachments.length > 0 && (
                                        <ul className="flex flex-col gap-2">
                                            {linkAttachments.map(a => (
                                                <li key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/20 text-sm">
                                                    <Link className="size-4 text-muted-foreground shrink-0" />
                                                    <span className="flex-1 truncate">{a.label}</span>
                                                    <a href={a.externalUrl!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs shrink-0">Open</a>
                                                    <button onClick={() => handleDeleteAttachment(a.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                                        <Trash className="size-4" />
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
                                                {linkAdding ? <CircleNotch className="size-3 animate-spin" /> : 'Add'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr />

                        {/* ── Settings ───────────────────────────────────────────── */}
                        <div className="flex items-center gap-3">
                            <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                            <span className="text-sm">Allow learners to download files</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={saving || !title.trim() || videoState.phase === 'uploading'}>
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lesson'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
