import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPaths = ['/login', '/auth/google/callback'];

export function middleware(request: NextRequest) {
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
