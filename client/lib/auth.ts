const TOKEN_KEY = 'auth_token';
const COOKIE_NAME = 'auth_token';

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    // Keep cookie in sync for Next.js middleware (reads cookies, not localStorage)
    document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=604800; SameSite=Lax`;
}

export function removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    // Expire the cookie so middleware stops seeing the token immediately
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
