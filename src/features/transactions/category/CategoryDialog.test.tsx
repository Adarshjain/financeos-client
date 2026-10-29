import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { buildRequest, valuesFromTransaction } from '../form/transactionFormModel';
import { CategoryDialog } from './CategoryDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const update = vi.fn();
vi.mock('../form/useTransactionMutations', () => ({
  useTransactionMutations: () => ({
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: update, isPending: false },
  }),
}));

const categories = vi.hoisted(() => [
  { id: 'c1', name: 'Groceries' },
  { id: 'c2', name: 'Transport' },
]);
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: categories }) }));

const stored = {
  id: 't1',
  accountId: 'cc1',
  cardId: 'k1',
  date: '2026-10-12',
  amount: -3600,
  description: 'BigBasket',
  source: 'gmail_transaction_alert',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['UNRECONCILED', 'DATE_CORRECTED'],
  isTransactionExcluded: true,
  isTransactionUnderMonitoring: true,
  monitoringReason: 'watch',
  mcc: '5411',
  settlementDate: '2026-10-15',
  instantDiscount: 20,
  convenienceFee: 5,
  channel: 'ONLINE',
  isEmi: true,
  isInternational: false,
  categories: [{ id: 'c1', name: 'Groceries' }],
  createdAt: '',
} as unknown as Transaction;

const onClose = vi.fn();
const setup = () => renderWithQuery(<CategoryDialog transaction={stored} onClose={onClose} />);

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({});
});

describe('CategoryDialog', () => {
  it('shows Set category with the current categories preselected', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Set category' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Categories/ })).toHaveTextContent('Groceries');
  });

  it('saves through the Edit update with every other field as stored and only the categories replaced', async () => {
    setup();
    fireEvent.click(screen.getByRole('combobox', { name: /^Categories/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Transport/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Set category' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const expected = buildRequest(valuesFromTransaction(stored), {
      isUpdate: true,
      source: stored.source,
      categoryIds: ['c1', 'c2'],
      supportsCards: true,
    });
    const { id, body } = update.mock.calls[0][0];
    expect(id).toBe('t1');
    expect(body).toEqual(expected);
    expect(body).toMatchObject({
      cardId: 'k1',
      reviewType: 'NEEDS_REVIEW',
      reviewReasons: ['UNRECONCILED', 'DATE_CORRECTED'],
      isTransactionExcluded: true,
      isTransactionUnderMonitoring: true,
      mcc: '5411',
      amount: -3600,
      categoryIds: ['c1', 'c2'],
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(router.refresh).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Transaction saved');
  });

  it('closes on Cancel without a request', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the error when saving fails', async () => {
    update.mockRejectedValue(new Error('Boom'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Set category' }));
    expect(await screen.findByText("Couldn't save the category. Try again.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Set category' })).toBeInTheDocument();
  });
});
