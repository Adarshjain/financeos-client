'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { SearchPalette } from '@/components/ds';
import { MarkPaidDialog } from '@/features/bills/MarkPaidDialog';
import { useAddTransaction } from '@/features/transactions/form/AddTransactionProvider';

import { shellFooterItems, shellQuickAddItems, shellRailGroups } from '../navigation';
import { useOpenQuickAddDialog } from '../quickAdd';
import { appHref } from '../routes';
import { buildSearchGroups, type SearchAction, searchHint, type SearchPage } from './searchItems';
import { useGlobalSearch } from './useGlobalSearch';

interface SearchValue {
  open: () => void;
}

const SearchContext = React.createContext<SearchValue>({ open: () => {} });

/** Opens the app-wide search from a Rail field or a top-bar button. A no-op outside the provider. */
export function useSearch(): SearchValue {
  return React.useContext(SearchContext);
}

const PAGES: SearchPage[] = [...shellRailGroups.flatMap((g) => g.items), ...shellFooterItems].map(({ id, label, icon, href }) => ({ id, label, icon, href }));

/** Owns the search palette (open state and text) for the signed-in Dinero shell and renders it once; ⌘K / Ctrl+K toggles it. */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const openQuickAdd = useOpenQuickAddDialog();
  const addTransaction = useAddTransaction();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const { result, loading, reset } = useGlobalSearch(query);
  const [markPaid, setMarkPaid] = React.useState<{ statementId: string; cardName: string; remaining: number } | null>(null);

  const actions: SearchAction[] = shellQuickAddItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    disabled: item.disabled,
    onSelect: () => {
      if (item.dialog) openQuickAdd(item.dialog);
      else if (item.href) router.push(appHref(item.href));
    },
  }));
  const groups = buildSearchGroups({ query, result, pages: PAGES, actions, go: (href) => router.push(href),
    onMarkBillPaid: setMarkPaid,
    onAddTransaction: (accountId) => addTransaction.open({ defaultAccountId: accountId }),
  });

  // Opening starts fresh: a bill paid or a transaction added elsewhere since would leave cached answers stale.
  const value: SearchValue = {
    open: () => {
      reset();
      setOpen(true);
    },
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
      <MarkPaidDialog
        open={markPaid !== null}
        onOpenChange={(next) => !next && setMarkPaid(null)}
        statementId={markPaid?.statementId ?? ''}
        cardName={markPaid?.cardName ?? ''}
        remaining={markPaid?.remaining ?? null}
        // The cached answers still show this bill as unpaid (or paid, after an undo).
        onMarked={reset}
      />
      <SearchPalette
        open={open}
        onOpenChange={(next) => {
          if (next) reset();
          setOpen(next);
          if (!next) setQuery('');
        }}
        value={query}
        onValueChange={setQuery}
        groups={groups}
        hint={searchHint(query)}
        // The previous answer stays on screen while a newer one loads; the skeleton is only for the first.
        loading={loading && !result}
        shortcutKey="k"
      />
    </SearchContext.Provider>
  );
}
