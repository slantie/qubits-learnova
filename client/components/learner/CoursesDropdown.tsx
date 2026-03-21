'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPublishedCourses } from '@/lib/api/learner';
import { LearnerCourse } from '@/types';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CaretDown, CircleNotch } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CoursesDropdown() {
  const [courses, setCourses] = useState<LearnerCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleOpen = () => {
    if (fetched) return;
    setLoading(true);
    fetchPublishedCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && handleOpen()}>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60 transition-colors cursor-pointer"
      >
        Courses
        <CaretDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch className="size-5 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No courses available
          </div>
        ) : (
          <>
            {courses.map(course => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="flex items-start gap-3 p-3 rounded-md w-full hover:bg-accent transition-colors"
              >
                {/* Thumbnail */}
                <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {course.coverImage ? (
                    <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="size-4 text-primary/40" />
                  )}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{course.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {course.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="neutral" className="text-[9px] px-1 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {course.accessRule === 'ON_PAYMENT' && (
                      <Badge variant="warning" className="text-[9px] px-1 py-0">
                        Paid
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {/* View all link */}
            <div className="border-t mt-1 pt-1">
              <Link
                href="/courses"
                className="flex items-center justify-center py-2 text-xs text-primary font-medium hover:underline"
              >
                View all courses →
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
