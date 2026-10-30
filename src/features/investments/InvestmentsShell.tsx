'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds/Tabs/Tabs';
import { type TopBarMenuItem } from '@/components/ds/TopBar/TopBar';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { activeInvestmentsTab, INVESTMENTS_IMPORT_HREF, investmentsTabHref, type InvestmentsTabId, investmentsTabs } from './investmentsTabs';
import {
  loadCorporateActionDialog,
  loadDividendAddDialog,
  loadEpfAddDialog,
  loadFnoAddDialog,
  loadInstrumentAddDialog,
  loadRecordTradeDialog,
} from './lazyDialogs';

// The add dialogs are not in the page: the open tab's loads when its + is pressed (see useLazyDialog).

/** The lazy add dialog of the open tab. */
function useAddDialog(tab: InvestmentsTabId) {
  const dividends = useLazyDialog(loadDividendAddDialog);
  const epf = useLazyDialog(loadEpfAddDialog);
  const fno = useLazyDialog(loadFnoAddDialog);
  const corporateActions = useLazyDialog(loadCorporateActionDialog);
  const instruments = useLazyDialog(loadInstrumentAddDialog);
  const trade = useLazyDialog(loadRecordTradeDialog);
  switch (tab) {
    case 'dividends':
      return dividends;
    case 'epf':
      return epf;
    case 'fno':
      return fno;
    case 'corporate-actions':
      return corporateActions;
    case 'instruments':
      return instruments;
    default:
      return trade;
  }
}

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
  const addDialog = useAddDialog(tab);
  const openAdd = () => void addDialog.run(() => setAdding(true));
  const close = () => setAdding(false);

  // Tradebook and F&O: the + is a menu of the add and the import; the other tabs add directly.
  const addMenu: TopBarMenuItem[] | undefined =
    tab === 'tradebook'
      ? [
          { id: 'add', label: 'Record trade', onSelect: openAdd },
          { id: 'import', label: 'Import tradebook', asChild: true, children: <Link href={INVESTMENTS_IMPORT_HREF} /> },
        ]
      : tab === 'fno'
        ? [
            { id: 'add', label: 'Record F&O trade', onSelect: openAdd },
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
      <ShellPage crumb={areaCrumb('investments')} title="Investments" flushTop onAdd={openAdd} addLoading={addDialog.loading} addMenu={addMenu} addLabel={ADD_LABELS[tab]}>
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <Tabs items={items} value={tab} />
          {children}
        </div>
      </ShellPage>
      {adding && addDialog.Component ? <addDialog.Component onClose={close} /> : null}
    </>
  );
}
