'use client';

import { ArrowLeft, Edit2, Handshake, Plus, Share2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { AddLendingEntryDialog } from './components/AddLendingEntryDialog';
import { CounterpartyHeroHeader } from './components/CounterpartyHeroHeader';
import { CounterpartyLedgerTable } from './components/CounterpartyLedgerTable';
import { EditCounterpartyDialog } from './components/EditCounterpartyDialog';
import { EditLendingEntryDialog } from './components/EditLendingEntryDialog';
import { ExportLedgerDialog } from './components/ExportLedgerDialog';
import { LendingMatchPanel } from './components/LendingMatchPanel';
import { useCounterpartyDetail } from './components/useCounterpartyDetail';

interface CounterpartyDetailProps {
  counterpartyId: string;
  /** Signed-in user's display name; prefills "Your name" in the export. */
  myName?: string | null;
  /** Open the share-as-text dialog straight away (`?export=1`, from the "money due back" push). */
  openExport?: boolean;
}

export function CounterpartyDetail({
  counterpartyId,
  myName = null,
  openExport = false,
}: CounterpartyDetailProps) {
  const [exportOpen, setExportOpen] = useState(openExport);
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
    addEntryType,
    setAddEntryType,
    openSettleUp,
    addAmount,
    setAddAmount,
    addEntryDate,
    setAddEntryDate,
    addExpDate,
    setAddExpDate,
    addNotes,
    setAddNotes,
    addSelectedTx,
    onSelectAddTx,
    onClearAddTx,
    submittingAddEntry,
    editLendingOpen,
    setEditLendingOpen,
    lendingEntryType,
    setLendingEntryType,
    lendingAmount,
    setLendingAmount,
    lendingDate,
    setLendingDate,
    lendingExpDate,
    setLendingExpDate,
    lendingNotes,
    setLendingNotes,
    editSelectedTx,
    onSelectEditTx,
    onClearEditTx,
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

  const hasUnlinkedEntries = entriesWithRunningBalance.some((e) => !e.transaction);
  const hasEntries = entriesWithRunningBalance.length > 0;

  // One set of actions, rendered twice: a desktop card (lg+) and the mobile
  // bottom bar (below lg). Tailwind hides whichever copy does not apply, so no
  // action exists on one viewport only.
  const renderActionBar = (isMobile: boolean) => {
    const grow = isMobile ? 'flex-1' : undefined;
    return (
      <div className={cn('w-full', isMobile ? 'flex flex-col gap-2' : 'flex flex-wrap items-center justify-end gap-2')}>
        <div className={cn('flex items-center gap-2', isMobile ? 'w-full' : 'contents')}>
          <Button size="sm" onClick={() => setAddEntryOpen(true)} className={grow}>
            <Plus className="h-3.5 w-3.5" /> Add Entry
          </Button>

          {cp.netPosition !== 0 && (
            <Button variant="outline" size="sm" onClick={() => openSettleUp(cp.netPosition)} className={grow}>
              <Handshake className="h-3.5 w-3.5" /> Settle up
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            disabled={!hasEntries}
            title={hasEntries ? undefined : 'Add an entry first'}
            className={grow}
          >
            <Share2 className="h-3.5 w-3.5" /> Export
          </Button>
        </div>

        <div className={cn('flex items-center gap-2', isMobile ? 'w-full' : 'contents')}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCpName(cp.name);
              setCpNotes(cp.notes ?? '');
              setEditCpOpen(true);
            }}
            className={grow}
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
              <Button variant="destructive" size="sm" className={grow}>
                <Trash2 className="h-3.5 w-3.5" /> Delete Person
              </Button>
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 p-3 pb-32 max-w-7xl mx-auto w-full">
      {/* Mobile bottom action bar */}
      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {/* Back Link */}
      <Link
        href="/loans/lendings"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium mt-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Lendings Ledger
      </Link>

      {/* Header Container */}
      <CounterpartyHeroHeader cp={cp} />

      {/* Desktop action bar */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      {/* Transaction Matching */}
      {hasUnlinkedEntries && <LendingMatchPanel counterpartyId={counterpartyId} />}

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
        netPosition={cp.netPosition}
        addEntryType={addEntryType}
        setAddEntryType={setAddEntryType}
        addAmount={addAmount}
        setAddAmount={setAddAmount}
        addEntryDate={addEntryDate}
        setAddEntryDate={setAddEntryDate}
        addExpDate={addExpDate}
        setAddExpDate={setAddExpDate}
        addNotes={addNotes}
        setAddNotes={setAddNotes}
        addSelectedTx={addSelectedTx}
        onSelectAddTx={onSelectAddTx}
        onClearAddTx={onClearAddTx}
        submittingAddEntry={submittingAddEntry}
        onAddEntry={handleAddEntry}
      />

      {/* Edit Entry Dialog */}
      <EditLendingEntryDialog
        open={editLendingOpen}
        onOpenChange={setEditLendingOpen}
        lendingEntryType={lendingEntryType}
        setLendingEntryType={setLendingEntryType}
        lendingAmount={lendingAmount}
        setLendingAmount={setLendingAmount}
        lendingDate={lendingDate}
        setLendingDate={setLendingDate}
        lendingExpDate={lendingExpDate}
        setLendingExpDate={setLendingExpDate}
        lendingNotes={lendingNotes}
        setLendingNotes={setLendingNotes}
        editSelectedTx={editSelectedTx}
        onSelectEditTx={onSelectEditTx}
        onClearEditTx={onClearEditTx}
        submittingEditLending={submittingEditLending}
        onUpdateLending={handleUpdateLending}
      />

      {/* Export as text — mounted only while open so each opening starts fresh */}
      {exportOpen && (
        <ExportLedgerDialog
          open
          onOpenChange={setExportOpen}
          entries={entriesWithRunningBalance}
          theirName={cp.name}
          defaultMyName={myName}
          totalEntryCount={cp.entryCount}
        />
      )}
    </div>
  );
}
