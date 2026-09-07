'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LendingDirection, LendingResponse } from '@/lib/lending.types';
import { formatDate, formatMoney } from '@/lib/utils';

import { NEW_COUNTERPARTY_VALUE } from './useRecordLending';

interface RecordLendingExistingEntryListProps {
  direction: LendingDirection;
  selectedCpId: string;
  entries: LendingResponse[];
  loading: boolean;
  attachingId: string | null;
  onAttach: (lendingId: string) => void;
}

export function RecordLendingExistingEntryList({
  direction,
  selectedCpId,
  entries,
  loading,
  attachingId,
  onAttach,
}: RecordLendingExistingEntryListProps) {
  if (!selectedCpId) {
    return (
      <p className="text-2xs text-slate-500 dark:text-slate-400 px-1">
        Pick a person above to see their unlinked entries.
      </p>
    );
  }

  if (selectedCpId === NEW_COUNTERPARTY_VALUE) {
    return (
      <p className="text-2xs text-slate-500 dark:text-slate-400 px-1">
        Switch to &quot;New entry&quot; to record a lending for a new person.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-2xs text-slate-500 dark:text-slate-400 px-1">
        No unlinked {direction} entries for this person.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
              {formatMoney(entry.amount)}
            </span>
            <span className="text-2xs text-slate-500 dark:text-slate-400 truncate">
              {formatDate(entry.entryDate)}
              {entry.notes ? ` · ${entry.notes}` : ''}
            </span>
          </div>
          <Button
            variant="outline"
            size="micro"
            onClick={() => onAttach(entry.id)}
            disabled={attachingId === entry.id}
          >
            {attachingId === entry.id && <Loader2 className="h-3 w-3 animate-spin" />}
            Attach
          </Button>
        </div>
      ))}
    </div>
  );
}
