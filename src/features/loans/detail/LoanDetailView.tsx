'use client';

import React from 'react';

import { ConfirmDialog } from '@/components/ds';
import { LoanEditDialog } from '@/features/loans/form/LoanEditDialog';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { subCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import type { InstallmentDto, LoanDetailResponse, LoanEventType } from '@/lib/loan.types';
import { SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

import { ChargeFormDialog } from './ChargeFormDialog';
import { EntriesCard } from './EntriesCard';
import { deleteEntryCopy, type EntryRow, entryRows } from './entriesModel';
import { EventFormDialog } from './EventFormDialog';
import { LinkedEmiDialog } from './LinkedEmiDialog';
import { linkedLine, loanHeader, loanTiles, termsLocked } from './loanDetailModel';
import { LoanHeader } from './LoanHeader';
import { LoanTilesCard } from './LoanTilesCard';
import { MarkPaidDialog } from './MarkPaidDialog';
import { MatchingCard } from './MatchingCard';
import { foundDebit } from './payModel';
import { ScheduleCard } from './ScheduleCard';
import { buildScheduleRows, fySplits, initialFy, type ScheduleRow } from './scheduleModel';
import { SplitCard } from './SplitCard';
import { useLoanActions } from './useLoanActions';

export interface LoanDetailViewProps {
  detail: LoanDetailResponse;
  schedule: InstallmentDto[];
  paymentAccountName: string | null;
  /** Today's calendar date in the app zone (YYYY-MM-DD). */
  today: string;
  /** `?installment=N` from an EMI push: its financial year opens and its row is highlighted. */
  highlightSeq: number | null;
}

/** One loan: header, tiles, schedule, events and charges, and matching, with the forms they open. */
export function LoanDetailView({ detail, schedule, paymentAccountName, today, highlightSeq }: LoanDetailViewProps) {
  const { loan, events, charges } = detail;
  const actions = useLoanActions(loan.id);

  const [fyChoice, setFyChoice] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [eventType, setEventType] = React.useState<LoanEventType | null>(null);
  const [addingCharge, setAddingCharge] = React.useState(false);
  const [paying, setPaying] = React.useState<InstallmentDto | null>(null);
  const [linked, setLinked] = React.useState<InstallmentDto | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [deletingEntry, setDeletingEntry] = React.useState<EntryRow | null>(null);

  const header = loanHeader(loan, schedule, paymentAccountName, today);
  const tiles = loanTiles(loan, events);
  const rows = React.useMemo(() => buildScheduleRows(loan, schedule, events, today), [loan, schedule, events, today]);
  const splits = React.useMemo(() => fySplits(schedule, today), [schedule, today]);
  const fy = fyChoice ?? initialFy(schedule, today, highlightSeq);
  const entries = entryRows(events, charges);
  const closed = loan.status !== 'active';

  const openMarkPaid = React.useCallback(
    (inst: InstallmentDto) => {
      setPaying(inst);
      // The server looks for the debit while the form is already on screen.
      if (!actions.matches) {
        setSearching(true);
        void actions.fetchMatches().finally(() => setSearching(false));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions.matches],
  );
  const openRow = React.useCallback(
    (row: ScheduleRow) => (row.settled ? setLinked(row.installment) : openMarkPaid(row.installment)),
    [openMarkPaid],
  );

  return (
    <>
      <ShellPage
        crumb={subCrumb('loans')}
        title={
          // The loans row's name grows into this title.
          <SharedName name={transitionName.loan(loan.id)}>
            <span>{loan.name}</span>
          </SharedName>
        }
        backHref={appHref('/loans')}
        onAdd={() => setEventType('rate_change')}
      >
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <LoanHeader
            header={header}
            canPrepay={!closed}
            closed={closed}
            onPrepay={() => setEventType('prepayment')}
            onEdit={() => setEditing(true)}
            onClose={() => void actions.closeLoan()}
            onReopen={() => void actions.reopenLoan()}
            onDelete={() => setDeleting(true)}
          />
          <LoanTilesCard model={tiles} />
          <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
            <div className="desk:col-span-9 min-w-0">
              <ScheduleCard
                rows={rows}
                installments={schedule}
                fy={fy}
                onFyChange={setFyChoice}
                highlightSeq={highlightSeq}
                onMarkPaid={openMarkPaid}
                onOpenRow={openRow}
              />
            </div>
            <div className="desk:col-span-3 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
              <SplitCard splits={splits} />
              <EntriesCard
                rows={entries}
                onAddEvent={setEventType}
                onAddCharge={() => setAddingCharge(true)}
                onDelete={setDeletingEntry}
              />
              <MatchingCard
                linked={linkedLine(schedule)}
                matches={actions.matches}
                loading={actions.matchLoading}
                onFind={() => void actions.findMatches()}
                onLink={(seq, date, amount, id) => void actions.linkMatch(seq, date, amount, id)}
                onConfirmAll={() => void actions.confirmAll()}
              />
            </div>
          </div>
        </div>
      </ShellPage>

      {editing ? (
        <LoanEditDialog loan={loan} termsLocked={termsLocked(events, schedule)} onClose={() => setEditing(false)} />
      ) : null}

      {paying ? (
        <MarkPaidDialog
          key={paying.seq}
          installment={paying}
          loanName={loan.name}
          today={today}
          found={foundDebit(actions.matches?.suggestions, paying.seq)}
          searching={searching}
          submitting={actions.pending.payment}
          onSubmit={(values) => actions.markPaid(paying, values)}
          onClose={() => setPaying(null)}
        />
      ) : null}

      {linked ? (
        <LinkedEmiDialog
          installment={linked}
          onUnlink={() => {
            void actions.unlink(linked);
            setLinked(null);
          }}
          onClose={() => setLinked(null)}
        />
      ) : null}

      {eventType ? (
        <EventFormDialog
          today={today}
          initialType={eventType}
          submitting={actions.pending.event}
          onSubmit={actions.addEvent}
          onClose={() => setEventType(null)}
        />
      ) : null}

      {addingCharge ? (
        <ChargeFormDialog
          today={today}
          submitting={actions.pending.charge}
          onSubmit={actions.addCharge}
          onClose={() => setAddingCharge(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting}
        onOpenChange={(open) => {
          if (!actions.pending.deleteLoan) setDeleting(open);
        }}
        title="Delete loan?"
        description={`"${loan.name}" and its schedule data go.`}
        impact={[
          'Its schedule, payments, events and charges are deleted.',
          'Bank transactions stay; only their links to this loan go.',
        ]}
        confirmLabel="Delete loan"
        confirmLoading={actions.pending.deleteLoan}
        onConfirm={() => void actions.deleteLoan()}
      >
        <IrreversibleNote />
      </ConfirmDialog>

      {deletingEntry ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeletingEntry(null);
          }}
          {...deleteEntryCopy(deletingEntry)}
          confirmLoading={actions.pending.deleteEvent || actions.pending.deleteCharge}
          onConfirm={() => {
            const row = deletingEntry;
            void (row.kind === 'event' ? actions.deleteEvent(row.id) : actions.deleteCharge(row.id)).then((ok) => {
              if (ok) setDeletingEntry(null);
            });
          }}
        >
          <IrreversibleNote />
        </ConfirmDialog>
      ) : null}
    </>
  );
}
