'use client';

import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';

import { AddLendingEntryDialog } from './components/AddLendingEntryDialog';
import { CounterpartyHeroHeader } from './components/CounterpartyHeroHeader';
import { CounterpartyLedgerTable } from './components/CounterpartyLedgerTable';
import { EditCounterpartyDialog } from './components/EditCounterpartyDialog';
import { EditLendingEntryDialog } from './components/EditLendingEntryDialog';
import { useCounterpartyDetail } from './components/useCounterpartyDetail';

interface CounterpartyDetailProps {
  counterpartyId: string;
}

export function CounterpartyDetail({
  counterpartyId,
}: CounterpartyDetailProps) {
  const {
    cp,
    entriesWithRunningBalance,
    editCpOpen,
    setEditCpOpen,
    cpName,
    setCpName,
    cpNotes,
    setCpNotes,
    submittingCp,
    addEntryOpen,
    setAddEntryOpen,
    addDir,
    setAddDir,
    addAmount,
    setAddAmount,
    addEntryDate,
    setAddEntryDate,
    addExpDate,
    setAddExpDate,
    addNotes,
    setAddNotes,
    submittingAddEntry,
    editLendingOpen,
    setEditLendingOpen,
    lendingDir,
    setLendingDir,
    lendingAmount,
    setLendingAmount,
    lendingDate,
    setLendingDate,
    lendingExpDate,
    setLendingExpDate,
    lendingNotes,
    setLendingNotes,
    submittingEditLending,
    handleUpdateCp,
    handleDeleteCp,
    handleAddEntry,
    handleDeleteLending,
    handleOpenEditLending,
    handleUpdateLending,
  } = useCounterpartyDetail({ counterpartyId });

  if (!cp) {
    return <div className="p-6 text-xs text-slate-500">Loading person…</div>;
  }

  return (
    <div className="space-y-2 p-3 pb-32 max-w-7xl mx-auto w-full">
      {/* Top Header Action Bar */}
      <PageActionBar>
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCpName(cp.name);
              setCpNotes(cp.notes ?? '');
              setEditCpOpen(true);
            }}
            className="flex-1"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit Person
          </Button>

          <ConfirmationDialog
            title="Delete Counterparty"
            description={`Delete ${cp.name}? This permanently deletes their entire ledger history (${cp.entryCount} entries).`}
            primaryAction={handleDeleteCp}
            primaryActionText="Delete Person"
            variant="destructive"
            trigger={
              <Button variant="destructive" size="sm" className="flex-1">
                <Trash2 className="h-3.5 w-3.5" /> Delete Person
              </Button>
            }
          />
        </div>
      </PageActionBar>

      {/* Back Link */}
      <Link
        href="/loans/lendings"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium mt-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Lendings Ledger
      </Link>

      {/* Header Container */}
      <CounterpartyHeroHeader cp={cp} />

      {/* Ledger Table / Cards */}
      <CounterpartyLedgerTable
        cpName={cp.name}
        entries={entriesWithRunningBalance}
        onOpenAddEntry={() => setAddEntryOpen(true)}
        onOpenEditEntry={handleOpenEditLending}
        onDeleteEntry={handleDeleteLending}
      />

      {/* Edit Counterparty Dialog */}
      <EditCounterpartyDialog
        open={editCpOpen}
        onOpenChange={setEditCpOpen}
        cpName={cpName}
        setCpName={setCpName}
        cpNotes={cpNotes}
        setCpNotes={setCpNotes}
        submittingCp={submittingCp}
        onUpdateCp={handleUpdateCp}
      />

      {/* Add Entry Dialog */}
      <AddLendingEntryDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        cpName={cp.name}
        addDir={addDir}
        setAddDir={setAddDir}
        addAmount={addAmount}
        setAddAmount={setAddAmount}
        addEntryDate={addEntryDate}
        setAddEntryDate={setAddEntryDate}
        addExpDate={addExpDate}
        setAddExpDate={setAddExpDate}
        addNotes={addNotes}
        setAddNotes={setAddNotes}
        submittingAddEntry={submittingAddEntry}
        onAddEntry={handleAddEntry}
      />

      {/* Edit Entry Dialog */}
      <EditLendingEntryDialog
        open={editLendingOpen}
        onOpenChange={setEditLendingOpen}
        lendingDir={lendingDir}
        setLendingDir={setLendingDir}
        lendingAmount={lendingAmount}
        setLendingAmount={setLendingAmount}
        lendingDate={lendingDate}
        setLendingDate={setLendingDate}
        lendingExpDate={lendingExpDate}
        setLendingExpDate={setLendingExpDate}
        lendingNotes={lendingNotes}
        setLendingNotes={setLendingNotes}
        submittingEditLending={submittingEditLending}
        onUpdateLending={handleUpdateLending}
      />
    </div>
  );
}
