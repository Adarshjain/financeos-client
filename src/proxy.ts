import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { loginHrefFor, rootRedirectFor } from '@/features/shell/routes';

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
  // Brand assets like the Google 'G' fetched on public auth pages
  '/brand',
  // `/handbook` is the static system reference (public/handbook/*), deliberately
  // readable without a session.
  '/handbook',
  // The Legacy app's own public pages (Dinero's are the plain ones above).
  '/legacy/login',
  '/legacy/signup',
  '/legacy/offline',
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Temporary redirects, before the auth check. Old Dinero URLs (bookmarks, push links): /ds/<rest> is /<rest>
  // (/ds itself stays the review index). Legacy paths that moved go to their Dinero page, Legacy-only pages
  // to /legacy.
  const redirectTo = pathname.startsWith('/ds/') ? `/${pathname.slice(4).replace(/^\/+/, '')}${search}` : rootRedirectFor(pathname, search);
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Check if the path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Get the session cookie
  const sessionCookie = request.cookies.get('FINANCEOS_SESSION');
  const hasSession = !!sessionCookie?.value;

  // Redirect to login if not authenticated and accessing protected route
  if (!isPublicPath && !hasSession) {
    return NextResponse.redirect(new URL(loginHrefFor(pathname), request.url));
  }

  // Don't redirect from login to dashboard here - let the page handle it
  // This avoids redirect loops when the session cookie exists but is invalid

  const headers = new Headers(request.headers);
  // The page being requested, for requireAuth to send a signed-out visitor back to it. Excludes Next's _rsc param.
  headers.set('x-pathname', pathname);
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
     * Match all request paths except:
     * - api (API routes)
     * - _next/static, _next/image, favicon.ico
     * - static public folders (icons, brand, banks, images, splash, handbook) and the service worker (serwist, sw.js)
     * - manifest.webmanifest and any path with a file extension (public files), which are all public anyway
     * Page routes have no dot, so auth runs for every page exactly as before.
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|icons/|brand/|banks/|images/|splash/|handbook(?:/|$)|serwist(?:/|$)|manifest\\.webmanifest|.*\\.[^/]+$).*)',
  ],
};
