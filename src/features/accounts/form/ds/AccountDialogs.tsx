'use client';

import React from 'react';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountFormDialog } from './AccountFormDialog';
import { parseAddType } from './accountFormModel';

type OpenState = { kind: 'add'; type: AccountType; onCreated?: (account: Account) => void } | { kind: 'edit' } | null;

interface AccountDialogsApi {
  /** Opens Add account; `type` (a slug like "credit_card") picks that type, otherwise Bank. With `onCreated`, creating closes the dialog and calls it instead of opening the new account's page. */
  open: (type?: string, options?: { onCreated?: (account: Account) => void }) => void;
  /** Opens Edit account for the provider's account. */
  openEdit: () => void;
}

const noop = () => {};
const AccountDialogsContext = React.createContext<AccountDialogsApi>({ open: noop, openEdit: noop });

export function useAccountDialogs(): AccountDialogsApi {
  return React.useContext(AccountDialogsContext);
}

/**
 * Add / Edit account dialogs, opened from page state so the URL never changes. Wrap a page in it so
 * server-rendered triggers (OpenDialogButton, AddLink, the app bar +) can open them. Pass `account` for Edit.
 */
export function AccountDialogs({ account, children }: { account?: Account; children: React.ReactNode }) {
  const [state, setState] = React.useState<OpenState>(null);
  const api = React.useMemo<AccountDialogsApi>(
    () => ({
      open: (type, options) =>
        setState({ kind: 'add', type: parseAddType(type) ?? AccountType.BANK_ACCOUNT, onCreated: options?.onCreated }),
      openEdit: () => setState({ kind: 'edit' }),
    }),
    [],
  );
  const close = () => setState(null);
  return (
    <AccountDialogsContext.Provider value={api}>
      {children}
      {state?.kind === 'add' ? <AccountFormDialog key={state.type} initialType={state.type} onCreated={state.onCreated} onClose={close} /> : null}
      {state?.kind === 'edit' && account ? <AccountFormDialog account={account} onClose={close} /> : null}
    </AccountDialogsContext.Provider>
  );
}
