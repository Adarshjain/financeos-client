import { describe, expect, it } from 'vitest';

import { buildJobsFilterUrl } from '../jobUtils';

const base = { statusFilter: '', typeFilter: '', size: 20 };

describe('buildJobsFilterUrl targets /settings/activity', () => {
  it('has no query for default state', () => {
    expect(buildJobsFilterUrl(base)).toBe('/legacy/settings/activity');
  });

  it('uses the base of the page that asks (the Dinero Activity tab) instead of the Legacy page', () => {
    expect(buildJobsFilterUrl(base, { newType: 'X' }, { base: '/settings/activity' })).toBe('/settings/activity?type=X');
  });

  it('includes status, type and non-default size', () => {
    expect(buildJobsFilterUrl({ statusFilter: 'FAILED', typeFilter: 'GMAIL_SYNC', size: 50 })).toBe(
      '/legacy/settings/activity?status=FAILED&type=GMAIL_SYNC&size=50',
    );
  });

  it('overrides replace current filters and page > 0 is included', () => {
    expect(buildJobsFilterUrl({ ...base, statusFilter: 'FAILED' }, { newStatus: '', newType: 'X', newPage: 3 })).toBe(
      '/legacy/settings/activity?type=X&page=3',
    );
  });

  it('omits page 0', () => {
    expect(buildJobsFilterUrl(base, { newPage: 0 })).toBe('/legacy/settings/activity');
  });
});
