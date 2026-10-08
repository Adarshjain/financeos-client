import { describe, expect, it } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';

import { billDueText, billStatusLabel, billStatusTone, countActionable } from '../bills.helpers';

describe('bills.helpers AWAITING_STATEMENT', () => {
  it('labels, tones and phrases it', () => {
    expect(billStatusLabel('AWAITING_STATEMENT')).toBe('Awaiting statement');
    expect(billStatusTone('AWAITING_STATEMENT')).toBe('slate');
    expect(billStatusTone('AWAITING_STATEMENT', 0)).toBe('slate');
    expect(billDueText({ status: 'AWAITING_STATEMENT', daysUntilDue: 2 })).toBe('Awaiting statement');
  });

  it('is not actionable, unlike overdue/open/partial/unknown', () => {
    const mk = (status: CardBillResponse['status']) => ({ status }) as CardBillResponse;
    expect(countActionable([mk('AWAITING_STATEMENT'), mk('PAID'), mk('NO_DUE')])).toBe(0);
    expect(countActionable([mk('AWAITING_STATEMENT'), mk('OVERDUE')])).toBe(1);
    expect(countActionable([])).toBe(0);
  });

  it('Overdue by uses at least 1 day even for a non-negative daysUntilDue', () => {
    expect(billDueText({ status: 'OVERDUE', daysUntilDue: 0 })).toBe('Overdue by 1 day');
  });

  it('OPEN with negative days reads as due today', () => {
    expect(billDueText({ status: 'OPEN', daysUntilDue: -2 })).toBe('Due today');
  });
});
