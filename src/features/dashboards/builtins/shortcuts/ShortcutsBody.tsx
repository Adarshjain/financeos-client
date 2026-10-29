'use client';

// shortcuts: the user's tiles in their order, as buttons. Pages, accounts, reports and dashboards are links; a
// dialog action (Add transaction, Record lending) opens its dialog from state. Unknown ids are hidden.
// Content only; the dashboard frame draws the card.

import Link from 'next/link';
import React from 'react';

import { Button, EmptyState, Skeleton } from '@/components/ds';
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
  const launch = (id: DialogActionId) => (id === 'add-transaction' ? addTransaction.open() : addLending.open());

  if (items.length === 0 && pending) return <ShortcutsSkeleton />;
  if (items.length === 0) {
    return <EmptyState compact title="No shortcuts yet" description="Pick some in this widget's settings." />;
  }
  return (
    <div className={GRID} data-testid="shortcuts-widget">
      {items.map((item) => (
        <Tile key={item.id} item={item} onLaunch={launch} />
      ))}
    </div>
  );
}

function Tile({ item, onLaunch }: { item: ShortcutItem; onLaunch: (id: DialogActionId) => void }) {
  if (item.href) {
    return (
      <Button asChild fullWidth title={item.label}>
        <Link href={appHref(item.href)}>{item.label}</Link>
      </Button>
    );
  }
  return (
    <Button fullWidth title={item.label} onClick={() => item.actionId && onLaunch(item.actionId)}>
      {item.label}
    </Button>
  );
}
