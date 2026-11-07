import { describe, expect, it } from 'vitest';

import { buildJobsFilterUrl } from '@/features/jobs/jobsFilterModel';

const base = { statusFilter: '', typeFilter: '', size: 20 };

describe('buildJobsFilterUrl targets /data-sources/sync', () => {
  it('has no query for default state', () => {
    expect(buildJobsFilterUrl(base)).toBe('/data-sources/sync');
  });

  it('uses the base of the page that asks', () => {
    expect(buildJobsFilterUrl(base, { newType: 'X' }, { base: '/settings/jobs-mirror' })).toBe('/settings/jobs-mirror?type=X');
  });

  it('includes status, type and non-default size', () => {
    expect(buildJobsFilterUrl({ statusFilter: 'FAILED', typeFilter: 'GMAIL_SYNC', size: 50 })).toBe(
      '/data-sources/sync?status=FAILED&type=GMAIL_SYNC&size=50',
    );
  });

  it('overrides replace current filters and page > 0 is included', () => {
    expect(buildJobsFilterUrl({ ...base, statusFilter: 'FAILED' }, { newStatus: '', newType: 'X', newPage: 3 })).toBe(
      '/data-sources/sync?type=X&page=4',
    );
  });

  it('omits page 0', () => {
    expect(buildJobsFilterUrl(base, { newPage: 0 })).toBe('/data-sources/sync');
  });
});
