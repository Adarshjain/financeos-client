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

describe('/legacy/settings/ingest redirect', () => {
  it('goes to /transactions/import with no query', async () => {
    expect(await run(LegacyIngestRedirect, {})).toBe('/legacy/transactions/import');
  });

  it('preserves single-valued params', async () => {
    expect(await run(LegacyIngestRedirect, { account: 'a1', x: '2' })).toBe('/legacy/transactions/import?account=a1&x=2');
  });

  it('preserves repeated params', async () => {
    expect(await run(LegacyIngestRedirect, { tag: ['a', 'b'] })).toBe('/legacy/transactions/import?tag=a&tag=b');
  });

  it('drops undefined params and url-encodes values', async () => {
    expect(await run(LegacyIngestRedirect, { gone: undefined, q: 'a b&c' })).toBe('/legacy/transactions/import?q=a+b%26c');
  });
});

describe('/legacy/settings/jobs redirect', () => {
  it('goes to /settings/activity with no query', async () => {
    expect(await run(LegacyJobsRedirect, {})).toBe('/legacy/settings/activity');
  });

  it('preserves the filter query string', async () => {
    expect(await run(LegacyJobsRedirect, { type: 'GMAIL_SYNC', status: 'FAILED', page: '2' })).toBe(
      '/legacy/settings/activity?type=GMAIL_SYNC&status=FAILED&page=2',
    );
  });

  it('preserves repeated params', async () => {
    expect(await run(LegacyJobsRedirect, { status: ['FAILED', 'RUNNING'] })).toBe(
      '/legacy/settings/activity?status=FAILED&status=RUNNING',
    );
  });

  it('drops undefined params', async () => {
    expect(await run(LegacyJobsRedirect, { type: undefined })).toBe('/legacy/settings/activity');
  });
});
