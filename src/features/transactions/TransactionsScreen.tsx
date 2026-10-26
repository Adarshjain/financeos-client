'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { ContextMenu, Icon, SwipeActions } from '@/components/ds';
import type { Transaction } from '@/lib/transaction.types';

import { isApprovable } from './bulk/bulkModel';
import { BulkBar, BulkSelectRow } from './bulk/BulkSelection';
import { useBulkSelection } from './bulk/useBulkSelection';
import { useTransactionActions } from './bulk/useTransactionActions';
import { CategoryDialog } from './category/CategoryDialog';
import { TransactionDetailPanel } from './detail/TransactionDetailPanel';
import { useAddTransaction } from './form/AddTransactionProvider';
import { TransactionFormDialog } from './form/TransactionFormDialog';
import { defaultAccountId } from './form/transactionFormModel';
import { LinkTransactionsDialog } from './link/LinkTransactionsDialog';
import { parseTxn, transactionsUrl } from './list/transactionsUrl';
import { TransactionsView, type TransactionsViewProps } from './list/TransactionsView';
import { OptimisticProvider, useOptimisticLayer } from './optimistic/OptimisticTransactions';

export interface TransactionsScreenProps extends Omit<TransactionsViewProps, 'onAdd' | 'onOpenDetail' | 'openId' | 'onEditCategories' | 'detailOpen' | 'selection' | 'onSelectionChange' | 'selectionHeader' | 'wrapRow'> {
  /** The transactions of the open page, in full: the detail reads them instead of asking again. */
  transactions: Transaction[];
}

/** A link to a transaction that is not there (or not yours): the server answers 404 or 403. Any other failure keeps the panel and its Retry. */
function isGone(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 404 || status === 403;
}

type FormState = { transaction: Transaction } | null;

/**
 * /ds/transactions: the list with its detail panel and the Edit dialog (Add is the shell's AddTransactionProvider), all opened from state (the address never changes).
 * Approve, Set category, Edit and a swiped Delete show at once and save behind it (see optimistic/); bulk actions wait.
 */
export function TransactionsScreen(props: TransactionsScreenProps) {
  const layer = useOptimisticLayer(props);
  return (
    <OptimisticProvider value={layer.api}>
      <TransactionsBody {...props} transactions={layer.transactions} list={layer.list} needsReviewCount={layer.needsReviewCount} />
    </OptimisticProvider>
  );
}

function TransactionsBody({ transactions, ...view }: TransactionsScreenProps) {
  // A link with ?txn=<id> opens that transaction at once; the panel fetches it by id when it is not on this page.
  const [detailId, setDetailIdState] = React.useState<string | null>(view.query.txn);
  const [txnInUrl, setTxnInUrl] = React.useState(view.query.txn !== null);
  // The address changing to another ?txn while this page stays mounted (a link from search, a second deep link
  // after one was closed) opens that transaction too.
  const txnParam = parseTxn(useSearchParams().get('txn'));
  const [seenTxn, setSeenTxn] = React.useState(txnParam);
  if (txnParam !== seenTxn) {
    setSeenTxn(txnParam);
    if (txnParam) {
      setDetailIdState(txnParam);
      setTxnInUrl(true);
    }
  }
  /** Takes ?txn out of the address without a navigation: no server render, no refetch, no scroll. */
  const dropTxn = () => {
    if (!txnInUrl) return;
    setTxnInUrl(false);
    window.history.replaceState(window.history.state, '', transactionsUrl({ ...view.query, txn: null }));
  };
  const setDetailId = (id: string | null) => {
    if (id !== view.query.txn || id === null) dropTxn();
    setDetailIdState(id);
  };
  const [form, setForm] = React.useState<FormState>(null);
  const [categorising, setCategorising] = React.useState<Transaction | null>(null);
  const [linking, setLinking] = React.useState<Transaction[] | null>(null);
  const router = useRouter();
  const addTransaction = useAddTransaction();
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
    if (transaction) setCategorising(transaction);
  };

  return (
    <>
      <TransactionsView
        {...view}
        onAdd={() => addTransaction.open({ defaultAccountId: defaultAccountId(view.query.accounts) })}
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
            <ContextMenu
              items={[
                ...(isApprovable(t) ? [{ id: 'approve', label: 'Approve', onSelect: () => void actions.review(t) }] : []),
                { id: 'delete', label: 'Delete', tone: 'danger' as const, onSelect: () => actions.remove([t]) },
              ]}
            >
            <SwipeActions
              // Selecting rows is a tap on the phone, so no swipe while it is on.
              disabled={selection.ids.length > 0}
              left={isApprovable(t) ? { label: 'Approve', icon: <Icon name="check" size="lg" />, tone: 'brand', onTrigger: () => void actions.review(t) } : undefined}
              right={{ label: 'Delete', icon: <Icon name="delete" size="lg" />, tone: 'danger', onTrigger: () => actions.remove([t]) }}
            >
              {node}
            </SwipeActions>
            </ContextMenu>
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
        onLoadFailed={txnInUrl ? (error) => isGone(error) && setDetailId(null) : undefined}
        onEdit={(transaction) => setForm({ transaction })}
        onDeleted={() => setDetailId(null)}
        onLink={(t) => setLinking([t])}
        onReview={actions.reviewInDialog}
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
      {categorising ? <CategoryDialog key={categorising.id} transaction={categorising} onClose={() => setCategorising(null)} /> : null}
      {form ? (
        <TransactionFormDialog
          key={form.transaction.id}
          transaction={form.transaction}
          today={view.today}
          accounts={view.accounts}
          onClose={() => setForm(null)}
        />
      ) : null}
    </>
  );
}
