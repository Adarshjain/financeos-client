import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountDialogs, useAccountDialogs } from './AccountDialogs';
import { OpenDialogButton } from './OpenDialogButton';

vi.mock('./AccountFormDialog', () => ({
  AccountFormDialog: (props: { account?: Account; initialType?: string | null; onClose: () => void }) => (
    <div>
      <p>dialog {props.account ? `edit ${props.account.name}` : `add ${props.initialType ?? 'none'}`}</p>
      <button onClick={props.onClose}>close</button>
    </div>
  ),
}));

const account: Account = { id: 'c1', type: AccountType.CREDIT_CARD, name: 'HDFC Regalia', last4: '7741', creditLimit: 1 };

function Triggers() {
  const { open, openEdit } = useAccountDialogs();
  return (
    <>
      <button onClick={() => open()}>add default</button>
      <button onClick={() => open('credit_card')}>add card</button>
      <button onClick={() => open('nonsense')}>add unknown</button>
      <button onClick={openEdit}>edit</button>
    </>
  );
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => window.history.replaceState(null, '', '/ds/accounts'));

describe('AccountDialogs', () => {
  it('renders no dialog until opened', () => {
    render(<AccountDialogs><Triggers /></AccountDialogs>);
    expect(screen.queryByText(/dialog/)).toBeNull();
  });

  it('opens Add with Bank picked by default and for an unknown type', () => {
    render(<AccountDialogs><Triggers /></AccountDialogs>);
    click('add default');
    expect(screen.getByText('dialog add bank_account')).toBeInTheDocument();
    click('close');
    click('add unknown');
    expect(screen.getByText('dialog add bank_account')).toBeInTheDocument();
  });

  it('opens Add with the given type and closes without touching the URL', () => {
    render(<AccountDialogs><Triggers /></AccountDialogs>);
    const push = vi.spyOn(window.history, 'pushState');
    const replace = vi.spyOn(window.history, 'replaceState');
    click('add card');
    expect(screen.getByText('dialog add credit_card')).toBeInTheDocument();
    click('close');
    expect(screen.queryByText(/dialog/)).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    push.mockRestore();
    replace.mockRestore();
  });

  it('opens Edit for the account, from an OpenDialogButton, and closes', () => {
    render(
      <AccountDialogs account={account}>
        <OpenDialogButton>Edit account</OpenDialogButton>
      </AccountDialogs>,
    );
    click('Edit account');
    expect(screen.getByText('dialog edit HDFC Regalia')).toBeInTheDocument();
    click('close');
    expect(screen.queryByText(/dialog/)).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('opens no Edit dialog when there is no account', () => {
    render(<AccountDialogs><Triggers /></AccountDialogs>);
    click('edit');
    expect(screen.queryByText(/dialog/)).toBeNull();
  });
});
