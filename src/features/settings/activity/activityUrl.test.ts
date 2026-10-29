import { describe, expect, it } from 'vitest';

import { ACTIVITY_SIZE_OPTIONS } from './activityModel';
import { parseActivityUrl } from './activityUrl';

describe('parseActivityUrl', () => {
  it('reads the page (1-based in the address), size, filters and job', () => {
    const size = ACTIVITY_SIZE_OPTIONS[1] ?? ACTIVITY_SIZE_OPTIONS[0];
    expect(parseActivityUrl({ page: '3', size: String(size), status: 'FAILED', type: 'GMAIL_SYNC', job: 'j1' })).toEqual({
      page: 2,
      size,
      statusFilter: 'FAILED',
      typeFilter: 'GMAIL_SYNC',
      jobId: 'j1',
    });
  });

  it('starts on the first page with no filters and no job', () => {
    expect(parseActivityUrl({})).toMatchObject({ page: 0, statusFilter: '', typeFilter: '', jobId: null });
  });

  it('falls back to the default size for one that is not offered, and takes the first of a repeated key', () => {
    const { size } = parseActivityUrl({});
    expect(parseActivityUrl({ size: '7' }).size).toBe(size);
    expect(parseActivityUrl({ status: ['A', 'B'] }).statusFilter).toBe('A');
  });
});
