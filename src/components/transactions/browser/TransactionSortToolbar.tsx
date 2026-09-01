'use client';

import { ArrowDown, ArrowUp, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PagedTransaction } from '@/lib/transaction.types';

interface TransactionSortToolbarProps {
  sort: string;
  onSort: (field: string) => void;
  isSelectionMode: boolean;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTxnIds: Set<string>;
  setSelectedTxnIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  loading: boolean;
  pagedData: PagedTransaction | null;
}

export function TransactionSortToolbar({
  sort,
  onSort,
  isSelectionMode,
  setIsSelectionMode,
  selectedTxnIds,
  setSelectedTxnIds,
  loading,
  pagedData,
}: TransactionSortToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1 border-b border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500">Sort:</span>
        <Button
          variant={sort.startsWith('date') ? 'filter-active' : 'filter'}
          size="pill"
          onClick={() => onSort('date')}
          className="gap-1"
        >
          Date
          {sort === 'date,desc' && <ArrowDown className="h-3 w-3" />}
          {sort === 'date,asc' && <ArrowUp className="h-3 w-3" />}
        </Button>
        <Button
          variant={sort.startsWith('amount') ? 'filter-active' : 'filter'}
          size="pill"
          onClick={() => onSort('amount')}
          className="gap-1"
        >
          Amount
          {sort === 'amount,desc' && <ArrowDown className="h-3 w-3" />}
          {sort === 'amount,asc' && <ArrowUp className="h-3 w-3" />}
        </Button>
        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
        <Button
          variant={
            isSelectionMode || selectedTxnIds.size > 0
              ? 'filter-active'
              : 'filter'
          }
          size="pill"
          onClick={() => {
            if (isSelectionMode && selectedTxnIds.size === 0) {
              setIsSelectionMode(false);
            } else {
              setIsSelectionMode(!isSelectionMode);
            }
          }}
          className="gap-1"
        >
          Link
        </Button>
        {selectedTxnIds.size > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setSelectedTxnIds(new Set());
              setIsSelectionMode(false);
            }}
            className="text-slate-500 hover:text-slate-900"
          >
            <X className="h-3 w-3" /> Clear ({selectedTxnIds.size})
          </Button>
        )}
      </div>

      {/* Total Count Indicator */}
      <div className="flex items-center text-xs text-slate-500">
        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2 text-slate-400" />
        )}
        {pagedData && (
          <span>
            {pagedData.totalElements.toLocaleString('en-IN')} transaction
            {pagedData.totalElements === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}
