'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { LoadError } from '@/features/shell/LoadError';
import { areaCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import { useSearchText } from '@/features/shell/useSearchText';
import { TransactionsTabs } from '@/features/transactions/TransactionsTabs';
import { seedNeedsReviewCount } from '@/features/transactions/useNeedsReviewCount';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { FilterChips } from './FilterChips';
import type { TransactionListRow } from './transactionRowsModel';
import { TransactionsList } from './TransactionsList';
import { type TransactionsQuery, transactionsUrl } from './transactionsUrl';

// The Filters dialog is not in the page: it loads when a filter control is pressed (see useLazyDialog).
const loadFiltersDialog = () => import('./FiltersDialog').then((m) => m.FiltersDialog);

export type TransactionsListResult =
  | {
      ok: true;
      rows: TransactionListRow[];
      totalElements: number;
      totalPages: number;
    }
  | { ok: false; reference?: string };

export interface TransactionsListPaneProps {
  /** The query the address stands for; the server read it before fetching. */
  query: TransactionsQuery;
  /** Today, YYYY-MM-DD, for the date fields. */
  today: string;
  list: TransactionsListResult;
  /** Null when they could not be loaded: the Account and Category chips are then off. */
  accounts: Account[] | null;
  categories: Category[] | null;
  /** Everything that needs review; null when it could not be loaded. */
  needsReviewCount: number | null;
  /** The app bar's +: opens Add transaction (piece 3 wires it). */
  onAdd?: () => void;
  /** The + shows its loading state while the Add transaction code loads. */
  addLoading?: boolean;
  /** A row was pressed (piece 2 opens the detail). */
  onOpenDetail?: (id: string) => void;
  /** The row open in the detail pane. */
  openId?: string;
  /** "Set category" or a category chip was pressed (piece 3 opens the edit). */
  onEditCategories?: (id: string) => void;
  /** The detail side panel is open: on desktop the list leaves room for it instead of sitting underneath. */
  detailOpen?: boolean;
  /** Selection (piece 5): the ticked ids, the change, and what sits above the filters while rows are selected. */
  selection?: string[];
  onSelectionChange?: (ids: string[]) => void;
  selectionHeader?: React.ReactNode;
  /** Wraps each row, for the phone swipe (piece 6). */
  wrapRow?: (row: TransactionListRow, node: React.ReactNode) => React.ReactNode;
}

const noop = () => {};

/**
 * /transactions: the tabs, the search and filter chips, and the list. Every change writes the
 * address; the server page then reads it and fetches once. The client never fetches the list itself.
 */
export function TransactionsListPane({
  query,
  today,
  list,
  accounts,
  categories,
  needsReviewCount,
  onAdd = noop,
  addLoading,
  onOpenDetail,
  openId,
  onEditCategories,
  detailOpen = false,
  selection,
  onSelectionChange,
  selectionHeader,
  wrapRow,
}: TransactionsListPaneProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountDialogs = useAccountDialogs();
  const [pending, startTransition] = React.useTransition();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const { Component: FiltersDialog, run: runFilters } = useLazyDialog(loadFiltersDialog);

  // The nav badge reads the same number, so it does not ask again. Seeded in render so it is there before the
  // rail's query subscribes; the effect keeps it current when the number changes later.
  React.useState(() => {
    if (needsReviewCount !== null)
      seedNeedsReviewCount(queryClient, needsReviewCount, 'initial');
  });
  React.useEffect(() => {
    if (needsReviewCount !== null)
      seedNeedsReviewCount(queryClient, needsReviewCount, 'update');
  }, [needsReviewCount, queryClient]);

  const go = (patch: Partial<TransactionsQuery>, resetPage = true) =>
    startTransition(() => {
      router.push(
        transactionsUrl({
          ...query,
          txn: null,
          ...(resetPage ? { page: 0 } : {}),
          ...patch,
        }),
        { scroll: false }
      );
    });
  const { text, setText } = useSearchText(query.q, (q) => go({ q }));

  return (
    <>
      <ShellPage crumb={areaCrumb('transactions')} title="Transactions" flushTop onAdd={onAdd} addLoading={addLoading} addLabel="Add transaction">
        <div className="flex">
          <div className="flex min-w-0 flex-1 flex-col gap-space-8 desk:gap-space-16">
            {selectionHeader ? (
              <>
                <div className="desk:hidden">
                  <TransactionsTabs />
                </div>
                {selectionHeader}
              </>
            ) : (
              <TransactionsTabs />
            )}
            <FilterChips
              query={query}
              today={today}
              accounts={accounts}
              categories={categories}
              onChange={go}
              onOpenFilters={() => void runFilters(() => setFiltersOpen(true))}
              search={{ value: text, onValueChange: setText }}
            />
            {list.ok ? (
              <TransactionsList
                query={query}
                rows={list.rows}
                totalElements={list.totalElements}
                totalPages={list.totalPages}
                busy={pending}
                noAccounts={accounts !== null && accounts.length === 0}
                onChange={go}
                onAddAccount={() => accountDialogs.open()}
                onImport={() => router.push(appHref('/transactions/import'))}
                onOpenDetail={onOpenDetail}
                openId={openId}
                onEditCategories={onEditCategories}
                selection={selection}
                onSelectionChange={onSelectionChange}
                wrapRow={wrapRow}
              />
            ) : (
              <LoadError what="transactions" reference={list.reference} />
            )}
          </div>
          {detailOpen ? (
            <div
              aria-hidden="true"
              className="hidden w-full max-w-container-sm shrink-0 desk:ml-space-24 desk:block"
            />
          ) : null}
        </div>
      </ShellPage>
      {filtersOpen && FiltersDialog ? (
        <FiltersDialog
          query={query}
          today={today}
          accounts={accounts}
          categories={categories}
          onApply={(next) => {
            setFiltersOpen(false);
            go(next, false);
          }}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
    </>
  );
}
