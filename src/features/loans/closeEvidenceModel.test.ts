import { describe, expect, it } from 'vitest';

import type { LoanCloseEvidence } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

import { closeEvidenceLines } from './closeEvidenceModel';

const evidence = (over: Partial<LoanCloseEvidence> = {}): LoanCloseEvidence => ({
  oldestUnpaidSeq: 7,
  oldestUnpaidDueDate: '2026-09-05',
  daysOverdue: 68,
  lastPaymentDate: '2026-08-05',
  lastPaymentAmount: 12000,
  settledInstallments: 6,
  totalInstallments: 24,
  outstandingPrincipal: 150000,
  ...over,
});

describe('closeEvidenceLines', () => {
  it('lists the oldest unpaid EMI, the last payment and the progress', () => {
    expect(closeEvidenceLines(evidence())).toEqual([
      `EMI #7 was due on ${formatDate('2026-09-05', 'list')} and has no payment for 68 days.`,
      `Last payment ${formatMoney(12000, { decimals: 'auto' })} on ${formatDate('2026-08-05', 'list')}.`,
      `6 of 24 EMIs paid · ${formatMoney(150000, { decimals: 'auto' })} principal left.`,
    ]);
  });
  it('says no payment was recorded when there is no last payment', () => {
    expect(closeEvidenceLines(evidence({ lastPaymentDate: null, lastPaymentAmount: null }))[1]).toBe('No payment recorded yet.');
  });
  it('leaves the amount out when only the date is known', () => {
    expect(closeEvidenceLines(evidence({ lastPaymentAmount: null }))[1]).toBe(`Last payment on ${formatDate('2026-08-05', 'list')}.`);
  });
  it('uses the singular for one day and never a negative count', () => {
    expect(closeEvidenceLines(evidence({ daysOverdue: 1 }))[0]).toContain('for 1 day.');
    expect(closeEvidenceLines(evidence({ daysOverdue: -3 }))[0]).toContain('for 0 days.');
  });
  it('is empty with no evidence', () => {
    expect(closeEvidenceLines(null)).toEqual([]);
    expect(closeEvidenceLines(undefined)).toEqual([]);
  });
});
