'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

import { CorporateActionDialog } from './corporate-actions/CorporateActionDialog';
import { DividendAddDialog } from './dividends/DividendFormDialog';
import { FnoAddDialog } from './fno/FnoAddDialog';
import { InstrumentAddDialog } from './instruments/InstrumentAddDialog';
import { activeInvestmentsTab, investmentsTabHref, type InvestmentsTabId, investmentsTabs, isHoldingDetailPath, isImportPath } from './investmentsTabs';
import { RecordTradeDialog } from './tradebook/TradeDialog';
import { useInvestmentsCounts } from './useInvestmentsCounts';

/**
 * The frame of `/ds/investments`, applied by the route layout: the top bar, then the tab strip, then the
 * tab's page. The counts load on their own after the page renders. The top bar's + adds what the open tab
 * lists, in a dialog that refreshes the page after saving. A holding's own page and the Import tradebook page render on their own, without the strip.
 */
export function InvestmentsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isHoldingDetailPath(pathname) || isImportPath(pathname)) return <>{children}</>;
  return <InvestmentsFrame>{children}</InvestmentsFrame>;
}

function InvestmentsFrame({ children }: { children: React.ReactNode }) {
  const tab = activeInvestmentsTab(usePathname());
  const { data: counts } = useInvestmentsCounts();
  const [adding, setAdding] = React.useState(false);
  const close = () => setAdding(false);

  const items: TabItem[] = investmentsTabs.map((t) => ({
    value: t.id,
    label: t.label,
    count: t.counted ? counts?.[t.id as keyof typeof counts] : undefined,
    asChild: true,
    children: <Link href={investmentsTabHref(t)} />,
  }));

  return (
    <>
      <ShellPage crumb="Grow" title="Investments" flushTop onAdd={() => setAdding(true)}>
        <div className="flex flex-col gap-space-12 desk:gap-space-16">
          <Tabs items={items} value={tab} />
          {children}
        </div>
      </ShellPage>
      {adding ? <AddDialog tab={tab} onClose={close} /> : null}
    </>
  );
}

/** The dialog the top bar's + opens on a tab. */
function AddDialog({ tab, onClose }: { tab: InvestmentsTabId; onClose: () => void }) {
  switch (tab) {
    case 'dividends':
      return <DividendAddDialog onClose={onClose} />;
    case 'fno':
      return <FnoAddDialog onClose={onClose} />;
    case 'corporate-actions':
      return <CorporateActionDialog onClose={onClose} />;
    case 'instruments':
      return <InstrumentAddDialog onClose={onClose} />;
    default:
      return <RecordTradeDialog onClose={onClose} />;
  }
}
