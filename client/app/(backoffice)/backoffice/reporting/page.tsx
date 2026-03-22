'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const COLUMNS = [
  { key: 'courseName',      label: 'Course Name'      },
  { key: 'participantName', label: 'Participant Name'  },
  { key: 'enrolledDate',    label: 'Enrolled Date'     },
  { key: 'startDate',       label: 'Start Date'        },
  { key: 'timeSpent',       label: 'Time Spent'        },
  { key: 'completionPct',   label: 'Completion %'      },
  { key: 'completedDate',   label: 'Completed Date'    },
  { key: 'status',          label: 'Status'            },
];
const ALL_COL_KEYS = new Set(COLUMNS.map((c) => c.key));

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    NOT_STARTED: { label: 'Not Started', cls: 'bg-muted text-muted-foreground border-border' },
    IN_PROGRESS:  { label: 'In Progress', cls: 'bg-primary/10 text-primary border-primary/20'  },
    COMPLETED:    { label: 'Completed',   cls: 'bg-primary/15 text-primary border-primary/25 dark:bg-primary/25 dark:text-primary dark:border-primary/35' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-normal shadow-xs whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function CompletionCell({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 min-w-20">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full w-[calc(var(--pct)*1%)] rounded-full bg-primary transition-all"
          style={{ '--pct': Math.min(100, Math.max(0, pct)) } as Record<string, number>}
        />
      </div>
      <span className="text-xs tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function ReportingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState<any>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COL_KEYS));
  const [showColPanel, setShowColPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.get('/reporting/courses').then((res: any) => {
      setCourses(res?.courses ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const courseParam = selectedCourse || '';
    const statusParam = statusFilter || '';

    Promise.all([
      api.get(`/reporting/summary?courseId=${courseParam}`),
      api.get(`/reporting/table?courseId=${courseParam}&status=${statusParam}&page=${page}&limit=20`),
    ])
      .then(([summaryRes, tableRes]: any[]) => {
        if (cancelled) return;
        setSummary(summaryRes);
        setTableData(tableRes);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedCourse, statusFilter, page]);

  const statCards = [
    { key: 'total',      label: 'Total Participants', value: summary?.total      ?? 0, filter: undefined       },
    { key: 'yetToStart', label: 'Yet to Start',       value: summary?.yetToStart ?? 0, filter: 'NOT_STARTED'  },
    { key: 'inProgress', label: 'In Progress',        value: summary?.inProgress ?? 0, filter: 'IN_PROGRESS'  },
    { key: 'completed',  label: 'Completed',          value: summary?.completed  ?? 0, filter: 'COMPLETED'    },
  ];

  function handleCourseClick(courseId: string | undefined) {
    setSelectedCourse((prev) => (prev === courseId ? undefined : courseId));
    setPage(1);
  }

  function handleCardClick(filter: string | undefined) {
    if (filter === undefined) {
      setStatusFilter(undefined);
    } else {
      setStatusFilter((prev) => (prev === filter ? undefined : filter));
    }
    setPage(1);
  }

  function toggleCol(key: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const visibleColumns = COLUMNS.filter((c) => visibleCols.has(c.key));
  const rows: any[] = tableData?.data ?? [];
  const totalPages: number = tableData?.totalPages ?? 1;

  return (
    <div className="px-6 py-8 space-y-6">
      <h1 className="text-2xl ">Reporting</h1>

      {/* Course filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleCourseClick(undefined)}
          className={`rounded-full border px-4 py-1.5 text-sm font-normal transition-colors ${
            selectedCourse === undefined
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:border-primary hover:text-primary'
          }`}
        >
          All Courses
        </button>
        {courses.map((course) => (
          <button
            type="button"
            key={course.id}
            onClick={() => handleCourseClick(course.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-normal transition-colors ${
              selectedCourse === course.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:border-primary hover:text-primary'
            }`}
          >
            {course.title}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const isActive = card.filter !== undefined && statusFilter === card.filter;
          return (
            <button
              type="button"
              key={card.key}
              onClick={() => handleCardClick(card.filter)}
              className={`bg-card border rounded-xl p-4 text-left transition-all ${
                isActive
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/60'
              }`}
            >
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {isLoading ? (
                  <span className="inline-block h-8 w-12 rounded bg-muted animate-pulse" />
                ) : (
                  card.value
                )}
              </p>
            </button>
          );
        })}
      </div>

      {/* Table section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${tableData?.total ?? 0} record(s)`}
          </p>
          <button
            type="button"
            onClick={() => setShowColPanel((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Customize columns
          </button>
        </div>

        {/* Column customization panel */}
        {showColPanel && (
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-wrap gap-3">
            {COLUMNS.map((col) => (
              <label key={col.key} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleCols.has(col.key)}
                  onChange={() => toggleCol(col.key)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                {col.label}
              </label>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-3 text-xs font-normal text-muted-foreground uppercase tracking-wide w-12">
                  Sr. No.
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-xs font-normal text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <span className="inline-block h-4 w-6 rounded bg-muted" />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <span className="inline-block h-4 w-24 rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 1}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No data yet
                  </td>
                </tr>
              ) : (
                rows.map((row: any, idx: number) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {(page - 1) * 20 + idx + 1}
                    </td>
                    {visibleColumns.map((col) => {
                      const val = row[col.key];
                      if (col.key === 'completionPct') {
                        return (
                          <td key={col.key} className="px-4 py-3">
                            <CompletionCell pct={val ?? 0} />
                          </td>
                        );
                      }
                      if (col.key === 'status') {
                        return (
                          <td key={col.key} className="px-4 py-3">
                            <StatusBadge status={val ?? ''} />
                          </td>
                        );
                      }
                      if (['enrolledDate', 'startDate', 'completedDate'].includes(col.key)) {
                        return (
                          <td key={col.key} className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {formatDate(val)}
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} className="px-4 py-3 text-foreground whitespace-nowrap">
                          {val ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-sm font-medium text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <p className="text-sm text-muted-foreground">
              Page <span className="font-normal text-foreground">{page}</span> of{' '}
              <span className="font-normal text-foreground">{totalPages}</span>
            </p>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 text-sm font-medium text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
