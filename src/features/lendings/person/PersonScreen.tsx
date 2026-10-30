'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ActionBar } from '@/components/ds/ActionBar/ActionBar';
import { Button } from '@/components/ds/Button/Button';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { GRID_GAP } from '@/components/ds/gridGap';
import { Menu } from '@/components/ds/Menu/Menu';
import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { firstNameOf } from '@/features/lendings/settleModel';
import { HeroBlock } from '@/features/loans/HeroBlock';
import { LENDINGS_HREF } from '@/features/loans/loansLendingsTabs';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { formatDate } from '@/lib/format';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import type { CounterpartyLedgerResponse, LedgerEntryResponse, PersonCounterparty } from '@/lib/lending.types';
import { SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

import { EditPersonDialog } from './EditPersonDialog';
import { LedgerCard } from './LedgerCard';
import { ExpectedReturnCard, PersonDetailsCard } from './PersonCards';
import { PersonExportDialog } from './PersonExportDialog';
import { PersonMatchingCard } from './PersonMatchingCard';
import {
  deleteEntryCopy,
  deletePersonCopy,
  ledgerRows,
  linkedLine,
  personHeader,
  personHero,
  personUrl,
  type PersonUrlState,
  sinceText,
  totalsLine,
} from './personModel';
import { usePersonMutations } from './usePersonMutations';

export interface PersonScreenProps {
  cp: PersonCounterparty;
  /** The page of entries the URL asks for, with the totals over all of them. */
  ledger: CounterpartyLedgerResponse;
  state: PersonUrlState;
  /** Today's calendar date in the app zone (YYYY-MM-DD). */
  today: string;
  /** The signed-in user's name; prefills "Your name" in the export. */
  myName: string | null;
  /** `?export=1` (the "money due back" push): open Export ledger straight away. */
  openExport: boolean;
}

const loadSettleDialog = () => import('@/features/lendings/SettleDialog').then((m) => m.SettleDialog);
const loadEditEntryDialog = () => import('./EditEntryDialog').then((m) => m.EditEntryDialog);

/** One person: who owes whom, the ledger, expected return, matching and details, with the forms they open. */
export function PersonScreen({ cp, ledger, state, today, myName, openExport }: PersonScreenProps) {
  const router = useRouter();
  const addLending = useAddLending();
  const actions = usePersonMutations(cp.id);

  const [settling, setSettling] = React.useState(false);
  // Settle and Edit entry are not in the page: each loads when opened (see useLazyDialog).
  const { Component: SettleDialog, run: runSettle, loading: settleLoading } = useLazyDialog(loadSettleDialog);
  const { Component: EditEntryDialog, run: runEditEntry } = useLazyDialog(loadEditEntryDialog);
  const [editingPerson, setEditingPerson] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<LedgerEntryResponse | null>(null);
  const [deletingEntry, setDeletingEntry] = React.useState<LedgerEntryResponse | null>(null);
  const [deletingPerson, setDeletingPerson] = React.useState(false);
  const [exporting, setExporting] = React.useState(openExport);

  const header = personHeader(cp, today);
  const hero = personHero(cp);
  const rows = React.useMemo(() => ledgerRows(ledger.entries.content), [ledger]);
  const hasEntries = cp.entryCount > 0;
  const go = (next: Partial<PersonUrlState>) =>
    router.push(personUrl(cp.id, { ...state, ...next }), { scroll: false });

  return (
    <>
      <ShellPage
        crumb={subCrumb('lendings')}
        title={
          // The lendings row's name grows into this title.
          <SharedName name={transitionName.person(cp.id)}>
            <span>{cp.name}</span>
          </SharedName>
        }
        backHref={LENDINGS_HREF}
        addLabel="Add entry"
        onAdd={() => void addLending.openFor(cp)}
        addLoading={addLending.loading}
      >
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <HeroBlock hero={hero} error="" />
          <ActionBar
            info={header.info}
            actions={
              cp.netPosition !== 0 ? (
                <Button variant="secondary" loading={settleLoading} onClick={() => void runSettle(() => setSettling(true))}>
                  Settle up
                </Button>
              ) : null
            }
            menu={
              <>
                <Menu.Item onSelect={() => setEditingPerson(true)}>Edit person</Menu.Item>
                <Menu.Item disabled={!hasEntries} onSelect={() => setExporting(true)}>
                  Export ledger
                </Menu.Item>
                <Menu.Item tone="danger" onSelect={() => setDeletingPerson(true)}>
                  Delete
                </Menu.Item>
              </>
            }
          />
          <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
            <div className="desk:col-span-7 min-w-0">
              <LedgerCard
                firstName={firstNameOf(cp.name)}
                rows={rows}
                totals={totalsLine(ledger.totals)}
                page={state.page}
                size={state.size}
                totalElements={ledger.entries.totalElements}
                totalPages={ledger.entries.totalPages}
                onPageChange={(page) => go({ page })}
                onSizeChange={(size) => go({ size, page: 0 })}
                onOpenEntry={(row) => void runEditEntry(() => setEditingEntry(row.entry))}
                onExport={() => setExporting(true)}
              />
            </div>
            <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
              <ExpectedReturnCard
                date={cp.expectedReturnDate ? formatDate(cp.expectedReturnDate, 'full') : null}
                canExport={hasEntries}
                onExport={() => setExporting(true)}
              />
              {hasEntries ? (
                <PersonMatchingCard
                  counterpartyId={cp.id}
                  personName={cp.name}
                  linked={linkedLine(cp.entryCount, cp.linkedEntryCount)}
                  hasUnlinked={cp.entryCount > cp.linkedEntryCount}
                />
              ) : null}
              <PersonDetailsCard notes={cp.notes ?? null} since={sinceText(cp.firstEntryDate ?? null)} onEdit={() => setEditingPerson(true)} />
            </div>
          </div>
        </div>
      </ShellPage>

      {settling && SettleDialog ? (
        <SettleDialog
          open
          onOpenChange={(open) => {
            if (!open) setSettling(false);
          }}
          counterpartyId={cp.id}
          name={cp.name}
          direction={cp.netPosition > 0 ? 'lent' : 'borrowed'}
          balance={Math.abs(cp.netPosition)}
          onRecorded={() => router.refresh()}
        />
      ) : null}

      {editingPerson ? (
        <EditPersonDialog
          person={cp}
          submitting={actions.pending.person}
          onSubmit={actions.updatePerson}
          onClose={() => setEditingPerson(false)}
        />
      ) : null}

      {editingEntry && EditEntryDialog ? (
        <EditEntryDialog
          key={editingEntry.id}
          entry={editingEntry}
          netPosition={cp.netPosition}
          personName={cp.name}
          submitting={actions.pending.entry}
          onSubmit={actions.updateEntry}
          onDelete={(entry) => {
            setEditingEntry(null);
            setDeletingEntry(entry);
          }}
          onClose={() => setEditingEntry(null)}
        />
      ) : null}

      {exporting ? (
        <PersonExportDialog
          counterpartyId={cp.id}
          entryCount={cp.entryCount}
          theirName={cp.name}
          defaultMyName={myName}
          onClose={() => setExporting(false)}
        />
      ) : null}

      {deletingEntry ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !actions.pending.deleteEntry) setDeletingEntry(null);
          }}
          title="Delete entry?"
          {...deleteEntryCopy(deletingEntry)}
          confirmLabel="Delete"
          confirmLoading={actions.pending.deleteEntry}
          onConfirm={() => {
            const id = deletingEntry.id;
            void actions.deleteEntry(id).then((ok) => {
              if (ok) setDeletingEntry(null);
            });
          }}
        >
          <IrreversibleNote />
        </ConfirmDialog>
      ) : null}

      <ConfirmDialog
        open={deletingPerson}
        onOpenChange={(open) => {
          if (!actions.pending.deletePerson) setDeletingPerson(open);
        }}
        title="Delete person?"
        {...deletePersonCopy(cp)}
        confirmLabel="Delete"
        confirmLoading={actions.pending.deletePerson}
        onConfirm={() => void actions.deletePerson()}
      >
        <IrreversibleNote />
      </ConfirmDialog>
    </>
  );
}
