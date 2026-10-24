'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

import { activeRewardsTab, rewardsTabHref, rewardsTabs } from './rewardsTabs';

/** The frame of the three Rewards tabs, applied by the route group's layout: the top bar, then the tab strip, then the tab's page. A card's own page has its own top bar and sits outside it. */
export function RewardsShell({ children }: { children: React.ReactNode }) {
  const tab = activeRewardsTab(usePathname());
  const items: TabItem[] = rewardsTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={rewardsTabHref(t)} />,
  }));
  return (
    <ShellPage crumb="Grow" title="Rewards" flushTop>
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <Tabs items={items} value={tab} />
        {children}
      </div>
    </ShellPage>
  );
}
