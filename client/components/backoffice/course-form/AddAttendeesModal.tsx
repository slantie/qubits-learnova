'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface AddAttendeesModalProps {
    courseId: string;
    onClose: () => void;
}

export function AddAttendeesModal({ courseId, onClose }: AddAttendeesModalProps) {
    const [emailsText, setEmailsText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ enrolled: number; alreadyEnrolled: number; invited: number; emailErrors: string[] } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const emails = emailsText
            .split(/[\n,]+/)
            .map((e) => e.trim())
            .filter(Boolean);

        if (emails.length === 0) {
            toast.error('Please enter at least one email address');
            return;
        }

        // Basic email format validation
        const invalid = emails.filter((em) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
        if (invalid.length > 0) {
            toast.error(`Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            const data = await api.post(`/courses/${courseId}/attendees`, { emails });
            setResult({
                enrolled: data.enrolled ?? 0,
                alreadyEnrolled: data.alreadyEnrolled ?? 0,
                invited: data.invited ?? 0,
                emailErrors: data.emailErrors ?? [],
            });
            toast.success('Attendees processed');
        } catch {
            toast.error('Failed to add attendees');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Add Attendees</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {!result ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">
                                    Email Addresses
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Enter one email per line, or separate with commas.
                                </p>
                                <textarea
                                    value={emailsText}
                                    onChange={(e) => setEmailsText(e.target.value)}
                                    placeholder="alice@example.com&#10;bob@example.com"
                                    rows={6}
                                    disabled={loading}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading || !emailsText.trim()}>
                                    {loading ? 'Processing...' : 'Add Attendees'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col gap-3">
                                <p className="text-sm font-medium">Results</p>
                                <div className="rounded-lg border bg-muted/30 divide-y">
                                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                                        <span className="text-muted-foreground">Enrolled</span>
                                        <span className="font-semibold text-green-600">{result.enrolled}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                                        <span className="text-muted-foreground">Already enrolled</span>
                                        <span className="font-semibold">{result.alreadyEnrolled}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                                        <span className="text-muted-foreground">Invited (new users)</span>
                                        <span className="font-semibold text-blue-600">{result.invited}</span>
                                    </div>
                                </div>
                                {result.emailErrors.length > 0 && (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                                        <p className="font-medium text-destructive mb-1">Email delivery failed for:</p>
                                        <ul className="text-muted-foreground text-xs space-y-0.5">
                                            {result.emailErrors.map((em) => (
                                                <li key={em}>{em}</li>
                                            ))}
                                        </ul>
                                        <p className="text-xs text-muted-foreground mt-2">Users were enrolled but did not receive a notification email. Check your SMTP settings.</p>
                                    </div>
                                )}
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
