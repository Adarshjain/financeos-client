'use client';

import React from 'react';

import { Badge, Banner, Card, Dialog, DialogBody, DialogContent, ListField, Text } from '@/components/ds';
import { formatAmount, formatDayMonthYear } from '@/features/accounts/list/accountsList';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';

import { computeDefaultKeepId, mergeChecks, mergeSourceLabel, mergeWarning } from './mergeModel';
import { useMergeTransactions } from './useMergeTransactions';

export interface MergeDialogProps {
  /** The two selected transactions. */
  transactions: readonly [Transaction, Transaction];
  accounts: Account[] | null;
  onClose: () => void;
  /** The merge went through; the dialog closes itself. Gets the id that was merged away. */
  onMerged: (deletedId: string) => void;
}

const money = (t: Transaction) => `${t.amount > 0 ? '+' : ''}₹${formatAmount(Math.abs(t.amount), 2)}`;

/**
 * Merge transactions (boards D/P-transactions-merge): two cards, tap the one to keep. The keeper starts as the
 * most trusted source (statement, upload, Gmail alert, manual). A different account blocks the merge; opposite
 * directions or different amounts only warn.
 */
export function MergeDialog({ transactions, accounts, onClose, onMerged }: MergeDialogProps) {
  const [a, b] = transactions;
  const [keepId, setKeepId] = React.useState(() => computeDefaultKeepId(a, b));
  const deleteId = keepId === a.id ? b.id : a.id;
  const merge = useMergeTransactions(() => {
    onClose();
    onMerged(deleteId);
  });

  const accountName = (id: string) => accounts?.find((x) => x.id === id)?.name ?? 'Unknown account';
  const checks = mergeChecks(a, b);
  const warning = mergeWarning(checks, [accountName(a.accountId), accountName(b.accountId)]);

  const card = (t: Transaction) => {
    const kept = keepId === t.id;
    const plastic = t.cardLast4 ? ` ••${t.cardLast4}` : '';
    return (
      <Card selected={kept} asChild>
        <button type="button" className="flex min-w-0 flex-col gap-space-4 p-space-12 text-left" onClick={() => setKeepId(t.id)}>
          <span className="flex items-center justify-between gap-space-8">
            <Text as="span" variant="body-strong" className="min-w-0 truncate">
              {t.description || t.sourcedDescription || '—'}
            </Text>
            <Badge tone={kept ? 'success' : 'danger'}>{kept ? 'Keep' : 'Delete · merge in'}</Badge>
          </span>
          <ListField label="Amount" value={money(t)} />
          <ListField label="Date" value={formatDayMonthYear(t.date)} />
          <ListField label="Account" value={`${accountName(t.accountId)}${plastic}`} />
          <ListField label="Category" value={t.categories?.map((c) => c.name).join(', ') || '—'} />
          <ListField label="Source" value={mergeSourceLabel(t.source)} />
        </button>
      </Card>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !merge.isPending && onClose()}>
      <DialogContent
        size="md"
        title="Merge transactions"
        description="Tap the one to keep. Fields it is missing are copied from the other, and its review reasons are cleared."
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: merge.isPending }}
        primary={{
          label: 'Merge and resolve',
          onSelect: () => merge.mutate({ keepId, deleteId }),
          disabled: checks.differentAccount,
          loading: merge.isPending,
        }}
      >
        <DialogBody>
          <div className="flex flex-col gap-space-12">
            {warning ? (
              <Banner tone={warning.kind === 'blocked' ? 'danger' : 'warning'} title={warning.title}>
                {warning.text}
              </Banner>
            ) : null}
            <div className="grid grid-cols-1 gap-space-10 desk:grid-cols-2">
              {card(a)}
              {card(b)}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
