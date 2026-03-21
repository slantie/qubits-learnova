import { getToken, removeToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
    constructor(public status: number, public data: any) {
        super(data?.message || 'API Error');
        this.name = 'ApiError';
    }
}

async function fetchWrapper(endpoint: string, options: RequestInit = {}) {
    const token = getToken();

    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    // Ensure endpoint starts with slash if it doesn't
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const response = await fetch(`${API_URL}${normalizedEndpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            removeToken();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('auth:unauthorized'));
            }
        }
        const data = await response.json().catch(() => null);
        throw new ApiError(response.status, data);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json().catch(() => null);
}

export const api = {
    get: (endpoint: string, options?: RequestInit) =>
        fetchWrapper(endpoint, { ...options, method: 'GET' }),
    post: (endpoint: string, data?: any, options?: RequestInit) =>
        fetchWrapper(endpoint, {
            ...options,
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data)
        }),
    put: (endpoint: string, data?: any, options?: RequestInit) =>
        fetchWrapper(endpoint, {
            ...options,
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data)
        }),
    patch: (endpoint: string, data?: any, options?: RequestInit) =>
        fetchWrapper(endpoint, {
            ...options,
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data)
        }),
    delete: (endpoint: string, options?: RequestInit) =>
        fetchWrapper(endpoint, { ...options, method: 'DELETE' }),
};
