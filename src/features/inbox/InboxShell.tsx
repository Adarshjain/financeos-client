'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds/Tabs/Tabs';
import { ShellPage } from '@/features/shell/ShellPage';

import { activeInboxTab, inboxTabs } from './inboxTabs';

/**
 * The frame shared by `/inbox` and `/inbox/updates`, applied by the route layout: top bar (titled Inbox on both
 * tabs), then the To do · Updates route tabs, then the tab's page as `children`.
 */
export function InboxShell({ children }: { children: React.ReactNode }) {
  const tab = activeInboxTab(usePathname());

  const items: TabItem[] = inboxTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={t.href} />,
  }));

  return (
    <ShellPage title={tab.title} flushTop>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Tabs items={items} value={tab.id} />
        {children}
      </div>
    </ShellPage>
  );
}
