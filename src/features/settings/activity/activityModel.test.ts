import { describe, expect, it } from 'vitest';

import type { JobResponse } from '@/lib/types';

import {
  activityUrl,
  filterChipLabel,
  jobSubject,
  jobSummary,
  phoneLine,
  resultCell,
  startedByLabel,
  startedLabel,
  STATUS_OPTIONS,
  tookLabel,
  TYPE_OPTIONS,
  typeLabel,
} from './activityModel';

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
    expect(filterChipLabel('Status', STATUS_OPTIONS, 'FAILED', 1)).toBe('Status: Failed · 1');
    expect(filterChipLabel('Status', STATUS_OPTIONS, 'active', 0)).toBe('Status: Running · 0');
    expect(filterChipLabel('Status', STATUS_OPTIONS, 'SUCCEEDED')).toBe('Status: Succeeded');
    expect(filterChipLabel('Type', TYPE_OPTIONS, 'GMAIL_SYNC')).toBe('Type: Gmail sync');
  });
});

describe('activityUrl', () => {
  const base = { statusFilter: '', typeFilter: '', size: 25 };
  it('is bare at the defaults (size 25)', () => {
    expect(activityUrl(base)).toBe('/ds/settings/activity');
  });
  it('keeps status, type, page, size and job', () => {
    expect(activityUrl({ statusFilter: 'FAILED', typeFilter: 'GMAIL_SYNC', size: 50 }, { newPage: 2, job: 'abc' })).toBe(
      '/ds/settings/activity?status=FAILED&type=GMAIL_SYNC&page=2&size=50&job=abc',
    );
  });
  it('a filter change resets the page and drops the job', () => {
    expect(activityUrl(base, { newStatus: 'active' })).toBe('/ds/settings/activity?status=active');
  });
  it('adds the job to a bare url', () => {
    expect(activityUrl(base, { job: 'x' })).toBe('/ds/settings/activity?job=x');
  });
});

describe('startedLabel', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  it('says today, yesterday, then the date', () => {
    expect(startedLabel('2026-10-20T08:36:00Z', now)).toBe('today 14:06');
    expect(startedLabel('2026-10-19T12:42:00Z', now)).toBe('yesterday 18:12');
    expect(startedLabel('2026-10-01T16:10:00Z', now)).toBe('1 Oct 21:40');
  });
  it('is a dash for a bad date', () => {
    expect(startedLabel('nope', now)).toBe('—');
  });
});

describe('tookLabel', () => {
  it('shows seconds with one decimal', () => {
    expect(tookLabel('2026-10-20T08:00:00Z', '2026-10-20T08:00:06.100Z')).toBe('6.1 s');
    expect(tookLabel('2026-10-20T08:00:00Z', '2026-10-20T08:00:00.900Z')).toBe('0.9 s');
  });
  it('shows minutes over a minute', () => {
    expect(tookLabel('2026-10-20T08:00:00Z', '2026-10-20T08:02:05Z')).toBe('2 m 5 s');
  });
  it('is a dash without a start or an end', () => {
    expect(tookLabel(null, '2026-10-20T08:00:00Z')).toBe('—');
    expect(tookLabel('2026-10-20T08:00:00Z', null)).toBe('—');
    expect(tookLabel(undefined, undefined)).toBe('—');
  });
});

describe('jobSubject', () => {
  it('Gmail sync: the mailbox', () => {
    expect(jobSubject(job({ result: { mailbox: 'arjun@gmail.test' } }))).toBe('arjun@gmail.test');
    expect(jobSubject(job({ result: { created: 1 } }))).toBeNull();
  });
  it('statement ingest: the file name, or the file count', () => {
    const one = { filesProcessed: 1, fileDetails: [{ filename: 'HSBC.pdf' }] };
    expect(jobSubject(job({ type: 'STATEMENT_INGEST', result: one }))).toBe('HSBC.pdf');
    const two = { filesProcessed: 2, fileDetails: [{ filename: 'a.pdf' }, { filename: 'b.pdf' }] };
    expect(jobSubject(job({ type: 'STATEMENT_INGEST', result: two }))).toBe('2 files');
  });
  it('price refresh: the instruments count', () => {
    expect(jobSubject(job({ type: 'PRICE_REFRESH', result: { refreshed: 9, skipped: 1, failed: [{}] } }))).toBe('11 instruments');
    expect(jobSubject(job({ type: 'PRICE_REFRESH', result: { refreshed: 1, skipped: 0, failed: [] } }))).toBe('1 instrument');
  });
  it('rule apply: the rule name', () => {
    expect(jobSubject(job({ type: 'RULE_APPLY', result: { appliedCount: 3, ruleName: 'Swiggy' } }))).toBe('Swiggy');
  });
  it('import and reconcile commit, and jobs without a result, have none', () => {
    expect(jobSubject(job({ type: 'INVESTMENT_IMPORT_COMMIT', result: { committed: 1 } }))).toBeNull();
    expect(jobSubject(job({ type: 'BROKER_RECONCILE_COMMIT', result: { committed: 1 } }))).toBeNull();
    expect(jobSubject(job({ result: null }))).toBeNull();
  });
});

describe('jobSummary', () => {
  it('Gmail sync', () => {
    expect(jobSummary(job({ result: { processed: 4, created: 3, parked: 1, reconciled: 0, skipped: 0 } }))).toBe(
      '4 emails · 3 transactions · 1 needs attention',
    );
    expect(jobSummary(job({ result: { processed: 1, created: 1, reconciled: 0, skipped: 0 } }))).toBe('1 email · 1 transaction');
    expect(jobSummary(job({ result: { processed: 5, created: 2, failedPermanent: 1, failedRetryable: 2, reconciled: 0, skipped: 0 } }))).toBe(
      '5 emails · 2 transactions · 3 need attention',
    );
  });
  it('Gmail sync in the old format', () => {
    expect(jobSummary(job({ result: { fetched: 6, created: 2, failed: 1, reconciled: 0, skipped: 3 } }))).toBe(
      '6 emails · 2 transactions · 1 needs attention',
    );
  });
  it('statement ingest', () => {
    const result = {
      filesProcessed: 1,
      totalCreated: 8,
      totalDuplicatesFound: 0,
      fileDetails: [{ filename: 'a.pdf', status: 'SUCCESS', linesParsed: 8 }],
    };
    expect(jobSummary(job({ type: 'STATEMENT_INGEST', result }))).toBe('8 rows · 8 new');
    expect(
      jobSummary(
        job({
          type: 'STATEMENT_INGEST',
          result: {
            ...result,
            totalDuplicatesFound: 2,
            fileDetails: [
              { filename: 'a.pdf', status: 'SUCCESS', linesParsed: 8 },
              { filename: 'b.pdf', status: 'FAILED', linesParsed: 0 },
            ],
          },
        }),
      ),
    ).toBe('8 rows · 8 new · 2 duplicates · 1 failed');
  });
  it('price refresh', () => {
    expect(jobSummary(job({ type: 'PRICE_REFRESH', result: { refreshed: 11, skipped: 0, failed: [] } }))).toBe('11 updated');
    expect(jobSummary(job({ type: 'PRICE_REFRESH', result: { refreshed: 9, skipped: 1, failed: [{}] } }))).toBe(
      '9 updated · 1 skipped · 1 failed',
    );
  });
  it('import and reconcile commit', () => {
    const result = { committed: 14, skipped: 24, failed: [], skippedItems: [] };
    expect(jobSummary(job({ type: 'INVESTMENT_IMPORT_COMMIT', result }))).toBe('14 imported · 24 skipped');
    expect(jobSummary(job({ type: 'BROKER_RECONCILE_COMMIT', result: { ...result, skipped: 0, failed: [{}] } }))).toBe(
      '14 imported · 1 failed',
    );
  });
  it('rule apply', () => {
    expect(jobSummary(job({ type: 'RULE_APPLY', result: { appliedCount: 31 } }))).toBe('31 updated');
    expect(jobSummary(job({ type: 'RULE_APPLY', result: { appliedCount: 31, skippedManuallyReviewed: 2, notFound: 1 } }))).toBe(
      '31 updated · 3 left unchanged',
    );
  });
  it('is null without a result', () => {
    expect(jobSummary(job({ result: null }))).toBeNull();
  });
});

describe('resultCell', () => {
  it('running: the note and a determinate bar', () => {
    const cell = resultCell(job({ status: 'RUNNING', progressNote: 'Parsing page 2 of 3', progressCurrent: 2, progressTotal: 3 }));
    expect(cell).toEqual({ kind: 'active', note: 'Parsing page 2 of 3', progress: { value: 2, max: 3 } });
  });
  it('pending without a total: indeterminate', () => {
    expect(resultCell(job({ status: 'PENDING', progressTotal: 0 }))).toEqual({ kind: 'active', note: null, progress: null });
  });
  it('succeeded: the summary, or a dash', () => {
    expect(resultCell(job({ type: 'PRICE_REFRESH', result: { refreshed: 11, skipped: 0, failed: [] } }))).toEqual({
      kind: 'text',
      text: '11 updated',
      tone: 'ink',
    });
    expect(resultCell(job({ result: null }))).toEqual({ kind: 'text', text: '—', tone: 'ink-3' });
  });
  it('failed: the error message in danger tone, else the code', () => {
    expect(resultCell(job({ status: 'FAILED', errorMessage: 'Token expired', errorCode: 'E1' }))).toEqual({
      kind: 'text',
      text: 'Token expired',
      tone: 'danger',
    });
    expect(resultCell(job({ status: 'FAILED', errorCode: 'E1' }))).toMatchObject({ text: 'E1' });
  });
  it('cancelled: "Cancelled by you"', () => {
    expect(resultCell(job({ status: 'CANCELLED' }))).toEqual({ kind: 'text', text: 'Cancelled by you', tone: 'ink' });
  });
});

describe('phoneLine and startedByLabel', () => {
  it('joins when it started with the result', () => {
    const now = new Date();
    const j = job({ createdAt: now.toISOString(), type: 'PRICE_REFRESH', result: { refreshed: 11, skipped: 0, failed: [] } });
    expect(phoneLine(j)).toMatch(/^today \d{2}:\d{2} · 11 updated$/);
  });
  it('uses the progress note for an active job', () => {
    const j = job({ createdAt: new Date().toISOString(), status: 'RUNNING', progressNote: 'Parsing page 2 of 3' });
    expect(phoneLine(j)).toMatch(/^today \d{2}:\d{2} · Parsing page 2 of 3$/);
  });
  it('says who started it', () => {
    expect(startedByLabel({ triggerSource: 'USER' })).toBe('Started by you');
    expect(startedByLabel({ triggerSource: 'CRON' })).toBe('Started automatically');
  });
});
