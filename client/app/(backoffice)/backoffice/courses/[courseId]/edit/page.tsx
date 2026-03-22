'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DotsLoader } from '@/components/ui/dots-loader';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ContentTab } from '@/components/backoffice/course-form/ContentTab';
import { QuizTab } from '@/components/backoffice/course-form/QuizTab';
import { AttendeesTab } from '@/components/backoffice/course-form/AttendeesTab';
import { CertificateTab } from '@/components/backoffice/course-form/CertificateTab';
import { AddAttendeesModal } from '@/components/backoffice/course-form/AddAttendeesModal';
import { ContactAttendeesModal } from '@/components/backoffice/course-form/ContactAttendeesModal';
import {
    ArrowLeft,
    ArrowSquareOut,
    UserPlus,
    Envelope,
    Upload,
    ImageBroken,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CourseDetail, Visibility, AccessRule } from '@/types';

export default function CourseEditPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<CourseDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Meta field states (controlled for blur-save)
    const [title, setTitle] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');

    // Options tab state
    const [visibility, setVisibility] = useState<Visibility>('EVERYONE');
    const [accessRule, setAccessRule] = useState<AccessRule>('OPEN');
    const [price, setPrice] = useState('');
    const [earlyBirdPrice, setEarlyBirdPrice] = useState('');
    const [earlyBirdLimit, setEarlyBirdLimit] = useState('');
    const [optionsSaving, setOptionsSaving] = useState(false);

    // Description tab state
    const [description, setDescription] = useState('');
    const [descSaving, setDescSaving] = useState(false);

    // Publish toggle
    const [publishLoading, setPublishLoading] = useState(false);

    // Modals
    const [attendeesModalOpen, setAttendeesModalOpen] = useState(false);
    const [contactModalOpen, setContactModalOpen] = useState(false);

    // Cover image
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [coverUploading, setCoverUploading] = useState(false);

    useEffect(() => {
        fetchCourse();
    }, [courseId]);

    const fetchCourse = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/courses/${courseId}`);
            const c: CourseDetail = data.course ?? data;
            setCourse(c);
            setTitle(c.title ?? '');
            setTagsInput((c.tags ?? []).join(', '));
            setWebsiteUrl(c.websiteUrl ?? '');
            setVisibility(c.visibility ?? 'EVERYONE');
            setAccessRule(c.accessRule ?? 'OPEN');
            setPrice(c.price ? String(c.price) : '');
            setEarlyBirdPrice(c.earlyBirdPrice ? String(c.earlyBirdPrice) : '');
            setEarlyBirdLimit(c.earlyBirdLimit ? String(c.earlyBirdLimit) : '');
            setDescription(c.description ?? '');
        } catch {
            toast.error('Failed to load course');
        } finally {
            setLoading(false);
        }
    };

    const patchCourse = async (fields: Record<string, unknown>) => {
        try {
            const data = await api.patch(`/courses/${courseId}`, fields);
            setCourse((prev) => prev ? { ...prev, ...fields, ...(data.course ?? data) } : prev);
        } catch {
            toast.error('Failed to save');
        }
    };

    const handleTitleBlur = () => {
        if (title.trim() && title !== course?.title) {
            patchCourse({ title: title.trim() });
        }
    };

    const handleTagsBlur = () => {
        const tags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        const current = (course?.tags ?? []).join(',');
        if (tags.join(',') !== current) {
            patchCourse({ tags });
        }
    };

    const handleWebsiteUrlBlur = () => {
        if (websiteUrl !== (course?.websiteUrl ?? '')) {
            patchCourse({ websiteUrl: websiteUrl.trim() || null });
        }
    };

    const handlePublishToggle = async () => {
        if (!course) return;

        // Pre-check: websiteUrl required to publish
        if (!course.isPublished && !websiteUrl.trim()) {
            toast.error('A Website URL is required before publishing. Add one above and save.');
            return;
        }

        setPublishLoading(true);
        try {
            const data = await api.patch(`/courses/${courseId}/publish`, {
                isPublished: !course.isPublished,
            });
            const updated = data.course ?? data;
            setCourse((prev) => prev ? { ...prev, isPublished: updated.isPublished ?? !course.isPublished } : prev);
            toast.success(updated.isPublished ?? !course.isPublished ? 'Course published' : 'Course unpublished');
        } catch (err) {
            if (err instanceof ApiError && err.data?.code === 'WEBSITE_URL_REQUIRED') {
                toast.error('A Website URL is required before publishing. Add one in the Website URL field.');
            } else {
                toast.error('Failed to update publish status');
            }
        } finally {
            setPublishLoading(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const data = await api.post(`/courses/${courseId}/cover`, formData);
            const coverImage = data.coverImage ?? data.course?.coverImage ?? null;
            setCourse((prev) => prev ? { ...prev, coverImage } : prev);
            toast.success('Cover image updated');
        } catch {
            toast.error('Failed to upload cover image');
        } finally {
            setCoverUploading(false);
            if (coverInputRef.current) coverInputRef.current.value = '';
        }
    };

    const handleSaveDescription = async () => {
        setDescSaving(true);
        try {
            await patchCourse({ description: description || null });
            toast.success('Description saved');
        } catch {
            // error handled in patchCourse
        } finally {
            setDescSaving(false);
        }
    };

    const handleSaveOptions = async () => {
        if (accessRule === 'ON_PAYMENT') {
            const parsedPrice = parseFloat(price);
            if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
                toast.error('Please enter a valid price greater than 0 for paid courses.');
                return;
            }
        }

        setOptionsSaving(true);
        try {
            const fields: Record<string, unknown> = { visibility, accessRule };
            if (accessRule === 'ON_PAYMENT') {
                fields.price = parseFloat(price);
                fields.earlyBirdPrice = earlyBirdPrice ? parseFloat(earlyBirdPrice) : null;
                fields.earlyBirdLimit = earlyBirdLimit ? parseInt(earlyBirdLimit) : null;
            } else {
                fields.earlyBirdPrice = null;
                fields.earlyBirdLimit = null;
            }
            await patchCourse(fields);
            toast.success('Options saved');
        } catch {
            // error handled in patchCourse
        } finally {
            setOptionsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <DotsLoader />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
                <p>Course not found.</p>
                <Link href="/backoffice/courses">
                    <Button variant="outline" size="sm">Back to Courses</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="px-6 py-8 flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/backoffice/courses">
                        <Button variant="ghost" size="icon-sm">
                            <ArrowLeft className="size-4" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl tracking-tight truncate max-w-xs sm:max-w-sm">
                            {course.title}
                        </h1>
                        <Badge variant={course.isPublished ? 'success' : 'neutral'}>
                            {course.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Publish toggle */}
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-card">
                        <Switch
                            checked={course.isPublished}
                            onCheckedChange={handlePublishToggle}
                            disabled={publishLoading}
                        />
                        <span className="text-sm font-medium">
                            {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/courses/${courseId}`, '_blank')}
                    >
                        <ArrowSquareOut className="size-4 mr-1.5" />
                        Preview
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAttendeesModalOpen(true)}
                    >
                        <UserPlus className="size-4 mr-1.5" />
                        Add Attendees
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setContactModalOpen(true)}
                    >
                        <Envelope className="size-4 mr-1.5" />
                        Contact Attendees
                    </Button>
                </div>
            </div>

            {/* Course Meta */}
            <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row gap-6">
                {/* Cover Image */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                        className="w-32 h-24 rounded-lg border bg-muted overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative"
                        onClick={() => coverInputRef.current?.click()}
                        title="Click to upload cover image"
                    >
                        {course.coverImage ? (
                            <img src={course.coverImage} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                <ImageBroken className="size-8 opacity-40" />
                                <span className="text-xs">No cover</span>
                            </div>
                        )}
                        {coverUploading && (
                            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={coverUploading}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        <Upload className="size-3" />
                        {coverUploading ? 'Uploading...' : 'Upload'}
                    </button>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        placeholder='coverImage'
                        className="hidden"
                        onChange={handleCoverUpload}
                    />
                </div>

                {/* Meta Fields */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            placeholder="Course title"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Tags</label>
                        <Input
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            onBlur={handleTagsBlur}
                            placeholder="e.g. react, javascript, frontend"
                        />
                        <p className="text-xs text-muted-foreground">Separate tags with commas</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Website URL</label>
                        <Input
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            onBlur={handleWebsiteUrlBlur}
                            placeholder="https://example.com"
                            type="url"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="content">
                <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="attendees">Attendees</TabsTrigger>
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                    <TabsTrigger value="quiz">Quiz</TabsTrigger>
                    <TabsTrigger value="certificate">Certificate</TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="mt-4">
                    <ContentTab courseId={courseId} />
                </TabsContent>

                {/* Attendees Tab */}
                <TabsContent value="attendees" className="mt-4">
                    <AttendeesTab
                        courseId={courseId}
                        onAddAttendees={() => setAttendeesModalOpen(true)}
                        onContactAttendees={() => setContactModalOpen(true)}
                    />
                </TabsContent>

                {/* Description Tab */}
                <TabsContent value="description" className="mt-4">
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Course Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what learners will gain from this course..."
                                rows={12}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSaveDescription} disabled={descSaving}>
                                {descSaving ? 'Saving...' : 'Save Description'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Options Tab */}
                <TabsContent value="options" className="mt-4">
                    <div className="flex flex-col gap-6 rounded-xl border bg-card p-6">
                        {/* Visibility */}
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-normal">Visibility</p>
                            <div className="flex flex-col gap-2">
                                {([
                                    { value: 'EVERYONE', label: 'Everyone', desc: 'Visible to all visitors' },
                                    { value: 'SIGNED_IN', label: 'Signed-in users only', desc: 'Only visible to logged-in users' },
                                ] as { value: Visibility; label: string; desc: string }[]).map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            visibility === opt.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value={opt.value}
                                            checked={visibility === opt.value}
                                            onChange={() => setVisibility(opt.value)}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <p className="text-sm font-medium">{opt.label}</p>
                                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Access Rule */}
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-normal">Access Rule</p>
                            <div className="flex flex-col gap-2">
                                {([
                                    { value: 'OPEN', label: 'Open', desc: 'Anyone can enroll freely' },
                                    { value: 'ON_INVITATION', label: 'By Invitation', desc: 'Only invited learners can enroll' },
                                    { value: 'ON_PAYMENT', label: 'Paid', desc: 'Learners must pay to access' },
                                ] as { value: AccessRule; label: string; desc: string }[]).map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            accessRule === opt.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="accessRule"
                                            value={opt.value}
                                            checked={accessRule === opt.value}
                                            onChange={() => setAccessRule(opt.value)}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <p className="text-sm font-medium">{opt.label}</p>
                                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {accessRule === 'ON_PAYMENT' && (
                                <div className="flex flex-col gap-4 mt-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium">Base Price (₹)</label>
                                        <div className="relative w-40">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                className="pl-7"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-dashed p-4 space-y-3">
                                        <div>
                                            <p className="text-sm font-medium">Early Bird Pricing <span className="text-xs font-normal text-muted-foreground">(optional)</span></p>
                                            <p className="text-xs text-muted-foreground">Offer a discounted price for the first N students</p>
                                        </div>
                                        <div className="flex gap-4 flex-wrap">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Early Bird Price (₹)</label>
                                                <div className="relative w-36">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={earlyBirdPrice}
                                                        onChange={(e) => setEarlyBirdPrice(e.target.value)}
                                                        className="pl-7"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Spots Available</label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={earlyBirdLimit}
                                                    onChange={(e) => setEarlyBirdLimit(e.target.value)}
                                                    className="w-28"
                                                    placeholder="e.g. 50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSaveOptions} disabled={optionsSaving}>
                                {optionsSaving ? 'Saving...' : 'Save Options'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Quiz Tab */}
                <TabsContent value="quiz" className="mt-4">
                    <QuizTab courseId={courseId} />
                </TabsContent>

                {/* Certificate Tab */}
                <TabsContent value="certificate" className="mt-4">
                    <CertificateTab
                        courseId={courseId}
                        currentTemplate={course.certificateTemplate ?? null}
                        onTemplateChange={(tpl) =>
                            setCourse((prev) =>
                                prev ? { ...prev, certificateTemplate: tpl } : prev,
                            )
                        }
                    />
                </TabsContent>
            </Tabs>

            {/* Modals */}
            {attendeesModalOpen && (
                <AddAttendeesModal
                    courseId={courseId}
                    onClose={() => setAttendeesModalOpen(false)}
                />
            )}
            {contactModalOpen && (
                <ContactAttendeesModal
                    courseId={courseId}
                    onClose={() => setContactModalOpen(false)}
                />
            )}
        </div>
    );
}
