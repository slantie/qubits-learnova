'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Users, MagnifyingGlass, Shield, GraduationCap, BookOpen,
    EnvelopeSimple, X, Spinner, CheckCircle, Warning,
} from '@phosphor-icons/react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserRow {
    id: number;
    name: string | null;
    email: string;
    role: 'ADMIN' | 'INSTRUCTOR' | 'LEARNER';
    avatarUrl?: string | null;
}

type RoleFilter = 'ALL' | 'ADMIN' | 'INSTRUCTOR' | 'LEARNER';

// ─── Role badge ────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
    ADMIN: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    INSTRUCTOR: 'bg-primary/10 text-primary border-primary/20',
    LEARNER: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

function RoleBadge({ role }: { role: string }) {
    return (
        <span className={cn(
            'inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize',
            ROLE_STYLES[role] ?? 'bg-muted text-muted-foreground border-border',
        )}>
            {role.toLowerCase()}
        </span>
    );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: UserRow }) {
    const initials = user.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email[0].toUpperCase();
    return (
        <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name ?? 'Avatar'} width={36} height={36} unoptimized className="object-cover size-full" />
            ) : initials}
        </div>
    );
}

// ─── Contact modal ─────────────────────────────────────────────────────────────

function ContactModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    async function send() {
        if (!subject.trim() || !message.trim()) return;
        setLoading(true);
        setFeedback(null);
        try {
            await api.post(`/users/${user.id}/contact`, { subject: subject.trim(), message: message.trim() });
            setFeedback({ type: 'success', msg: `Message sent to ${user.email}.` });
            setSubject('');
            setMessage('');
        } catch (err: unknown) {
            const e = err as { data?: { message?: string } };
            setFeedback({ type: 'error', msg: e?.data?.message ?? 'Failed to send message.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl flex flex-col gap-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div>
                            <p className="text-sm font-medium">{user.name ?? 'User'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} title="Close" className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-5 py-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Subject</label>
                        <Input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="e.g. Important platform update"
                            maxLength={200}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Message</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Write your message…"
                            rows={5}
                            maxLength={2000}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
                    </div>

                    {feedback && (
                        <div className={cn(
                            'flex items-center gap-2 text-sm px-3 py-2 rounded-lg border',
                            feedback.type === 'success'
                                ? 'bg-primary/8 text-primary border-primary/20'
                                : 'bg-destructive/8 text-destructive border-destructive/20',
                        )}>
                            {feedback.type === 'success'
                                ? <CheckCircle className="size-4 shrink-0" weight="fill" />
                                : <Warning className="size-4 shrink-0" />}
                            {feedback.msg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t bg-muted/20">
                    <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Cancel
                    </button>
                    <Button type="button" onClick={send} disabled={loading || !subject.trim() || !message.trim()} size="sm" className="gap-1.5">
                        {loading ? <Spinner className="size-3.5 animate-spin" /> : <EnvelopeSimple className="size-3.5" />}
                        Send message
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Role filter tabs ─────────────────────────────────────────────────────────

const ROLE_TABS: { key: RoleFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'ALL',        label: 'All',         icon: Users },
    { key: 'ADMIN',      label: 'Admins',      icon: Shield },
    { key: 'INSTRUCTOR', label: 'Instructors', icon: BookOpen },
    { key: 'LEARNER',    label: 'Learners',    icon: GraduationCap },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
    const [contacting, setContacting] = useState<UserRow | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/users');
            setUsers(data.users ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const counts: Record<RoleFilter, number> = {
        ALL: users.length,
        ADMIN: users.filter(u => u.role === 'ADMIN').length,
        INSTRUCTOR: users.filter(u => u.role === 'INSTRUCTOR').length,
        LEARNER: users.filter(u => u.role === 'LEARNER').length,
    };

    const visible = users.filter(u => {
        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
        const matchesSearch = !search ||
            (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <>
            <div className="px-6 py-8 flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl">Users</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            View, filter, and contact learners, instructors, and admins.
                        </p>
                    </div>
                </div>

                {/* Role filter tabs */}
                <div className="flex items-center gap-1 border-b overflow-x-auto">
                    {ROLE_TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setRoleFilter(key)}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px shrink-0',
                                roleFilter === key
                                    ? 'border-primary text-foreground font-medium'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="size-3.5" />
                            {label}
                            <span className={cn(
                                'ml-1 text-[10px] px-1.5 py-0.5 rounded-full border',
                                roleFilter === key
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'bg-muted text-muted-foreground border-border',
                            )}>
                                {counts[key]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="pl-9"
                    />
                </div>

                {/* Table */}
                <div className="rounded-xl border overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
                            <Spinner className="size-4 animate-spin" />
                            Loading users…
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">
                            No users found.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                                    <th className="px-4 py-3 sr-only">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {visible.map(user => (
                                    <tr key={user.id} className="bg-card hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={user} />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{user.name ?? '—'}</p>
                                                    <p className="text-xs text-muted-foreground truncate sm:hidden">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setContacting(user)}
                                                title={`Contact ${user.name ?? user.email}`}
                                                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            >
                                                <EnvelopeSimple className="size-3.5" />
                                                Contact
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer count */}
                {!loading && (
                    <p className="text-xs text-muted-foreground">
                        Showing {visible.length} of {users.length} users
                    </p>
                )}
            </div>

            {/* Contact modal */}
            {contacting && (
                <ContactModal user={contacting} onClose={() => setContacting(null)} />
            )}
        </>
    );
}
