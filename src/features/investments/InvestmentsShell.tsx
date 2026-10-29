'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs, type TopBarMenuItem } from '@/components/ds';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { CorporateActionDialog } from './corporate-actions/CorporateActionDialog';
import { DividendAddDialog } from './dividends/DividendFormDialog';
import { EpfAddDialog } from './epf/EpfAddDialog';
import { FnoAddDialog } from './fno/FnoAddDialog';
import { InstrumentAddDialog } from './instruments/InstrumentAddDialog';
import { activeInvestmentsTab, INVESTMENTS_IMPORT_HREF, investmentsTabHref, type InvestmentsTabId, investmentsTabs } from './investmentsTabs';
import { RecordTradeDialog } from './tradebook/TradeDialog';

/** The top bar's + wording per tab: verb plus object. Tradebook and F&O open a menu whose rows say it. */
const ADD_LABELS: Record<InvestmentsTabId, string | undefined> = {
  holdings: 'Record trade',
  epf: 'Record EPF entry',
  dividends: 'Record dividend',
  tradebook: 'Add trade',
  fno: 'Add F&O trade',
  'corporate-actions': 'Record corporate action',
  instruments: 'Add instrument',
};

/**
 * The frame of `/investments`, applied by the route layout: the top bar, then the tab strip, then the
 * tab's page. The top bar's + adds what the open tab
 * lists, in a dialog that refreshes the page after saving. A holding's own page and the Import tradebook page sit outside the
 * `(tabs)` route group, so they render on their own, without the strip.
 */
export function InvestmentsShell({ children }: { children: React.ReactNode }) {
  const tab = activeInvestmentsTab(usePathname());
  const [adding, setAdding] = React.useState(false);
  const close = () => setAdding(false);

  // Tradebook and F&O: the + is a menu of the add and the import; the other tabs add directly.
  const addMenu: TopBarMenuItem[] | undefined =
    tab === 'tradebook'
      ? [
          { id: 'add', label: 'Record trade', onSelect: () => setAdding(true) },
          { id: 'import', label: 'Import tradebook', asChild: true, children: <Link href={INVESTMENTS_IMPORT_HREF} /> },
        ]
      : tab === 'fno'
        ? [
            { id: 'add', label: 'Record F&O trade', onSelect: () => setAdding(true) },
            { id: 'import', label: 'Import statement', asChild: true, children: <Link href={INVESTMENTS_IMPORT_HREF} /> },
          ]
        : undefined;

  const items: TabItem[] = investmentsTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={investmentsTabHref(t)} />,
  }));

  return (
    <>
      <ShellPage crumb={areaCrumb('investments')} title="Investments" flushTop onAdd={() => setAdding(true)} addMenu={addMenu} addLabel={ADD_LABELS[tab]}>
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
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
    case 'epf':
      return <EpfAddDialog onClose={onClose} />;
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
