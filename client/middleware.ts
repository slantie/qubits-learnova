import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup');
    const isBackoffice = request.nextUrl.pathname.startsWith('/backoffice');

    if (isBackoffice && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/courses', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/login', '/signup', '/backoffice/:path*'],
};
