'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface ContactAttendeesModalProps {
    courseId: string;
    onClose: () => void;
}

export function ContactAttendeesModal({ courseId, onClose }: ContactAttendeesModalProps) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [sentCount, setSentCount] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            toast.error('Subject and body are required');
            return;
        }

        setLoading(true);
        try {
            const data = await api.post(`/courses/${courseId}/contact`, { subject, body });
            setSentCount(data.sentTo ?? 0);
            toast.success('Message sent');
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Contact Attendees</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {sentCount === null ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium" htmlFor="contact-subject">
                                    Subject
                                </label>
                                <Input
                                    id="contact-subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Important course update"
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium" htmlFor="contact-body">
                                    Message
                                </label>
                                <textarea
                                    id="contact-body"
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Write your message here..."
                                    rows={6}
                                    disabled={loading}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading || !subject.trim() || !body.trim()}>
                                    {loading ? 'Sending...' : 'Send Message'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center">
                                <p className="text-2xl font-semibold">{sentCount}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {sentCount === 1 ? 'learner' : 'learners'} received your message
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <Button type="button" onClick={onClose}>
                                    Done
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
