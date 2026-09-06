import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// `/serwist` serves the compiled service worker, `/offline` is its document
// fallback, and `/manifest.webmanifest` plus the `/icons` it references are
// fetched by the browser before login — none of them may be bounced to the
// login page or the app is not installable.
const publicPaths = [
  '/login',
  '/signup',
  '/auth/google/callback',
  '/serwist',
  '/offline',
  '/manifest.webmanifest',
  '/icons',
  // `/handbook` is the static system reference (public/handbook/*), deliberately
  // readable without a session.
  '/handbook',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Get the session cookie
  const sessionCookie = request.cookies.get('FINANCEOS_SESSION');
  const hasSession = !!sessionCookie?.value;

  // Redirect to login if not authenticated and accessing protected route
  if (!isPublicPath && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Don't redirect from login to dashboard here - let the page handle it
  // This avoids redirect loops when the session cookie exists but is invalid

  const headers = new Headers(request.headers);
  headers.set('x-request-id', crypto.randomUUID().replace(/-/g, '').slice(0, 20));
  const faroSession = request.cookies.get('faro_session')?.value;
  if (faroSession) {
    headers.set('x-session-id', faroSession);
  }

  return NextResponse.next({ request: { headers } });
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
