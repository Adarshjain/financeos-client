import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { formatDate, formatMoney } from '@/lib/utils';

import { CounterpartyLedgerTable, type LendingEntryWithBalance } from '../CounterpartyLedgerTable';

function makeEntry(overrides: Partial<LendingEntryWithBalance> = {}): LendingEntryWithBalance {
  return {
    id: 'l1',
    counterpartyId: 'cp1',
    counterpartyName: 'Rahul',
    amount: 500,
    direction: 'lent',
    entryDate: '2026-01-05',
    createdAt: '2026-01-05T00:00:00Z',
    runningBalance: 500,
    ...overrides,
  };
}

describe('CounterpartyLedgerTable + TransactionLinkCell', () => {
  it('renders the linked-transaction summary (account · date, signed-amount title) in both the mobile card and desktop row', () => {
    const entry = makeEntry({
      transaction: { id: 'tx-1', accountId: 'acc1', accountName: 'HDFC Savings', date: '2026-01-05', signedAmount: -500 },
    });

    render(
      <CounterpartyLedgerTable
        cpName="Rahul"
        entries={[entry]}
        onOpenAddEntry={vi.fn()}
        onOpenEditEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
      />,
    );

    const cells = screen.getAllByTitle(`-${formatMoney(500)}`);
    expect(cells).toHaveLength(2);
    cells.forEach((cell) => {
      expect(cell).toHaveTextContent(`HDFC Savings · ${formatDate('2026-01-05')}`);
    });
  });

  it('renders a Link button that opens the edit dialog for an unlinked entry', () => {
    const entry = makeEntry({ id: 'l2' });
    const onOpenEditEntry = vi.fn();

    render(
      <CounterpartyLedgerTable
        cpName="Rahul"
        entries={[entry]}
        onOpenAddEntry={vi.fn()}
        onOpenEditEntry={onOpenEditEntry}
        onDeleteEntry={vi.fn()}
      />,
    );

    const linkButtons = screen.getAllByRole('button', { name: 'Link' });
    expect(linkButtons).toHaveLength(2);

    linkButtons[0].click();
    expect(onOpenEditEntry).toHaveBeenCalledWith(entry);
  });

  it('shows the split hint on both entries sharing a transaction, formatted via formatMoney', () => {
    const sharedTx = { id: 'tx-shared', accountId: 'acc1', accountName: 'Shared Acct', date: '2026-02-01', signedAmount: -500 };
    const entryA = makeEntry({ id: 'l3', amount: 300, transaction: sharedTx });
    const entryB = makeEntry({ id: 'l4', amount: 250, transaction: sharedTx });

    render(
      <CounterpartyLedgerTable
        cpName="Rahul"
        entries={[entryA, entryB]}
        onOpenAddEntry={vi.fn()}
        onOpenEditEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
      />,
    );

    const splitHint = `split: ${formatMoney(550)} of ${formatMoney(500)}`;
    expect(screen.getAllByText(splitHint)).toHaveLength(4);
  });

  it('shows no split hint for a single entry linked to its own transaction', () => {
    const entry = makeEntry({
      transaction: { id: 'tx-solo', accountId: 'acc1', accountName: 'Solo Acct', date: '2026-01-05', signedAmount: -500 },
    });

    render(
      <CounterpartyLedgerTable
        cpName="Rahul"
        entries={[entry]}
        onOpenAddEntry={vi.fn()}
        onOpenEditEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
      />,
    );

    expect(screen.queryByText(/split:/)).not.toBeInTheDocument();
  });
});
