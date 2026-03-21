'use client';

import { Users, MagnifyingGlass, Shield, GraduationCap, BookOpen } from '@phosphor-icons/react';

export default function UsersPage() {
    return (
        <div className="px-6 py-8 flex flex-col gap-6">
            <div>
                <h1 className="text-2xl ">Users</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage learners, instructors, and admins across your platform.
                </p>
            </div>

            {/* Coming soon illustration */}
            <div className="border rounded-2xl bg-card p-12 flex flex-col items-center gap-6 text-center">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Users className="size-8 text-primary" strokeWidth={1.5} />
                </div>
                <div className="max-w-sm">
                    <h2 className="text-lg ">User Management — Coming Soon</h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        View and manage all users, assign roles, reset passwords, and track
                        activity across your platform. This feature is under development.
                    </p>
                </div>

                {/* Feature preview */}
                <div className="grid sm:grid-cols-3 gap-4 w-full max-w-lg mt-2">
                    {[
                        { icon: GraduationCap, label: 'Learners', desc: 'Enroll & track progress' },
                        { icon: BookOpen, label: 'Instructors', desc: 'Manage course authors' },
                        { icon: Shield, label: 'Admins', desc: 'Platform administrators' },
                    ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="border rounded-xl p-4 bg-muted/30 flex flex-col items-center gap-2 text-center">
                            <Icon className="size-5 text-muted-foreground" />
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
