'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import {
    SignOut, SquaresFour, Trophy,
    GraduationCap, CaretDown, Star, User,
} from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CoursesDropdown } from '@/components/learner/CoursesDropdown';

function UserMenu({ user, role, onLogout }: { user: any; role: string | null; onLogout: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : (user?.email?.[0] ?? 'U').toUpperCase();

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
            >
                <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {initials}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-30 truncate">
                    {user?.name?.split(' ')[0] ?? 'You'}
                </span>
                {(user?.totalPoints ?? 0) > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {user.totalPoints}
                    </span>
                )}
                <CaretDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border bg-popover shadow-lg py-1 z-50">
                    <div className="px-3 py-2.5 border-b">
                        <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        {(user?.totalPoints ?? 0) > 0 && (
                            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                                <Star className="size-3 fill-amber-400 text-amber-400" />
                                {user.totalPoints} pts earned
                            </p>
                        )}
                    </div>

                    <Link
                        href="/profile"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                        <User className="size-4 text-muted-foreground" />
                        My Profile
                    </Link>
                    {(role === 'ADMIN' || role === 'INSTRUCTOR') && (
                        <Link
                            href="/backoffice"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        >
                            <SquaresFour className="size-4 text-muted-foreground" />
                            Backoffice
                        </Link>
                    )}
                    <Link
                        href="/my-courses"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                        <GraduationCap className="size-4 text-muted-foreground" />
                        My Learning
                    </Link>
                    <Link
                        href="/leaderboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                        <Trophy className="size-4 text-muted-foreground" />
                        Leaderboard
                    </Link>

                    <div className="border-t mt-1 pt-1">
                        <button
                            type="button"
                            onClick={() => { setOpen(false); onLogout(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <SignOut className="size-4" />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WebsiteLayout({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, role, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        api.post('/auth/logout').catch(() => { });
        logout();
        router.push('/login');
    };

    return (
        <div className="flex min-h-screen flex-col">
            <header className="h-16 border-b flex items-center px-4 sm:px-6 justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-50">
                {/* Brand */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <Image src="/learnova.svg" alt="Learnova" width={36} height={36} className="size-9 object-contain" />
                        <span className="font-normal text-base">Learnova</span>
                    </Link>

                    {/* Nav links */}
                    <nav className="hidden md:flex items-center gap-1">
                        <CoursesDropdown />
                        {isAuthenticated && (
                            <>
                                <Link
                                    href="/my-courses"
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                        pathname.startsWith('/my-courses')
                                            ? 'text-foreground bg-muted'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                                    )}
                                >
                                    My Learning
                                </Link>
                                <Link
                                    href="/leaderboard"
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                        pathname === '/leaderboard'
                                            ? 'text-foreground bg-muted'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                                    )}
                                >
                                    Leaderboard
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    {!isAuthenticated ? (
                        <>
                            <Link
                                href="/login"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/signup"
                                className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-lg transition-colors hover:bg-primary/90"
                            >
                                Get started
                            </Link>
                        </>
                    ) : (
                        <UserMenu user={user} role={role} onLogout={handleLogout} />
                    )}
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t py-8 bg-muted/20">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Image src="/learnova.svg" alt="Learnova" width={24} height={24} className="size-6 object-contain" />
                        <span className="text-sm font-normal">Learnova</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} Learnova by Qubits. Built at Hackathon 2026.
                    </p>
                </div>
            </footer>
        </div>
    );
}
