'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';
import { useInboxSummary } from '@/lib/query/hooks/useInbox';

import { activeInboxUpcomingTab, inboxUpcomingTabs } from './inboxUpcomingTabs';

/**
 * The frame shared by `/ds/inbox` and `/ds/upcoming/**`, applied by both route layouts: top bar
 * (title follows the tab), then the Inbox · Upcoming · Calendar route tabs, then the tab's page as
 * `children`. The Inbox count (act now + needs a look) loads on its own after the page renders.
 */
export function InboxUpcomingShell({ children }: { children: React.ReactNode }) {
  const tab = activeInboxUpcomingTab(usePathname());
  const { data: summary } = useInboxSummary();

  const items: TabItem[] = inboxUpcomingTabs.map((t) => ({
    value: t.id,
    label: t.label,
    count: t.id === 'inbox' && summary?.badge ? summary.badge : undefined,
    asChild: true,
    children: <Link href={t.href} />,
  }));

  return (
    <ShellPage title={tab.title} flushTop>
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <Tabs items={items} value={tab.id} />
        {children}
      </div>
    </ShellPage>
  );
}
