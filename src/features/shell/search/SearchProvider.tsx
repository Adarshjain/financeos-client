'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { SearchPalette } from '@/components/ds';

import { shellFooterItems, shellQuickAddItems, shellRailGroups } from '../navigation';
import { useOpenQuickAddDialog } from '../quickAdd';
import { appHref } from '../routes';
import { buildSearchGroups, type SearchAction, type SearchPage } from './searchItems';
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
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const { result, loading } = useGlobalSearch(query);

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
  const groups = buildSearchGroups({ query, result, pages: PAGES, actions, go: (href) => router.push(href) });

  const value = React.useMemo<SearchValue>(() => ({ open: () => setOpen(true) }), []);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchPalette
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery('');
        }}
        value={query}
        onValueChange={setQuery}
        groups={groups}
        // The previous answer stays on screen while a newer one loads; the skeleton is only for the first.
        loading={loading && !result}
        shortcutKey="k"
      />
    </SearchContext.Provider>
  );
}
