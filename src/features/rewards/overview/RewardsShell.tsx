'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

import { RewardsAddProvider } from './RewardsAdd';
import { activeRewardsTab, rewardsTabHref, rewardsTabs } from './rewardsTabs';

/** The frame of the three Rewards tabs, applied by the route group's layout: the top bar, then the tab strip, then the tab's page. A card's own page has its own top bar and sits outside it. */
export function RewardsShell({ children }: { children: React.ReactNode }) {
  const tab = activeRewardsTab(usePathname());
  // The tab's page registers its add action; the + shows only when one is registered.
  const [adder, setAdder] = React.useState<(() => void) | null>(null);
  const register = React.useCallback((add: (() => void) | null) => setAdder(() => add), []);
  const items: TabItem[] = rewardsTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={rewardsTabHref(t)} />,
  }));
  return (
    <ShellPage
      crumb="Grow"
      title="Rewards"
      flushTop
      onAdd={tab === 'rules' ? (adder ?? undefined) : undefined}
      addLabel="New rule"
    >
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Tabs items={items} value={tab} />
        <RewardsAddProvider value={register}>{children}</RewardsAddProvider>
      </div>
    </ShellPage>
  );
}
