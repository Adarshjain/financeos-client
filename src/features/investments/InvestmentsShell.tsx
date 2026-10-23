'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

import { investmentsTabHref, investmentsTabs,isHoldingDetailPath } from './investmentsTabs';
import { useInvestmentsCounts } from './useInvestmentsCounts';

/**
 * The frame of `/ds/investments`, applied by the route layout: the top bar, then the tab strip, then the
 * tab's page. The counts load on their own after the page renders. Tabs whose page is not built yet link to
 * their Legacy page. A holding's own page renders on its own, without the strip.
 */
export function InvestmentsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isHoldingDetailPath(pathname)) return <>{children}</>;
  return <InvestmentsFrame>{children}</InvestmentsFrame>;
}

function InvestmentsFrame({ children }: { children: React.ReactNode }) {
  const { data: counts } = useInvestmentsCounts();

  const items: TabItem[] = investmentsTabs.map((tab) => ({
    value: tab.id,
    label: tab.label,
    count: tab.counted ? counts?.[tab.id as keyof typeof counts] : undefined,
    asChild: true,
    children: <Link href={investmentsTabHref(tab)} />,
  }));

  return (
    <ShellPage crumb="Grow" title="Investments" flushTop>
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <Tabs items={items} value="holdings" />
        {children}
      </div>
    </ShellPage>
  );
}
