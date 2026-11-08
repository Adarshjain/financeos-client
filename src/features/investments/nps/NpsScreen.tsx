'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { GRID_GAP } from '@/components/ds/gridGap';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { loadNpsAccountDialog } from '../lazyDialogs';
import { NpsDetectedAccounts } from './NpsDetectedAccounts';
import { NpsEntriesCard } from './NpsEntriesCard';
import { NpsBanners, NpsHero } from './NpsFigures';
import { NpsGmailBanners } from './NpsGmailBanners';
import { NPS_UPLOAD_HREF } from './npsImportModel';
import type { NpsAccount, NpsAccountCard, NpsAllocationLine, NpsEntry, NpsEntryRow, NpsFigures, NpsFyLine, NpsSchemeRow, NpsSummary, NpsTier, NpsTierGroup, NpsUrlState } from './npsModel';
import { NpsSchemesCard } from './NpsSchemesCard';
import { NpsAccountCardView, NpsAllocationCard, NpsThisFyCard } from './NpsSideCards';

const loadNpsEntryDialog = () => import('./NpsEntryDialog').then((m) => m.NpsEntryDialog);
const loadNpsStatementsDialog = () => import('./NpsStatementsDialog').then((m) => m.NpsStatementsDialog);
const loadNpsSchemeSheet = () => import('./NpsSchemeSheet').then((m) => m.NpsSchemeSheet);

export interface NpsScreenProps {
  state: NpsUrlState;
  /** The FY the ledger is showing (undefined = all years). */
  ledgerFy: number | undefined;
  summary: NpsSummary;
  /** The account shown; null before the first one is added. */
  account: NpsAccount | null;
  figures: NpsFigures;
  groups: NpsTierGroup[];
  card: NpsAccountCard | null;
  fyLines: NpsFyLine[];
  allocation: { tier: NpsTier; lines: NpsAllocationLine[] }[];
  entries: NpsEntry[];
  rows: NpsEntryRow[];
  totalElements: number;
  totalPages: number;
  /** The account choices, empty unless there is more than one account. */
  accountOptions: { value: string; label: string }[];
  accountValue: string;
}

/** The NPS tab: the hero, schemes by tier, the ledger, the account, this FY and the allocation, and the dialogs they open. */
export function NpsScreen(props: NpsScreenProps) {
  const { state, ledgerFy, summary, account, figures, groups, card, fyLines, allocation, rows, totalElements, totalPages, accountOptions, accountValue } = props;
  const [accountDialog, setAccountDialog] = React.useState<'new' | 'edit' | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [scheme, setScheme] = React.useState<NpsSchemeRow | null>(null);
  const add = useLazyDialog(loadNpsAccountDialog);
  const entry = useLazyDialog(loadNpsEntryDialog);
  const sheet = useLazyDialog(loadNpsSchemeSheet);
  const statements = useLazyDialog(loadNpsStatementsDialog);
  const [listingStatements, setListingStatements] = React.useState(false);

  const accountDialogNode =
    accountDialog && add.Component ? <add.Component account={accountDialog === 'edit' ? account : null} allocation={summary.allocation} onClose={() => setAccountDialog(null)} /> : null;

  const emptyState = (
    <EmptyState
      className="flex-1"
      title="Track your NPS"
      description="Upload your NPS statement to bring in every contribution, charge and switch, or add your balance by hand."
      action={{ label: 'Upload statement', variant: 'primary', href: NPS_UPLOAD_HREF }}
      secondaryAction={{ label: 'Add by hand', loading: add.loading, onSelect: () => void add.run(() => setAccountDialog('new')) }}
    />
  );

  if (!account || !card) {
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <NpsGmailBanners locked={summary.lockedGmail} failed={summary.failedGmail} />
        {summary.pendingGmail.length > 0 ? (
          <NpsDetectedAccounts detections={summary.pendingGmail}>
            <Card.Row>{emptyState}</Card.Row>
          </NpsDetectedAccounts>
        ) : (
          <Card>{emptyState}</Card>
        )}
        {accountDialogNode}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <NpsHero figures={figures} />
        <NpsGmailBanners locked={summary.lockedGmail} failed={summary.failedGmail} />
        {summary.pendingGmail.length > 0 ? <NpsDetectedAccounts detections={summary.pendingGmail} /> : null}
        <NpsBanners flags={summary.flags} uploadHref={NPS_UPLOAD_HREF} statementEnd={account.latestStatementEnd} frozenAsOf={account.tier1Status === 'FROZEN' ? (account.tier1StatusAsOf ?? null) : undefined} />
        <div className={`grid grid-cols-1 desk:grid-cols-3 items-start ${GRID_GAP}`}>
          <div className="desk:col-span-2 min-w-0 flex flex-col gap-space-8 desk:gap-space-16">
            <NpsSchemesCard groups={groups} onOpen={(row) => void sheet.run(() => setScheme(row))} />
            <NpsEntriesCard
              state={state}
              fy={ledgerFy}
              rows={rows}
              totalElements={totalElements}
              totalPages={totalPages}
              accountOptions={accountOptions}
              accountValue={accountValue}
              onRecord={() => void entry.run(() => setRecording(true))}
              recordLoading={entry.loading}
            />
          </div>
          <div className="flex flex-col gap-space-8 desk:gap-space-16">
            <NpsAccountCardView card={card} editLoading={add.loading} onEdit={() => void add.run(() => setAccountDialog('edit'))} onStatements={() => void statements.run(() => setListingStatements(true))} />
            <NpsThisFyCard lines={fyLines} />
            <NpsAllocationCard allocation={allocation} />
          </div>
        </div>
        {recording && entry.Component ? <entry.Component summary={summary} accountId={account.id} onClose={() => setRecording(false)} /> : null}
        {listingStatements && statements.Component ? <statements.Component accountId={account.id} onClose={() => setListingStatements(false)} /> : null}
        {scheme && sheet.Component ? <sheet.Component schemeCode={scheme.schemeCode} tier={scheme.tier} accountId={account.id} onClose={() => setScheme(null)} /> : null}
      </div>
      {accountDialogNode}
    </>
  );
}
