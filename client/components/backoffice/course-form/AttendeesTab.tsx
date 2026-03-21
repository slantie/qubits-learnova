'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users, Search, ChevronLeft, ChevronRight, Clock,
    CheckCircle, CircleDot, CircleDashed, Loader2,
    Mail, UserPlus, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Enrollment {
    id: number;
    participantName: string | null;
    participantEmail: string;
    enrolledDate: string;
    startDate: string | null;
    completedDate: string | null;
    timeSpent: string;
    completionPct: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface Summary {
    total: number;
    yetToStart: number;
    inProgress: number;
    completed: number;
}

type StatusFilter = '' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface AttendeesTabProps {
    courseId: string | number;
    onAddAttendees?: () => void;
    onContactAttendees?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; badgeVariant: 'neutral' | 'warning' | 'info' | 'success' }> = {
    NOT_STARTED: { label: 'Not Started', icon: CircleDashed, color: 'text-muted-foreground', badgeVariant: 'neutral' },
    IN_PROGRESS: { label: 'In Progress', icon: CircleDot, color: 'text-blue-500', badgeVariant: 'info' },
    COMPLETED: { label: 'Completed', icon: CheckCircle, color: 'text-green-500', badgeVariant: 'success' },
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatCard({ icon: Icon, label, value, active, onClick, className }: {
    icon: React.ElementType;
    label: string;
    value: number;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex flex-col gap-1 p-4 rounded-xl border text-left transition-colors',
                active ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/50',
                className,
            )}
        >
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" />
                <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">{value}</span>
        </button>
    );
}

export function AttendeesTab({ courseId, onAddAttendees, onContactAttendees }: AttendeesTabProps) {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
    const [searchQuery, setSearchQuery] = useState('');
    const limit = 10;

    const fetchSummary = useCallback(async () => {
        try {
            const data = await api.get(`/reporting/summary?courseId=${courseId}`);
            setSummary(data.summary ?? data);
        } catch {}
    }, [courseId]);

    const fetchTable = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                courseId: String(courseId),
                page: String(page),
                limit: String(limit),
            });
            if (statusFilter) params.set('status', statusFilter);
            const data = await api.get(`/reporting/table?${params.toString()}`);
            setEnrollments(data.data ?? []);
            setTotal(data.total ?? 0);
        } catch {}
        finally { setLoading(false); }
    }, [courseId, page, statusFilter]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);
    useEffect(() => { setPage(1); }, [statusFilter]);
    useEffect(() => { fetchTable(); }, [fetchTable]);

    const totalPages = Math.ceil(total / limit);

    const filtered = searchQuery.trim()
        ? enrollments.filter(e =>
            (e.participantName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.participantEmail.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : enrollments;

    return (
        <div className="flex flex-col gap-6">
            {/* Stats cards */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                        icon={Users}
                        label="Total Enrolled"
                        value={summary.total}
                        active={statusFilter === ''}
                        onClick={() => setStatusFilter('')}
                    />
                    <StatCard
                        icon={CircleDashed}
                        label="Not Started"
                        value={summary.yetToStart}
                        active={statusFilter === 'NOT_STARTED'}
                        onClick={() => setStatusFilter(statusFilter === 'NOT_STARTED' ? '' : 'NOT_STARTED')}
                    />
                    <StatCard
                        icon={CircleDot}
                        label="In Progress"
                        value={summary.inProgress}
                        active={statusFilter === 'IN_PROGRESS'}
                        onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
                    />
                    <StatCard
                        icon={CheckCircle}
                        label="Completed"
                        value={summary.completed}
                        active={statusFilter === 'COMPLETED'}
                        onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? '' : 'COMPLETED')}
                    />
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        className="pl-9 h-9"
                    />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {onAddAttendees && (
                        <Button variant="outline" size="sm" onClick={onAddAttendees}>
                            <UserPlus className="size-3.5 mr-1.5" /> Add
                        </Button>
                    )}
                    {onContactAttendees && (
                        <Button variant="outline" size="sm" onClick={onContactAttendees}>
                            <Mail className="size-3.5 mr-1.5" /> Email All
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Learner</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Progress</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Enrolled</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Time Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                        {searchQuery ? 'No matching learners found.' : 'No enrollments yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(e => {
                                    const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.NOT_STARTED;
                                    const StatusIcon = cfg.icon;
                                    return (
                                        <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                        {(e.participantName ?? e.participantEmail).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{e.participantName ?? '—'}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{e.participantEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={cfg.badgeVariant} className="gap-1">
                                                    <StatusIcon className="size-3" />
                                                    {cfg.label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[100px]">
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full transition-all',
                                                                e.completionPct >= 100 ? 'bg-green-500' : e.completionPct > 0 ? 'bg-blue-500' : 'bg-muted-foreground/20',
                                                            )}
                                                            style={{ width: `${Math.min(100, e.completionPct)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{Math.round(e.completionPct)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                                {formatDate(e.enrolledDate)}
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                    <Clock className="size-3" />
                                                    {e.timeSpent || '0:00'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <span className="text-xs text-muted-foreground">
                            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={page === pageNum ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setPage(pageNum)}
                                        className="h-7 w-7 p-0 text-xs"
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
