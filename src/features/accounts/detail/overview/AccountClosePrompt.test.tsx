import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
const actions = vi.hoisted(() => ({ closeAccount: vi.fn(), dismissAccountClosePrompt: vi.fn(), reopenAccount: vi.fn() }));
vi.mock('@/features/accounts/accountActions', () => actions);
vi.mock('./BankOverview', () => ({ BankOverview: () => <div>bank overview</div> }));
vi.mock('./CardOverview', () => ({ CardOverview: () => <div>card overview</div> }));
vi.mock('./BrokerOverview', () => ({ BrokerOverview: () => <div>broker overview</div> }));
vi.mock('./WalletOverview', () => ({ WalletOverview: () => <div>wallet overview</div> }));

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AccountClosePrompt } from './AccountClosePrompt';
import { AccountOverview } from './AccountOverview';

const user = userEvent.setup();

beforeEach(() => {
  vi.clearAllMocks();
  actions.closeAccount.mockResolvedValue({ success: true, data: {} });
  actions.dismissAccountClosePrompt.mockResolvedValue({ success: true, data: undefined });
});

const account = (over: Record<string, unknown> = {}) =>
  ({ id: 'a1', name: 'Old bank', type: AccountType.BANK_ACCOUNT, ...over }) as unknown as Account;

describe('account page: Close this account?', () => {
  it('shows the notice only when suggestClose and the account is open', async () => {
    const { unmount } = renderWithQuery(await AccountOverview({ account: account({ suggestClose: true }), today: '2026-11-04' }));
    expect(screen.getByText('Close this account?')).toBeInTheDocument();
    expect(screen.getByText(/No activity for 90 days and the balance is zero\./)).toBeInTheDocument();
    unmount();
    const none = renderWithQuery(await AccountOverview({ account: account({ suggestClose: false }), today: '2026-11-04' }));
    expect(screen.queryByText('Close this account?')).toBeNull();
    none.unmount();
    renderWithQuery(await AccountOverview({ account: account(), today: '2026-11-04' }));
    expect(screen.queryByText('Close this account?')).toBeNull();
  });

  it('Close runs the account close and refreshes', async () => {
    renderWithQuery(<AccountClosePrompt accountId="a1" />);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(actions.closeAccount).toHaveBeenCalledWith('a1', { closedOn: expect.any(String) }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(actions.dismissAccountClosePrompt).not.toHaveBeenCalled();
  });

  it('Not yet calls the dismiss endpoint and refreshes', async () => {
    renderWithQuery(<AccountClosePrompt accountId="a1" />);
    await user.click(screen.getByRole('button', { name: 'Not yet' }));
    await waitFor(() => expect(actions.dismissAccountClosePrompt).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(actions.closeAccount).not.toHaveBeenCalled();
  });
});
