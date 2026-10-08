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
