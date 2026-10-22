'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Icon, type TabItem, Tabs, TextField } from '@/components/ds';
import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import { useSearchText } from '@/features/shell/useSearchText';
import { seedNeedsReviewCount } from '@/features/transactions/useNeedsReviewCount';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';

import { FilterChips } from './FilterChips';
import { FiltersDialog } from './FiltersDialog';
import type { TransactionListRow } from './transactionRows';
import { TransactionsList } from './TransactionsList';
import { TransactionsLoadError } from './TransactionsLoadError';
import { type TransactionsQuery, transactionsUrl } from './transactionsUrl';

export const TRANSACTION_TABS = [
  { value: 'all', label: 'All', href: '/transactions' },
  { value: 'rules', label: 'Rules', href: '/rules' },
  { value: 'categories', label: 'Categories', href: '/rules/categories' },
  { value: 'import', label: 'Import', href: '/transactions/import' },
];

export type TransactionsListResult =
  | {
      ok: true;
      rows: TransactionListRow[];
      totalElements: number;
      totalPages: number;
    }
  | { ok: false; reference?: string };

export interface TransactionsViewProps {
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
 * /ds/transactions: the tabs, the search and filter chips, and the list. Every change writes the
 * address; the server page then reads it and fetches once. The client never fetches the list itself.
 */
export function TransactionsView({
  query,
  today,
  list,
  accounts,
  categories,
  needsReviewCount,
  onAdd = noop,
  onOpenDetail,
  openId,
  onEditCategories,
  detailOpen = false,
  selection,
  onSelectionChange,
  selectionHeader,
  wrapRow,
}: TransactionsViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountDialogs = useAccountDialogs();
  const [pending, startTransition] = React.useTransition();
  const [filtersOpen, setFiltersOpen] = React.useState(false);

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
          ...(resetPage ? { page: 0 } : {}),
          ...patch,
        }),
        { scroll: false }
      );
    });
  const { text, setText } = useSearchText(query.q, (q) => go({ q }));
  // Phone: the search fills the row beside the chips; while focused it widens and pushes them out of view.
  const [searchFocused, setSearchFocused] = React.useState(false);

  const tabs: TabItem[] = TRANSACTION_TABS.map((t) => ({
    value: t.value,
    label: t.label,
    asChild: true,
    children: <Link href={appHref(t.href)} prefetch={false} />,
  }));

  return (
    <>
      <ShellPage crumb="Money" title="Transactions" flushTop onAdd={onAdd}>
        <div className="flex">
          <div className="flex min-w-0 flex-1 flex-col gap-space-12 desk:gap-space-16">
            {selectionHeader ? (
              <>
                <div className="desk:hidden">
                  <Tabs items={tabs} value="all" />
                </div>
                {selectionHeader}
              </>
            ) : (
              <Tabs items={tabs} value="all" />
            )}
            <FilterChips
              query={query}
              today={today}
              accounts={accounts}
              categories={categories}
              needsReviewCount={needsReviewCount}
              onChange={go}
              onOpenFilters={() => setFiltersOpen(true)}
              search={
                <TextField
                  type="search"
                  size="md"
                  className={`min-w-0 desk:min-w-container-xs transition-all duration-base motion-reduce:transition-none ${searchFocused ? 'max-desk:grow-0 max-desk:shrink-0 max-desk:basis-11/12' : 'flex-1'}`}
                  prefix={<Icon name="search" size="sm" />}
                  clearable
                  clearLabel="Clear search"
                  placeholder="Search merchant, amount…"
                  value={text}
                  onValueChange={setText}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              }
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
              <TransactionsLoadError reference={list.reference} />
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
      {filtersOpen ? (
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
