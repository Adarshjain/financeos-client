import { describe, expect, it } from 'vitest';

import { cycleSummaryDaysUntilDue } from '../statements-dialog/cycleSummaryDue';

describe('cycleSummaryDaysUntilDue', () => {
  it('shows nothing while the bill is still loading, even when the summary date is past', () => {
    expect(cycleSummaryDaysUntilDue(-5, { status: 'pending', bill: null })).toBeNull();
  });

  it('shows nothing when the bill failed to load, since payment state is unknown', () => {
    expect(cycleSummaryDaysUntilDue(-5, { status: 'error', bill: null })).toBeNull();
  });

  it('falls back to the summary days once the bill has loaded and there is none', () => {
    expect(cycleSummaryDaysUntilDue(10, { status: 'success', bill: null })).toBe(10);
  });

  it('shows nothing when there is no bill and the summary has no due date', () => {
    expect(cycleSummaryDaysUntilDue(null, { status: 'success', bill: null })).toBeNull();
    expect(cycleSummaryDaysUntilDue(undefined, { status: 'success', bill: null })).toBeNull();
  });

  it.each(['PAID', 'NO_DUE', 'AWAITING_STATEMENT', 'DUE_UNKNOWN'] as const)(
    'shows nothing for a %s bill whose due date has passed',
    (status) => {
      expect(cycleSummaryDaysUntilDue(-5, { status: 'success', bill: { status, daysUntilDue: -5 } })).toBeNull();
    },
  );

  it.each([
    ['OVERDUE', -5],
    ['OPEN', 4],
    ['PARTIAL', 0],
  ] as const)('counts a %s bill with the bill days', (status, days) => {
    expect(cycleSummaryDaysUntilDue(99, { status: 'success', bill: { status, daysUntilDue: days } })).toBe(days);
  });

  it('shows nothing for an open bill without a due date', () => {
    expect(cycleSummaryDaysUntilDue(3, { status: 'success', bill: { status: 'OPEN', daysUntilDue: null } })).toBeNull();
  });
});
