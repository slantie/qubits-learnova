'use client';

import Link from 'next/link';
import { LearnerCourse } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/learner/ProgressBar';
import { BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: LearnerCourse;
  showProgress?: boolean;
}

export function CourseCard({ course, showProgress = true }: CourseCardProps) {
  const enrollment = course.enrollment;
  const progressPct = enrollment?.progressPct ?? 0;

  const getCtaLabel = () => {
    if (!enrollment) {
      if (course.accessRule === 'ON_PAYMENT') return `Buy ₹${course.price}`;
      return 'View Course';
    }
    switch (enrollment.status) {
      case 'NOT_STARTED': return 'Start Course';
      case 'IN_PROGRESS': return 'Continue';
      case 'COMPLETED': return 'View Course';
      default: return 'View';
    }
  };

  const getCtaVariant = () => {
    if (!enrollment) {
      if (course.accessRule === 'ON_PAYMENT') return 'outline' as const;
      return 'default' as const;
    }
    return enrollment.status === 'COMPLETED' ? 'outline' as const : 'default' as const;
  };

  return (
    <Link href={`/courses/${course.id}`} className="block">
      <article className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group h-full">
        {/* Cover image */}
        <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
          {course.coverImage ? (
            <img
              src={course.coverImage}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <BookOpen className="size-10 text-primary/25" strokeWidth={1.5} />
          )}
          {/* Paid badge */}
          {course.accessRule === 'ON_PAYMENT' && (
            <Badge className="absolute top-2.5 right-2.5 bg-amber-500/90 text-white text-[10px] hover:bg-amber-500">
              Paid
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1 gap-3">
          {/* Tags */}
          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {course.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="neutral" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {course.tags.length > 3 && (
                <Badge variant="neutral" className="text-[10px] px-1.5 py-0 opacity-60">
                  +{course.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">{course.title}</h3>

          {/* Description */}
          {course.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
          )}

          {/* Progress bar */}
          {showProgress && enrollment && (
            <ProgressBar value={progressPct} size="sm" className="mt-auto" />
          )}

          {/* Stats */}
          {enrollment && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3" />
                {enrollment.totalLessons ?? course._count.lessons} total
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="size-3" />
                {enrollment.completedLessons} done
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Clock className="size-3" />
                {enrollment.incompleteLessons} left
              </span>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-[11px] text-muted-foreground">
              {course.instructor?.name && `by ${course.instructor.name}`}
            </span>
            <span className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-md',
              getCtaVariant() === 'default'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-foreground',
              course.accessRule === 'ON_PAYMENT' && !enrollment && 'text-amber-600 border-amber-300',
              enrollment?.status === 'COMPLETED' && 'text-emerald-600 border-emerald-300',
            )}>
              {getCtaLabel()}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
