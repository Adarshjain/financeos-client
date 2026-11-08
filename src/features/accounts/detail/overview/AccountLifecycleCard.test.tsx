import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account, CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountLifecycleCard } from './AccountLifecycleCard';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
const mutations = {
  closeAccountMutation: mutation(),
  reopenAccountMutation: mutation(),
  deleteAccountMutation: mutation(),
};
vi.mock('@/features/accounts/form/useAccountFormMutations', () => ({
  useAccountFormMutations: () => mutations,
}));

const card: CreditCard = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  last4: '7741',
} as CreditCard;

const user = userEvent.setup({ pointerEventsCheck: 0 });
const click = (name: string) => fireEvent.click(screen.getAllByRole('button', { name })[0]);

function renderCard(account: Account = card) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AccountLifecycleCard account={account} />
    </QueryClientProvider>
  );
}

describe('AccountLifecycleCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const m of Object.values(mutations)) m.mutateAsync.mockReset();
  });

  it('shows Close and Delete for an open account', () => {
    renderCard();
    expect(screen.getByText('Close or delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    expect(screen.getByText(/the card drops out of active lists/)).toBeInTheDocument();
  });

  it('says account for a non-card', () => {
    renderCard({ id: 'w1', type: AccountType.GENERIC, name: 'Wallet' } as Account);
    expect(screen.getByText(/the account drops out of active lists/)).toBeInTheDocument();
  });

  it('closes on the chosen date', async () => {
    mutations.closeAccountMutation.mutateAsync.mockResolvedValue({ ...card, closedOn: '2026-10-31' });
    renderCard();
    await user.type(screen.getByRole('textbox', { name: /Closed on/ }), '31102026');
    click('Close account');
    await waitFor(() =>
      expect(mutations.closeAccountMutation.mutateAsync).toHaveBeenCalledWith({ id: 'c1', body: { closedOn: '2026-10-31' } })
    );
    expect(toast).toHaveBeenCalledWith('Account closed');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('closes without a date and shows server warnings', async () => {
    mutations.closeAccountMutation.mutateAsync.mockResolvedValue({ ...card, warnings: ['2 transactions are dated after the closing date.'] });
    renderCard();
    click('Close account');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('2 transactions are dated after the closing date.', { tone: 'warning' })
    );
    expect(mutations.closeAccountMutation.mutateAsync).toHaveBeenCalledWith({ id: 'c1', body: { closedOn: undefined } });
  });

  it('toasts an error when closing fails', async () => {
    mutations.closeAccountMutation.mutateAsync.mockRejectedValue(new Error('boom'));
    renderCard();
    click('Close account');
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('shows when a closed account closed and reopens it', async () => {
    mutations.reopenAccountMutation.mutateAsync.mockResolvedValue(card);
    renderCard({ ...card, closedOn: '2026-06-30' });
    expect(screen.getByText('Closed on 30 Jun 26')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close account' })).toBeNull();
    click('Reopen account');
    await waitFor(() => expect(mutations.reopenAccountMutation.mutateAsync).toHaveBeenCalledWith('c1'));
    expect(toast).toHaveBeenCalledWith('Account reopened');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('toasts an error when reopening fails', async () => {
    mutations.reopenAccountMutation.mutateAsync.mockRejectedValue(new Error('boom'));
    renderCard({ ...card, closedOn: '2026-06-30' });
    click('Reopen account');
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
  });

  it('confirms before deleting, then returns to the list', async () => {
    mutations.deleteAccountMutation.mutateAsync.mockResolvedValue(undefined);
    renderCard();
    click('Delete account');
    expect(await screen.findByText('Delete HDFC Regalia?')).toBeInTheDocument();
    expect(screen.getByText('Not using this account any more?')).toBeInTheDocument();
    expect(screen.getByText(/Close account is just above Delete account on this page\./)).toBeInTheDocument();
    expect(mutations.deleteAccountMutation.mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    await waitFor(() => expect(mutations.deleteAccountMutation.mutateAsync).toHaveBeenCalledWith('c1'));
    expect(toast).toHaveBeenCalledWith('Account deleted');
    expect(router.push).toHaveBeenCalledWith('/accounts');
  });

  it('does not delete when the confirm is cancelled', async () => {
    renderCard();
    click('Delete account');
    await screen.findByText('Delete HDFC Regalia?');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete HDFC Regalia?')).toBeNull());
    expect(mutations.deleteAccountMutation.mutateAsync).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('leaves the close-instead banner out for a closed account', async () => {
    renderCard({ ...card, closedOn: '2026-06-30' });
    click('Delete account');
    expect(await screen.findByText('Delete HDFC Regalia?')).toBeInTheDocument();
    expect(screen.queryByText('Not using this account any more?')).toBeNull();
  });

  it('toasts an error and stays when deleting fails', async () => {
    mutations.deleteAccountMutation.mutateAsync.mockRejectedValue(new Error('boom'));
    renderCard();
    click('Delete account');
    await screen.findByText('Delete HDFC Regalia?');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(router.push).not.toHaveBeenCalled();
  });
});
