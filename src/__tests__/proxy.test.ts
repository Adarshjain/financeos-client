import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy } from '@/proxy';

function requestWithoutSession(pathname: string) {
  return new NextRequest(new URL(pathname, 'https://financeos.local'));
}

describe('proxy', () => {
  it('redirects an unauthenticated request for a protected page to the login page', () => {
    const response = proxy(requestWithoutSession('/dashboard'));

    expect(response.headers.get('location')).toBe(
      'https://financeos.local/login?from=%2Fdashboard'
    );
  });

  // Every one of these is fetched by the browser before the user has a session:
  // redirecting them to /login makes the app uninstallable and leaves the
  // service worker unable to serve its offline fallback.
  it.each([
    '/serwist/sw.js',
    '/manifest.webmanifest',
    '/offline',
    '/icons/icon-192.png',
  ])('serves %s without a session', (pathname) => {
    const response = proxy(requestWithoutSession(pathname));

    expect(response.headers.get('location')).toBeNull();
  });
});
