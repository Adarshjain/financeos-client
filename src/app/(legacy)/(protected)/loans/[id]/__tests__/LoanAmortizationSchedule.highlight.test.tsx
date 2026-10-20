import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoanAmortizationSchedule } from '../components/LoanAmortizationSchedule';
import { parseInstallmentParam } from '../installmentParam';

const installment = (seq: number, dueDate: string, status: 'settled' | 'overdue' | 'upcoming') => ({
  seq,
  dueDate,
  openingBalance: 100000,
  emi: 25000,
  interest: 1000,
  principal: 24000,
  closingBalance: 76000,
  status,
  payment: undefined,
});

// Two financial years: seq 1-2 in FY 2025-26, seq 3-4 in FY 2026-27.
const schedule = [
  installment(1, '2026-02-05', 'settled'),
  installment(2, '2026-03-05', 'settled'),
  installment(3, '2026-04-05', 'upcoming'),
  installment(4, '2026-05-05', 'upcoming'),
];

function renderSchedule(highlightSeq: number | null, expandedFYs: Record<string, boolean> = {}) {
  render(
    <LoanAmortizationSchedule
      schedule={schedule}
      expandedFYs={expandedFYs}
      onToggleFY={vi.fn()}
      currentFY="FY 2026-27"
      onOpenMarkPaid={vi.fn()}
      onUnlinkPayment={vi.fn()}
      highlightSeq={highlightSeq}
    />,
  );
}

describe('LoanAmortizationSchedule deep-link highlight', () => {
  it('opens the highlighted installment\'s financial year even when it is not the current one', () => {
    renderSchedule(2);
    // seq 2 lives in FY 2025-26, which is collapsed by default; the highlight opens it (mobile + desktop copies).
    expect(screen.getByText('FY 2025-26')).toBeInTheDocument();
    const rows = document.querySelectorAll('[data-installment-seq="2"]');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => expect(row.className).toContain('ring-amber-400/70'));
  });

  it('does not highlight anything when no installment is targeted', () => {
    renderSchedule(null);
    expect(document.querySelectorAll('[data-installment-seq="2"]')).toHaveLength(0);
    document.querySelectorAll('[data-installment-seq]').forEach((row) => {
      expect(row.className).not.toContain('ring-amber-400/70');
    });
  });

  it('a user collapsing the highlighted year still wins', () => {
    renderSchedule(2, { 'FY 2025-26': false });
    expect(document.querySelectorAll('[data-installment-seq="2"]')).toHaveLength(0);
  });

  it('ignores a highlight that is not in the schedule', () => {
    renderSchedule(99);
    document.querySelectorAll('[data-installment-seq]').forEach((row) => {
      expect(row.className).not.toContain('ring-amber-400/70');
    });
  });
});

describe('parseInstallmentParam', () => {
  it('accepts positive integers only', () => {
    expect(parseInstallmentParam('4')).toBe(4);
    expect(parseInstallmentParam(['7', '8'])).toBe(7);
    expect(parseInstallmentParam('0')).toBeNull();
    expect(parseInstallmentParam('-1')).toBeNull();
    expect(parseInstallmentParam('2.5')).toBeNull();
    expect(parseInstallmentParam('abc')).toBeNull();
    expect(parseInstallmentParam('')).toBeNull();
    expect(parseInstallmentParam(null)).toBeNull();
    expect(parseInstallmentParam(undefined)).toBeNull();
  });
});
