import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DividendReceiptCell, receiptVariance } from '../DividendReceiptCell';
import { makeDividend } from './fixtures';

const linked = (signedAmount: number, extra = {}) =>
  makeDividend({
    receiptStatus: 'received',
    amount: 1000,
    tds: 100,
    transaction: { id: 'tx-1', accountName: 'HDFC Savings', date: '2026-03-10', signedAmount },
    ...extra,
  });

describe('DividendReceiptCell', () => {
  it('shows only the badge when unlinked', () => {
    render(<DividendReceiptCell dividend={makeDividend({ receiptStatus: 'awaiting' })} />);
    expect(screen.getByText('Awaiting')).toBeInTheDocument();
    expect(screen.queryByText(/HDFC/)).not.toBeInTheDocument();
    expect(screen.queryByText(/vs expected/)).not.toBeInTheDocument();
  });

  it('shows the received line and no variance hint when the credit equals expected net', () => {
    render(<DividendReceiptCell dividend={linked(900)} />);
    expect(screen.getByText('+₹900.00 · HDFC Savings · 10 Mar 26')).toBeInTheDocument();
    expect(screen.queryByText(/vs expected/)).not.toBeInTheDocument();
  });

  it('tolerates a gap of up to ₹1', () => {
    render(<DividendReceiptCell dividend={linked(899.5)} />);
    expect(screen.queryByText(/vs expected/)).not.toBeInTheDocument();
  });

  it('shows a ± hint when the gap exceeds ₹1 (either direction)', () => {
    const { rerender } = render(<DividendReceiptCell dividend={linked(800)} />);
    expect(screen.getByText('±₹100.00 vs expected')).toBeInTheDocument();
    rerender(<DividendReceiptCell dividend={linked(950)} />);
    expect(screen.getByText('±₹50.00 vs expected')).toBeInTheDocument();
  });

  it('treats a missing TDS as zero and falls back to a generic account label', () => {
    const d = linked(1000, {
      tds: undefined,
      transaction: { id: 'tx-1', date: '2026-03-10', signedAmount: 1000 },
    });
    render(<DividendReceiptCell dividend={d} />);
    expect(screen.getByText('+₹1,000.00 · Account · 10 Mar 26')).toBeInTheDocument();
    expect(screen.queryByText(/vs expected/)).not.toBeInTheDocument();
  });
});

describe('receiptVariance', () => {
  it('is null for unlinked dividends', () => {
    expect(receiptVariance(makeDividend())).toBeNull();
  });
  it('returns the signed gap beyond tolerance', () => {
    expect(receiptVariance(linked(850))).toBe(-50);
  });
});
