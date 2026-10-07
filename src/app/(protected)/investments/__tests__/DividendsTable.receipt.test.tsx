import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/transactions/TransactionPicker', () => ({
  TransactionPicker: () => <div data-testid="picker" />,
}));

import { DividendsTable } from '@/app/(protected)/investments/DividendsTable';
import { renderWithQuery } from '@/test/renderWithQuery';

import { makeDividend } from '../dividend-receipts/__tests__/fixtures';

function renderTable(dividends: ReturnType<typeof makeDividend>[]) {
  return renderWithQuery(<DividendsTable dividends={dividends} accounts={[]} brokerAccounts={[]} />);
}

describe('DividendsTable receipt column', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds a Receipt column header on desktop', () => {
    renderTable([makeDividend()]);
    expect(screen.getByRole('columnheader', { name: 'Receipt' })).toBeInTheDocument();
  });

  it('renders the badge for an unlinked dividend (desktop + mobile card) without a received line', () => {
    renderTable([makeDividend({ receiptStatus: 'overdue' })]);
    // One in the desktop table, one in the mobile card.
    expect(screen.getAllByText('Overdue')).toHaveLength(2);
    expect(screen.queryByText(/vs expected/)).not.toBeInTheDocument();
  });

  it('renders the received line for a linked dividend in both layouts', () => {
    renderTable([
      makeDividend({
        receiptStatus: 'received',
        amount: 1000,
        tds: 100,
        transaction: { id: 'tx-1', accountName: 'HDFC Savings', date: '2026-03-10', signedAmount: 900 },
      }),
    ]);
    expect(screen.getAllByText('+₹900.00 · HDFC Savings · 10 Mar 26')).toHaveLength(2);
    expect(screen.queryByText(/vs expected/)).not.toBeInTheDocument();
  });

  it('shows the variance hint when the credit differs from expected net by more than ₹1', () => {
    renderTable([
      makeDividend({
        receiptStatus: 'received',
        amount: 1000,
        tds: 100,
        transaction: { id: 'tx-1', accountName: 'HDFC Savings', date: '2026-03-10', signedAmount: 800 },
      }),
    ]);
    expect(screen.getAllByText('±₹100.00 vs expected')).toHaveLength(2);
  });
});
