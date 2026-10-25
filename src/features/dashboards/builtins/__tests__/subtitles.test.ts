import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/account.types';

import { accountTypeText, cardNameText, monthsSubtitle, stringParam, upcomingSubtitle } from '../subtitles';

const accounts = [{ id: 'a', name: 'Amex', type: 'credit_card' }] as unknown as Account[];

describe('subtitles', () => {
  it('stringParam reads only non-empty strings', () => {
    expect(stringParam({ accountId: 'a' }, 'accountId')).toBe('a');
    expect(stringParam({ accountId: '' }, 'accountId')).toBeNull();
    expect(stringParam({ accountId: 3 }, 'accountId')).toBeNull();
    expect(stringParam({}, 'accountId')).toBeNull();
  });

  it('upcoming reads the days param, else defers to the server\'s line', () => {
    expect(upcomingSubtitle({ days: 14 })).toBe('Next 14 days');
    expect(upcomingSubtitle({ days: 1 })).toBe('Next 1 day');
    expect(upcomingSubtitle({ days: '14' })).toBeNull();
    expect(upcomingSubtitle({})).toBeNull();
  });

  it('months', () => {
    expect(monthsSubtitle(6)).toBe('Last 6 months');
    expect(monthsSubtitle(1)).toBe('Last 1 month');
  });

  it('a card\'s name, "One card" until the list loads or when it is gone', () => {
    expect(cardNameText(accounts, 'a')).toBe('Amex');
    expect(cardNameText(accounts, 'gone')).toBe('One card');
    expect(cardNameText(undefined, 'a')).toBe('One card');
  });

  it('an account\'s type as the caller words it, "Account" until the list loads', () => {
    const label = () => 'Credit card';
    expect(accountTypeText(accounts, 'a', label)).toBe('Credit card');
    expect(accountTypeText(undefined, 'a', label)).toBe('Account');
    expect(accountTypeText(accounts, 'gone', label)).toBe('Account');
    expect(accountTypeText(accounts, 'a', () => undefined)).toBe('Account');
  });
});
