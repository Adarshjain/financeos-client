'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { showToast } from '@/components/ds/Toast/Toast';
import { watchSession } from '@/lib/authExpiry';
import type { LedgerEntryResponse, LendingCycleResponse } from '@/lib/lending.types';

import { ExportLedgerDialog } from '../export/ExportLedgerDialog';
import { loadPersonLedger } from './ledgerActions';

export interface PersonExportDialogProps {
  counterpartyId: string;
  entryCount: number;
  theirName: string;
  defaultMyName: string | null;
  /** The cycle the page shows (null = every entry): the export starts with it selected. */
  initialCycle?: number | null;
  onClose: () => void;
}

/** Export ledger for a person: fetches every entry once the dialog opens (the page itself only holds one page). */
export function PersonExportDialog({ counterpartyId, entryCount, theirName, defaultMyName, initialCycle, onClose }: PersonExportDialogProps) {
  const [entries, setEntries] = React.useState<LedgerEntryResponse[] | null>(null);
  const [cycles, setCycles] = React.useState<LendingCycleResponse[]>([]);

  React.useEffect(() => {
    let live = true;
    void watchSession(loadPersonLedger(counterpartyId, entryCount)).then((result) => {
      if (!live) return;
      if (result.success) {
        setCycles(result.data.cycles);
        setEntries([...result.data.entries].reverse());
      }
      else {
        showToast(result.error.message || "Couldn't load the ledger. Try again.", { tone: 'danger' });
        onClose();
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per opening
  }, [counterpartyId, entryCount]);

  if (entries) {
    return (
      <ExportLedgerDialog
        entries={entries}
        cycles={cycles}
        initialCycle={initialCycle}
        theirName={theirName}
        defaultMyName={defaultMyName}
        onClose={onClose}
      />
    );
  }
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content size="md" title="Export ledger" description="Loading the entries…">
        <Dialog.Body>
          <div className="flex flex-col gap-space-8 desk:gap-space-12" data-testid="export-loading">
            <Skeleton className="h-space-24 w-full" />
            <Skeleton className="h-space-24 w-full" />
            <Skeleton className="h-space-24 w-full" />
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
