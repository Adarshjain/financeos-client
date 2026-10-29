import { describe, expect, it } from 'vitest';

import { TYPE_OPTIONS, typeLabel } from '@/features/jobs/jobsModel';
import type { JobResponse } from '@/lib/types';

import { activityUrl, filterChipLabel, startedByLabel, STATUS_OPTIONS } from './activityModel';

const job = (over: Partial<JobResponse>): JobResponse =>
  ({
    id: 'j1',
    type: 'GMAIL_SYNC',
    status: 'SUCCEEDED',
    triggerSource: 'USER',
    cancelRequested: false,
    attempt: 1,
    createdAt: '2026-10-20T08:36:00Z',
    startedAt: '2026-10-20T08:36:00Z',
    finishedAt: '2026-10-20T08:36:06.100Z',
    ...over,
  }) as JobResponse;

describe('filters', () => {
  it('lists every status and type with sentence-case labels', () => {
    expect(STATUS_OPTIONS.map((o) => o.label)).toEqual(['All statuses', 'Running', 'Succeeded', 'Failed', 'Cancelled']);
    expect(STATUS_OPTIONS.find((o) => o.label === 'Running')?.value).toBe('active');
    expect(TYPE_OPTIONS.map((o) => o.label)).toEqual([
      'All types',
      'Statement ingest',
      'Gmail sync',
      'Price refresh',
      'Import commit',
      'Reconcile commit',
      'Rule apply',
    ]);
    expect(typeLabel('BROKER_RECONCILE_COMMIT')).toBe('Reconcile commit');
  });

  it('labels the chip with the choice and its count', () => {
    expect(filterChipLabel('Status', STATUS_OPTIONS, '')).toBe('Status: All');
    expect(filterChipLabel('Status', STATUS_OPTIONS, 'FAILED')).toBe('Status: Failed');
    expect(filterChipLabel('Status', STATUS_OPTIONS, 'active')).toBe('Status: Running');
    expect(filterChipLabel('Status', STATUS_OPTIONS, 'SUCCEEDED')).toBe('Status: Succeeded');
    expect(filterChipLabel('Type', TYPE_OPTIONS, 'GMAIL_SYNC')).toBe('Type: Gmail sync');
  });
});

describe('activityUrl', () => {
  const base = { statusFilter: '', typeFilter: '', size: 25 };
  it('is bare at the defaults (size 25)', () => {
    expect(activityUrl(base)).toBe('/settings/activity');
  });
  it('keeps status, type, page, size and job', () => {
    expect(activityUrl({ statusFilter: 'FAILED', typeFilter: 'GMAIL_SYNC', size: 50 }, { newPage: 2, job: 'abc' })).toBe(
      '/settings/activity?status=FAILED&type=GMAIL_SYNC&page=3&size=50&job=abc',
    );
  });
  it('a filter change resets the page and drops the job', () => {
    expect(activityUrl(base, { newStatus: 'active' })).toBe('/settings/activity?status=active');
  });
  it('adds the job to a bare url', () => {
    expect(activityUrl(base, { job: 'x' })).toBe('/settings/activity?job=x');
  });
});

describe('startedByLabel', () => {
  it('says who started it', () => {
    expect(startedByLabel({ triggerSource: 'USER' })).toBe('Started by you');
    expect(startedByLabel({ triggerSource: 'CRON' })).toBe('Started automatically');
  });
});
