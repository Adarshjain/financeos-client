'use client';

import React from 'react';

import { Banner, Dialog, DialogBody, DialogContent, Select, Text } from '@/components/ds';

import type { AttentionItem } from './attentionItem.helpers';
import { useAssignAccount } from './useAssignAccount';

const FORM_ID = 'assign-account-form';

/** Pick the account a Gmail identifier belongs to, so the app remembers it. */
export function AssignDialog({ item, onClose }: { item: AttentionItem | null; onClose: () => void }) {
  const a = useAssignAccount(item, onClose);

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open && !a.isPending) onClose();
      }}
    >
      <DialogContent
        size="sm"
        dismissible={!a.isPending}
        title="Assign account identifier"
        secondary={{ label: 'Cancel', disabled: a.isPending, onSelect: onClose }}
        primary={{
          label: a.isPending ? 'Assigning…' : 'Assign & remember',
          type: 'submit',
          form: FORM_ID,
          disabled: a.isPending || !a.effectiveAccountId,
        }}
      >
        <DialogBody>
          <form id={FORM_ID} noValidate className="flex flex-col gap-space-12" onSubmit={a.submit}>
            <Text variant="body" tone="ink-2" as="p">
              Emails referencing <strong>••{item?.extractedLast4 || '????'}</strong> will be remembered for this account.
            </Text>
            {a.errorMessage ? <Banner tone="danger">{a.errorMessage}</Banner> : null}
            <Select
              label="Target account"
              value={a.effectiveAccountId || undefined}
              onValueChange={(v) => a.selectAccount(v as string)}
              options={a.accounts.map((acc) => ({ value: acc.id, label: acc.name }))}
              placeholder={a.loadingAccounts ? 'Loading accounts…' : 'Select an account'}
              disabled={a.loadingAccounts || a.isPending}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
