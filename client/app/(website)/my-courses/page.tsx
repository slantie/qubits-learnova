'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyCourses } from '@/lib/api/learner';
import { LearnerCourse } from '@/types';
import { CourseCard } from '@/components/learner/CourseCard';
import { ProfilePanel } from '@/components/learner/ProfilePanel';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MagnifyingGlass, GraduationCap, BookOpen } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<LearnerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMyCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const filtered = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)),
    );
  }, [courses, search]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Course list */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-medium tracking-tight flex items-center gap-3">
              <BookOpen className="size-7 text-primary" />
              My Courses
              {!loading && (
                <span className="text-lg text-muted-foreground font-normal">
                  ({courses.length})
                </span>
              )}
            </h1>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search your courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Course grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                  <div className="h-40 bg-muted" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="size-16 rounded-full bg-muted/60 flex items-center justify-center">
                <GraduationCap className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-medium mb-1">
                  {search ? 'No courses match your search' : 'No enrolled courses yet'}
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  {search
                    ? 'Try a different search term.'
                    : 'Browse our catalog and find your next course!'}
                </p>
              </div>
              {search ? (
                <Button variant="outline" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : (
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center h-8 px-3 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors"
                >
                  Browse Courses
                </Link>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {filtered.map(course => (
                <CourseCard key={course.id} course={course} showProgress />
              ))}
            </div>
          )}
        </div>

        {/* Right: Profile panel */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          <div className="lg:sticky lg:top-24">
            <ProfilePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
