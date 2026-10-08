import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
let pathname = '/accounts/a1';
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => pathname }));
vi.mock('../AccountForm', () => ({
  AccountForm: ({ onSuccess }: any) => (
    <div>
      <button onClick={() => onSuccess({ id: 'a1' })}>save</button>
      <button onClick={() => onSuccess()}>delete</button>
    </div>
  ),
}));

import { renderWithQuery } from '@/test/renderWithQuery';

import { AccountFormWrapper } from '../AccountFormWrapper';

const account = { id: 'a1', name: 'N', type: 'bank_account', warnings: [] } as never;

async function openAnd(label: string) {
  await userEvent.click(screen.getByRole('button', { name: 'open' }));
  await userEvent.click(await screen.findByRole('button', { name: label }));
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname = '/accounts/a1';
});

describe('AccountFormWrapper after success', () => {
  it('delete on the account detail page replaces to /accounts (no refresh)', async () => {
    renderWithQuery(<AccountFormWrapper account={account}>open</AccountFormWrapper>);
    await openAnd('delete');
    expect(router.replace).toHaveBeenCalledWith('/accounts');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('delete from the list page just refreshes', async () => {
    pathname = '/accounts';
    renderWithQuery(<AccountFormWrapper account={account}>open</AccountFormWrapper>);
    await openAnd('delete');
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('a save on the detail page refreshes in place', async () => {
    renderWithQuery(<AccountFormWrapper account={account}>open</AccountFormWrapper>);
    await openAnd('save');
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('create mode (no account) never redirects, even from an /accounts/ path', async () => {
    renderWithQuery(<AccountFormWrapper>open</AccountFormWrapper>);
    await openAnd('delete');
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('closes the dialog after success', async () => {
    renderWithQuery(<AccountFormWrapper account={account}>open</AccountFormWrapper>);
    await openAnd('save');
    expect(screen.queryByRole('button', { name: 'save' })).toBeNull();
  });
});
