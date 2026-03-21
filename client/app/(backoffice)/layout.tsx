'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Home, BookOpen, BarChart } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function BackofficeLayout({ children }: { children: ReactNode }) {
    const { user, isLoading, role, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        api.post('/auth/logout').catch(() => { });
        logout();
        router.push('/login');
    };

    useEffect(() => {
        if (!isLoading && (!user || (role !== 'ADMIN' && role !== 'INSTRUCTOR'))) {
            router.push('/login');
        }
    }, [user, isLoading, role, router]);

    // Handle 401 events (expired token) while on a backoffice page
    useEffect(() => {
        const handleUnauthorized = () => router.push('/login');
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [router]);

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    if (!user || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) {
        return null; // Will redirect
    }

    return (
        <div className="flex flex-col min-h-screen">
            {/* Topbar Placeholder */}
            <header className="h-16 border-b bg-background flex items-center px-6 justify-between shrink-0">
                <div className="font-semibold text-lg flex items-center gap-4">
                    <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-normal">
                        <Home className="size-4" /> Home
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <span>Backoffice</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="size-4 mr-2" /> Logout
                    </Button>
                </div>
            </header>
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Placeholder */}
                <aside className="w-64 border-r bg-muted/40 hidden md:block overflow-y-auto">
                    <nav className="p-4 flex flex-col gap-2">
                        <Link href="/backoffice/courses" className="text-sm font-medium hover:text-primary transition-colors p-2 rounded-md hover:bg-muted flex items-center gap-2">
                            <BookOpen className="size-4" /> Courses
                        </Link>
                        {role === 'ADMIN' && (
                            <Link href="/backoffice/reporting" className="text-sm font-medium hover:text-primary transition-colors p-2 rounded-md hover:bg-muted flex items-center gap-2">
                                <BarChart className="size-4" /> Reporting
                            </Link>
                        )}
                    </nav>
                </aside>
                <main className="flex-1 p-6 md:p-8 bg-muted/10 overflow-auto">
                    <div className="mx-auto max-w-5xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
