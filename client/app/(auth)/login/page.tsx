'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await api.post('/auth/login', { email, password });
            login(data.token, data.user);

            if (data.user.role === 'ADMIN' || data.user.role === 'INSTRUCTOR') {
                router.push('/backoffice/courses');
            } else {
                router.push('/courses');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background p-8 rounded-xl shadow-sm border">
            <h1 className="text-2xl font-medium mb-6 text-center">Log In</h1>
            {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Logging in...' : 'Log In'}
                </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
                <a href="/forgot-password" className="text-primary hover:underline">Forgot password?</a>
            </div>
            <div className="mt-2 text-center text-sm text-muted-foreground">
                Don&apos;t have an account? <a href="/signup" className="text-primary hover:underline">Sign up</a>
            </div>
        </div>
    );
}
