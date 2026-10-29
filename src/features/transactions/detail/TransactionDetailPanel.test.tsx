import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds';
import type { Account } from '@/lib/account.types';
import type { Transaction, TransactionLinkResponse } from '@/lib/transaction.types';
import { pinClock } from '@/test/pinClock';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { TransactionDetailPanel, type TransactionDetailPanelProps } from './TransactionDetailPanel';

pinClock();

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({
  fetchTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  fetchTransactionLinks: vi.fn(),
  createTransactionLink: vi.fn(),
  deleteTransactionLink: vi.fn(),
  deleteLoanPayment: vi.fn(),
  unlinkDividendTransaction: vi.fn(),
  linkDividendTransaction: vi.fn(),
  unlinkEpfWithdrawalTransaction: vi.fn(),
  linkEpfWithdrawalTransaction: vi.fn(),
}));
vi.mock('./transactionDetailApi', () => api);

const lending = vi.hoisted(() => ({ link: vi.fn(), unlink: vi.fn() }));
vi.mock('@/features/lendings/useLendingMutations', () => ({
  useLinkLendingTransaction: () => ({ mutateAsync: lending.link }),
  useUnlinkLendingTransaction: () => ({ mutateAsync: lending.unlink }),
}));

const accounts = [{ id: 'a1', name: 'HDFC Regalia Gold', type: 'credit_card' }] as Account[];

const txn = (over: Partial<Transaction> = {}): Transaction =>
  ({
    id: 't1',
    accountId: 'a1',
    date: '2026-10-12',
    amount: -3600,
    balance: 295030,
    description: 'BigBasket',
    sourcedDescription: 'UPI/DR/427812345678/BIGBASKET BANGALORE',
    source: 'gmail_transaction_alert',
    reviewType: 'MANUALLY_REVIEWED',
    categories: [{ id: 'c1', name: 'Groceries' }],
    createdAt: '',
    ...over,
  }) as Transaction;

const props = (over: Partial<TransactionDetailPanelProps> = {}): TransactionDetailPanelProps => ({
  transactionId: 't1',
  pageTransactions: [txn()],
  accounts,
  onOpenTransaction: vi.fn(),
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onDeleted: vi.fn(),
  ...over,
});

const link: TransactionLinkResponse = {
  id: 'l1',
  type: 'REFUND',
  note: 'refund',
  createdBy: 'USER',
  createdAt: '',
  members: [
    { transactionId: 't1', isAnchor: true, signedAmount: -3600, description: 'BigBasket', date: '2026-10-12', accountId: 'a1', roleLabel: 'Refunded purchase' },
    { transactionId: 't2', isAnchor: false, signedAmount: 240, description: 'BigBasket refund', date: '2026-10-14', accountId: 'a1', roleLabel: 'Refund' },
  ],
};

/** The action of the last toast with one. */
const toastAction = () => (toast.mock.calls.findLast((c) => c[1]?.action)?.[1] as { action: { label: string; onSelect: () => void } }).action;

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchTransactionLinks.mockResolvedValue([]);
  api.deleteTransactionLink.mockResolvedValue({});
  api.createTransactionLink.mockResolvedValue({});
  api.deleteTransaction.mockResolvedValue({});
  api.deleteLoanPayment.mockResolvedValue({});
  api.unlinkDividendTransaction.mockResolvedValue({});
  api.linkDividendTransaction.mockResolvedValue({});
  api.unlinkEpfWithdrawalTransaction.mockResolvedValue({});
  api.linkEpfWithdrawalTransaction.mockResolvedValue({});
  lending.link.mockResolvedValue({});
  lending.unlink.mockResolvedValue({});
});

describe('TransactionDetailPanel', () => {
  it('shows the name, the bank text, the amount, the balance after and the fields', () => {
    renderWithQuery(
      <TransactionDetailPanel
        {...props({
          pageTransactions: [
            txn({ mcc: '5411', cardLabel: 'Meera', cardLast4: '7742', settlementDate: '2026-10-14', channel: 'UPI' }),
          ],
        })}
      />,
    );
    expect(screen.getByText('BigBasket')).toBeInTheDocument();
    expect(screen.getByText('UPI/DR/427812345678/BIGBASKET BANGALORE')).toBeInTheDocument();
    expect(screen.getByText('₹3,600')).toBeInTheDocument();
    expect(screen.getByText('₹2,95,030.00 after')).toBeInTheDocument();
    for (const [label, value] of [
      ['Account', 'HDFC Regalia Gold'],
      ['Card', 'Meera · ••7742'],
      ['Date', 'Monday 12 October 2026'],
      ['MCC', '5411'],
      ['Source', 'Gmail alert'],
      ['Rewards', 'Settled 14 Oct · UPI'],
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Manually reviewed')).toBeInTheDocument();
  });

  it('leaves out the Card, MCC and Rewards fields when there is nothing to show', () => {
    renderWithQuery(<TransactionDetailPanel {...props()} />);
    for (const label of ['Card', 'MCC', 'Rewards', 'Links']) expect(screen.queryByText(label)).not.toBeInTheDocument();
  });

  it('shows the status words: reasons, Watching with its reason, Excluded', () => {
    renderWithQuery(
      <TransactionDetailPanel
        {...props({
          pageTransactions: [
            txn({
              reviewType: 'NEEDS_REVIEW',
              reviewReasons: ['UNRECONCILED'],
              isTransactionUnderMonitoring: true,
              monitoringReason: 'check the refund',
              isTransactionExcluded: true,
            }),
          ],
        })}
      />,
    );
    expect(screen.getAllByText('Unreconciled').length).toBeGreaterThan(0);
    expect(screen.getByText('Watching')).toBeInTheDocument();
    expect(screen.getByText('“check the refund”')).toBeInTheDocument();
    expect(screen.getByText('Excluded')).toBeInTheDocument();
  });

  it('draws a credit as money in', () => {
    renderWithQuery(<TransactionDetailPanel {...props({ pageTransactions: [txn({ amount: 18500 })] })} />);
    expect(screen.getByText('+₹18,500')).toBeInTheDocument();
  });

  it('is closed without a transaction', () => {
    renderWithQuery(<TransactionDetailPanel {...props({ transactionId: null })} />);
    expect(screen.queryByText('BigBasket')).not.toBeInTheDocument();
  });

  it('fetches a transaction that is not on the page (opened from a link)', async () => {
    api.fetchTransaction.mockResolvedValue(txn({ id: 't2', description: 'BigBasket refund', amount: 240 }));
    renderWithQuery(<TransactionDetailPanel {...props({ transactionId: 't2' })} />);
    expect(await screen.findByText('BigBasket refund')).toBeInTheDocument();
    expect(api.fetchTransaction).toHaveBeenCalledWith('t2');
  });

  it('closes from the close control', () => {
    const p = props();
    renderWithQuery(<TransactionDetailPanel {...p} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(p.onClose).toHaveBeenCalled();
  });

  describe('actions', () => {
    it('opens Edit with the transaction', () => {
      const p = props();
      renderWithQuery(<TransactionDetailPanel {...p} />);
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(p.onEdit).toHaveBeenCalledWith(p.pageTransactions[0]);
    });

    it('hides Link to… and Review while nothing is wired to them', () => {
      renderWithQuery(<TransactionDetailPanel {...props({ pageTransactions: [txn({ reviewType: 'NEEDS_REVIEW' })] })} />);
      expect(screen.queryByRole('button', { name: 'Link to…' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
    });

    it('shows Link to… when wired, and Review only for a transaction that needs review', () => {
      const onLink = vi.fn();
      const onReview = vi.fn();
      const reviewed = renderWithQuery(<TransactionDetailPanel {...props({ onLink, onReview })} />);
      expect(screen.getByRole('button', { name: 'Link to…' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
      reviewed.unmount();

      renderWithQuery(<TransactionDetailPanel {...props({ onLink, onReview, pageTransactions: [txn({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] })] })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Review' }));
      expect(onReview).toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Link to…' }));
      expect(onLink).toHaveBeenCalled();
    });

    it('hides Review on a Needs review transaction with no reason: nothing to clear', () => {
      renderWithQuery(<TransactionDetailPanel {...props({ onReview: vi.fn(), pageTransactions: [txn({ reviewType: 'NEEDS_REVIEW' })] })} />);
      expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
    });
  });

  describe('links', () => {
    const withLink = () => txn({ links: [{ linkId: 'l1', type: 'REFUND', roleLabel: 'Refunded purchase', memberCount: 2 }] });

    it('lists a linked transaction and swaps the panel to it when its name is pressed', async () => {
      api.fetchTransactionLinks.mockResolvedValue([link]);
      const p = props({ pageTransactions: [withLink()] });
      renderWithQuery(<TransactionDetailPanel {...p} />);
      expect(await screen.findByText('Links')).toBeInTheDocument();
      expect(screen.getByText('Refund · +₹240.00 · 14 Oct · HDFC Regalia Gold')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'BigBasket refund' }));
      expect(p.onOpenTransaction).toHaveBeenCalledWith('t2');
    });

    it('opens a record on its own page', async () => {
      const p = props({
        pageTransactions: [txn({ obligationRefs: [{ kind: 'LENDING', id: 'e1', parentId: 'p1', label: 'Lending · Priya Nair' }] })],
      });
      renderWithQuery(<TransactionDetailPanel {...p} />);
      expect(screen.getByRole('link', { name: 'Lending · Priya Nair' })).toHaveAttribute('href', '/loans/lendings/p1');
    });

    it('unlinks a transaction link at once and Undo links it again', async () => {
      api.fetchTransactionLinks.mockResolvedValue([link]);
      renderWithQuery(<TransactionDetailPanel {...props({ pageTransactions: [withLink()] })} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(api.deleteTransactionLink).toHaveBeenCalledWith('l1'));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Link removed', expect.anything()));
      expect(router.refresh).toHaveBeenCalled();

      toastAction().onSelect();
      await waitFor(() =>
        expect(api.createTransactionLink).toHaveBeenCalledWith({
          type: 'REFUND',
          note: 'refund',
          members: [
            { transactionId: 't1', isAnchor: true },
            { transactionId: 't2', isAnchor: false },
          ],
        }),
      );
    });

    it('unlinks a lending entry at once and Undo attaches this transaction to it again', async () => {
      renderWithQuery(
        <TransactionDetailPanel
          {...props({ pageTransactions: [txn({ obligationRefs: [{ kind: 'LENDING', id: 'e1', parentId: 'p1', label: 'Lending · Priya Nair' }] })] })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(lending.unlink).toHaveBeenCalledWith('e1'));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Ledger entry unlinked', expect.anything()));
      toastAction().onSelect();
      await waitFor(() => expect(lending.link).toHaveBeenCalledWith({ id: 'e1', transactionId: 't1' }));
    });

    it('unlinks a dividend at once and Undo links the credit again', async () => {
      renderWithQuery(
        <TransactionDetailPanel
          {...props({ pageTransactions: [txn({ amount: 1200, obligationRefs: [{ kind: 'DIVIDEND', id: 'd1', parentId: 'i1', label: 'Dividend · TCS' }] })] })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(api.unlinkDividendTransaction).toHaveBeenCalledWith('d1'));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Dividend unlinked', expect.anything()));
      toastAction().onSelect();
      await waitFor(() => expect(api.linkDividendTransaction).toHaveBeenCalledWith('d1', 't1'));
    });

    it('unlinks an EPF withdrawal at once and Undo links the credit again', async () => {
      renderWithQuery(
        <TransactionDetailPanel
          {...props({ pageTransactions: [txn({ amount: 40000, obligationRefs: [{ kind: 'EPF_WITHDRAWAL', id: 'w1', parentId: 'emp1', label: 'EPF withdrawal' }] })] })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(api.unlinkEpfWithdrawalTransaction).toHaveBeenCalledWith('w1'));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('EPF withdrawal unlinked', expect.anything()));
      toastAction().onSelect();
      await waitFor(() => expect(api.linkEpfWithdrawalTransaction).toHaveBeenCalledWith('w1', 't1'));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Linked to the EPF withdrawal'));
    });

    it('refreshes the EPF and Inbox queries after unlinking an EPF withdrawal and after Undo', async () => {
      const queryClient = createTestQueryClient();
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      renderWithQuery(
        <TransactionDetailPanel
          {...props({ pageTransactions: [txn({ amount: 40000, obligationRefs: [{ kind: 'EPF_WITHDRAWAL', id: 'w1', parentId: 'emp1', label: 'EPF withdrawal' }] })] })}
        />,
        { queryClient },
      );
      const keysOf = () => invalidate.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));
      fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(keysOf()).toContain('["epf"]'));
      expect(keysOf()).toContain('["inbox"]');
      invalidate.mockClear();
      toastAction().onSelect();
      await waitFor(() => expect(keysOf()).toContain('["epf"]'));
      expect(keysOf()).toContain('["inbox"]');
    });

    it('says so when unlinking an EPF withdrawal fails, and offers no Undo', async () => {
      api.unlinkEpfWithdrawalTransaction.mockRejectedValue(new Error('nope'));
      renderWithQuery(
        <TransactionDetailPanel
          {...props({ pageTransactions: [txn({ amount: 40000, obligationRefs: [{ kind: 'EPF_WITHDRAWAL', id: 'w1', parentId: 'emp1', label: 'EPF withdrawal' }] })] })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't unlink the EPF withdrawal. Try again.", { tone: 'danger' }));
      expect(toast).not.toHaveBeenCalledWith('EPF withdrawal unlinked', expect.anything());
    });

    it('asks before removing a loan settlement, and has no Undo (it deletes the payment)', async () => {
      renderWithQuery(
        <TransactionDetailPanel
          {...props({ pageTransactions: [txn({ obligationRefs: [{ kind: 'LOAN_PAYMENT', id: 'pay1', parentId: 'loan1', label: 'EMI #8 · HDFC car loan' }] })] })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
      expect(api.deleteLoanPayment).not.toHaveBeenCalled();
      expect(screen.getByText('Remove this settlement?')).toBeInTheDocument();
      expect(screen.getByText('The installment goes back to unpaid; the transaction stays.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      await waitFor(() => expect(api.deleteLoanPayment).toHaveBeenCalledWith('loan1', 'pay1'));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Settlement removed'));
      expect(toast.mock.calls.every((c) => !c[1]?.action)).toBe(true);
    });

    it('offers no Unlink for a loan event or charge', () => {
      renderWithQuery(
        <TransactionDetailPanel
          {...props({ pageTransactions: [txn({ obligationRefs: [{ kind: 'LOAN_EVENT', id: 'ev1', parentId: 'loan1', label: 'Prepayment' }] })] })}
        />,
      );
      expect(screen.getByText('Prepayment')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Unlink' })).not.toBeInTheDocument();
    });
  });

  describe('closing', () => {
    it('does not read a transaction that left the page while the panel is shut', async () => {
      const view = renderWithQuery(<TransactionDetailPanel {...props()} />);
      view.rerender(<TransactionDetailPanel {...props({ transactionId: null, pageTransactions: [] })} />);
      await new Promise((r) => setTimeout(r, 20));
      expect(api.fetchTransaction).not.toHaveBeenCalled();
      expect(screen.queryByText("Couldn't load this transaction.")).toBeNull();
    });

    it('after Delete, closes without asking the server for the deleted transaction or its links', async () => {
      api.fetchTransactionLinks.mockResolvedValue([link]);
      const withLink = txn({ links: [{ linkId: 'l1', type: 'REFUND', roleLabel: 'Refunded purchase', memberCount: 2 }] });
      // The parent closes the panel; the refreshed page no longer has the row.
      const onDeleted = vi.fn(() =>
        view.rerender(<TransactionDetailPanel {...props({ transactionId: null, pageTransactions: [] })} />),
      );
      const view = renderWithQuery(<TransactionDetailPanel {...props({ pageTransactions: [withLink], onDeleted })} />);
      await screen.findByText('Links');
      expect(api.fetchTransactionLinks).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(onDeleted).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 30));
      expect(api.fetchTransaction).not.toHaveBeenCalled();
      expect(api.fetchTransactionLinks).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Couldn't load this transaction.")).toBeNull();
    });

    it('shows a transaction fetched without a balance, hiding the "after" line', async () => {
      api.fetchTransaction.mockResolvedValue(txn({ id: 't2', description: 'Uber', balance: null }));
      renderWithQuery(<TransactionDetailPanel {...props({ transactionId: 't2' })} />);
      expect(await screen.findByText('Uber')).toBeInTheDocument();
      expect(screen.queryByText(/after$/)).toBeNull();
    });
  });

  describe('bank balance', () => {
    it('shows the bank line under the balance, with its figures masked when concealed', () => {
      const p = props({ pageTransactions: [txn({ balance: 288.88, bankBalance: 144.86 })] });
      const { unmount } = renderWithQuery(<TransactionDetailPanel {...p} />);
      expect(screen.getByText('Bank says ₹144.86 · differs by ₹144.02')).toBeInTheDocument();
      unmount();
      renderWithQuery(
        <ConcealProvider concealed>
          <TransactionDetailPanel {...p} />
        </ConcealProvider>,
      );
      // Like the balance line, the figures are masked by Text, the words stay
      expect(screen.getByText(/Bank says/)).toBeInTheDocument();
      expect(screen.queryByText(/144\.86/)).toBeNull();
    });

    it('has no bank line when the balance matches', () => {
      renderWithQuery(<TransactionDetailPanel {...props({ pageTransactions: [txn({ bankBalance: null })] })} />);
      expect(screen.queryByText(/Bank says/)).toBeNull();
    });
  });

  describe('delete', () => {
    it('confirms with what goes and what stays, then deletes, closes and refreshes', async () => {
      const p = props({
        pageTransactions: [
          txn({
            source: 'gmail_statement',
            obligationRefs: [{ kind: 'LENDING', id: 'e1', parentId: 'p1', label: 'Lending · Priya Nair' }],
          }),
        ],
      });
      renderWithQuery(<TransactionDetailPanel {...p} />);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      const dialog = await screen.findByRole('dialog', { name: /Delete BigBasket/ });
      expect(within(dialog).getByText('Delete BigBasket · ₹3,600.00?')).toBeInTheDocument();
      expect(within(dialog).getByText(/1 linked record stays \(Lending · Priya Nair\) but loses the link/)).toBeInTheDocument();
      expect(within(dialog).getByText(/not a manually created transaction/)).toBeInTheDocument();
      expect(api.deleteTransaction).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(api.deleteTransaction).toHaveBeenCalledWith('t1'));
      await waitFor(() => expect(p.onDeleted).toHaveBeenCalled());
      expect(toast).toHaveBeenCalledWith('Transaction deleted');
      expect(router.refresh).toHaveBeenCalled();
    });

    it('keeps the panel open when Cancel is pressed', async () => {
      const p = props();
      renderWithQuery(<TransactionDetailPanel {...p} />);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
      expect(api.deleteTransaction).not.toHaveBeenCalled();
      expect(p.onDeleted).not.toHaveBeenCalled();
    });
  });
});
