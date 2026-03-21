'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { getToken, setToken, removeToken } from '@/lib/auth';
import { api } from '@/lib/api';

interface ExtendedUser extends User {
    totalPoints?: number;
    currentBadge?: string | null;
}

interface AuthContextType {
    user: ExtendedUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    role: User['role'] | null;
    login: (token: string, userData: ExtendedUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<ExtendedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = getToken();
            if (token) {
                try {
                    const data = await api.get('/auth/me');
                    if (data?.user) {
                        setUser(data.user);
                    } else if (data) {
                        setUser(data);
                    }
                } catch (error) {
                    console.error('Failed to fetch user', error);
                    removeToken();
                }
            }
            setIsLoading(false);
        };

        initAuth();

        // Fired by api.ts when any response returns 401
        const handleUnauthorized = () => {
            removeToken();
            setUser(null);
            // Navigation is handled by the page/layout that catches this
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    const login = (token: string, userData: ExtendedUser) => {
        setToken(token);
        setUser(userData);
    };

    // Clears token + cookie; navigation is the caller's responsibility
    const logout = () => {
        removeToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                role: user?.role || null,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
