'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Icon, SwipeActions } from '@/components/ds';
import type { Transaction } from '@/lib/transaction.types';

import { isApprovable } from './bulk/bulkModel';
import { BulkBar, BulkSelectRow } from './bulk/BulkSelection';
import { useBulkSelection } from './bulk/useBulkSelection';
import { useTransactionActions } from './bulk/useTransactionActions';
import { TransactionDetailPanel } from './detail/TransactionDetailPanel';
import { TransactionFormDialog } from './form/TransactionFormDialog';
import { defaultAccountId } from './form/transactionFormModel';
import { LinkTransactionsDialog } from './link/LinkTransactionsDialog';
import { transactionsUrl } from './list/transactionsUrl';
import { TransactionsView, type TransactionsViewProps } from './list/TransactionsView';

export interface TransactionsScreenProps extends Omit<TransactionsViewProps, 'onAdd' | 'onOpenDetail' | 'openId' | 'onEditCategories' | 'detailOpen' | 'selection' | 'onSelectionChange' | 'selectionHeader' | 'wrapRow'> {
  /** The transactions of the open page, in full: the detail reads them instead of asking again. */
  transactions: Transaction[];
}

type FormState = { kind: 'add' } | { kind: 'edit'; transaction: Transaction; focus?: 'categories' } | null;

/** /ds/transactions: the list with its detail panel and the Add / Edit dialog, all opened from state (the address never changes). */
export function TransactionsScreen({ transactions, ...view }: TransactionsScreenProps) {
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(null);
  const [linking, setLinking] = React.useState<Transaction[] | null>(null);
  const router = useRouter();
  const byId = React.useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);
  const pageIds = React.useMemo(() => view.list.ok ? view.list.rows.map((r) => r.id) : [], [view.list]);
  // Another page, filter, sort or page size starts with nothing selected.
  const selection = useBulkSelection(transactionsUrl(view.query), pageIds);
  const selected = selection.ids.map((id) => byId.get(id)).filter((t): t is Transaction => t !== undefined);
  const actions = useTransactionActions({
    accounts: view.accounts,
    onDone: ({ kind, ids, fromBar }) => {
      if (fromBar) selection.clear();
      if ((kind === 'delete' || kind === 'merge') && detailId !== null && ids.includes(detailId)) setDetailId(null);
    },
  });

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
        selection={selection.ids}
        onSelectionChange={selection.select}
        selectionHeader={
          selected.length > 0 ? (
            <BulkSelectRow pageCount={pageIds.length} onSelectAll={selection.selectAll} onCancel={selection.clear} />
          ) : null
        }
        wrapRow={(row, node) => {
          const t = byId.get(row.id);
          if (!t) return node;
          return (
            <SwipeActions
              // Selecting rows is a tap on the phone, so no swipe while it is on.
              disabled={selection.ids.length > 0}
              left={isApprovable(t) ? { label: 'Approve', icon: <Icon name="check" size="lg" />, tone: 'brand', onTrigger: () => void actions.review(t) } : undefined}
              right={{ label: 'Delete', icon: <Icon name="delete" size="lg" />, tone: 'danger', onTrigger: () => actions.remove([t]) }}
            >
              {node}
            </SwipeActions>
          );
        }}
      />
      <BulkBar
        selected={selected}
        pageCount={pageIds.length}
        onSelectAll={selection.selectAll}
        onClear={selection.clear}
        onLink={() => setLinking(selected)}
        onMerge={() => selected.length === 2 && actions.merge([selected[0], selected[1]])}
        onApprove={() => actions.approve(selected.filter(isApprovable))}
        onDelete={() => actions.remove(selected, true)}
      />
      {actions.dialogs}
      <TransactionDetailPanel
        transactionId={detailId}
        pageTransactions={transactions}
        accounts={view.accounts}
        onOpenTransaction={setDetailId}
        onClose={() => setDetailId(null)}
        onEdit={(transaction) => setForm({ kind: 'edit', transaction })}
        onDeleted={() => setDetailId(null)}
        onLink={(t) => setLinking([t])}
        onReview={(t) => void actions.review(t)}
      />
      {linking ? (
        <LinkTransactionsDialog
          key={linking.map((t) => t.id).join()}
          transactions={linking}
          onClose={() => setLinking(null)}
          onLinked={() => {
            selection.clear();
            router.refresh();
          }}
        />
      ) : null}
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
