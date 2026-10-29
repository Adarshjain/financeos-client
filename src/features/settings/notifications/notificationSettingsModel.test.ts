import { describe, expect, it } from 'vitest';

import type { NotificationSettingsResponse } from '@/lib/api/types';

import { addedOn, describeBrowser, hourLabel, isKindEnabled, isThisDevice, offsetLabel, offsetsSummary, toggleOffset } from './notificationSettingsModel';

describe('notificationSettings.helpers', () => {
  it('labels offsets and hours', () => {
    expect(offsetLabel(0)).toBe('On the day');
    expect(offsetLabel(1)).toBe('1 day before');
    expect(offsetLabel(7)).toBe('7 days before');
    expect(hourLabel(0)).toBe('12:00 am');
    expect(hourLabel(9)).toBe('9:00 am');
    expect(hourLabel(12)).toBe('12:00 pm');
    expect(hourLabel(21)).toBe('9:00 pm');
  });

  it('toggles offsets keeping them descending and unique', () => {
    expect(toggleOffset([7, 3, 1, 0], 3)).toEqual([7, 1, 0]);
    expect(toggleOffset([7, 1], 14)).toEqual([14, 7, 1]);
    expect(toggleOffset([0], 0)).toEqual([]);
  });

  it('treats absent kinds as enabled', () => {
    const settings = { kinds: { BILL_OVERDUE: false } } as unknown as NotificationSettingsResponse;
    expect(isKindEnabled(settings, 'BILL_OVERDUE')).toBe(false);
    expect(isKindEnabled(settings, 'STATEMENT_RECEIVED')).toBe(true);
    expect(isKindEnabled({} as NotificationSettingsResponse, 'BILL_DUE_REMINDER')).toBe(true);
  });

  it('matches this device by endpoint', () => {
    expect(isThisDevice('https://a', 'https://a')).toBe(true);
    expect(isThisDevice('https://a', 'https://b')).toBe(false);
    expect(isThisDevice('https://a', null)).toBe(false);
  });
});

describe('notificationSettings.helpers kinds', () => {
  it('groups every switch by module in display order', async () => {
    const { KIND_GROUPS, KIND_OPTIONS } = await import('./notificationSettingsModel');
    expect(KIND_GROUPS.map((g) => g.title)).toEqual([
      'Credit cards',
      'Transactions',
      'Loans and lendings',
      'Rewards',
      'Gmail',
      'Imports and jobs',
    ]);
    expect(KIND_OPTIONS.map((k) => k.key)).toEqual([
      'STATEMENT_RECEIVED',
      'BILL_DUE_REMINDER',
      'BILL_OVERDUE',
      'STATEMENT_EXPECTED',
      'STATEMENT_REVIEW_DIGEST',
      'EMI_DUE_REMINDER',
      'EMI_OVERDUE',
      'LENDING_RETURN',
      'REWARD_MILESTONE',
      'REWARD_CAP',
      'GMAIL_RECONNECT',
      'GMAIL_ATTENTION',
      'JOB_FINISHED',
    ]);
    for (const kind of KIND_OPTIONS) {
      expect(kind.label.length).toBeGreaterThan(0);
      expect(kind.description.length).toBeGreaterThan(0);
    }
  });
});

describe('this-browser naming', () => {
  const chromeMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

  it('names the browser and OS from the user agent', () => {
    expect(describeBrowser(chromeMac)).toBe('Chrome on macOS');
    expect(describeBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1')).toBe('Safari on iOS');
  });

  it('falls back to Browser', () => {
    expect(describeBrowser('')).toBe('Browser');
  });

  it('formats the added date as 2 Sep and tolerates a missing one', () => {
    expect(addedOn('2026-09-02T05:00:00Z')).toBe('2 Sep');
    expect(addedOn(null)).toBe('');
    expect(addedOn('nonsense')).toBe('');
  });
});

describe('offsetsSummary', () => {
  it('lists days before, largest first, then the day itself', () => {
    expect(offsetsSummary([1, 7, 0, 3])).toBe('7, 3, 1 days · on the day');
  });
  it('reads singular for one day and capitalises a lone "on the day"', () => {
    expect(offsetsSummary([1])).toBe('1 day');
    expect(offsetsSummary([0])).toBe('On the day');
    expect(offsetsSummary([14])).toBe('14 days');
  });
});
