'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds/Tabs/Tabs';
import { type TopBarMenuItem } from '@/components/ds/TopBar/TopBar';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { activeInvestmentsTab, activeInvestmentsView, INVESTMENTS_IMPORT_HREF, investmentsTabHref, investmentsTabs,type InvestmentsViewId } from './investmentsTabs';
import {
  loadCorporateActionDialog,
  loadDividendAddDialog,
  loadEpfAddDialog,
  loadFnoAddDialog,
  loadNpsAccountDialog,
  loadRecordTradeDialog,
} from './lazyDialogs';
import { NPS_UPLOAD_HREF } from './nps/npsImportModel';
import { EPF_UPLOAD_HREF } from './retirement/retirementModel';

// The add dialogs are not in the page: the open tab's loads when its + is pressed (see useLazyDialog).

/** The lazy add dialog of the open screen. */
function useAddDialog(view: InvestmentsViewId) {
  const dividends = useLazyDialog(loadDividendAddDialog);
  const epf = useLazyDialog(loadEpfAddDialog);
  const nps = useLazyDialog(loadNpsAccountDialog);
  const fno = useLazyDialog(loadFnoAddDialog);
  const corporateActions = useLazyDialog(loadCorporateActionDialog);
  const trade = useLazyDialog(loadRecordTradeDialog);
  switch (view) {
    case 'dividends':
      return dividends;
    case 'epf':
      return epf;
    case 'nps':
      return nps;
    case 'fno':
      return fno;
    case 'corporate-actions':
      return corporateActions;
    default:
      return trade;
  }
}

/** The top bar's + wording per screen: verb plus object. Trades, F&O and Retirement open a menu whose rows say it. */
const ADD_LABELS: Record<InvestmentsViewId, string | undefined> = {
  holdings: 'Record trade',
  retirement: 'Upload statement',
  epf: 'Record EPF entry',
  nps: 'Add NPS account',
  dividends: 'Record dividend',
  trades: 'Add trade',
  fno: 'Add F&O trade',
  'corporate-actions': 'Record corporate action',
};

/**
 * The frame of `/investments`, applied by the route layout: the top bar, then the tab strip, then the
 * tab's page. The top bar's + adds what the open tab
 * lists, in a dialog that refreshes the page after saving. A holding's own page and the Import tradebook page sit outside the
 * `(tabs)` route group, so they render on their own, without the strip.
 */
export function InvestmentsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tab = activeInvestmentsTab(pathname);
  const view = activeInvestmentsView(pathname);
  const [adding, setAdding] = React.useState(false);
  const addDialog = useAddDialog(view);
  const openAdd = () => void addDialog.run(() => setAdding(true));
  const close = () => setAdding(false);

  // Trades and F&O: the + is a menu of the add and the import; Retirement's is a menu of the two uploads; the other screens add directly.
  const addMenu: TopBarMenuItem[] | undefined =
    view === 'trades'
      ? [
          { id: 'add', label: 'Record trade', onSelect: openAdd },
          { id: 'import', label: 'Import tradebook', asChild: true, children: <Link href={INVESTMENTS_IMPORT_HREF} /> },
        ]
      : view === 'fno'
        ? [
            { id: 'add', label: 'Record F&O trade', onSelect: openAdd },
            { id: 'import', label: 'Import statement', asChild: true, children: <Link href={INVESTMENTS_IMPORT_HREF} /> },
          ]
        : view === 'retirement'
          ? [
              { id: 'epf', label: 'EPF passbook', asChild: true, children: <Link href={EPF_UPLOAD_HREF} /> },
              { id: 'nps', label: 'NPS statement', asChild: true, children: <Link href={NPS_UPLOAD_HREF} /> },
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
      <ShellPage crumb={areaCrumb('investments')} title="Investments" flushTop onAdd={openAdd} addLoading={addDialog.loading} addMenu={addMenu} addLabel={ADD_LABELS[view]}>
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <Tabs items={items} value={tab} />
          {children}
        </div>
      </ShellPage>
      {adding && addDialog.Component ? <addDialog.Component onClose={close} /> : null}
    </>
  );
}
