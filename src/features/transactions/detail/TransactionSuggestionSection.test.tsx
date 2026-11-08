import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ accept: vi.fn(), dismiss: vi.fn(), toast: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...a: unknown[]) => mocks.toast(...a),
}));
vi.mock('../link/linkActions', () => ({ acceptLinkSuggestion: mocks.accept, dismissLinkSuggestion: mocks.dismiss }));

import type { Schemas } from '@/lib/api/types';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { TransactionSuggestionSection } from './TransactionSuggestionSection';

type Suggestion = Schemas['TransactionSuggestion'];
const txn = (amount: number, suggestion: Suggestion | null): Transaction =>
  ({ id: 't-own', accountId: 'a1', date: '2026-10-12', amount, description: 'X', source: 'manual', createdAt: '', suggestion }) as Transaction;
const cand = { date: '2026-10-11', description: 'To HDFC', accountName: 'HDFC Savings', amount: 5000 };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.accept.mockResolvedValue({ success: true, data: { id: 'l1' } });
  mocks.dismiss.mockResolvedValue({ success: true, data: undefined });
});

describe('TransactionSuggestionSection', () => {
  it('shows nothing without a suggestion', () => {
    const { container } = renderWithQuery(<TransactionSuggestionSection transaction={txn(-5, null)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('transfer from the debit row links with the candidate transaction id', async () => {
    const s: Suggestion = { id: 's1', kind: 'TRANSFER', label: 'Looks like a transfer to HDFC Savings ••1234', candidates: [{ ...cand, transactionId: 'c1' }] };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(-5000, s)} />);
    expect(screen.getByText(s.label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('s1', 'c1'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Linked'));
  });

  it('transfer from the credit row links with its own transaction id', async () => {
    const s: Suggestion = { id: 's1', kind: 'TRANSFER', label: 'Looks like a transfer', candidates: [{ ...cand, transactionId: 'c1' }] };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(5000, s)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('s1', 't-own'));
  });

  it('card payment from the credit row links with its own transaction id', async () => {
    const s: Suggestion = { id: 's2', kind: 'CC_PAYMENT', label: 'Looks like your bill', candidates: [{ ...cand, transactionId: 'c1' }] };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(5000, s)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('s2', 't-own'));
    expect(screen.getByRole('button', { name: 'Not this' })).toBeInTheDocument();
  });

  it('refund links the candidate transaction and dismisses with Not a refund', async () => {
    const s: Suggestion = { id: 's3', kind: 'REFUND', label: 'Looks like a refund', candidates: [{ ...cand, transactionId: 'c9' }] };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(450, s)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('s3', 'c9'));
    fireEvent.click(screen.getByRole('button', { name: 'Not a refund' }));
    await waitFor(() => expect(mocks.dismiss).toHaveBeenCalledWith('s3'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Dismissed'));
  });

  it('lending settles by lending id; the empty 204 still succeeds', async () => {
    mocks.accept.mockResolvedValue({ success: true, data: undefined });
    const s: Suggestion = { id: 's4', kind: 'LENDING', label: 'Looks like Rahul paying back ₹5,000', candidates: [{ ...cand, lendingId: 'len1' }] };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(5000, s)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settle' }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('s4', 'len1'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Settled'));
  });

  it('several candidates each get their own action, one Not this', async () => {
    const s: Suggestion = {
      id: 's5',
      kind: 'REFUND',
      label: 'Looks like a refund',
      candidates: [
        { ...cand, transactionId: 'c1' },
        { ...cand, transactionId: 'c2' },
      ],
    };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(450, s)} />);
    expect(screen.getAllByRole('button', { name: 'Link' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Not a refund' })).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Link' })[1]);
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('s5', 'c2'));
  });

  it('a failed link shows an error toast', async () => {
    mocks.accept.mockResolvedValue({ success: false, error: { message: 'nope' } });
    const s: Suggestion = { id: 's6', kind: 'TRANSFER', label: 'Looks like a transfer', candidates: [{ ...cand, transactionId: 'c1' }] };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(-5000, s)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
  });

  it('spins the pressed action while it saves, ignores a second press, and works again after an error', async () => {
    let finish: (v: unknown) => void = () => {};
    mocks.accept.mockReturnValueOnce(new Promise((r) => (finish = r)));
    const s: Suggestion = { id: 's1', kind: 'TRANSFER', label: 'Looks like a transfer', candidates: [{ ...cand, transactionId: 'c1' }] };
    renderWithQuery(<TransactionSuggestionSection transaction={txn(-5000, s)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect((screen.getByRole('button', { name: /Link/ }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole('button', { name: 'Not this' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Link/ }));
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    finish({ success: false, error: { message: 'no', status: 500 } });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Link' }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByRole('button', { name: 'Not this' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
