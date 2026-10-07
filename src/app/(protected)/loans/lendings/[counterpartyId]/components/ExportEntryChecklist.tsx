'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ENTRY_TYPE_SHORT, isSettlementType, toEntryType } from '@/lib/lendingEntry';
import type { ExportableEntry } from '@/lib/lendingExport';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import type { ExportLedgerState } from './useExportLedger';

interface ExportEntryChecklistProps {
  state: ExportLedgerState;
  /** `cp.entryCount` — when larger than the loaded list, say so. */
  totalEntryCount: number;
}

function badgeVariant(entry: ExportableEntry): 'slate' | 'default' | 'destructive' {
  const type = toEntryType(entry.direction, entry.kind);
  if (isSettlementType(type)) return 'slate';
  return entry.direction === 'lent' ? 'default' : 'destructive';
}

/** Chips + one compact row per loaded entry. Labels use the app's own (first-person)
 *  wording — this is the user's surface; the preview below is the receiver's. */
export function ExportEntryChecklist({ state, totalEntryCount }: ExportEntryChecklistProps) {
  const {
    entries,
    selectedIds,
    toggleEntry,
    selectAll,
    selectNone,
    selectSinceSettled,
    sinceSettledAvailable,
    allSelected,
    noneSelected,
    sinceSettledSelected,
  } = state;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mr-1">Entries</span>
        <Button size="pill" variant={allSelected ? 'filter-active' : 'filter'} onClick={selectAll}>
          All
        </Button>
        {sinceSettledAvailable && (
          <Button size="pill" variant={sinceSettledSelected ? 'filter-active' : 'filter'} onClick={selectSinceSettled}>
            Since last settled
          </Button>
        )}
        <Button size="pill" variant={noneSelected ? 'filter-active' : 'filter'} onClick={selectNone}>
          None
        </Button>
        <span className="ml-auto text-2xs text-slate-500 tabular-nums" data-testid="export-selected-count">
          {selectedIds.size} selected
        </span>
      </div>

      {totalEntryCount > entries.length && (
        <p className="text-2xs text-amber-600 dark:text-amber-400">
          Only the {entries.length} loaded entries can be exported ({totalEntryCount} in total).
        </p>
      )}

      <ul className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60">
        {entries.map((entry) => {
          const type = toEntryType(entry.direction, entry.kind);
          const label = ENTRY_TYPE_SHORT[type];
          const checked = selectedIds.has(entry.id);
          const inputId = `export-entry-${entry.id}`;
          return (
            <li key={entry.id} className={cn('flex items-center gap-2 px-2 py-1.5 text-xs', !checked && 'opacity-60')}>
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={() => toggleEntry(entry.id)}
                aria-label={`${formatDate(entry.entryDate)} ${label} ${formatMoney(entry.amount)}`}
              />
              <label htmlFor={inputId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <span className="w-16 shrink-0 tabular-nums text-slate-500">{formatDate(entry.entryDate)}</span>
                <Badge variant={badgeVariant(entry)} size="xs" className="shrink-0">
                  {label}
                </Badge>
                {entry.notes && (
                  <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">{entry.notes}</span>
                )}
                <span className="ml-auto shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatMoney(entry.amount)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
