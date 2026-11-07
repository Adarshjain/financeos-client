'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Text } from '@/components/ds/Text/Text';
import { loadAccountForm } from '@/features/accounts/form/ds/AccountDialogs';
import type { AccountFormDialogProps } from '@/features/accounts/form/ds/AccountFormDialog';
import type { AccountFocusField } from '@/features/accounts/form/ds/AccountFormFields';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { useAccount } from '@/lib/query/hooks/useAccounts';

type FormDialog = React.ComponentType<AccountFormDialogProps>;

/** The hint as a button: on press loads the form's code and the account together (nothing before), then opens its Edit dialog in place on the field; falls back to the account page. */
export function EditAccountHint({ accountId, focusField, label, href }: { accountId: string; focusField: AccountFocusField; label: string; href: string }) {
  const [pressed, setPressed] = useState(false);
  const [ready, setReady] = useState(false);
  const { Component: AccountFormDialog, run, preload } = useLazyDialog(loadAccountForm);
  const close = () => {
    setPressed(false);
    setReady(false);
  };
  const open = () => {
    setPressed(true);
    void run(() => {}).then((loaded) => {
      if (!loaded) close();
    });
  };
  return (
    <>
      <Text variant="label" as="span">
        <Button variant="link" loading={pressed && !ready} onPointerDown={preload} onClick={open}>
          {label}
        </Button>
      </Text>
      {pressed ? <EditAccountLoader accountId={accountId} focusField={focusField} href={href} Dialog={AccountFormDialog} onReady={() => setReady(true)} onClose={close} /> : null}
    </>
  );
}

export function EditAccountLoader({ accountId, focusField, href, Dialog, onReady, onClose }: { accountId: string; focusField: AccountFocusField; href: string; Dialog: FormDialog | null; onReady: () => void; onClose: () => void }) {
  const router = useRouter();
  const { data: account, isError, isSuccess } = useAccount(accountId);
  const failed = isError || (isSuccess && !account);
  const shown = Boolean(account && Dialog);
  React.useEffect(() => {
    if (shown) onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  React.useEffect(() => {
    if (!failed) return;
    onClose();
    router.push(href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);
  if (!account || !Dialog) return null;
  return <Dialog account={account} focusField={focusField} onClose={onClose} />;
}
