import { describe, expect, it } from 'vitest';

import { appHref, DS_HOME_HREF, isDsPath, legacyHref, loginHrefFor, normalisePathname, rootRedirectFor } from '../routes';

describe('appHref', () => {
  it.each([
    ['/login', '/login'],
    ['/signup', '/signup'],
    ['/offline', '/offline'],
    ['/inbox', '/inbox'],
    ['/upcoming', '/upcoming'],
    ['/upcoming/calendar', '/upcoming/calendar'],
    ['/notifications', '/notifications'],
    ['/accounts', '/accounts'],
    ['/transactions', '/transactions'],
    ['/transactions?account=a1', '/transactions?account=a1'],
    ['/transactions/import?account=a1', '/transactions/import?account=a1'],
    ['/transactions/import/job-1', '/transactions/import/job-1'],
    ['/accounts/abc-123', '/accounts/abc-123'],
    ['/accounts/abc-123/cards', '/accounts/abc-123/cards'],
    ['/accounts/abc-123/rewards', '/accounts/abc-123/rewards'],
    ['/accounts/abc-123/statements', '/accounts/abc-123/statements'],
    ['/settings', '/settings'],
    ['/settings/activity', '/settings/activity'],
    ['/settings/connections', '/settings/connections'],
    ['/settings/ai', '/settings/ai'],
    ['/settings/notifications', '/settings/notifications'],
    ['/settings/debug', '/settings/debug'],
    ['/chat', '/chat'],
    ['/chat?q=hello%20there', '/chat?q=hello%20there'],
    ['/chat/c-1', '/chat/c-1'],
    ['/reports', '/reports'],
    ['/reports/new', '/reports/new'],
    ['/reports/abc-123', '/reports/abc-123'],
    ['/dashboard', '/dashboard'],
    ['/dashboards', '/dashboards'],
    ['/dashboards/new', '/dashboards/new'],
    ['/dashboards/abc-123?edit=1', '/dashboards/abc-123?edit=1'],
    ['/rewards/which-card', '/rewards/which-card'],
    ['/', '/'],
    ['/ds', '/ds'],
    ['/locked', '/locked'],
  ])('maps %s', (from, to) => expect(appHref(from)).toBe(to));

  it.each([
    ['/settings/llm-keys', '/settings/ai'],
    ['/settings/gmail', '/settings/connections'],
    ['/settings/jobs', '/settings/activity'],
    ['/debug', '/settings/debug'],
    ['/rules', '/transactions/rules'],
    ['/rules/categories', '/transactions/categories'],
    ['/rewards/recommend', '/rewards/which-card'],
  ])('maps the Legacy path %s', (from, to) => expect(appHref(from)).toBe(to));

  it('keeps query strings and hashes', () => {
    expect(appHref('/settings/activity?job=j1&type=X')).toBe('/settings/activity?job=j1&type=X');
    expect(appHref('/accounts/a1/statements?statement=s1&fy=2025')).toBe('/accounts/a1/statements?statement=s1&fy=2025');
    expect(appHref('/debug?ref=r%201')).toBe('/settings/debug?ref=r%201');
    expect(appHref('/settings/gmail?gmail=connected#top')).toBe('/settings/connections?gmail=connected#top');
    expect(appHref('/inbox#x')).toBe('/inbox#x');
    expect(appHref('/accounts?')).toBe('/accounts?');
  });

  it('tolerates a trailing slash', () => {
    expect(appHref('/accounts/')).toBe('/accounts');
    expect(appHref('/inbox/?item=k')).toBe('/inbox?item=k');
  });

  it('sends unbuilt paths to their Legacy page, keeping the query and hash', () => {
    expect(appHref('/loans/calendar')).toBe('/legacy/loans/calendar');
    expect(appHref('/settings/ingest?x=1#h')).toBe('/legacy/settings/ingest?x=1#h');
    expect(appHref('/statements')).toBe('/legacy/statements');
  });

  describe('Needs review', () => {
    it('is the Dinero Transactions filter', () => {
      expect(appHref('/transactions/review')).toBe('/transactions?review=needs_review');
    });

    it('merges the original query: account list split, reason lower-cased, dates kept', () => {
      expect(appHref('/transactions/review?account=a1,a2&reason=DUPLICATE_SUSPECT&from=2026-10-01&to=2026-10-31#x')).toBe(
        '/transactions?review=needs_review&account=a1&account=a2&reason=duplicate_suspect&from=2026-10-01&to=2026-10-31#x',
      );
    });

    it('drops an unknown reason and a review param of its own', () => {
      expect(appHref('/transactions/review?reason=NOPE&review=na')).toBe('/transactions?review=needs_review');
    });
  });

  it('does not map unbuilt children of built routes', () => {
    expect(appHref('/accounts/a1/other')).toBe('/legacy/accounts/a1/other');
    expect(appHref('/accounts/a1/cards/x')).toBe('/legacy/accounts/a1/cards/x');
    expect(appHref('/upcoming/other')).toBe('/legacy/upcoming/other');
    expect(appHref('/settings/profile')).toBe('/legacy/settings/profile');
    expect(appHref('/inbox/x')).toBe('/legacy/inbox/x');
  });

  it('does not match on prefix look-alikes', () => {
    for (const p of ['/accountsx', '/accountsx/1', '/settingsfoo', '/settings-old', '/inboxes', '/upcomingx', '/debugger', '/loginx']) {
      expect(appHref(p)).toBe(`/legacy${p}`);
    }
  });

  it('passes paths already under /legacy and non-page paths through', () => {
    for (const p of ['/legacy', '/legacy/accounts', '/api/v1/x', '/auth/google/callback', '/handbook', '/storybook', '/serwist/sw.js', '/icons/a.png', '/brand/g.svg', '/manifest.webmanifest']) {
      expect(appHref(p)).toBe(p);
    }
  });

  it('passes non-app values through', () => {
    for (const p of ['https://example.com/accounts', '//cdn.x/accounts', 'accounts', '']) {
      expect(appHref(p)).toBe(p);
    }
  });

  it('is already a Dinero path: unchanged', () => {
    expect(appHref('/accounts')).toBe('/accounts');
  });
});

describe('legacyHref', () => {
  it('puts app paths under /legacy, keeping query and hash', () => {
    expect(legacyHref('/accounts')).toBe('/legacy/accounts');
    expect(legacyHref('/accounts/a1?x=1#h')).toBe('/legacy/accounts/a1?x=1#h');
    expect(legacyHref('/rules')).toBe('/legacy/rules');
    expect(legacyHref('/accounts/')).toBe('/legacy/accounts/');
    expect(legacyHref('/')).toBe('/legacy');
  });

  it('passes through external URLs, //host, non-/ values, /legacy paths and non-page paths', () => {
    for (const p of [
      'https://example.com/accounts',
      '//cdn.x/accounts',
      'accounts',
      '',
      '/legacy',
      '/legacy/accounts',
      '/api/v1/accounts',
      '/auth/google/callback',
      '/handbook/index.html',
      '/storybook',
      '/serwist/sw.js',
      '/icons/icon-192.png',
      '/brand/g.svg',
      '/manifest.webmanifest',
    ]) {
      expect(legacyHref(p)).toBe(p);
    }
  });

  it('does not treat look-alikes as non-page paths', () => {
    expect(legacyHref('/apis')).toBe('/legacy/apis');
    expect(legacyHref('/legacyx')).toBe('/legacy/legacyx');
  });
});

describe('rootRedirectFor', () => {
  it('sends an alias to its Dinero page with the query', () => {
    expect(rootRedirectFor('/rules', '')).toBe('/transactions/rules');
    expect(rootRedirectFor('/settings/gmail', '?focus=attention')).toBe('/settings/connections?focus=attention');
  });

  it('sends Needs review to the filter', () => {
    expect(rootRedirectFor('/transactions/review', '?account=a1')).toBe('/transactions?review=needs_review&account=a1');
  });

  it('sends a Legacy-only page under /legacy', () => {
    expect(rootRedirectFor('/settings/ingest', '?x=1')).toBe('/legacy/settings/ingest?x=1');
    expect(rootRedirectFor('/loans/calendar', '')).toBe('/legacy/loans/calendar');
  });

  it('leaves Dinero pages, /legacy paths and non-pages alone', () => {
    for (const p of ['/accounts', '/transactions', '/legacy/rules', '/legacy/settings/ingest', '/api/rules', '/nope']) {
      expect(rootRedirectFor(p, '')).toBeNull();
    }
  });
});

describe('isDsPath', () => {
  it('is everything that is not under /legacy', () => {
    expect(isDsPath('/accounts')).toBe(true);
    expect(isDsPath('/')).toBe(true);
    expect(isDsPath('/ds')).toBe(true);
    expect(isDsPath('/legacy')).toBe(false);
    expect(isDsPath('/legacy/accounts')).toBe(false);
    expect(isDsPath('/legacyx')).toBe(true);
  });
});

describe('normalisePathname', () => {
  it('drops the Dinero prefix', () => {
    expect(normalisePathname('/inbox')).toBe('/inbox');
    expect(normalisePathname('/accounts/a1/rewards')).toBe('/accounts/a1/rewards');
    expect(normalisePathname('/settings')).toBe('/settings');
  });

  it('keeps the review index and root as they are', () => {
    expect(normalisePathname('/ds')).toBe('/ds');
    expect(normalisePathname('/')).toBe('/');
  });

  it('drops /legacy and leaves look-alikes alone', () => {
    expect(normalisePathname('/legacy/inbox')).toBe('/inbox');
    expect(normalisePathname('/legacy')).toBe('/');
    expect(normalisePathname('/legacyx/inbox')).toBe('/legacyx/inbox');
  });

  it('exposes the home href', () => {
    expect(DS_HOME_HREF).toBe('/dashboard');
  });
});

describe('loginHrefFor', () => {
  it('sends a Dinero page to the Dinero login and back to the same page', () => {
    expect(loginHrefFor('/loans')).toBe('/login?from=%2Floans');
    expect(loginHrefFor('/transactions/abc')).toBe('/login?from=%2Ftransactions%2Fabc');
  });

  it('sends a Legacy path to the Dinero login, with the /legacy path as from', () => {
    expect(loginHrefFor('/legacy/accounts')).toBe('/login?from=%2Flegacy%2Faccounts');
    expect(loginHrefFor('/legacy/dashboard')).toBe('/login?from=%2Flegacy%2Fdashboard');
  });

  it('keeps none, root and unknowns on the plain login', () => {
    expect(loginHrefFor('/')).toBe('/login');
    expect(loginHrefFor(null)).toBe('/login');
    expect(loginHrefFor(undefined)).toBe('/login');
    expect(loginHrefFor('')).toBe('/login');
  });

  it('never carries a path that is not a same-origin relative one', () => {
    expect(loginHrefFor('//evil.example/ds')).toBe('/login');
    expect(loginHrefFor('https://evil.example')).toBe('/login');
    expect(loginHrefFor('/ds\\evil')).toBe('/login');
    expect(loginHrefFor('/\t/evil.com')).toBe('/login');
    expect(loginHrefFor('/a\nb')).toBe('/login');
  });

  it('does not loop from the login page itself', () => {
    expect(loginHrefFor('/login')).toBe('/login');
    expect(loginHrefFor('/legacy/login')).toBe('/login');
  });
});
