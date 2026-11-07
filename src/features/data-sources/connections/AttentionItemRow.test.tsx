import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { AttentionItem } from './attentionItemModel';
import { AttentionItemRow } from './AttentionItemRow';

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/data-sources/connections',
  useSearchParams: () => new URLSearchParams(),
}));
const account = vi.hoisted(() => ({
  data: undefined as unknown,
  isError: false,
  isSuccess: false,
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccount: () => account,
  useAccounts: () => ({ data: [] }),
}));
const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
vi.mock('@/features/accounts/form/useAccountFormMutations', () => ({
  useAccountFormMutations: () => ({
    createAccountMutation: mutation(),
    updateAccountMutation: mutation(),
    closeAccountMutation: mutation(),
    reopenAccountMutation: mutation(),
    deleteAccountMutation: mutation(),
    previewGmailCleanupMutation: mutation(),
    executeGmailCleanupMutation: mutation(),
  }),
}));
vi.mock('@/features/accounts/form/useAccountIdentifiers', () => ({
  useAccountIdentifiers: () => ({
    identifiers: [],
    isLoading: false,
    createIdentifier: vi.fn(),
    deleteIdentifier: vi.fn(),
    isCreating: false,
    isDeleting: false,
  }),
}));

const card: CreditCard = {
  id: 'a1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  bank: 'hdfc',
  last4: '7741',
  creditLimit: 300000,
  anniversaryDate: '2024-03-15',
  ingestFromDate: '2026-04-01T00:00:00Z',
  financialPosition: 'liability',
};

const bank = {
  id: 'a1',
  type: AccountType.BANK_ACCOUNT,
  name: 'HDFC Savings',
  bank: 'hdfc',
  last4: '1234',
  openingBalance: '0',
  ingestFromDate: '2026-04-01T00:00:00Z',
  financialPosition: 'asset',
} as unknown as CreditCard;

const item = (over: Partial<AttentionItem>): AttentionItem =>
  ({
    id: 'i1',
    gmailMessageId: 'm1',
    connectionEmail: 'a@gmail.test',
    subject: 'Statement',
    discoveredAt: '2026-10-10T10:05:00Z',
    status: 'FAILED',
    reason: 'LOCKED_STATEMENT',
    attemptCount: 1,
    ...over,
  }) as AttentionItem;

function renderRow(i: AttentionItem) {
  return renderWithQuery(
    <AttentionItemRow
      item={i}
      retryItem={vi.fn()}
      onAssign={vi.fn()}
      onArchive={vi.fn()}
      onUnarchive={vi.fn()}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(account, { data: card, isError: false, isSuccess: true });
});

describe('AttentionItemRow locked statement', () => {
  it.each([
    ['credit card', card],
    ['bank account', bank],
  ])(
    'opens the Edit dialog in place and focuses the statement password (%s)',
    async (_n, acct) => {
      account.data = acct;
      renderRow(item({ accountId: 'a1' }));
      expect(
        screen.queryByRole('link', { name: 'Add the statement password' })
      ).toBeNull();
      fireEvent.click(
        screen.getByRole('button', { name: 'Add the statement password' })
      );
      const input = await screen.findByLabelText(/^Statement PDF password/, undefined, { timeout: 5000 });
      await waitFor(() => expect(input).toHaveFocus());
      expect(screen.getByText('Edit account')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    }
  );

  it('falls back to the account page when the account cannot be loaded', async () => {
    Object.assign(account, { data: null, isError: false, isSuccess: true });
    renderRow(item({ accountId: 'a1' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Add the statement password' })
    );
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/accounts/a1')
    );
  });

  it('Set import date opens the Edit dialog in place on the import date', async () => {
    account.data = bank;
    renderRow(item({ accountId: 'a1', reason: 'IMPORT_OFF', status: 'ACCOUNT_NOT_OPTED_IN', error: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Set import date' }));
    const input = await screen.findByLabelText(/^Import emails from/, undefined, { timeout: 5000 });
    await waitFor(() => expect(input).toHaveFocus());
    expect(router.push).not.toHaveBeenCalled();
  });

  it('Set import date stays a link to /accounts without an account', () => {
    renderRow(item({ reason: 'IMPORT_OFF', status: 'ACCOUNT_NOT_OPTED_IN', error: null }));
    expect(screen.getByRole('link', { name: 'Set import date' })).toHaveAttribute('href', '/accounts');
  });

  it('without an account it is a button, not a link (the decision is in LockedStatementHint.test)', () => {
    renderRow(item({}));
    expect(screen.queryByRole('link', { name: 'Add the statement password' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add the statement password' })).toBeInTheDocument();
  });
});
