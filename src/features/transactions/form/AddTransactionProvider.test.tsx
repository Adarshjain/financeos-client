import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AddTransactionProvider, useAddTransaction } from './AddTransactionProvider';

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({
  useAccountDialogs: () => ({ open: vi.fn(), openEdit: vi.fn() }),
  AccountDialogs: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
const create = vi.fn();
vi.mock('./useTransactionMutations', () => ({
  useTransactionMutations: () => ({
    createMutation: { mutateAsync: create, isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
  }),
}));
const accountList = [{ id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', balance: 0, cardholders: [] }] as unknown as Account[];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accountList }) }));
const categories = vi.hoisted(() => [] as { id: string; name: string }[]);
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: categories }) }));
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  api: { GET: vi.fn(), POST: vi.fn(async () => ({ data: undefined })), PUT: vi.fn(), DELETE: vi.fn() },
}));
const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...a: unknown[]) => showToast(...a),
}));

function Opener({ accountId }: { accountId?: string }) {
  const add = useAddTransaction();
  return <button onClick={() => add.open({ defaultAccountId: accountId })}>open add</button>;
}

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({});
});

describe('AddTransactionProvider', () => {
  it('opens one Add transaction form from state, saves, toasts, refreshes and closes', async () => {
    renderWithQuery(
      <AddTransactionProvider today="2026-10-22">
        <Opener accountId="b1" />
      </AddTransactionProvider>,
    );
    expect(screen.queryByText('Add transaction')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('open add'));
    expect(screen.getAllByText('Add transaction')).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('HDFC Savings');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Add transaction')).not.toBeInTheDocument());
    expect(showToast).toHaveBeenCalledWith('Transaction saved!');
    expect(router.refresh).toHaveBeenCalled();
  });
});
