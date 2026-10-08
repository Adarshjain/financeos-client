import { describe, expect, it } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';

import { billCardLabel, billDueText, billStatusLabel, billStatusTone, countActionable } from '../bills.helpers';

const base = { accountName: 'HDFC Regalia', last4: '4321' } as CardBillResponse;

describe('bills.helpers', () => {
  it('labels and tones every status', () => {
    expect(billStatusLabel('OVERDUE')).toBe('Overdue');
    expect(billStatusLabel('PAID')).toBe('Paid');
    expect(billStatusLabel('PARTIAL')).toBe('Partly paid');
    expect(billStatusLabel('NO_DUE')).toBe('Nothing due');
    expect(billStatusLabel('DUE_UNKNOWN')).toBe('Due date missing');
    expect(billStatusLabel('OPEN')).toBe('Due');

    expect(billStatusTone('OVERDUE')).toBe('destructive');
    expect(billStatusTone('PAID')).toBe('success');
    expect(billStatusTone('NO_DUE')).toBe('success');
    expect(billStatusTone('DUE_UNKNOWN')).toBe('info');
    expect(billStatusTone('OPEN', 10)).toBe('slate');
    expect(billStatusTone('OPEN', 3)).toBe('warning');
    expect(billStatusTone('PARTIAL', 0)).toBe('warning');
  });

  it('phrases the due state', () => {
    expect(billDueText({ status: 'OPEN', daysUntilDue: 0 })).toBe('Due today');
    expect(billDueText({ status: 'OPEN', daysUntilDue: 1 })).toBe('Due tomorrow');
    expect(billDueText({ status: 'PARTIAL', daysUntilDue: 5 })).toBe('Due in 5 days');
    expect(billDueText({ status: 'OPEN', daysUntilDue: null })).toBe('Due');
    expect(billDueText({ status: 'OVERDUE', daysUntilDue: -1 })).toBe('Overdue by 1 day');
    expect(billDueText({ status: 'OVERDUE', daysUntilDue: -4 })).toBe('Overdue by 4 days');
    expect(billDueText({ status: 'OVERDUE', daysUntilDue: null })).toBe('Overdue by 1 day');
    expect(billDueText({ status: 'PAID', daysUntilDue: 3 })).toBe('Paid');
    expect(billDueText({ status: 'NO_DUE', daysUntilDue: 3 })).toBe('Nothing to pay this cycle');
    expect(billDueText({ status: 'DUE_UNKNOWN', daysUntilDue: null })).toBe('Set the due date to start reminders');
  });

  it('labels the card and counts what still needs attention', () => {
    expect(billCardLabel(base)).toBe('HDFC Regalia ••4321');
    expect(billCardLabel({ accountName: 'Amex', last4: null })).toBe('Amex');
    const bills = ['OVERDUE', 'OPEN', 'PARTIAL', 'DUE_UNKNOWN', 'PAID', 'NO_DUE'].map(
      (status) => ({ ...base, status }) as CardBillResponse,
    );
    expect(countActionable(bills)).toBe(4);
  });
});
