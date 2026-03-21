'use client';

import { useState, useMemo } from 'react';
import { LessonSummary } from '@/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/formatDuration';
import {
  Search, Play, FileText, Image as ImageIcon, ClipboardList,
  CheckCircle2, Circle, Lock,
} from 'lucide-react';

interface LessonListProps {
  lessons: LessonSummary[];
  isEnrolled: boolean;
  onLessonClick?: (lessonId: number) => void;
}

function LessonIcon({ type }: { type: string }) {
  const cls = 'size-3.5 shrink-0';
  switch (type) {
    case 'VIDEO': return <Play className={cls} />;
    case 'DOCUMENT': return <FileText className={cls} />;
    case 'IMAGE': return <ImageIcon className={cls} />;
    case 'QUIZ': return <ClipboardList className={cls} />;
    default: return <Circle className={cls} />;
  }
}

export function LessonList({ lessons, isEnrolled, onLessonClick }: LessonListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return lessons;
    const q = search.toLowerCase();
    return lessons.filter(l => l.title.toLowerCase().includes(q));
  }, [lessons, search]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          className="pl-9 h-9 text-sm"
          placeholder="Search lessons..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Lesson list */}
      <div className="border rounded-lg divide-y overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {search ? 'No lessons match your search' : 'No lessons yet'}
          </div>
        ) : (
          filtered.map((lesson, idx) => (
            <button
              key={lesson.id}
              onClick={() => isEnrolled && onLessonClick?.(lesson.id)}
              disabled={!isEnrolled}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors text-sm',
                isEnrolled
                  ? 'hover:bg-muted/60 cursor-pointer'
                  : 'cursor-default',
              )}
            >
              {/* Completion status */}
              <span className="shrink-0">
                {isEnrolled ? (
                  lesson.isCompleted ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/40" />
                  )
                ) : (
                  <Lock className="size-3.5 text-muted-foreground/30" />
                )}
              </span>

              {/* Lesson type icon */}
              <span className="text-muted-foreground">
                <LessonIcon type={lesson.type} />
              </span>

              {/* Title and meta */}
              <span className="flex-1 min-w-0">
                <span className={cn(
                  'block truncate text-sm',
                  lesson.isCompleted && 'text-muted-foreground',
                )}>
                  {idx + 1}. {lesson.title}
                </span>
              </span>

              {/* Duration */}
              {lesson.duration && lesson.duration > 0 && (
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatDuration(lesson.duration)}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
