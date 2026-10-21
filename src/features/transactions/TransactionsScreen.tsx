'use client';

import React from 'react';

import type { Transaction } from '@/lib/transaction.types';

import { TransactionDetailPanel } from './detail/TransactionDetailPanel';
import { TransactionFormDialog } from './form/TransactionFormDialog';
import { defaultAccountId } from './form/transactionFormModel';
import { TransactionsView, type TransactionsViewProps } from './list/TransactionsView';

export interface TransactionsScreenProps extends Omit<TransactionsViewProps, 'onAdd' | 'onOpenDetail' | 'openId' | 'onEditCategories' | 'detailOpen'> {
  /** The transactions of the open page, in full: the detail reads them instead of asking again. */
  transactions: Transaction[];
  /** "Link to…" on the detail (piece 4); the button is hidden until it is wired. */
  onLink?: (transaction: Transaction) => void;
  /** "Review" on the detail (piece 6); the button is hidden until it is wired. */
  onReview?: (transaction: Transaction) => void;
}

type FormState = { kind: 'add' } | { kind: 'edit'; transaction: Transaction; focus?: 'categories' } | null;

/** /ds/transactions: the list with its detail panel and the Add / Edit dialog, all opened from state (the address never changes). */
export function TransactionsScreen({ transactions, onLink, onReview, ...view }: TransactionsScreenProps) {
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(null);

  const editCategories = (id: string) => {
    const transaction = transactions.find((t) => t.id === id);
    if (transaction) setForm({ kind: 'edit', transaction, focus: 'categories' });
  };

  return (
    <>
      <TransactionsView
        {...view}
        onAdd={() => setForm({ kind: 'add' })}
        onOpenDetail={setDetailId}
        openId={detailId ?? undefined}
        detailOpen={detailId !== null}
        onEditCategories={editCategories}
      />
      <TransactionDetailPanel
        transactionId={detailId}
        pageTransactions={transactions}
        accounts={view.accounts}
        onOpenTransaction={setDetailId}
        onClose={() => setDetailId(null)}
        onEdit={(transaction) => setForm({ kind: 'edit', transaction })}
        onDeleted={() => setDetailId(null)}
        onLink={onLink}
        onReview={onReview}
      />
      {form ? (
        <TransactionFormDialog
          key={form.kind === 'edit' ? form.transaction.id : 'add'}
          transaction={form.kind === 'edit' ? form.transaction : undefined}
          focus={form.kind === 'edit' ? form.focus : undefined}
          defaultAccountId={defaultAccountId(view.query.accounts)}
          today={view.today}
          accounts={view.accounts}
          onClose={() => setForm(null)}
        />
      ) : null}
    </>
  );
}
