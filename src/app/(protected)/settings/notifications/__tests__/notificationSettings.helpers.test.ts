import { describe, expect, it } from 'vitest';

import type { NotificationSettingsResponse } from '@/lib/api/types';

import { hourLabel, isKindEnabled, isThisDevice, offsetLabel, toggleOffset } from '../components/notificationSettings.helpers';

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
    const { KIND_GROUPS, KIND_OPTIONS } = await import('../components/notificationSettings.helpers');
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
