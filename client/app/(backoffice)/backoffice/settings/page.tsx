'use client';

import { Settings, Palette, Bell, Lock, Globe } from 'lucide-react';

const SETTING_GROUPS = [
    {
        icon: Globe,
        label: 'Platform',
        desc: 'Name, logo, domain, and branding',
    },
    {
        icon: Lock,
        label: 'Access & Auth',
        desc: 'Sign-up rules, SSO, password policies',
    },
    {
        icon: Bell,
        label: 'Notifications',
        desc: 'Email triggers, digests, and alerts',
    },
    {
        icon: Palette,
        label: 'Appearance',
        desc: 'Theme, fonts, and custom CSS',
    },
];

export default function SettingsPage() {
    return (
        <div className="px-6 py-8 flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure your platform's behavior, branding, and access rules.
                </p>
            </div>

            <div className="border rounded-2xl bg-card p-12 flex flex-col items-center gap-6 text-center">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Settings className="size-8 text-primary" strokeWidth={1.5} />
                </div>
                <div className="max-w-sm">
                    <h2 className="text-lg font-semibold">Platform Settings — Coming Soon</h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        Control every aspect of your Learnova instance from a single place.
                        This section is under active development.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 w-full max-w-md mt-2">
                    {SETTING_GROUPS.map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="border rounded-xl p-4 bg-muted/30 flex items-start gap-3 text-left">
                            <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium">{label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
