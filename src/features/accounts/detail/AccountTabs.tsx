'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem,Tabs } from '@/components/ds';
import { AccountType } from '@/lib/types';

import { accountHref, accountTabsFor, activeTabId } from './accountTabsModel';

/** The route tab strip of an account page. */
export function AccountTabs({
  accountId,
  type,
}: {
  accountId: string;
  type: AccountType;
}) {
  const pathname = usePathname();
  const tabs = accountTabsFor(type);
  if (tabs.length === 0) return null;

  const items: TabItem[] = tabs.map((tab) => ({
    value: tab.id,
    label: tab.label,
    asChild: true,
    children: <Link href={`${accountHref(accountId)}${tab.segment}`} />,
  }));

  return <Tabs items={items} value={activeTabId(pathname, accountId)} />;
}
