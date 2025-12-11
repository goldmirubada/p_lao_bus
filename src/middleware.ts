import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check the protocol
    const proto = request.headers.get('x-forwarded-proto');
    const host = request.headers.get('host');

    // If the protocol is HTTP and we are not on localhost, redirect to HTTPS
    if (proto === 'http' && host && !host.includes('localhost')) {
        const newUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
        return NextResponse.redirect(newUrl, 301);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
