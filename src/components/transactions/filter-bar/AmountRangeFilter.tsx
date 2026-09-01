'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AmountRangeFilterProps {
  hasAmountFilter: boolean;
  onApplyAmount: (
    op: 'greater_than' | 'less_than' | 'between',
    val1: string,
    val2: string
  ) => void;
}

export function AmountRangeFilter({
  hasAmountFilter,
  onApplyAmount,
}: AmountRangeFilterProps) {
  const [amountOpen, setAmountOpen] = useState(false);
  const [amountOp, setAmountOp] = useState<'greater_than' | 'less_than' | 'between'>('greater_than');
  const [amountVal1, setAmountVal1] = useState('');
  const [amountVal2, setAmountVal2] = useState('');

  const handleApply = () => {
    onApplyAmount(amountOp, amountVal1, amountVal2);
    setAmountOpen(false);
  };

  return (
    <Popover open={amountOpen} onOpenChange={setAmountOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasAmountFilter ? 'filter-active' : 'filter'}
          size="pill"
          className="gap-1"
        >
          <span>Amount</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 rounded-2xl shadow-xl space-y-3">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Filter by Amount
        </div>
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <button
            type="button"
            onClick={() => setAmountOp('greater_than')}
            className={cn(
              'flex-1 py-1 text-xs font-semibold rounded-lg transition-colors',
              amountOp === 'greater_than'
                ? 'bg-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-500'
            )}
          >
            Greater Than
          </button>
          <button
            type="button"
            onClick={() => setAmountOp('less_than')}
            className={cn(
              'flex-1 py-1 text-xs font-semibold rounded-lg transition-colors',
              amountOp === 'less_than'
                ? 'bg-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-500'
            )}
          >
            Less Than
          </button>
          <button
            type="button"
            onClick={() => setAmountOp('between')}
            className={cn(
              'flex-1 py-1 text-xs font-semibold rounded-lg transition-colors',
              amountOp === 'between'
                ? 'bg-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-500'
            )}
          >
            Between
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-2xs text-slate-400 block mb-1">
              {amountOp === 'between' ? 'Min Amount (₹)' : 'Amount (₹)'}
            </label>
            <Input
              type="number"
              placeholder="e.g. 1000"
              value={amountVal1}
              onChange={(e) => setAmountVal1(e.target.value)}
              className="h-8 text-xs rounded-xl"
            />
          </div>

          {amountOp === 'between' && (
            <div>
              <label className="text-2xs text-slate-400 block mb-1">Max Amount (₹)</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={amountVal2}
                onChange={(e) => setAmountVal2(e.target.value)}
                className="h-8 text-xs rounded-xl"
              />
            </div>
          )}

          <Button
            size="sm"
            className="w-full mt-1"
            onClick={handleApply}
            disabled={!amountVal1}
          >
            Apply Amount Filter
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
