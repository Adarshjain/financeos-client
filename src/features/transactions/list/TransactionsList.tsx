'use client';

import React from 'react';

import { Card, DataTable, EmptyState, Pager } from '@/components/ds';
import { createTransactionColumns, TransactionRow, type TransactionRowData } from '@/components/organisms';
import { ListTransition, RowTransition, SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

import { activeFilterWords } from './filterOptions';
import { dayHeader, monthBand, type TransactionListRow } from './transactionRows';
import { clearedQuery, isUnfiltered, type SortId, SORTS, TRANSACTIONS_SIZE_OPTIONS, type TransactionsQuery } from './transactionsUrl';

type SortState = { id: string; desc: boolean } | null;

const SORT_STATES: Record<SortId, { id: string; desc: boolean }> = {
  newest: { id: 'date', desc: true },
  oldest: { id: 'date', desc: false },
  highest: { id: 'amount', desc: true },
  lowest: { id: 'amount', desc: false },
};

/** The table header's sort for a query's sort. */
export function sortStateOf(sort: SortId): SortState {
  return SORT_STATES[sort];
}

/** The query sort for a header click; "off" and the description column (the server can't sort it) go back to newest. */
export function sortIdOf(sort: SortState): SortId {
  const hit = SORTS.find((s) => SORT_STATES[s.id].id === sort?.id && SORT_STATES[s.id].desc === sort.desc);
  return hit?.id ?? 'newest';
}

/** The columns of the board, minus sorting by description. */
function columnsFor(q: string) {
  return createTransactionColumns(q).map((col) =>
    col.id === 'description' ? { ...col, meta: { ...col.meta, sortable: false } } : col,
  );
}

const asListRow = (row: TransactionRowData) => row as TransactionListRow;

export interface TransactionsListProps {
  query: TransactionsQuery;
  rows: TransactionListRow[];
  totalElements: number;
  totalPages: number;
  /** A new page or sort is loading while these rows stay. */
  busy?: boolean;
  /** The user has no account yet: nothing can exist, so the first-run state shows even under filters. */
  noAccounts: boolean;
  onChange: (patch: Partial<TransactionsQuery>, resetPage?: boolean) => void;
  onAddAccount: () => void;
  onImport: () => void;
  /** A row was pressed (piece 2 opens the detail). */
  onOpenDetail?: (id: string) => void;
  /** The row open in the detail pane, shown highlighted. */
  openId?: string;
  /** The row whose description and amount carry their shared names now (it is about to open into the detail, or just closed from it). */
  morphId?: string;
  /** "Set category" or a category chip was pressed (piece 3 opens the edit). */
  onEditCategories?: (id: string) => void;
  /** The ticked row ids; the table's checkbox column shows when `onSelectionChange` is given (piece 5). */
  selection?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Wraps each row, for the phone swipe (piece 6). */
  wrapRow?: (row: TransactionListRow, node: React.ReactNode) => React.ReactNode;
}

/** The transactions in a card: table with month bands on desktop, rows under sticky day headers on phone. */
export function TransactionsList({
  query,
  rows,
  totalElements,
  totalPages,
  busy,
  noAccounts,
  onChange,
  onAddAccount,
  onImport,
  onOpenDetail,
  openId,
  morphId,
  onEditCategories,
  selection,
  onSelectionChange,
  wrapRow,
}: TransactionsListProps) {
  const columns = React.useMemo(() => columnsFor(query.q), [query.q]);
  const byDate = query.sort === 'newest' || query.sort === 'oldest';

  const pager = (
    <Pager
      page={query.page}
      size={query.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="transactions"
      sizeOptions={TRANSACTIONS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => onChange({ page }, false)}
      onSizeChange={(size) => onChange({ size })}
    />
  );

  const empty =
    query.page === 0 && (noAccounts || isUnfiltered(query)) ? (
      <EmptyState
        title="No transactions yet"
        description="Transactions belong to an account. Add your first one, then import a statement or add a transaction."
        action={{ label: 'Add account', onSelect: onAddAccount }}
        secondaryAction={{ label: 'Import', onSelect: onImport }}
      />
    ) : (
      <EmptyState
        title="No transactions match"
        description={activeFilterWords(query)}
        action={{ label: 'Clear all filters', variant: 'secondary', onSelect: () => onChange(clearedQuery(query)) }}
      />
    );

  return (
    <ListTransition>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          sort={sortStateOf(query.sort)}
          onSortChange={(sort) => onChange({ sort: sortIdOf(sort) })}
          selectable={onSelectionChange !== undefined}
          selection={selection}
          onSelectionChange={onSelectionChange}
          // Each row slides in, folds away and moves with the list (wrapping the swipe, so a swiped row folds as it is).
          wrapRow={(row, node) => <RowTransition key={row.id}>{wrapRow ? wrapRow(asListRow(row), node) : node}</RowTransition>}
          onRowSelect={onOpenDetail ? (row) => onOpenDetail(row.id) : undefined}
          highlightedRowId={openId}
          band={(row) => monthBand(asListRow(row), byDate)}
          dayHeader={(row) => dayHeader(asListRow(row), byDate)}
          pager={pager}
          busy={busy}
          empty={empty}
          stickyHeader={false}
          renderRow={(row, rowProps) => {
            const r = asListRow(row);
            return (
              <TransactionRow
                key={r.id}
                date={r.date}
                description={r.description}
                amount={r.formattedAmount}
                isCredit={r.isCredit}
                balance={r.balance}
                account={r.account}
                plastic={r.plastic}
                reviewStatus={r.reviewStatus}
                link={r.link}
                provenance={r.provenance}
                categories={r.categories}
                unsetCategoryLabel="Set category"
                onSetCategory={onEditCategories ? () => onEditCategories(r.id) : undefined}
                onCategoryClick={onEditCategories ? () => onEditCategories(r.id) : undefined}
                onMoreCategoriesClick={onEditCategories ? () => onEditCategories(r.id) : undefined}
                tone={r.watching ? 'warning' : 'default'}
                muted={r.excluded}
                highlighted={rowProps.highlighted}
                selectable={rowProps.selectable}
                selected={rowProps.selected}
                onSelectedChange={rowProps.onSelectedChange}
                selectionMode={rowProps.selectionMode}
                onDetail={onOpenDetail ? rowProps.onSelect : undefined}
                query={query.q || undefined}
                wrapDescription={r.id === morphId ? (node) => <SharedName name={transitionName.transactionTitle(r.id)}><span className="inline-block max-w-full">{node}</span></SharedName> : undefined}
                wrapAmount={r.id === morphId ? (node) => <SharedName name={transitionName.transactionAmount(r.id)}><span className="inline-block">{node}</span></SharedName> : undefined}
              />
            );
          }}
        />
      </Card>
    </ListTransition>
  );
}

/** The list while the page loads. */
export function TransactionsListSkeleton() {
  return (
    <Card>
      <DataTable columns={createTransactionColumns()} data={[]} getRowId={(row) => row.id} loading skeletonRows={8} />
    </Card>
  );
}
