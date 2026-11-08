'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Text } from '@/components/ds/Text/Text';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { loadAccountForm } from '@/features/accounts/form/ds/AccountDialogs';
import type { Account } from '@/lib/account.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';

import { statementPasswordAccounts } from './attentionItemModel';
import { EditAccountLoader } from './EditAccountHint';

const PICKER_TYPES = [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD];

type Phase = { name: 'idle' } | { name: 'picking'; accounts: Account[] } | { name: 'editing'; accountId: string };

/** The hint for a locked statement with no known account: on press asks which bank account or card it is for (never guessed), then opens its Edit dialog on the statement password; with no bank or card account it goes to the accounts page. */
export function LockedStatementHint({ label, href }: { label: string; href: string }) {
  const router = useAppRouter();
  const [pressed, setPressed] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const { data: accounts, isError: accountsFailed } = useAccounts(undefined, { enabled: pressed });
  const { Component: AccountFormDialog, run, preload } = useLazyDialog(loadAccountForm);

  const reset = () => {
    setPressed(false);
    setPhase({ name: 'idle' });
    setReady(false);
    setChosen(null);
  };

  useEffect(() => {
    if (!pressed || phase.name !== 'idle') return;
    if (accountsFailed && !accounts) {
      reset();
      router.push(href);
      return;
    }
    if (!accounts) return;
    const candidates = statementPasswordAccounts(accounts);
    if (candidates.length === 0) {
      reset();
      router.push(href);
    } else setPhase({ name: 'picking', accounts: candidates });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed, phase.name, accounts, accountsFailed]);

  const open = () => {
    setPressed(true);
    void run(() => {}).then((loaded) => {
      if (!loaded) reset();
    });
  };

  return (
    <>
      <Text variant="label" as="span">
        <Button variant="link" loading={pressed && phase.name !== 'picking' && !ready} onPointerDown={preload} onClick={open}>
          {label}
        </Button>
      </Text>
      {phase.name === 'picking' ? (
        <Dialog open onOpenChange={(o) => !o && reset()}>
          <Dialog.Content
            size="sm"
            title="Which account is this statement for?"
            secondary={{ label: 'Cancel', onSelect: reset }}
            primary={{
              label: 'Continue',
              disabled: !chosen,
              onSelect: () => {
                if (chosen) setPhase({ name: 'editing', accountId: chosen });
              },
            }}
          >
            <Dialog.Body>
              <AccountPicker label="Account" value={chosen} onValueChange={setChosen} accounts={phase.accounts} types={PICKER_TYPES} />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog>
      ) : null}
      {phase.name === 'editing' ? (
        <EditAccountLoader accountId={phase.accountId} focusField="statementPassword" href={href} Dialog={AccountFormDialog} onReady={() => setReady(true)} onClose={reset} />
      ) : null}
    </>
  );
}
