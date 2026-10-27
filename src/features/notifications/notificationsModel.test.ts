import { describe, expect, it } from 'vitest';

import type { AppNotification } from '@/lib/api/types';

import { dayHeading, groupByDay, notificationHref, timeLabel, timeOrDateLabel } from './notificationsModel';

const NOW = new Date('2026-10-21T06:00:00Z'); // 11:30 IST on 21 Oct 2026

function n(over: Partial<AppNotification> & { kind: string }): AppNotification {
  return { id: 'n', title: 't', body: 'b', createdAt: '2026-10-21T04:00:00Z', read: false, refs: {}, ...over } as AppNotification;
}

describe('notificationHref', () => {
  it('job kinds open the job in Activity, or Activity when there is no job', () => {
    for (const kind of ['job_failed', 'job_finished', 'gmail_sync']) {
      expect(notificationHref(n({ kind, refs: { jobId: 'j1' } as never }))).toBe('/settings/activity?job=j1');
      expect(notificationHref(n({ kind }))).toBe('/settings/activity');
    }
  });

  it('statement_imported opens the account statements', () => {
    expect(notificationHref(n({ kind: 'statement_imported', refs: { accountId: 'a1' } as never }))).toBe(
      '/accounts/a1/statements',
    );
    expect(notificationHref(n({ kind: 'statement_imported' }))).toBeNull();
  });

  it('gmail_disconnected opens Connections', () => {
    expect(notificationHref(n({ kind: 'gmail_disconnected' }))).toBe('/settings/connections');
  });

  it('reward kinds open the account rewards, or nothing without an account', () => {
    for (const kind of ['reward_milestone', 'reward_cap']) {
      expect(notificationHref(n({ kind, refs: { accountId: 'a1' } as never }))).toBe('/accounts/a1/rewards');
      expect(notificationHref(n({ kind }))).toBeNull();
    }
  });

  it('an unknown kind is not clickable', () => {
    expect(notificationHref(n({ kind: 'something_new' }))).toBeNull();
  });
});

describe('days and times (IST)', () => {
  it('timeLabel is 12-hour IST', () => {
    expect(timeLabel('2026-10-21T08:35:00Z')).toBe('2:05 pm');
    expect(timeLabel('2026-10-20T18:35:00Z')).toBe('12:05 am');
    expect(timeLabel('2026-10-21T06:30:00Z')).toBe('12:00 pm');
  });

  it('dayHeading: Today, Yesterday, then the date, with the year only when not current', () => {
    expect(dayHeading('2026-10-21T04:00:00Z', NOW)).toBe('Today');
    expect(dayHeading('2026-10-20T10:00:00Z', NOW)).toBe('Yesterday');
    expect(dayHeading('2026-10-13T10:00:00Z', NOW)).toBe('13 Oct');
    expect(dayHeading('2025-10-13T10:00:00Z', NOW)).toBe('13 Oct 2025');
  });

  it('uses the IST day, not UTC: 00:30 IST is still the previous UTC day', () => {
    expect(dayHeading('2026-10-20T19:00:00Z', NOW)).toBe('Today');
  });

  it('groupByDay keeps order and starts a group at each new day', () => {
    const items = [
      n({ id: '1', kind: 'x', createdAt: '2026-10-21T05:00:00Z' }),
      n({ id: '2', kind: 'x', createdAt: '2026-10-21T01:00:00Z' }),
      n({ id: '3', kind: 'x', createdAt: '2026-10-20T10:00:00Z' }),
      n({ id: '4', kind: 'x', createdAt: '2026-10-13T10:00:00Z' }),
    ];
    const groups = groupByDay(items, NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', '13 Oct']);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['1', '2'], ['3'], ['4']]);
    expect(groupByDay([], NOW)).toEqual([]);
  });

  it('timeOrDateLabel: time today, date otherwise', () => {
    expect(timeOrDateLabel('2026-10-21T08:35:00Z', NOW)).toBe('2:05 pm');
    expect(timeOrDateLabel('2026-10-13T10:00:00Z', NOW)).toBe('13 Oct');
    expect(timeOrDateLabel('2025-10-13T10:00:00Z', NOW)).toBe('13 Oct 2025');
  });
});
