'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Banner,
  Button,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  ListField,
  ListRow,
  SectionHeader,
  showToast,
  Skeleton,
  StatusWords,
  Text,
  useConcealed,
} from '@/components/ds';
import { formatAmount } from '@/features/accounts/list/accountsList';
import { appHref } from '@/features/shell/routes';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { ObligationRef, Transaction } from '@/lib/transaction.types';

import { isApprovable } from '../bulk/bulkModel';
import {
  amountWords,
  balanceAfterWords,
  cardWords,
  deleteImpact,
  type LinkRow,
  linkRows,
  longDate,
  reviewFieldItems,
  rewardsWords,
  sourceWords,
  statusItems,
} from './transactionDetail';
import { deleteTransaction, fetchTransactionLinks } from './transactionDetailApi';
import { useDetailTransaction } from './useDetailTransaction';
import { useTransactionUnlink } from './useTransactionUnlink';

/** Below the top bar (space-56), then the page gutter (space-24, as a margin so the two add up). */
const PANEL_OFFSET = 'desk:top-safe-56 desk:mt-space-24';

export interface TransactionDetailPanelProps {
  /** The transaction to show; null keeps the panel closed. */
  transactionId: string | null;
  /** The transactions on the open page; one that is not among them (opened from a link) is fetched. */
  pageTransactions: readonly Transaction[];
  accounts: readonly Account[] | null;
  /** A linked transaction's name was pressed: the panel swaps to it. */
  onOpenTransaction: (id: string) => void;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  /** The transaction was deleted; the panel closes and the page refreshes. */
  onDeleted: () => void;
  /** "Link to…" (piece 4); the button is hidden while there is no handler. */
  onLink?: (transaction: Transaction) => void;
  /** "Review" (piece 6); the button is hidden while there is no handler, and for a transaction with nothing to clear (not in Needs review, or with no reason). */
  onReview?: (transaction: Transaction) => void;
}

/** The detail of one transaction: a side panel on desktop beside the list, a sheet on phone. The address never changes. */
export function TransactionDetailPanel({
  transactionId,
  pageTransactions,
  accounts,
  onOpenTransaction,
  onClose,
  ...rest
}: TransactionDetailPanelProps) {
  // The last one opened stays up while the panel slides away.
  const [shownId, setShownId] = React.useState(transactionId);
  if (transactionId !== null && transactionId !== shownId) setShownId(transactionId);
  const found = useDetailTransaction(shownId, transactionId !== null, pageTransactions);
  const { loading, failed, retry } = found;
  // While it slides shut the last one stays up, even when a refresh has taken it off the page (it was deleted).
  const [last, setLast] = React.useState<Transaction | undefined>(found.transaction);
  if (found.transaction && found.transaction !== last) setLast(found.transaction);
  const transaction = found.transaction ?? (transactionId === null ? last : undefined);

  return (
    <Dialog variant="side-panel" open={transactionId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      {transaction ? (
        <DetailContent
          key={transaction.id}
          transaction={transaction}
          open={transactionId !== null}
          accounts={accounts}
          onOpenTransaction={onOpenTransaction}
          onClose={onClose}
          {...rest}
        />
      ) : transaction ? null : (
        <DialogContent size="sm" srTitle="Transaction" onClose={onClose} className={PANEL_OFFSET}>
          <DialogBody>
            {failed ? (
              <Banner tone="danger" action={{ label: 'Retry', onSelect: retry }}>
                Could not load this transaction.
              </Banner>
            ) : loading ? (
              <div className="flex flex-col gap-space-12">
                <Skeleton height={22} width="40%" />
                <Skeleton width="70%" />
                <Skeleton width="55%" />
              </div>
            ) : null}
          </DialogBody>
        </DialogContent>
      )}
    </Dialog>
  );
}

type DetailContentProps = Omit<TransactionDetailPanelProps, 'transactionId' | 'pageTransactions'> & {
  transaction: Transaction;
  /** False while the panel slides shut: nothing is read then. */
  open: boolean;
};

function DetailContent({
  transaction: t,
  open,
  accounts,
  onOpenTransaction,
  onClose,
  onEdit,
  onDeleted,
  onLink,
  onReview,
}: DetailContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const unlink = useTransactionUnlink(t.id);
  const [deleting, setDeleting] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [removing, setRemoving] = React.useState<ObligationRef | null>(null);

  const { data: links = [], isError: linksFailed, refetch: refetchLinks } = useQuery({
    queryKey: keys.transactions.links(t.id),
    queryFn: () => fetchTransactionLinks(t.id),
    enabled: open && (t.links?.length ?? 0) > 0,
  });

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? 'Unknown';
  const rows = linkRows(t.id, links, t.obligationRefs ?? [], accountName);
  const credit = t.amount > 0;
  const concealed = useConcealed();
  const status = statusItems(t);
  const card = cardWords(t);
  const rewards = rewardsWords(t);
  const balance = balanceAfterWords(t);
  const title = t.description || t.sourcedDescription || '—';
  const raw = t.description && t.sourcedDescription && t.sourcedDescription !== t.description ? t.sourcedDescription : undefined;
  const categories = t.categories ?? [];

  const confirmDelete = async () => {
    setDeletePending(true);
    try {
      await deleteTransaction(t.id);
      showToast('Transaction deleted');
      setDeleting(false);
      // Close first, and forget what is cached for it, so nothing asks the server about the deleted id again.
      onDeleted();
      queryClient.removeQueries({ queryKey: keys.transactions.byId(t.id) });
      queryClient.removeQueries({ queryKey: keys.transactions.links(t.id) });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void invalidateMoneyQueries(queryClient);
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to delete transaction'), { tone: 'danger' });
    } finally {
      setDeletePending(false);
    }
  };

  const renderRow = (row: LinkRow) => {
    const busy = unlink.busyKey === (row.kind === 'transaction' ? row.link.id : row.key);
    const unlinkButton =
      row.kind === 'transaction' ? (
        <Button variant="link" size="sm" loading={busy} onClick={() => void unlink.unlinkTransaction(row.link)}>
          Unlink
        </Button>
      ) : row.unlink ? (
        <Button
          variant="link"
          size="sm"
          loading={busy}
          onClick={() => (row.unlink === 'confirm' ? setRemoving(row.ref) : void unlink.unlinkRecord(row.ref))}
        >
          Unlink
        </Button>
      ) : null;
    const name =
      row.kind === 'transaction' ? (
        <Button variant="link" onClick={() => onOpenTransaction(row.otherId)}>
          {row.title}
        </Button>
      ) : row.href ? (
        <Button variant="link" asChild>
          <Link href={appHref(row.href)} prefetch={false}>
            {row.title}
          </Link>
        </Button>
      ) : (
        row.title
      );
    return <ListRow key={row.key} wrap title={name} subtitle={row.subtitle} trailing={unlinkButton} />;
  };

  return (
    <>
      <DialogContent
        size="sm"
        title={title}
        description={raw}
        onClose={onClose}
        className={PANEL_OFFSET}
      >
        <DialogBody className="px-0 desk:px-0 pt-0 pb-safe-12 desk:pb-space-24 gap-0">
          <div className="flex flex-col gap-space-8 px-space-16 desk:px-space-20 pb-space-12">
            <div className="flex items-baseline gap-space-8">
              <Text variant="figure" tone={credit && !concealed ? 'positive' : 'ink'} as="span" fraction="small">
                {`${credit ? '+' : ''}${amountWords(t.amount)}`}
              </Text>
              {balance ? (
                <Text variant="label" tone="ink-3" as="span">
                  {balance}
                </Text>
              ) : null}
            </div>
            {status.length > 0 ? (
              <StatusWords items={status} />
            ) : null}
            <div className="flex flex-wrap items-center gap-space-8">
              <Button size="sm" onClick={() => onEdit(t)}>
                Edit
              </Button>
              {onLink ? (
                <Button size="sm" onClick={() => onLink(t)}>
                  Link to…
                </Button>
              ) : null}
              {onReview && isApprovable(t) ? (
                <Button size="sm" onClick={() => onReview(t)}>
                  Review
                </Button>
              ) : null}
              <Button size="sm" variant="danger" onClick={() => setDeleting(true)}>
                Delete
              </Button>
            </div>
          </div>

          <ListField label="Account" value={accountName(t.accountId)} />
          {card ? <ListField label="Card" value={card} /> : null}
          <ListField label="Date" value={longDate(t.date)} />
          <ListField
           
            label="Categories"
            value={
              categories.length > 0 ? (
                <span className="flex flex-wrap justify-end gap-space-4">
                  {categories.map((c) => (
                    <Badge key={c.id} variant="outline" shape="rounded">
                      {c.name}
                    </Badge>
                  ))}
                </span>
              ) : (
                'None'
              )
            }
          />
          {t.mcc ? <ListField label="MCC" value={t.mcc} /> : null}
          <ListField label="Source" value={sourceWords(t.source)} />
          <ListField label="Review" value={<StatusWords items={reviewFieldItems(t)} />} />
          {rewards ? <ListField label="Rewards" value={rewards} /> : null}

          {rows.length > 0 || linksFailed ? (
            <div>
              <SectionHeader variant="band">Links</SectionHeader>
              {linksFailed ? (
                <div className="px-space-16 py-space-10">
                  <Banner tone="danger" action={{ label: 'Retry', onSelect: () => void refetchLinks() }}>
                    Could not load the links.
                  </Banner>
                </div>
              ) : null}
              {rows.map(renderRow)}
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>

      <ConfirmDialog
        open={deleting}
        onOpenChange={(open) => {
          if (!deletePending) setDeleting(open);
        }}
        title={`Delete ${title} · ₹${formatAmount(Math.abs(t.amount), 2)}?`}
        impact={deleteImpact(t)}
        confirmLabel="Delete transaction"
        confirmLoading={deletePending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove this settlement?"
        description="The installment goes back to unpaid; the transaction stays."
        confirmLabel="Remove settlement"
        confirmLoading={removing !== null && unlink.busyKey === `${removing.kind}:${removing.id}`}
        onConfirm={() => {
          const ref = removing;
          if (ref) void unlink.removeSettlement(ref).then(() => setRemoving(null));
        }}
      />
    </>
  );
}
