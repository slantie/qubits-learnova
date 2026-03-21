'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
    SignOut, BookOpen, ChartBar, SquaresFour,
    Users, GearSix, CaretRight, GraduationCap,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    badge?: string;
}

const NAV_ITEMS: NavItem[] = [
    { href: '/backoffice', label: 'Dashboard', icon: SquaresFour },
    { href: '/backoffice/courses', label: 'Courses', icon: BookOpen },
    { href: '/backoffice/reporting', label: 'Reporting', icon: ChartBar, adminOnly: true },
    { href: '/backoffice/users', label: 'Users', icon: Users, adminOnly: true, badge: 'Soon' },
    { href: '/backoffice/settings', label: 'Settings', icon: GearSix, adminOnly: true, badge: 'Soon' },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-normal transition-all',
                isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground shadow-xs">
                    {item.badge}
                </span>
            )}
            {isActive && <CaretRight className="size-3 text-primary" />}
        </Link>
    );
}

export default function BackofficeLayout({ children }: { children: ReactNode }) {
    const { user, isLoading, role, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

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

    useEffect(() => {
        const handleUnauthorized = () => router.push('/login');
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Image src="/learnova.svg" alt="Learnova" width={64} height={64} className="size-16 object-contain animate-pulse" />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-normal text-foreground">Learnova</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Loading your panel…</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || (role !== 'ADMIN' && role !== 'INSTRUCTOR')) return null;

    const visibleNav = NAV_ITEMS.filter(item => !item.adminOnly || role === 'ADMIN');
    const initials = user.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : (user.email?.[0] ?? 'U').toUpperCase();

    return (
        <div className="flex min-h-screen bg-background">
            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar shrink-0">
                {/* Brand */}
                <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0">
                    <Image src="/learnova.svg" alt="Learnova" width={36} height={36} className="size-9 object-contain shrink-0" />
                    <div>
                        <p className="text-sm font-normal text-foreground leading-none">Learnova</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                            {role?.toLowerCase()} panel
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                    {visibleNav.map(item => {
                        const isActive = item.href === '/backoffice'
                            ? pathname === '/backoffice'
                            : pathname.startsWith(item.href);
                        return <NavLink key={item.href} item={item} isActive={isActive} />;
                    })}

                    <div className="mt-4 pt-4 border-t border-sidebar-border">
                        <p className="px-3 text-[10px] font-normal uppercase tracking-widest text-sidebar-foreground/40 mb-2">
                            Learner View
                        </p>
                        <Link
                            href="/courses"
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-normal text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                        >
                            <GraduationCap className="size-4 shrink-0" />
                            View as Learner
                        </Link>
                    </div>
                </nav>

                {/* User footer */}
                <div className="p-3 border-t border-sidebar-border">
                    <div className="flex items-center gap-3 px-2 py-1.5">
                        <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-normal truncate">{user.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                            title="Log out"
                        >
                            <SignOut className="size-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main area ───────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile topbar */}
                <header className="md:hidden h-14 border-b bg-background flex items-center px-4 justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Image src="/learnova.svg" alt="Learnova" width={32} height={32} className="size-8 object-contain" />
                        <span className="font-normal text-sm">Learnova</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
                        <SignOut className="size-4" />
                    </Button>
                </header>

                <main className="flex-1 overflow-auto flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    );
}
