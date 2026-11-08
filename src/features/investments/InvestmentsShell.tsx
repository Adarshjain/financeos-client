'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds/Tabs/Tabs';
import { type TopBarMenuItem } from '@/components/ds/TopBar/TopBar';
import { areaCrumb, subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import {
  activeInvestmentsTab,
  activeInvestmentsView,
  INVESTMENTS_HREF,
  INVESTMENTS_IMPORT_HREF,
  investmentsTabHref,
  investmentsTabs,
  type InvestmentsViewId,
} from './investmentsTabs';
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

/** The top bar's + wording per screen: verb plus object. The landing, Tradebook and F&O open a menu whose rows say it. */
const ADD_LABELS: Record<InvestmentsViewId, string | undefined> = {
  overview: undefined,
  holdings: 'Record trade',
  epf: 'Record EPF entry',
  nps: 'Add NPS account',
  dividends: 'Record dividend',
  tradebook: 'Add trade',
  fno: 'Add F&O trade',
  'corporate-actions': 'Record corporate action',
};

/**
 * The frame of the Investments area, applied once by each route layout: the landing (`/investments`) is the area's own
 * page; the stocks pages (Holdings, Dividends, Tradebook, F&O, Corporate actions) sit under a "Stocks & funds" bar with back to the landing and the
 * tab strip; EPF and NPS are drill-ins under their own name with back to the landing and no strip. The top bar's +
 * adds what the open screen lists, in a dialog that refreshes the page after saving. A holding's own page, the Import
 * tradebook page and Instruments mount their own frame.
 */
export function InvestmentsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tab = activeInvestmentsTab(pathname);
  const view = activeInvestmentsView(pathname);
  const [adding, setAdding] = React.useState(false);
  const addDialog = useAddDialog(view);
  const openAdd = () => void addDialog.run(() => setAdding(true));
  const close = () => setAdding(false);

  // The landing, Tradebook and F&O: the + is a menu (record or upload, add and import); the other screens add directly.
  const addMenu: TopBarMenuItem[] | undefined =
    view === 'overview'
      ? [
          { id: 'add', label: 'Record trade', onSelect: openAdd },
          { id: 'epf', label: 'Upload EPF passbook', asChild: true, children: <Link href={EPF_UPLOAD_HREF} /> },
          { id: 'nps', label: 'Upload NPS statement', asChild: true, children: <Link href={NPS_UPLOAD_HREF} /> },
        ]
      : view === 'tradebook'
        ? [
            { id: 'add', label: 'Record trade', onSelect: openAdd },
            { id: 'import', label: 'Import tradebook', asChild: true, children: <Link href={INVESTMENTS_IMPORT_HREF} /> },
          ]
        : view === 'fno'
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

  const drillIn = view === 'epf' || view === 'nps';
  const frame =
    view === 'overview'
      ? { title: 'Investments', crumb: areaCrumb('investments') }
      : drillIn
        ? { title: view === 'epf' ? 'EPF' : 'NPS', crumb: subCrumb('investments'), backHref: INVESTMENTS_HREF }
        : { title: 'Stocks & funds', crumb: subCrumb('investments'), backHref: INVESTMENTS_HREF, flushTop: true };

  return (
    <>
      <ShellPage {...frame} onAdd={openAdd} addLoading={addDialog.loading} addMenu={addMenu} addLabel={ADD_LABELS[view]}>
        {view === 'overview' || drillIn ? (
          children
        ) : (
          <div className="flex flex-col gap-space-8 desk:gap-space-16">
            <Tabs items={items} value={tab} />
            {children}
          </div>
        )}
      </ShellPage>
      {adding && addDialog.Component ? <addDialog.Component onClose={close} /> : null}
    </>
  );
}
