'use client';

// shortcuts: the user's tiles in their order, as buttons. Pages, accounts, reports and dashboards are links; a
// dialog action (Add transaction, Record lending) opens its dialog from state. Unknown ids are hidden.
// Content only; the dashboard frame draws the card.

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { appHref } from '@/features/shell/routes';
import { useAddTransaction } from '@/features/transactions/form/AddTransactionProvider';

import { type DialogActionId, type ShortcutItem, useShortcuts } from './shortcutsCatalog';

const GRID = 'grid grid-cols-2 gap-space-8 px-space-16 pb-space-12 desk:grid-cols-4';

/** The widget's loading skeleton: a row of four button-sized blocks. */
export function ShortcutsSkeleton() {
  return (
    <div className={GRID} data-testid="shortcuts-loading">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={32} />
      ))}
    </div>
  );
}

export function ShortcutsBody({ ids }: { ids: readonly string[] }) {
  const { items, pending } = useShortcuts(ids);
  const addTransaction = useAddTransaction();
  const addLending = useAddLending();
  const launch = (id: DialogActionId) => void (id === 'add-transaction' ? addTransaction.open() : addLending.open());
  const loadingId = (id: DialogActionId) => (id === 'add-transaction' ? addTransaction.loading : addLending.loading);

  if (items.length === 0 && pending) return <ShortcutsSkeleton />;
  if (items.length === 0) {
    return <EmptyState compact description="Pick some in this widget's settings." />;
  }
  return (
    <div className={GRID} data-testid="shortcuts-widget">
      {items.map((item) => (
        <Tile key={item.id} item={item} onLaunch={launch} loading={Boolean(item.actionId && loadingId(item.actionId))} />
      ))}
    </div>
  );
}

function Tile({ item, onLaunch, loading }: { item: ShortcutItem; onLaunch: (id: DialogActionId) => void; loading: boolean }) {
  if (item.href) {
    return (
      <Button asChild fullWidth title={item.label}>
        <Link href={appHref(item.href)}>{item.label}</Link>
      </Button>
    );
  }
  return (
    <Button fullWidth title={item.label} loading={loading} onClick={() => item.actionId && onLaunch(item.actionId)}>
      {item.label}
    </Button>
  );
}
