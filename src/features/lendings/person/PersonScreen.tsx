'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ConfirmDialog } from '@/components/ds';
import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { SettleDialog } from '@/features/lendings/SettleDialog';
import { firstNameOf } from '@/features/lendings/settleModel';
import { LENDINGS_HREF } from '@/features/loans/loansLendingsTabs';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { formatDate } from '@/lib/format';
import type { CounterpartyLedgerResponse, LedgerEntryResponse, PersonCounterparty } from '@/lib/lending.types';
import { SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

import { EditEntryDialog } from './EditEntryDialog';
import { EditPersonDialog } from './EditPersonDialog';
import { LedgerCard } from './LedgerCard';
import { ExpectedReturnCard, PersonDetailsCard } from './PersonCards';
import { PersonExportDialog } from './PersonExportDialog';
import { PersonHeader } from './PersonHeader';
import { PersonMatchingCard } from './PersonMatchingCard';
import {
  deleteEntryCopy,
  deletePersonCopy,
  ledgerRows,
  linkedLine,
  personHeader,
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

/** One person: who owes whom, the ledger, expected return, matching and details, with the forms they open. */
export function PersonScreen({ cp, ledger, state, today, myName, openExport }: PersonScreenProps) {
  const router = useRouter();
  const addLending = useAddLending();
  const actions = usePersonMutations(cp.id);

  const [settling, setSettling] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<LedgerEntryResponse | null>(null);
  const [deletingEntry, setDeletingEntry] = React.useState<LedgerEntryResponse | null>(null);
  const [deletingPerson, setDeletingPerson] = React.useState(false);
  const [exporting, setExporting] = React.useState(openExport);

  const header = personHeader(cp, cp.firstEntryDate ?? null, today);
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
        onAdd={() => addLending.openFor(cp)}
      >
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <PersonHeader
            name={cp.name}
            header={header}
            canSettle={cp.netPosition !== 0}
            canExport={hasEntries}
            onSettle={() => setSettling(true)}
            onEdit={() => setEditingPerson(true)}
            onExport={() => setExporting(true)}
            onDelete={() => setDeletingPerson(true)}
          />
          <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
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
                onOpenEntry={(row) => setEditingEntry(row.entry)}
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

      {settling ? (
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

      {editingEntry ? (
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
          confirmLabel="Delete entry"
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
        confirmLabel="Delete person"
        confirmLoading={actions.pending.deletePerson}
        onConfirm={() => void actions.deletePerson()}
      >
        <IrreversibleNote />
      </ConfirmDialog>
    </>
  );
}
