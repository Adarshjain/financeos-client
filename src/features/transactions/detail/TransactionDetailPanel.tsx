'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Icon } from '@/components/ds/Icon/Icon';
import type { IconName } from '@/components/ds/Icon/registry';
import { ListField } from '@/components/ds/ListField/ListField';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { StatusWords } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { Amount } from '@/components/organisms/Amount/Amount';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { appHref } from '@/features/shell/routes';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { categoryLabel } from '@/lib/categoryList';
import { formatMoney } from '@/lib/format';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { ObligationRef, Transaction } from '@/lib/transaction.types';
import { foreignAmountText, foreignChargedText, rowAmount } from '@/lib/transactionAmount';

import { isApprovable } from '../bulk/bulkModel';
import { sourceLine } from '../category/categoryModel';
import { TransactionTagsSheet } from '../tags/TransactionTagsSheet';
import { useTransactionTags } from '../tags/useTransactionTags';
import { deleteTransaction, fetchTransactionLinks } from './transactionDetailApi';
import {
  balanceAfterWords,
  bankBalanceWords,
  cardWords,
  deleteImpact,
  type LinkRow,
  linkRows,
  longDate,
  notOnStatementText,
  reviewFieldItems,
  rewardsWords,
  sourceWords,
  statusItems,
} from './transactionDetailModel';
import { TransactionSuggestionSection } from './TransactionSuggestionSection';
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
  /** The transaction could not be loaded; the caller may close the panel (it decides from the error's status). */
  onLoadFailed?: (error: unknown) => void;
  onEdit: (transaction: Transaction) => void;
  /** The Category row was pressed: the page opens the category picker. */
  onSetCategory?: (transaction: Transaction) => void;
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
  onLoadFailed,
  ...rest
}: TransactionDetailPanelProps) {
  // The last one opened stays up while the panel slides away.
  const [shownId, setShownId] = React.useState(transactionId);
  if (transactionId !== null && transactionId !== shownId) setShownId(transactionId);
  const found = useDetailTransaction(shownId, transactionId !== null, pageTransactions);
  const { loading, failed, retry } = found;
  React.useEffect(() => {
    if (failed) onLoadFailed?.(found.error);
  }, [failed, found.error, onLoadFailed]);
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
        <Dialog.Content size="sm" srTitle="Transaction" onDismiss={onClose} className={PANEL_OFFSET}>
          <Dialog.Body>
            {failed ? (
              <Banner tone="danger" action={{ label: 'Retry', onSelect: retry }}>
                Couldn&apos;t load this transaction.
              </Banner>
            ) : loading ? (
              <div className="flex flex-col gap-space-8 desk:gap-space-12">
                <Skeleton height={22} width="40%" />
                <Skeleton width="70%" />
                <Skeleton width="55%" />
              </div>
            ) : null}
          </Dialog.Body>
        </Dialog.Content>
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
  onSetCategory,
  onDeleted,
  onLink,
  onReview,
}: DetailContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const unlink = useTransactionUnlink(t.id);
  const [deleting, setDeleting] = React.useState(false);
  const [removing, setRemoving] = React.useState<ObligationRef | null>(null);

  const { data: links = [], isError: linksFailed, refetch: refetchLinks } = useQuery({
    queryKey: keys.transactions.links(t.id),
    queryFn: () => fetchTransactionLinks(t.id),
    enabled: open && (t.links?.length ?? 0) > 0,
  });

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? 'Unknown';
  const rows = linkRows(t.id, links, t.obligationRefs ?? [], accountName);
  const credit = rowAmount(t)?.credit ?? false;
  const foreignOnly = t.amount == null ? foreignAmountText(t) : null;
  const charged = foreignChargedText(t);
  const missing = notOnStatementText(t);
  const status = statusItems(t);
  const card = cardWords(t);
  const rewards = rewardsWords(t);
  const balance = balanceAfterWords(t);
  const bankBalance = bankBalanceWords(t);
  const title = t.description || t.sourcedDescription || '—';
  const raw = t.description && t.sourcedDescription && t.sourcedDescription !== t.description ? t.sourcedDescription : undefined;
  const tags = t.tags ?? [];
  const [tagging, setTagging] = React.useState(false);
  const { setTags } = useTransactionTags(accounts);
  const removeTag = (id: string) =>
    setTags(
      t,
      tags.filter((x) => x.id !== id),
    );

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(t.id),
    onSuccess: () => {
      showToast('Transaction deleted');
      setDeleting(false);
      // Close first, and forget what is cached for it, so nothing asks the server about the deleted id again.
      onDeleted();
      queryClient.removeQueries({ queryKey: keys.transactions.byId(t.id) });
      queryClient.removeQueries({ queryKey: keys.transactions.links(t.id) });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void invalidateMoneyQueries(queryClient);
      router.refresh();
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't delete the transaction. Try again."), { tone: 'danger' }),
  });
  const deletePending = deleteMutation.isPending;

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
    const auto = (row.kind === 'transaction' ? row.link.createdBy : row.ref.origin) === 'AUTO';
    const subtitle = auto
      ? [
          row.subtitle,
          <Text key="auto" as="span" variant="label" tone="ink-3" className="block">
            Linked automatically
          </Text>,
        ]
      : row.subtitle;
    return <ListRow key={row.key} wrap title={name} subtitle={subtitle} trailing={unlinkButton} />;
  };

  return (
    <>
      <Dialog.Content
        size="sm"
        title={title}
        description={raw}
        onDismiss={onClose}
        className={PANEL_OFFSET}
      >
        <Dialog.Body className="px-0 desk:px-0 pt-0 pb-safe-12 desk:pb-space-24 gap-0 desk:gap-0">
          <div className="flex flex-col gap-space-8 px-space-16 desk:px-space-20 pb-space-12">
            <div className="flex items-baseline gap-space-8">
              {t.amount != null ? (
                <Amount variant="figure" fraction="small" value={t.amount} direction={credit ? 'credit' : 'debit'} />
              ) : foreignOnly ? (
                <Text variant="figure" as="span">
                  {foreignOnly}
                </Text>
              ) : (
                <Text variant="figure" tone="ink-3" as="span">
                  —
                </Text>
              )}
              {balance ? (
                <Text variant="label" tone="ink-3" as="span">
                  {balance}
                </Text>
              ) : null}
            </div>
            {charged ? (
              <Text variant="label" tone="ink-3" as="span">
                {charged}
              </Text>
            ) : null}
            {missing ? (
              <Text variant="label" tone="warning" as="span">
                {missing}
              </Text>
            ) : null}
            {bankBalance ? (
              <Text variant="label" tone="warning" as="span">
                {bankBalance}
              </Text>
            ) : null}
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

          <ListField
            label="Account"
            value={
              <Button variant="link" asChild>
                <Link href={appHref(`/accounts/${t.accountId}`)} prefetch={false}>
                  {accountName(t.accountId)}
                </Link>
              </Button>
            }
          />
          {card ? <ListField label="Card" value={card} /> : null}
          <ListField label="Date" value={longDate(t.date)} />
          <ListField
            label="Category"
            value={
              <span className="flex flex-col items-end gap-space-4">
                {t.category ? (
                  <Badge variant="outline" shape="rounded" onClick={onSetCategory ? () => onSetCategory(t) : undefined}>
                    <span className="inline-flex items-center gap-space-4">
                      <Icon name={t.category.icon as IconName} size="xs" />
                      {categoryLabel(t.category.name, t.subcategory?.name)}
                    </span>
                  </Badge>
                ) : onSetCategory ? (
                  <Button size="sm" variant="secondary" onClick={() => onSetCategory(t)}>
                    Set category
                  </Button>
                ) : null}
                <Text variant="label" tone="ink-3" as="span">
                  {sourceLine(t)}
                </Text>
              </span>
            }
          />
          <ListField
            label="Tags"
            value={
              <span className="flex flex-wrap items-center justify-end gap-space-4">
                {tags.map((tag) => (
                  <FilterChip
                    key={tag.id}
                    variant="outline"
                    shape="rounded"
                    removable
                    onRemove={() => void removeTag(tag.id)}
                  >
                    {tag.name}
                  </FilterChip>
                ))}
                <Button size="sm" variant="secondary" onClick={() => setTagging(true)}>
                  Add tag
                </Button>
              </span>
            }
          />
          {t.mcc ? <ListField label="MCC" value={t.mcc} /> : null}
          <ListField label="Source" value={sourceWords(t.source)} />
          <ListField label="Review" value={<StatusWords items={reviewFieldItems(t)} />} />
          {rewards ? <ListField label="Rewards" value={rewards} /> : null}

          <TransactionSuggestionSection transaction={t} />

          {rows.length > 0 || linksFailed ? (
            <div>
              <SectionHeader variant="band">Links</SectionHeader>
              {linksFailed ? (
                <div className="px-space-16 py-space-10">
                  <Banner tone="danger" action={{ label: 'Retry', onSelect: () => void refetchLinks() }}>
                    Couldn&apos;t load the links.
                  </Banner>
                </div>
              ) : null}
              {rows.map(renderRow)}
            </div>
          ) : null}
        </Dialog.Body>
      </Dialog.Content>

      <ConfirmDialog
        open={deleting}
        onOpenChange={(open) => {
          if (!deletePending) setDeleting(open);
        }}
        title={`Delete ${title}${t.amount != null ? ` · ${formatMoney(Math.abs(t.amount), { decimals: 'exact' })}` : ''}?`}
        impact={deleteImpact(t)}
        confirmLabel="Delete"
        confirmLoading={deletePending}
        onConfirm={() => deleteMutation.mutate()}
      >
        <IrreversibleNote />
      </ConfirmDialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove this settlement?"
        description="The installment goes back to unpaid; the transaction stays."
        confirmLabel="Remove"
        confirmLoading={removing !== null && unlink.busyKey === `${removing.kind}:${removing.id}`}
        onConfirm={() => {
          const ref = removing;
          if (ref) void unlink.removeSettlement(ref).then(() => setRemoving(null));
        }}
      />

      {tagging ? <TransactionTagsSheet transactions={[t]} accounts={accounts} onClose={() => setTagging(false)} /> : null}
    </>
  );
}
