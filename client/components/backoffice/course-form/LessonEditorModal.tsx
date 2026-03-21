'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import {
    X, Link2, FileUp, Trash2, FileText, Image as ImageIcon, Video,
    Loader2, CheckCircle, AlertCircle, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { LessonType, Attachment } from '@/types';

type ModalTab = 'content' | 'description' | 'attachments';

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

export function LessonEditorModal({ courseId, lesson, onSave, onClose }: LessonEditorModalProps) {
    const isEdit = !!lesson;
    const [activeTab, setActiveTab] = useState<ModalTab>('content');

    // Content tab state
    const [title, setTitle] = useState(lesson?.title ?? '');
    const [type, setType] = useState<LessonType>(lesson?.type ?? 'VIDEO');
    const [durationHH, setDurationHH] = useState(() => {
        if (!lesson?.duration) return '0';
        return String(Math.floor(lesson.duration / 3600));
    });
    const [durationMM, setDurationMM] = useState(() => {
        if (!lesson?.duration) return '0';
        return String(Math.floor((lesson.duration % 3600) / 60));
    });
    const [allowDownload, setAllowDownload] = useState(lesson?.allowDownload ?? false);

    // Track the real lesson ID (may differ from lesson prop when creating a new lesson mid-upload)
    const [savedLessonId, setSavedLessonId] = useState<number | null>(lesson?.id ?? null);

    // Non-video file state
    const [file, setFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(lesson?.filePath ?? null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Video upload state
    const [videoState, setVideoState] = useState<VideoUploadState>(() => {
        if (lesson?.videoStatus === 'READY' && lesson?.videoUrl) {
            return { phase: 'ready', streamUrl: lesson.videoUrl, thumbnailUrl: lesson.thumbnailUrl };
        }
        if (lesson?.videoStatus === 'PROCESSING') {
            return { phase: 'processing' };
        }
        if (lesson?.videoStatus === 'FAILED') {
            return { phase: 'failed', message: 'Video processing failed. Try uploading again.' };
        }
        return { phase: 'idle' };
    });
    const videoFileRef = useRef<HTMLInputElement>(null);

    // Description tab state
    const [description, setDescription] = useState(lesson?.content ?? lesson?.description ?? '');

    // Attachments tab state
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkLabel, setNewLinkLabel] = useState('');
    const [newFileLabel, setNewFileLabel] = useState('');
    const [newFile, setNewFile] = useState<File | null>(null);
    const attachFileInputRef = useRef<HTMLInputElement>(null);
    const [attachUploading, setAttachUploading] = useState(false);

    const [saving, setSaving] = useState(false);

    // Poll for video status when PROCESSING
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
            } catch {
                // ignore polling errors
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [videoState.phase, savedLessonId, courseId]);

    useEffect(() => {
        if (isEdit && lesson?.id && activeTab === 'attachments') {
            fetchAttachments();
        }
    }, [activeTab, isEdit, lesson?.id]);

    const fetchAttachments = async () => {
        setAttachmentsLoading(true);
        try {
            const data = await api.get(`/courses/${courseId}/lessons/${lesson.id}/attachments`);
            setAttachments(data.attachments ?? data ?? []);
        } catch {
            toast.error('Failed to load attachments');
        } finally {
            setAttachmentsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        if (f && type === 'IMAGE') {
            setImagePreview(URL.createObjectURL(f));
        }
    };

    // Upload video directly to the video service
    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const videoFile = e.target.files?.[0];
        if (!videoFile) return;

        // Need a saved lesson ID first
        let lessonId = savedLessonId;
        if (!lessonId) {
            if (!title.trim()) {
                toast.error('Enter a title before uploading a video');
                return;
            }
            try {
                const created = await api.post(`/courses/${courseId}/lessons`, { title, type: 'VIDEO' });
                lessonId = created.id ?? created.lesson?.id;
                setSavedLessonId(lessonId);
            } catch {
                toast.error('Failed to create lesson');
                return;
            }
        }

        setVideoState({ phase: 'uploading', progress: 'Getting auth token...' });

        try {
            // 1. Get a short-lived upload token from our backend
            const { token } = await api.get('/videos/token');

            setVideoState({ phase: 'uploading', progress: `Uploading ${(videoFile.size / 1_000_000).toFixed(1)} MB...` });

            // 2. Upload directly to the video service (bypasses Next.js 4 MB body limit)
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('autoProcess', 'true');
            // Webhook will call back to our monolith which updates the lesson
            const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000'}/api/webhooks/video`;
            formData.append('callbackUrl', callbackUrl);

            const uploadRes = await fetch(`${VIDEO_SERVICE_URL}/videos/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!uploadRes.ok) {
                throw new Error(await uploadRes.text());
            }

            const { videoId } = await uploadRes.json();

            // 3. Save the videoId on the lesson so webhook can find it later
            await api.patch(`/courses/${courseId}/lessons/${lessonId}`, {
                videoId,
                videoStatus: 'PROCESSING',
            });

            setVideoState({ phase: 'processing' });
            toast.success('Video uploaded! Processing will complete in a few minutes.');
        } catch (err: any) {
            setVideoState({ phase: 'failed', message: err.message ?? 'Upload failed' });
            toast.error('Video upload failed');
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            let lessonId = savedLessonId;

            // Create if new (and not already created during video upload)
            if (!lessonId) {
                const created = await api.post(`/courses/${courseId}/lessons`, { title, type });
                lessonId = created.id ?? created.lesson?.id;
                setSavedLessonId(lessonId);
            }

            // Patch fields
            const durationSeconds = type === 'VIDEO'
                ? (parseInt(durationHH, 10) || 0) * 3600 + (parseInt(durationMM, 10) || 0) * 60
                : null;

            await api.patch(`/courses/${courseId}/lessons/${lessonId}`, {
                title,
                type,
                description: description || null,
                ...(type === 'VIDEO' && durationSeconds ? { duration: durationSeconds } : {}),
                ...(type !== 'VIDEO' && { allowDownload }),
            });

            // Upload file for DOCUMENT/IMAGE types
            if (file && (type === 'DOCUMENT' || type === 'IMAGE')) {
                const formData = new FormData();
                formData.append('file', file);
                await api.post(`/courses/${courseId}/lessons/${lessonId}/file`, formData);
            }

            toast.success(isEdit ? 'Lesson updated' : 'Lesson created');
            onSave({ id: lessonId, title, type });
        } catch {
            toast.error('Failed to save lesson');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        if (!confirm('Delete this attachment?')) return;
        try {
            await api.delete(`/courses/${courseId}/lessons/${lesson.id}/attachments/${attachmentId}`);
            setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
            toast.success('Attachment deleted');
        } catch {
            toast.error('Failed to delete attachment');
        }
    };

    const handleAddLink = async () => {
        if (!newLinkUrl.trim()) { toast.error('URL is required'); return; }
        setAttachUploading(true);
        try {
            const data = await api.post(`/courses/${courseId}/lessons/${lesson.id}/attachments`, {
                type: 'LINK',
                label: newLinkLabel.trim() || newLinkUrl,
                externalUrl: newLinkUrl,
            });
            setAttachments((prev) => [...prev, data.attachment ?? data]);
            setNewLinkUrl('');
            setNewLinkLabel('');
            toast.success('Link added');
        } catch { toast.error('Failed to add link'); }
        finally { setAttachUploading(false); }
    };

    const handleAddFile = async () => {
        if (!newFile) { toast.error('Please select a file'); return; }
        setAttachUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', newFile);
            formData.append('label', newFileLabel.trim() || newFile.name);
            const data = await api.post(`/courses/${courseId}/lessons/${lesson.id}/attachments`, formData);
            setAttachments((prev) => [...prev, data.attachment ?? data]);
            setNewFile(null);
            setNewFileLabel('');
            if (attachFileInputRef.current) attachFileInputRef.current.value = '';
            toast.success('File uploaded');
        } catch { toast.error('Failed to upload file'); }
        finally { setAttachUploading(false); }
    };

    const tabs: { key: ModalTab; label: string }[] = [
        { key: 'content', label: 'Content' },
        { key: 'description', label: 'Description' },
        { key: 'attachments', label: 'Attachments' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <h2 className="text-lg font-semibold">{isEdit ? 'Edit Lesson' : 'Add Lesson'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Inner Tabs */}
                <div className="flex border-b shrink-0 px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Content Tab */}
                    {activeTab === 'content' && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Lesson title"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Type</label>
                                <div className="flex gap-2">
                                    {(['VIDEO', 'DOCUMENT', 'IMAGE'] as LessonType[]).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            disabled={isEdit && lesson?.type !== t}
                                            onClick={() => setType(t)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                                type === t
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'border-border hover:bg-muted'
                                            }`}
                                        >
                                            {t === 'VIDEO' && <Video className="size-4" />}
                                            {t === 'DOCUMENT' && <FileText className="size-4" />}
                                            {t === 'IMAGE' && <ImageIcon className="size-4" />}
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* VIDEO type UI */}
                            {type === 'VIDEO' && (
                                <div className="flex flex-col gap-4">
                                    {/* Video upload / status */}
                                    {videoState.phase === 'idle' && (
                                        <div
                                            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 cursor-pointer hover:border-primary/40 transition-colors"
                                            onClick={() => videoFileRef.current?.click()}
                                        >
                                            <Upload className="size-8 text-muted-foreground/40" />
                                            <div className="text-center">
                                                <p className="text-sm font-medium">Upload Video</p>
                                                <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, MKV — up to 5 GB</p>
                                            </div>
                                            <Button type="button" variant="outline" size="sm">
                                                Choose File
                                            </Button>
                                            <input
                                                ref={videoFileRef}
                                                type="file"
                                                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
                                                className="hidden"
                                                onChange={handleVideoUpload}
                                            />
                                        </div>
                                    )}

                                    {videoState.phase === 'uploading' && (
                                        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-6">
                                            <Loader2 className="size-8 text-primary animate-spin" />
                                            <p className="text-sm font-medium">{videoState.progress}</p>
                                            <p className="text-xs text-muted-foreground">Do not close this window</p>
                                        </div>
                                    )}

                                    {videoState.phase === 'processing' && (
                                        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-6">
                                            <Loader2 className="size-8 text-amber-500 animate-spin" />
                                            <p className="text-sm font-medium">Processing video...</p>
                                            <p className="text-xs text-muted-foreground">
                                                Transcoding to HLS (360p – 1080p). This may take a few minutes.
                                                You can close this and come back.
                                            </p>
                                        </div>
                                    )}

                                    {videoState.phase === 'ready' && (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 text-sm text-green-600">
                                                <CheckCircle className="size-4" />
                                                Video ready
                                            </div>
                                            <VideoPlayer src={videoState.streamUrl} poster={videoState.thumbnailUrl} />
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground hover:text-foreground underline self-start"
                                                onClick={() => {
                                                    setVideoState({ phase: 'idle' });
                                                    if (videoFileRef.current) videoFileRef.current.value = '';
                                                }}
                                            >
                                                Replace video
                                            </button>
                                        </div>
                                    )}

                                    {videoState.phase === 'failed' && (
                                        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                                            <div className="flex items-center gap-2 text-sm text-destructive">
                                                <AlertCircle className="size-4" />
                                                {videoState.message}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setVideoState({ phase: 'idle' });
                                                    if (videoFileRef.current) videoFileRef.current.value = '';
                                                }}
                                            >
                                                Try Again
                                            </Button>
                                        </div>
                                    )}

                                    {/* Manual duration (only when no auto-detected) */}
                                    {videoState.phase !== 'ready' && (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-muted-foreground">Duration (optional)</label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={durationHH}
                                                    onChange={(e) => setDurationHH(e.target.value)}
                                                    className="w-20 text-center"
                                                    placeholder="HH"
                                                />
                                                <span className="text-sm text-muted-foreground">h</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="59"
                                                    value={durationMM}
                                                    onChange={(e) => setDurationMM(e.target.value)}
                                                    className="w-20 text-center"
                                                    placeholder="MM"
                                                />
                                                <span className="text-sm text-muted-foreground">min</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DOCUMENT / IMAGE types */}
                            {(type === 'DOCUMENT' || type === 'IMAGE') && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">
                                            {type === 'DOCUMENT' ? 'Document File' : 'Image File'}
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept={type === 'IMAGE' ? 'image/*' : undefined}
                                            onChange={handleFileChange}
                                            className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                                        />
                                        {type === 'IMAGE' && imagePreview && (
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-full max-h-48 object-contain rounded-lg border bg-muted"
                                            />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                                        <span className="text-sm">Allow Download</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description Tab */}
                    {activeTab === 'description' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what learners will find in this lesson..."
                                rows={10}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>
                    )}

                    {/* Attachments Tab */}
                    {activeTab === 'attachments' && (
                        <div className="flex flex-col gap-6">
                            {!isEdit && (
                                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                                    Save the lesson first, then add attachments.
                                </p>
                            )}

                            {isEdit && (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-medium">Current Attachments</p>
                                        {attachmentsLoading ? (
                                            <p className="text-sm text-muted-foreground">Loading...</p>
                                        ) : attachments.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic">No attachments yet.</p>
                                        ) : (
                                            <ul className="flex flex-col gap-2">
                                                {attachments.map((a) => (
                                                    <li key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/20 text-sm">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {a.type === 'LINK' ? <Link2 className="size-4 shrink-0 text-muted-foreground" /> : <FileUp className="size-4 shrink-0 text-muted-foreground" />}
                                                            <span className="truncate">{a.label}</span>
                                                            <Badge variant="neutral" className="shrink-0">{a.type}</Badge>
                                                        </div>
                                                        <button onClick={() => handleDeleteAttachment(a.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-2 shrink-0">
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3 border rounded-lg p-4">
                                        <p className="text-sm font-medium flex items-center gap-2"><Link2 className="size-4" /> Add Link</p>
                                        <Input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Label (optional)" />
                                        <Input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://example.com" type="url" />
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddLink} disabled={attachUploading || !newLinkUrl.trim()}>Add Link</Button>
                                    </div>

                                    <div className="flex flex-col gap-3 border rounded-lg p-4">
                                        <p className="text-sm font-medium flex items-center gap-2"><FileUp className="size-4" /> Add File</p>
                                        <Input value={newFileLabel} onChange={(e) => setNewFileLabel(e.target.value)} placeholder="Label (optional)" />
                                        <input
                                            ref={attachFileInputRef}
                                            type="file"
                                            onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                                            className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                                        />
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddFile} disabled={attachUploading || !newFile}>
                                            {attachUploading ? 'Uploading...' : 'Upload File'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !title.trim() || videoState.phase === 'uploading'}
                    >
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lesson'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
