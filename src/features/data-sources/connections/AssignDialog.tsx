'use client';

import React, { useRef, useState } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Text } from '@/components/ds/Text/Text';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { NumberKindChoice } from '@/features/accounts/cards/NumberKindChoice';
import { loadAccountForm } from '@/features/accounts/form/ds/AccountDialogs';
import { ACCOUNT_GROUP_ORDER } from '@/lib/accounts/accountGroups';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import type { AttentionItem } from './attentionItemModel';
import { useAssignAccount } from './useAssignAccount';

const FORM_ID = 'assign-account-form';

/** Pick the account a Gmail identifier belongs to, so the app remembers it. */
export function AssignDialog({ item, onClose }: { item: AttentionItem | null; onClose: () => void }) {
  const [creating, setCreating] = useState(false);
  const created = useRef(false);
  const done = () => {
    setCreating(false);
    onClose();
  };
  const a = useAssignAccount(item, done);
  const { Component: AccountFormDialog, run, loading: loadingForm } = useLazyDialog(loadAccountForm);

  return (
    <>
    <Dialog
      open={item !== null && !creating}
      onOpenChange={(open) => {
        if (!open && !a.isPending) onClose();
      }}
    >
      <Dialog.Content
        size="sm"
        dismissible={!a.isPending}
        title="Assign account identifier"
        secondary={{ label: 'Cancel', disabled: a.isPending, onSelect: onClose }}
        primary={{
          label: a.isPending ? 'Assigning…' : 'Assign & remember',
          type: 'submit',
          form: FORM_ID,
          loading: a.isPending,
          disabled: !a.effectiveAccountId,
        }}
      >
        <Dialog.Body>
          <form id={FORM_ID} noValidate className="flex flex-col gap-space-8 desk:gap-space-12" onSubmit={a.submit}>
            <Text variant="body" tone="ink-2" as="p">
              Emails referencing <strong>••{item?.extractedLast4 || '????'}</strong> will be remembered for this account.
            </Text>
            {a.errorMessage ? <Banner tone="danger">{a.errorMessage}</Banner> : null}
            <AccountPicker
              label="Target account"
              value={a.effectiveAccountId || null}
              onValueChange={(v) => a.selectAccount(v ?? '')}
              accounts={a.accounts}
              types={ACCOUNT_GROUP_ORDER}
              placeholder={a.loadingAccounts ? 'Loading accounts…' : 'Select an account'}
              disabled={a.loadingAccounts || a.isPending}
            />
            {a.canOldCard ? (
              <NumberKindChoice
                kind={a.kind}
                onKindChange={a.chooseKind}
                state={a.oldCard}
                today={a.today}
                errors={a.oldCardErrors}
                disabled={a.isPending}
              />
            ) : null}
            <div>
              <Text variant="label" as="span">
                <Button
                  variant="link"
                  size="sm"
                  type="button"
                  loading={loadingForm}
                  disabled={a.isPending || loadingForm}
                  onClick={() => {
                    created.current = false;
                    void run(() => setCreating(true));
                  }}
                >
                  Create account
                </Button>
              </Text>
            </div>
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
    {creating && AccountFormDialog && item ? (
      <AccountFormDialog
        prefillBank={item.suggestedBankId ?? undefined}
        prefillLast4={item.suggestedLast4 ?? undefined}
        onCreated={(account) => {
          created.current = true;
          a.selectAccount(account.id);
          void a.assignTo(account.id);
        }}
        onClose={() => {
          // After a create the assign call finishes the flow; a cancel returns to the picker.
          if (!created.current) setCreating(false);
        }}
      />
    ) : null}
    </>
  );
}
