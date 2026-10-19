'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem,Tabs } from '@/components/ds';
import { AccountType } from '@/lib/types';

import { accountHref, accountTabsFor, activeTabId, tabCount } from './accountTabsModel';
import { useAccountTabCounts } from './useAccountTabCounts';

/** The route tab strip of an account page; counts appear when tab-counts arrives. */
export function AccountTabs({
  accountId,
  type,
}: {
  accountId: string;
  type: AccountType;
}) {
  const pathname = usePathname();
  const counts = useAccountTabCounts(accountId);
  const tabs = accountTabsFor(type);
  if (tabs.length === 0) return null;

  const items: TabItem[] = tabs.map((tab) => ({
    value: tab.id,
    label: tab.label,
    count: tabCount(tab.id, counts),
    asChild: true,
    children: <Link href={`${accountHref(accountId)}${tab.segment}`} />,
  }));

  return <Tabs items={items} value={activeTabId(pathname, accountId)} />;
}
