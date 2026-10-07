'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LendingResponse } from '@/lib/lending.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface RecordLendingExistingEntryListProps {
  entries: LendingResponse[];
  attachingId: string | null;
  onAttach: (lendingId: string) => void;
}

/** Rows of a person's unlinked ledger entries, each with an Attach action. The
 *  parent decides when the list is worth showing (it has entries). */
export function RecordLendingExistingEntryList({
  entries,
  attachingId,
  onAttach,
}: RecordLendingExistingEntryListProps) {
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
