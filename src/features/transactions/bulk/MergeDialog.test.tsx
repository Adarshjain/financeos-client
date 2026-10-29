import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/api/server', () => ({ serverApi: { POST: vi.fn() } }));
const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...a: unknown[]) => showToast(...a),
}));

import type { Account } from '@/lib/account.types';
import { serverApi as api } from '@/lib/api/server';
import type { Transaction } from '@/lib/transaction.types';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { MergeDialog } from './MergeDialog';

pinClock();

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
    expect(screen.getAllByText('1,249')).toHaveLength(2);
    expect(screen.getAllByText('11 Oct')).toHaveLength(2);
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

  it('a real pointer click on the row text switches the keeper, and the keyboard does too', async () => {
    merged();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    setup([alert, statement]);
    await user.click(screen.getByText('Swiggy'));
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    radios[1].focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    await user.click(screen.getByRole('button', { name: 'Merge and resolve' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(vi.mocked(api.POST).mock.calls[0][1]).toEqual({ body: { keepId: 'stmt', deleteId: 'alert' } });
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
    expect(screen.getByText('Cross-account merge blocked')).toBeInTheDocument();
    expect(screen.getByText(/HDFC Regalia vs SBI Cashback/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge and resolve' })).toBeDisabled();
  });

  it('warns, without blocking, on opposite directions', () => {
    setup([alert, { ...statement, amount: 1249 }]);
    expect(screen.getByText('Direction mismatch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge and resolve' })).toBeEnabled();
  });

  it('warns on different amounts', () => {
    setup([alert, { ...statement, amount: -1300 }]);
    expect(screen.getByText('Amount mismatch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge and resolve' })).toBeEnabled();
  });

  it('Cancel closes without merging', () => {
    const { onClose } = setup([alert, statement]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });
});
