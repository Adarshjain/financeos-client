'use client';

import React from 'react';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountFormDialog } from './AccountFormDialog';
import { parseAddType } from './accountFormModel';

type OpenState = { kind: 'add'; type: AccountType } | { kind: 'edit' } | null;

interface AccountDialogsApi {
  /** Opens Add account; `type` (a slug like "credit_card") picks that type, otherwise Bank. */
  open: (type?: string) => void;
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
      open: (type) => setState({ kind: 'add', type: parseAddType(type) ?? AccountType.BANK_ACCOUNT }),
      openEdit: () => setState({ kind: 'edit' }),
    }),
    [],
  );
  const close = () => setState(null);
  return (
    <AccountDialogsContext.Provider value={api}>
      {children}
      {state?.kind === 'add' ? <AccountFormDialog key={state.type} initialType={state.type} onClose={close} /> : null}
      {state?.kind === 'edit' && account ? <AccountFormDialog account={account} onClose={close} /> : null}
    </AccountDialogsContext.Provider>
  );
}
