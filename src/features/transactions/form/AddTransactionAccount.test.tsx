import { useQueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog, DialogBody, DialogContent } from '@/components/ds';
import type { Account } from '@/lib/account.types';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AddTransactionProvider, useAddTransaction } from './AddTransactionProvider';

const navigate = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./useTransactionMutations', () => ({
  useTransactionMutations: () => ({
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
  }),
}));
// Stable, like the query's own data.
const categories = vi.hoisted(() => [] as { id: string; name: string }[]);
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: categories }) }));
const bank = { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', balance: 0, cardholders: [] } as unknown as Account;
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  api: { GET: vi.fn(async () => ({ data: [bank] })), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));
// The real Add account form is covered by its own tests: this stand-in creates an account the way its mutation does.
vi.mock('@/features/accounts/form/ds/AccountFormDialog', () => ({
  AccountFormDialog: function FakeAccountDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: (a: Account) => void }) {
    const client = useQueryClient();
    const create = () => {
      client.setQueryData(keys.accounts.list(), [
        bank,
        { id: 'w1', type: AccountType.GENERIC, name: 'Cash wallet', balance: 0, cardholders: [] },
      ]);
      // Without onCreated the real dialog would push to the new account's page.
      if (!onCreated) navigate('/accounts/w1');
      else onCreated({ id: 'w1' } as Account);
      onClose();
    };
    return (
      <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
        <DialogContent
          size="sm"
          title="Add account dialog"
          secondary={{ label: 'Cancel account', onSelect: onClose }}
          primary={{ label: 'Create account', onSelect: create }}
        >
          <DialogBody>Account form</DialogBody>
        </DialogContent>
      </Dialog>
    );
  },
}));

function Opener() {
  const add = useAddTransaction();
  return <button onClick={() => add.open()}>open add</button>;
}

function open() {
  renderWithQuery(
    <AddTransactionProvider today="2026-10-22">
      <Opener />
    </AddTransactionProvider>,
  );
  fireEvent.click(screen.getByText('open add'));
}

describe('Add account from Add transaction', () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  it('opens the Add account dialog on top of the transaction form', async () => {
    open();
    await user.click(await screen.findByRole('combobox', { name: /^Account/ }));
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(await screen.findByText('Account form')).toBeInTheDocument();
    expect(screen.getByText('Add transaction')).toBeInTheDocument();
  });

  it('cancel returns to the form with its values intact', async () => {
    open();
    fireEvent.change(await screen.findByLabelText('Amount'), { target: { value: '75' } });
    await user.click(screen.getByRole('combobox', { name: /^Account/ }));
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel account' }));
    await waitFor(() => expect(screen.queryByText('Account form')).toBeNull());
    expect(screen.getByLabelText('Amount')).toHaveValue('75');
  });

  it('selects the account that was created', async () => {
    open();
    await user.click(await screen.findByRole('combobox', { name: /^Account/ }));
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    await user.click(await screen.findByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('Cash wallet'));
    expect(navigate).not.toHaveBeenCalled();
  });
});
