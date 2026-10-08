import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ redirect }));

import LegacyIngestRedirect from '../ingest/page';
import LegacyJobsRedirect from '../jobs/page';

async function run(page: typeof LegacyIngestRedirect, params: Record<string, string | string[] | undefined>) {
  await page({ searchParams: Promise.resolve(params) });
  return redirect.mock.calls[redirect.mock.calls.length - 1][0] as string;
}

beforeEach(() => redirect.mockClear());

describe('/settings/ingest redirect', () => {
  it('goes to /transactions/import with no query', async () => {
    expect(await run(LegacyIngestRedirect, {})).toBe('/transactions/import');
  });

  it('preserves single-valued params', async () => {
    expect(await run(LegacyIngestRedirect, { account: 'a1', x: '2' })).toBe('/transactions/import?account=a1&x=2');
  });

  it('preserves repeated params', async () => {
    expect(await run(LegacyIngestRedirect, { tag: ['a', 'b'] })).toBe('/transactions/import?tag=a&tag=b');
  });

  it('drops undefined params and url-encodes values', async () => {
    expect(await run(LegacyIngestRedirect, { gone: undefined, q: 'a b&c' })).toBe('/transactions/import?q=a+b%26c');
  });
});

describe('/settings/jobs redirect', () => {
  it('goes to /settings/activity with no query', async () => {
    expect(await run(LegacyJobsRedirect, {})).toBe('/settings/activity');
  });

  it('preserves the filter query string', async () => {
    expect(await run(LegacyJobsRedirect, { type: 'GMAIL_SYNC', status: 'FAILED', page: '2' })).toBe(
      '/settings/activity?type=GMAIL_SYNC&status=FAILED&page=2',
    );
  });

  it('preserves repeated params', async () => {
    expect(await run(LegacyJobsRedirect, { status: ['FAILED', 'RUNNING'] })).toBe(
      '/settings/activity?status=FAILED&status=RUNNING',
    );
  });

  it('drops undefined params', async () => {
    expect(await run(LegacyJobsRedirect, { type: undefined })).toBe('/settings/activity');
  });
});
