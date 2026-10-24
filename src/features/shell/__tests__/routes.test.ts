import { describe, expect, it } from 'vitest';

import { appHref, DS_HOME_HREF, loginHrefFor, normalisePathname } from '../routes';

describe('appHref', () => {
  it.each([
    ['/login', '/ds/login'],
    ['/signup', '/ds/signup'],
    ['/offline', '/ds/offline'],
    ['/inbox', '/ds/inbox'],
    ['/upcoming', '/ds/upcoming'],
    ['/upcoming/calendar', '/ds/upcoming/calendar'],
    ['/notifications', '/ds/notifications'],
    ['/accounts', '/ds/accounts'],
    ['/transactions', '/ds/transactions'],
    ['/transactions?account=a1', '/ds/transactions?account=a1'],
    ['/transactions/import?account=a1', '/ds/transactions/import?account=a1'],
    ['/transactions/import/job-1', '/ds/transactions/import/job-1'],
    ['/accounts/abc-123', '/ds/accounts/abc-123'],
    ['/accounts/abc-123/cards', '/ds/accounts/abc-123/cards'],
    ['/accounts/abc-123/rewards', '/ds/accounts/abc-123/rewards'],
    ['/accounts/abc-123/statements', '/ds/accounts/abc-123/statements'],
    ['/settings', '/ds/settings'],
    ['/settings/activity', '/ds/settings/activity'],
    ['/settings/connections', '/ds/settings/connections'],
    ['/settings/ai', '/ds/settings/ai'],
    ['/settings/notifications', '/ds/settings/notifications'],
    ['/settings/debug', '/ds/settings/debug'],
    ['/reports', '/ds/reports'],
  ])('maps %s', (from, to) => expect(appHref(from)).toBe(to));

  it.each([
    ['/settings/llm-keys', '/ds/settings/ai'],
    ['/settings/gmail', '/ds/settings/connections'],
    ['/settings/jobs', '/ds/settings/activity'],
    ['/debug', '/ds/settings/debug'],
  ])('maps the Legacy path %s', (from, to) => expect(appHref(from)).toBe(to));

  it('keeps query strings and hashes', () => {
    expect(appHref('/settings/activity?job=j1&type=X')).toBe('/ds/settings/activity?job=j1&type=X');
    expect(appHref('/accounts/a1/statements?statement=s1&fy=2025')).toBe('/ds/accounts/a1/statements?statement=s1&fy=2025');
    expect(appHref('/debug?ref=r%201')).toBe('/ds/settings/debug?ref=r%201');
    expect(appHref('/settings/gmail?gmail=connected#top')).toBe('/ds/settings/connections?gmail=connected#top');
    expect(appHref('/inbox#x')).toBe('/ds/inbox#x');
    expect(appHref('/accounts?')).toBe('/ds/accounts?');
  });

  it('tolerates a trailing slash', () => {
    expect(appHref('/accounts/')).toBe('/ds/accounts');
    expect(appHref('/inbox/?item=k')).toBe('/ds/inbox?item=k');
  });

  it('leaves unbuilt Legacy paths alone', () => {
    for (const p of [
      '/dashboard',
      '/transactions/review',
      '/loans/calendar',
      '/dashboards',
      '/reports/new',
      '/reports/abc-123',
      '/chat',
      '/settings/ingest',
      '/storybook',
      '/',
    ]) {
      expect(appHref(p)).toBe(p);
    }
  });

  it('does not map unbuilt children of built routes', () => {
    expect(appHref('/accounts/a1/other')).toBe('/accounts/a1/other');
    expect(appHref('/accounts/a1/cards/x')).toBe('/accounts/a1/cards/x');
    expect(appHref('/upcoming/other')).toBe('/upcoming/other');
    expect(appHref('/settings/profile')).toBe('/settings/profile');
    expect(appHref('/inbox/x')).toBe('/inbox/x');
  });

  it('does not match on prefix look-alikes', () => {
    for (const p of ['/accountsx', '/accountsx/1', '/settingsfoo', '/settings-old', '/inboxes', '/upcomingx', '/debugger', '/loginx']) {
      expect(appHref(p)).toBe(p);
    }
  });

  it('passes non-app values through', () => {
    for (const p of ['https://example.com/accounts', '//cdn.x/accounts', 'accounts', '']) {
      expect(appHref(p)).toBe(p);
    }
  });

  it('is already a Dinero path: unchanged', () => {
    expect(appHref('/ds/accounts')).toBe('/ds/accounts');
  });
});

describe('normalisePathname', () => {
  it('drops the Dinero prefix', () => {
    expect(normalisePathname('/ds/inbox')).toBe('/inbox');
    expect(normalisePathname('/ds/accounts/a1/rewards')).toBe('/accounts/a1/rewards');
    expect(normalisePathname('/ds/settings')).toBe('/settings');
  });

  it('maps the Dinero index to root', () => {
    expect(normalisePathname('/ds')).toBe('/');
    expect(normalisePathname('/ds/')).toBe('/');
  });

  it('leaves Legacy paths and look-alikes alone', () => {
    expect(normalisePathname('/inbox')).toBe('/inbox');
    expect(normalisePathname('/dsx/inbox')).toBe('/dsx/inbox');
    expect(normalisePathname('/dsx')).toBe('/dsx');
  });

  it('exposes the index href', () => {
    expect(DS_HOME_HREF).toBe('/ds');
  });
});

describe('loginHrefFor', () => {
  it('sends a Dinero page to the Dinero login and back to the same page', () => {
    expect(loginHrefFor('/ds/loans')).toBe('/ds/login?from=%2Fds%2Floans');
    expect(loginHrefFor('/ds/transactions/abc')).toBe('/ds/login?from=%2Fds%2Ftransactions%2Fabc');
  });

  it('keeps Legacy paths and unknowns on the plain login', () => {
    expect(loginHrefFor('/dashboard')).toBe('/login');
    expect(loginHrefFor(null)).toBe('/login');
    expect(loginHrefFor(undefined)).toBe('/login');
    expect(loginHrefFor('')).toBe('/login');
  });

  it('never carries a path that is not a same-origin relative one', () => {
    expect(loginHrefFor('//evil.example/ds')).toBe('/login');
    expect(loginHrefFor('https://evil.example')).toBe('/login');
    expect(loginHrefFor('/ds\\evil')).toBe('/login');
    expect(loginHrefFor('/ds/\t/evil.com')).toBe('/login');
    expect(loginHrefFor('/ds/a\nb')).toBe('/login');
  });

  it('does not loop from the login page itself', () => {
    expect(loginHrefFor('/ds/login')).toBe('/ds/login');
  });
});
