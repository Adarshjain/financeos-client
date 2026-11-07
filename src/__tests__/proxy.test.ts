import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, proxy } from '@/proxy';

function matchesProxy(pathname: string) {
  return new RegExp(`^${config.matcher[0]}$`).test(pathname);
}

function requestWithoutSession(pathname: string) {
  return new NextRequest(new URL(pathname, 'https://financeos.local'));
}

describe('proxy', () => {
  it('redirects an unauthenticated request for a protected page to the login page', () => {
    const response = proxy(requestWithoutSession('/accounts'));

    expect(response.headers.get('location')).toBe(
      'https://financeos.local/login?from=%2Faccounts'
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
    '/brand/google-g.svg',
  ])('serves %s without a session', (pathname) => {
    const response = proxy(requestWithoutSession(pathname));

    expect(response.headers.get('location')).toBeNull();
  });

  it.each(['/handbook', '/handbook/index.html', '/handbook/handbook.css'])(
    'serves the public system reference at %s without a session',
    (pathname) => {
      const response = proxy(requestWithoutSession(pathname));

      expect(response.headers.get('location')).toBeNull();
    }
  );

  it.each(['/login', '/signup', '/offline', '/auth/google/callback'])(
    'serves the public auth page %s without a session',
    (pathname) => {
      expect(proxy(requestWithoutSession(pathname)).headers.get('location')).toBeNull();
    }
  );

  it('sends a signed-out Dinero page visit to the login with the page to return to', () => {
    expect(proxy(requestWithoutSession('/accounts')).headers.get('location')).toBe(
      'https://financeos.local/login?from=%2Faccounts'
    );
  });

  it('keeps /ds, the review index, and protects it', () => {
    expect(proxy(requestWithoutSession('/ds')).headers.get('location')).toBe(
      'https://financeos.local/login?from=%2Fds'
    );
  });

  it('sends /locked to the login while signed out, like any protected page', () => {
    expect(proxy(requestWithoutSession('/locked')).headers.get('location')).toBe(
      'https://financeos.local/login?from=%2Flocked'
    );
  });

  it('sends the plain login for the root path', () => {
    expect(proxy(requestWithoutSession('/')).headers.get('location')).toBe('https://financeos.local/login');
  });

  describe('redirects', () => {
    const to = (pathname: string) => proxy(requestWithoutSession(pathname)).headers.get('location');

    it('sends an old /ds/<rest> URL to /<rest>, keeping the query', () => {
      expect(to('/ds/accounts?x=1')).toBe('https://financeos.local/accounts?x=1');
      expect(to('/ds/login')).toBe('https://financeos.local/login');
      expect(to('/ds/transactions/import/j1')).toBe('https://financeos.local/transactions/import/j1');
    });

    it('keeps the /ds component pages the review index links to', () => {
      for (const page of ['/ds/hero', '/ds/figures', '/ds/action-bar']) {
        expect(proxy(requestWithoutSession(page)).headers.get('location')).toBe(
          `https://financeos.local/login?from=${encodeURIComponent(page)}`,
        );
      }
    });

    it('does not turn /ds//host into a protocol-relative redirect', () => {
      expect(to('/ds//evil.com')).toBe('https://financeos.local/evil.com');
    });

    it('sends an old path to the page that replaced it, keeping the query', () => {
      expect(to('/rules')).toBe('https://financeos.local/transactions/tags');
      expect(to('/settings/gmail?focus=attention')).toBe('https://financeos.local/settings/connections?focus=attention');
      expect(to('/debug')).toBe('https://financeos.local/settings/debug');
      expect(to('/rewards/recommend')).toBe('https://financeos.local/rewards/which-card');
    });

    it('turns /transactions/review into the Needs review filter, merging the original query', () => {
      expect(to('/transactions/review?account=a1,a2&reason=UNRECONCILED&from=2026-10-01&to=2026-10-31')).toBe(
        'https://financeos.local/transactions?review=needs_review&account=a1&account=a2&reason=unreconciled&from=2026-10-01&to=2026-10-31'
      );
    });

    it('sends the old ingest and calendar pages to their replacements, keeping the query', () => {
      expect(to('/settings/ingest?x=1')).toBe('https://financeos.local/transactions/import?x=1');
      expect(to('/loans/calendar')).toBe('https://financeos.local/upcoming');
    });

    it('redirects before the auth check, with a session too', () => {
      const request = new NextRequest(new URL('/rules', 'https://financeos.local'), {
        headers: { cookie: 'FINANCEOS_SESSION=abc' },
      });
      expect(proxy(request).headers.get('location')).toBe('https://financeos.local/transactions/tags');
    });

    it.each(['/accounts', '/legacy/rules', '/legacy', '/api/v1/x', '/transactions/tags'])('leaves %s alone', (pathname) => {
      const request = new NextRequest(new URL(pathname, 'https://financeos.local'), {
        headers: { cookie: 'FINANCEOS_SESSION=abc' },
      });
      expect(proxy(request).headers.get('location')).toBeNull();
    });
  });

  it.each(['/sw.js', '/serwist/sw.js', '/icons/icon-192.png', '/brand/google-g.svg', '/banks/sprite.png', '/images/logo.png', '/splash/splash-750x1334.png', '/handbook', '/handbook/index.html', '/manifest.webmanifest', '/robots.txt', '/api/v1/auth/me', '/_next/static/chunks/a.js'])(
    'does not run the proxy for the static path %s',
    (pathname) => {
      expect(matchesProxy(pathname)).toBe(false);
    }
  );

  it.each(['/', '/login', '/accounts', '/accounts/abc-123', '/offline', '/legacy/dashboard', '/ds', '/auth/google/callback'])(
    'still runs the proxy for the page route %s',
    (pathname) => {
      expect(matchesProxy(pathname)).toBe(true);
    }
  );
});
