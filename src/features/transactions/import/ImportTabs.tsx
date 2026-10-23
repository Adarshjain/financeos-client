'use client';

import Link from 'next/link';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { TRANSACTION_TABS } from '@/features/transactions/list/TransactionsView';

/** All · Rules · Categories · Import, with Import current. */
export function ImportTabs() {
  const items: TabItem[] = TRANSACTION_TABS.map((t) => ({
    value: t.value,
    label: t.label,
    asChild: true,
    children: <Link href={appHref(t.href)} prefetch={false} />,
  }));
  return <Tabs items={items} value="import" />;
}
