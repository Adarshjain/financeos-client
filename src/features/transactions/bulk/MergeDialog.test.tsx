import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { POST: vi.fn() } };
});
const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...a: unknown[]) => showToast(...a),
}));

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { MergeDialog } from './MergeDialog';

const accounts = [
  { id: 'a1', name: 'HDFC Regalia' },
  { id: 'a2', name: 'SBI Cashback' },
] as unknown as Account[];

const statement = {
  id: 'stmt',
  accountId: 'a1',
  date: '2026-10-11',
  amount: -1249,
  description: 'SWIGGY BANGALORE',
  source: 'gmail_statement',
  createdAt: '2026-10-12T00:00:00Z',
  categories: [{ id: 'c1', name: 'Food & dining' }],
  cardLast4: '7741',
} as Transaction;
const alert = { ...statement, id: 'alert', description: 'Swiggy', source: 'gmail_transaction_alert', categories: [], cardLast4: '7741' } as Transaction;

function setup(pair: readonly [Transaction, Transaction], onClose = vi.fn(), onMerged = vi.fn()) {
  renderWithQuery(<MergeDialog transactions={pair} accounts={accounts} onClose={onClose} onMerged={onMerged} />);
  return { onClose, onMerged };
}
const merged = (remainingReasons: string[] = []) =>
  vi.mocked(api.POST).mockResolvedValue({ data: { keptId: 'stmt', reviewType: 'MANUALLY_REVIEWED', remainingReasons } } as never);

beforeEach(() => vi.clearAllMocks());

describe('MergeDialog', () => {
  it('draws both cards with the board rows, the statement kept by default', () => {
    setup([alert, statement]);
    expect(screen.getByText('Merge transactions')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
    expect(screen.getByText('Delete · merge in')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,249.00')).toHaveLength(2);
    expect(screen.getAllByText('11 Oct 2026')).toHaveLength(2);
    expect(screen.getAllByText('HDFC Regalia ••7741')).toHaveLength(2);
    expect(screen.getByText('Food & dining')).toBeInTheDocument();
    expect(screen.getByText('Statement')).toBeInTheDocument();
    expect(screen.getByText('Gmail alert')).toBeInTheDocument();
    expect(screen.queryByText(/Mismatch|Blocked/)).toBeNull();
  });

  it('merges into the default keeper, toasts, closes and reports it', async () => {
    merged();
    const { onClose, onMerged } = setup([alert, statement]);
    fireEvent.click(screen.getByRole('button', { name: 'Merge and resolve' }));
    await waitFor(() => expect(onMerged).toHaveBeenCalled());
    expect(vi.mocked(api.POST).mock.calls[0]).toEqual(['/api/v1/transactions/merge', { body: { keepId: 'stmt', deleteId: 'alert' } }]);
    expect(showToast).toHaveBeenCalledWith('Transactions merged and resolved', { tone: 'success' });
    expect(onClose).toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('flips the keeper when the other card is tapped', async () => {
    merged();
    setup([alert, statement]);
    fireEvent.click(screen.getByText('Swiggy'));
    fireEvent.click(screen.getByRole('button', { name: 'Merge and resolve' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(vi.mocked(api.POST).mock.calls[0][1]).toEqual({ body: { keepId: 'alert', deleteId: 'stmt' } });
  });

  it('says what still needs review when the kept transaction keeps a reason', async () => {
    merged(['UNRECONCILED']);
    const { onMerged } = setup([alert, statement]);
    fireEvent.click(screen.getByRole('button', { name: 'Merge and resolve' }));
    await waitFor(() => expect(onMerged).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(
      'Transactions merged. The kept transaction still needs review: Unreconciled',
      { tone: 'success' },
    );
  });

  it('blocks a merge across accounts', () => {
    setup([alert, { ...statement, accountId: 'a2' }]);
    expect(screen.getByText('Cross-Account Merge Blocked')).toBeInTheDocument();
    expect(screen.getByText(/HDFC Regalia vs SBI Cashback/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge and resolve' })).toBeDisabled();
  });

  it('warns, without blocking, on opposite directions', () => {
    setup([alert, { ...statement, amount: 1249 }]);
    expect(screen.getByText('Direction Mismatch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge and resolve' })).toBeEnabled();
  });

  it('warns on different amounts', () => {
    setup([alert, { ...statement, amount: -1300 }]);
    expect(screen.getByText('Amount Mismatch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge and resolve' })).toBeEnabled();
  });

  it('Cancel closes without merging', () => {
    const { onClose } = setup([alert, statement]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });
});
