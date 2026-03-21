'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CoursesDropdown } from '@/components/learner/CoursesDropdown';

export default function WebsiteLayout({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, role, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        api.post('/auth/logout').catch(() => { });
        logout();
        router.push('/login');
    };

    return (
        <div className="flex min-h-screen flex-col">
            <header className="h-16 border-b flex items-center px-6 justify-between bg-background sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href="/" className="font-bold text-xl text-primary inline-flex items-center gap-2">
                        <BookOpen className="size-5" /> Learnova
                    </Link>
                    <nav className="hidden md:flex items-center gap-1">
                        <CoursesDropdown />
                    </nav>
                </div>

                <div className="flex gap-3 items-center">
                    {!isAuthenticated ? (
                        <>
                            <Link href="/login" className="text-sm font-medium hover:underline">Log in</Link>
                            <Link href="/signup" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md transition-colors hover:bg-primary/90">Sign up</Link>
                        </>
                    ) : (
                        <>
                            {role === 'LEARNER' && (
                                <Link
                                    href="/my-courses"
                                    className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <GraduationCap className="size-4" />
                                    My Courses
                                </Link>
                            )}
                            {(role === 'ADMIN' || role === 'INSTRUCTOR') && (
                                <Link href="/backoffice/courses" className="text-sm font-medium inline-flex items-center hover:underline">
                                    Dashboard <ArrowRight className="size-3 ml-1" />
                                </Link>
                            )}
                            <span className="text-sm text-muted-foreground hidden sm:inline-block">
                                {user?.name || user?.email}
                            </span>
                            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout" className="text-muted-foreground hover:text-destructive">
                                <LogOut className="size-4" />
                            </Button>
                        </>
                    )}
                </div>
            </header>
            <main className="flex-1">
                {children}
            </main>
            <footer className="border-t py-8 mt-auto bg-muted/40">
                <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} Learnova. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
