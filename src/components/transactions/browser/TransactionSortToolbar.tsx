'use client';

import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SORT_FIELDS = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
];

interface TransactionSortToolbarProps {
  /** `field,direction`, e.g. `date,desc`. */
  sort: string;
  onSortFieldChange: (field: string) => void;
  onToggleSortDirection: () => void;
  loading: boolean;
  /** The top pager, sharing this row; null while there is nothing to page. */
  pager: ReactNode | null;
}

/** "Sort [field ▾] [↓]" with the top pager on the same row. */
export function TransactionSortToolbar({
  sort,
  onSortFieldChange,
  onToggleSortDirection,
  loading,
  pager,
}: TransactionSortToolbarProps) {
  const [field, direction] = sort.split(',');
  const DirectionIcon = direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-1.5 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 shrink-0">
        <Select value={field} onValueChange={onSortFieldChange}>
          <SelectTrigger
            aria-label="Sort"
            className="h-8 w-auto min-w-[5.5rem] gap-2 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-medium shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {SORT_FIELDS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={
            direction === 'asc' ? 'Sort ascending' : 'Sort descending'
          }
          title="Reverse the order"
          onClick={onToggleSortDirection}
        >
          <DirectionIcon className="h-4 w-4" />
        </Button>
        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        )}
      </div>
      {pager && <div className="ml-auto flex-1 min-w-0">{pager}</div>}
    </div>
  );
}
