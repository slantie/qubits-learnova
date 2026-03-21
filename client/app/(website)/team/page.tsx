import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Team | Learnova',
};

const TEAM = [
    {
        name: 'Ridham Patel',
        photo: 'https://avatars.githubusercontent.com/u/127187827?v=4',
        github: 'https://github.com/ridh21',
        linkedin: 'https://linkedin.com/in/ridhampatel2k4',
    },
    {
        name: 'Kandarp Gajjar',
        photo: 'https://avatars.githubusercontent.com/u/128211660?v=4',
        github: 'https://github.com/slantie',
        linkedin: 'https://linkedin.com/in/kandarpgajjar',
    },
    {
        name: 'Harsh Dodiya',
        photo: 'https://media.licdn.com/dms/image/v2/D4D03AQGC79OgP-f4hQ/profile-displayphoto-scale_400_400/B4DZjmqv30GkAg-/0/1756216625213?e=1775692800&v=beta&t=juvpFzMRAngUhMTT3TwD5YZ4BZm4GwfMAG3lNU2rRT0',
        github: 'https://github.com/HarshDodiya1',
        linkedin: 'https://linkedin.com/in/dodiyaharsh',
    },
];

export default function TeamPage() {
    return (
        <main className="min-h-screen bg-background">
            {/* Hero */}
            <section className="relative py-24 overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="size-175 rounded-full bg-primary/8 blur-3xl" />
                </div>
                <div className="relative text-center px-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
                        The People Behind It
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                        Meet the Team
                    </h1>
                    <p className="mt-4 text-muted-foreground text-base max-w-xs mx-auto">
                        Built with care by three people who wanted learning to feel better.
                    </p>
                </div>
            </section>

            {/* Cards */}
            <section className="pb-28 px-6">
                <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {TEAM.map((member) => (
                        <div
                            key={member.name}
                            className="group flex flex-col items-center gap-6 bg-card border border-border rounded-2xl px-6 py-10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                        >
                            {/* Photo */}
                            <div className="relative size-56 rounded-full overflow-hidden ring-4 ring-primary/20 ring-offset-4 p-8 ring-offset-card shadow-xl">
                                <Image
                                    src={member.photo}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                    sizes="180px"
                                    unoptimized={member.photo.includes('licdn.com')}
                                />
                            </div>

                            {/* Name */}
                            <p className="text-lg font-semibold text-foreground text-center leading-tight">
                                {member.name}
                            </p>

                            {/* Social links */}
                            <div className="flex items-center gap-3">
                                <Link
                                    href={member.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${member.name} on GitHub`}
                                    className="flex items-center justify-center size-9 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                    </svg>
                                </Link>
                                <Link
                                    href={member.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${member.name} on LinkedIn`}
                                    className="flex items-center justify-center size-9 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
