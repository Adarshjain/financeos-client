'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { appHref } from '@/features/shell/routes';

import { activeTransactionsTab, TRANSACTION_TABS } from './transactionTabs';

/** All · Rules · Categories · Import: the tab strip of Transactions. The active tab comes from the address. */
export function TransactionsTabs() {
  const items: TabItem[] = TRANSACTION_TABS.map((t) => ({
    value: t.value,
    label: t.label,
    asChild: true,
    children: <Link href={appHref(t.href)} prefetch={false} />,
  }));
  return <Tabs items={items} value={activeTransactionsTab(usePathname())} />;
}
