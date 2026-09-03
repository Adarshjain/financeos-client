'use client';

import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DividendSuggestion } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

export interface EditableSuggestionItem {
  suggestion: DividendSuggestion;
  selected: boolean;
  amount: string | number;
  payDate: string;
}

interface DividendSuggestionListProps {
  items: EditableSuggestionItem[];
  selectedCount: number;
  isScanning: boolean;
  onRunScan: () => void;
  onToggle: (index: number) => void;
  onToggleAll: (checked: boolean) => void;
  onItemChange: (
    index: number,
    field: 'amount' | 'payDate',
    value: string
  ) => void;
}

export function DividendSuggestionList({
  items,
  selectedCount,
  isScanning,
  onRunScan,
  onToggle,
  onToggleAll,
  onItemChange,
}: DividendSuggestionListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Check className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
          No unrecorded dividends found
        </p>
        <p className="text-xs text-slate-500 max-w-sm">
          All recent stock dividend payouts for your active holdings appear to
          be recorded.
        </p>
        <Button
          size="micro"
          onClick={onRunScan}
          disabled={isScanning}
          className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Rescan
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={selectedCount === items.length}
            onCheckedChange={(checked) => onToggleAll(!!checked)}
          />
          <label
            htmlFor="select-all"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Select All ({items.length} suggested)
          </label>
        </div>
        <Button
          size="micro"
          onClick={onRunScan}
          disabled={isScanning}
          className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Rescan
        </Button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
        {items.map((item, index) => {
          const s = item.suggestion;
          return (
            <div
              key={`${s.holdingId}-${s.exDate}`}
              className={cn(
                'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                item.selected
                  ? 'bg-white dark:bg-slate-900'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 opacity-75'
              )}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => onToggle(index)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {s.symbol}
                    </span>
                    <span className="text-2xs text-slate-500 dark:text-slate-400 font-medium">
                      {s.brokerName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {s.instrumentName}
                  </div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                    <span>
                      Ex-Date:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {formatDate(s.exDate)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Qty Held:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {s.qtyHeld}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>₹{s.perUnit}/unit</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <div className="space-y-1">
                  <label className="text-2xs font-semibold text-slate-500 block">
                    Pay Date
                  </label>
                  <Input
                    type="date"
                    value={item.payDate}
                    onChange={(e) =>
                      onItemChange(index, 'payDate', e.target.value)
                    }
                    className="h-7 w-[125px] text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-semibold text-slate-500 block">
                    Amount (INR)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) =>
                      onItemChange(index, 'amount', e.target.value)
                    }
                    className="h-7 w-[105px] text-xs font-bold text-right text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
