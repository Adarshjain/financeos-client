'use client';

import React from 'react';

import { Badge, Banner, Card, Dialog } from '@/components/ds';
import { TransactionRow } from '@/components/organisms';
import type { Account } from '@/lib/account.types';
import { formatDate, formatMoney } from '@/lib/format';
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

/** The amount as the Transactions list writes it: "+45.00" for a credit, "7,430.00" for a debit. */
const amountOf = (t: Transaction) => {
  const amount = formatMoney(Math.abs(t.amount), { decimals: 'exact', symbol: false });
  return t.amount > 0 ? `+${amount}` : amount;
};

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
    return (
      <Card selected={kept}>
        <div className="flex min-w-0 flex-col gap-space-4 p-space-12 text-left">
          <span className="flex">
            <Badge tone={kept ? 'success' : 'danger'}>{kept ? 'Keep' : 'Delete · merge in'}</Badge>
          </span>
          <TransactionRow
            role="radio"
            aria-checked={kept}
            onClick={() => setKeepId(t.id)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              setKeepId(t.id);
            }}
            compact
            borderTop={false}
            className="bg-transparent px-0 hover:bg-transparent"
            description={t.description || t.sourcedDescription || '—'}
            date={formatDate(t.date, 'list')}
            account={accountName(t.accountId)}
            plastic={t.cardLast4 ? `••${t.cardLast4}` : undefined}
            categories={t.categories?.map((c) => c.name) ?? []}
            unsetCategoryLabel="Uncategorized"
            provenance={mergeSourceLabel(t.source)}
            amount={amountOf(t)}
            isCredit={t.amount > 0}
          />
        </div>
      </Card>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !merge.isPending && onClose()}>
      <Dialog.Content
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
        <Dialog.Body>
          <div className="flex flex-col gap-space-8 desk:gap-space-12">
            {warning ? (
              <Banner tone={warning.kind === 'blocked' ? 'danger' : 'warning'} title={warning.title}>
                {warning.text}
              </Banner>
            ) : null}
            <div className="grid grid-cols-1 gap-x-space-10 gap-y-space-8 desk:gap-y-space-10 desk:grid-cols-2">
              {card(a)}
              {card(b)}
            </div>
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
