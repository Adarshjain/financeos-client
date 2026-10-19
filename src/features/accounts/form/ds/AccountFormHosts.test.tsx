import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AddAccountHost, EditAccountHost } from './AccountFormHosts';

let query = '';
let path = '/ds/accounts';
const router = { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => path,
  useSearchParams: () => new URLSearchParams(query),
}));

const dialog = vi.fn();
vi.mock('./AccountFormDialog', () => ({
  AccountFormDialog: (props: { account?: Account; initialType?: string | null; onClose: () => void }) => {
    dialog(props);
    return (
      <div>
        <p>dialog {props.account ? `edit ${props.account.name}` : `add ${props.initialType ?? 'none'}`}</p>
        <button onClick={props.onClose}>close</button>
      </div>
    );
  },
}));

const account: Account = { id: 'c1', type: AccountType.CREDIT_CARD, name: 'HDFC Regalia', last4: '7741', creditLimit: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  query = '';
  path = '/ds/accounts';
});

describe('AddAccountHost', () => {
  it('renders nothing without ?add', () => {
    render(<AddAccountHost />);
    expect(screen.queryByText(/dialog/)).toBeNull();
  });

  it('opens with nothing picked for ?add=1', () => {
    query = 'add=1';
    render(<AddAccountHost />);
    expect(screen.getByText('dialog add none')).toBeInTheDocument();
  });

  it.each(['bank_account', 'credit_card', 'broker', 'generic'])('opens with %s picked for ?add=%s', (type) => {
    query = `add=${type}`;
    render(<AddAccountHost />);
    expect(screen.getByText(`dialog add ${type}`)).toBeInTheDocument();
  });

  it('closing removes only the add param and does not scroll', () => {
    query = 'add=credit_card&closed=cards';
    render(<AddAccountHost />);
    screen.getByText('close').click();
    expect(router.replace).toHaveBeenCalledWith('/ds/accounts?closed=cards', { scroll: false });
  });
});

describe('EditAccountHost', () => {
  it('renders nothing without ?edit', () => {
    path = '/ds/accounts/c1';
    render(<EditAccountHost account={account} />);
    expect(screen.queryByText(/dialog/)).toBeNull();
  });

  it('opens the dialog for the account on ?edit=1 and closing drops the param', () => {
    path = '/ds/accounts/c1';
    query = 'edit=1&tab=cards';
    render(<EditAccountHost account={account} />);
    expect(screen.getByText('dialog edit HDFC Regalia')).toBeInTheDocument();
    screen.getByText('close').click();
    expect(router.replace).toHaveBeenCalledWith('/ds/accounts/c1?tab=cards', { scroll: false });
  });
});
