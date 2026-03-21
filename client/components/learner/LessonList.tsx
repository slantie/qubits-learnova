'use client';

import { useState, useMemo } from 'react';
import { LessonSummary } from '@/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/formatDuration';
import {
  MagnifyingGlass, Play, FileText, Image as ImageIcon, ClipboardText,
  CheckCircle, Circle, Lock, CaretDown, CaretRight,
  FileAudio, Link as LinkIcon, Code, CheckSquare, ChartBar as ChartBar4, Chat,
} from '@phosphor-icons/react';

interface SectionSummary {
  id: number;
  title: string;
  order: number;
  isLocked: boolean;
  lessons: LessonSummary[];
}

interface LessonListProps {
  lessons: LessonSummary[];          // orphan lessons
  sections?: SectionSummary[];       // sectioned lessons
  isEnrolled: boolean;
  onLessonClick?: (lessonId: number) => void;
}

function LessonIcon({ type }: { type: string }) {
  const cls = 'size-3.5 shrink-0';
  switch (type) {
    case 'VIDEO':         return <Play className={cls} />;
    case 'ARTICLE':       return <FileText className={cls} />;
    case 'PDF':           return <FileText className={cls} />;
    case 'DOCUMENT':      return <FileText className={cls} />;
    case 'IMAGE':         return <ImageIcon className={cls} />;
    case 'AUDIO':         return <FileAudio className={cls} />;
    case 'LINK_BLOCK':    return <LinkIcon className={cls} />;
    case 'IFRAME':        return <Code className={cls} />;
    case 'QUIZ_BLOCK':    return <ClipboardText className={cls} />;
    case 'QUIZ':          return <ClipboardText className={cls} />;
    case 'ASSIGNMENT':    return <CheckSquare className={cls} />;
    case 'SURVEY':        return <ChartBar4 className={cls} />;
    case 'FEEDBACK_GATE': return <Chat className={cls} />;
    default:              return <Circle className={cls} />;
  }
}

function LessonRow({
  lesson, index, isEnrolled, onClick,
}: {
  lesson: LessonSummary; index: number; isEnrolled: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => isEnrolled && onClick?.()}
      disabled={!isEnrolled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors',
        isEnrolled ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default',
      )}
    >
      <span className="shrink-0">
        {isEnrolled
          ? lesson.isCompleted
            ? <CheckCircle className="size-4 text-emerald-500" />
            : <Circle className="size-4 text-muted-foreground/40" />
          : <Lock className="size-3.5 text-muted-foreground/30" />
        }
      </span>
      <span className="text-muted-foreground">
        <LessonIcon type={lesson.type} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={cn('block truncate text-sm', lesson.isCompleted && 'text-muted-foreground')}>
          {index}. {lesson.title}
        </span>
      </span>
      {lesson.duration && lesson.duration > 0 && (
        <span className="text-[11px] text-muted-foreground shrink-0">{formatDuration(lesson.duration)}</span>
      )}
    </button>
  );
}

export function LessonList({ lessons, sections = [], isEnrolled, onLessonClick }: LessonListProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // Flatten all lessons for search
  const allLessons = useMemo(() => {
    const sectionLessons = sections.flatMap(s => s.lessons);
    return [...sectionLessons, ...lessons];
  }, [sections, lessons]);

  const isSearching = search.trim().length > 0;
  const filtered = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase();
    return allLessons.filter(l => l.title.toLowerCase().includes(q));
  }, [search, allLessons, isSearching]);

  // Global sequential index across all lessons
  const indexMap = useMemo(() => {
    const map = new Map<number, number>();
    let i = 1;
    for (const s of sections) {
      for (const l of s.lessons) { map.set(l.id, i++); }
    }
    for (const l of lessons) { map.set(l.id, i++); }
    return map;
  }, [sections, lessons]);

  const toggleSection = (id: number) => {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const hasSections = sections.length > 0;
  const hasOrphans = lessons.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          className="pl-9 h-9 text-sm"
          placeholder="Search lessons..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search lessons"
        />
      </div>

      {/* Search results */}
      {isSearching && (
        <div className="border rounded-lg divide-y overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No lessons match your search</div>
          ) : filtered.map(l => (
            <LessonRow key={l.id} lesson={l} index={indexMap.get(l.id) ?? 0} isEnrolled={isEnrolled} onClick={() => onLessonClick?.(l.id)} />
          ))}
        </div>
      )}

      {/* Structured view */}
      {!isSearching && (
        <div className="border rounded-lg overflow-hidden">
          {!hasSections && !hasOrphans && (
            <div className="py-8 text-center text-sm text-muted-foreground">No lessons yet</div>
          )}

          {/* Sectioned lessons */}
          {sections.map(section => {
            const isCollapsed = collapsed.has(section.id);
            const completedInSection = section.lessons.filter(l => l.isCompleted).length;
            return (
              <div key={section.id} className="border-b last:border-b-0">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  {isCollapsed
                    ? <CaretRight className="size-3.5 text-muted-foreground shrink-0" />
                    : <CaretDown className="size-3.5 text-muted-foreground shrink-0" />
                  }
                  {section.isLocked && !isEnrolled && <Lock className="size-3 text-muted-foreground/50 shrink-0" />}
                  <span className="flex-1 text-sm font-semibold">{section.title}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {section.lessons.length > 0 && isEnrolled
                      ? `${completedInSection}/${section.lessons.length}`
                      : `${section.lessons.length} lesson${section.lessons.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </button>

                {/* Section lessons */}
                {!isCollapsed && (
                  <div className="divide-y">
                    {section.lessons.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground/60 italic">No lessons in this section</div>
                    ) : section.lessons.map(l => (
                      <LessonRow key={l.id} lesson={l} index={indexMap.get(l.id) ?? 0} isEnrolled={isEnrolled} onClick={() => onLessonClick?.(l.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphan lessons */}
          {hasOrphans && (
            <div className={cn('divide-y', hasSections && 'border-t')}>
              {hasSections && (
                <div className="px-4 py-2 bg-muted/20">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Other lessons</span>
                </div>
              )}
              {lessons.map(l => (
                <LessonRow key={l.id} lesson={l} index={indexMap.get(l.id) ?? 0} isEnrolled={isEnrolled} onClick={() => onLessonClick?.(l.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
