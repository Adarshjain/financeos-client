'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { activeInboxUpcomingTab, inboxUpcomingTabs } from './inboxUpcomingTabs';

/**
 * The frame shared by `/inbox` and `/upcoming/**`, applied by both route layouts: top bar
 * (title follows the tab), then the Inbox · Upcoming · Calendar route tabs, then the tab's page as
 * `children`.
 */
export function InboxUpcomingShell({ children }: { children: React.ReactNode }) {
  const tab = activeInboxUpcomingTab(usePathname());

  const items: TabItem[] = inboxUpcomingTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={t.href} />,
  }));

  return (
    <ShellPage crumb={tab.id === 'inbox' ? undefined : areaCrumb('notifications')} title={tab.title} flushTop>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Tabs items={items} value={tab.id} />
        {children}
      </div>
    </ShellPage>
  );
}
