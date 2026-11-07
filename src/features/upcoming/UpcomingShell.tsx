'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds/Tabs/Tabs';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { activeUpcomingTab, upcomingTabs } from './upcomingTabs';

/**
 * The frame shared by `/upcoming` and `/upcoming/calendar`, applied by the route layout: top bar (titled
 * Upcoming, under Money), then the List · Calendar route tabs, then the tab's page as `children`.
 */
export function UpcomingShell({ children }: { children: React.ReactNode }) {
  const tab = activeUpcomingTab(usePathname());

  const items: TabItem[] = upcomingTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={t.href} />,
  }));

  return (
    <ShellPage crumb={areaCrumb('upcoming')} title={tab.title} flushTop>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Tabs items={items} value={tab.id} />
        {children}
      </div>
    </ShellPage>
  );
}
