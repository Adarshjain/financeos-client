import { describe, expect, it } from 'vitest';

import { appHref, DS_HOME_HREF, loginHrefFor, rootRedirectFor } from './routes';

describe('appHref', () => {
  it.each([
    ['/login', '/login'],
    ['/signup', '/signup'],
    ['/offline', '/offline'],
    ['/inbox', '/inbox'],
    ['/upcoming', '/upcoming'],
    ['/upcoming/calendar', '/upcoming/calendar'],
    ['/inbox/updates', '/inbox/updates'],
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
    ['/home', '/home'],
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
    ['/rules', '/transactions/tags'],
    ['/rules/categories', '/transactions/tags'],
    ['/transactions/rules', '/transactions/tags'],
    ['/dashboard', '/home'],
    ['/notifications', '/inbox/updates'],
    ['/loans/lendings', '/lending'],
    ['/loans/lendings/p-1', '/lending/p-1'],
    ['/rewards/recommend', '/rewards/which-card'],
    ['/settings/ingest', '/transactions/import'],
    ['/loans/calendar', '/upcoming'],
  ])('maps the old path %s', (from, to) => expect(appHref(from)).toBe(to));

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

  it('keeps the query and hash of a moved page', () => {
    expect(appHref('/settings/ingest?x=1#h')).toBe('/transactions/import?x=1#h');
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

  it('passes non-page paths through', () => {
    for (const p of ['/api/v1/x', '/auth/google/callback', '/handbook', '/storybook', '/serwist/sw.js', '/icons/a.png', '/brand/g.svg', '/manifest.webmanifest']) {
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

describe('rootRedirectFor', () => {
  it('sends an alias to its Dinero page with the query', () => {
    expect(rootRedirectFor('/rules', '')).toBe('/transactions/tags');
    expect(rootRedirectFor('/dashboard', '?x=1')).toBe('/home?x=1');
    expect(rootRedirectFor('/notifications', '?page=2')).toBe('/inbox/updates?page=2');
    expect(rootRedirectFor('/loans/lendings', '?q=a')).toBe('/lending?q=a');
    expect(rootRedirectFor('/loans/lendings/p-1', '?tab=x')).toBe('/lending/p-1?tab=x');
    expect(rootRedirectFor('/settings/gmail', '?focus=attention')).toBe('/settings/connections?focus=attention');
  });

  it('sends Needs review to the filter', () => {
    expect(rootRedirectFor('/transactions/review', '?account=a1')).toBe('/transactions?review=needs_review&account=a1');
  });

  it('sends the old ingest and calendar pages to their replacements', () => {
    expect(rootRedirectFor('/settings/ingest', '?x=1')).toBe('/transactions/import?x=1');
    expect(rootRedirectFor('/loans/calendar', '')).toBe('/upcoming');
  });

  it('leaves pages and non-pages alone, /legacy included (it is a 404)', () => {
    for (const p of ['/accounts', '/transactions', '/loans', '/loans/abc', '/dashboards', '/legacy/rules', '/api/rules', '/nope']) {
      expect(rootRedirectFor(p, '')).toBeNull();
    }
  });
});

describe('DS_HOME_HREF', () => {
  it('is the home page', () => {
    expect(DS_HOME_HREF).toBe('/home');
  });
});

describe('loginHrefFor', () => {
  it('sends a Dinero page to the Dinero login and back to the same page', () => {
    expect(loginHrefFor('/loans')).toBe('/login?from=%2Floans');
    expect(loginHrefFor('/transactions/abc')).toBe('/login?from=%2Ftransactions%2Fabc');
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
  });
});
