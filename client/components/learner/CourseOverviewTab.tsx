'use client';

import { LearnerCourseDetail, LearnerEnrollment } from '@/types';
import { ProgressBar } from '@/components/learner/ProgressBar';
import { LessonList } from '@/components/learner/LessonList';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, HelpCircle } from 'lucide-react';

interface CourseOverviewTabProps {
  course: LearnerCourseDetail;
  enrollment?: LearnerEnrollment;
  onLessonClick: (lessonId: number) => void;
}

export function CourseOverviewTab({ course, enrollment, onLessonClick }: CourseOverviewTabProps) {
  const isEnrolled = !!enrollment;
  const totalQuestions = course.quizzes.reduce((sum, q) => sum + q._count.questions, 0);

  return (
    <div className="space-y-6 py-4">
      {/* Description */}
      {course.description && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
          {course.description.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {/* Progress bar — enrolled only */}
      {isEnrolled && enrollment && (
        <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
          <ProgressBar value={enrollment.progressPct} label="Course Progress" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3" />
              {enrollment.totalLessons ?? course._count.lessons} total
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              ✓ {enrollment.completedLessons} completed
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600">
              ○ {enrollment.incompleteLessons} remaining
            </span>
          </div>
        </div>
      )}

      {/* Content list + Quiz summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lesson list */}
        <div className="lg:col-span-2">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="size-4" />
            Course Content
            <Badge variant="neutral" className="text-[10px]">
              {course._count.lessons} lessons
            </Badge>
          </h3>
          <LessonList
            sections={course.sections}
            lessons={course.lessons}
            isEnrolled={isEnrolled}
            onLessonClick={onLessonClick}
          />
        </div>

        {/* Quiz summary */}
        <div className="space-y-4">
          {totalQuestions > 0 && (
            <div className="rounded-lg border p-4 bg-card space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="size-4 text-primary" />
                Quiz Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total questions</span>
                  <span className="font-medium">{totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Multiple attempts</span>
                  <span className="font-medium text-emerald-600">Yes</span>
                </div>
                {course.quizzes.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Quizzes</span>
                    <span className="font-medium">{course.quizzes.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Course stats card */}
          <div className="rounded-lg border p-4 bg-card space-y-3">
            <h4 className="text-sm font-semibold">Course Info</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Instructor</span>
                <span className="font-medium">{course.instructor?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lessons</span>
                <span className="font-medium">{course._count.lessons}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Enrolled</span>
                <span className="font-medium inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {course._count.enrollments}
                </span>
              </div>
              {course.accessRule === 'ON_PAYMENT' && course.price && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium text-amber-600">₹{course.price}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
