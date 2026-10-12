'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type TxnType = 'ALL' | 'DEBIT' | 'CREDIT';

const TYPE_OPTIONS: { value: TxnType; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'DEBIT', label: 'Expenses' },
  { value: 'CREDIT', label: 'Income' },
];

interface TypeFilterPopoverProps {
  activeType: string;
  onTypeChange: (type: TxnType) => void;
}

export function TypeFilterPopover({ activeType, onTypeChange }: TypeFilterPopoverProps) {
  const [typeOpen, setTypeOpen] = useState(false);
  const active = TYPE_OPTIONS.find((t) => t.value === activeType) ?? TYPE_OPTIONS[0];
  const isFiltered = active.value !== 'ALL';

  return (
    <Popover open={typeOpen} onOpenChange={setTypeOpen}>
      <PopoverTrigger asChild>
        <Button variant={isFiltered ? 'filter-active' : 'filter'} size="pill">
          <span>{active.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1 rounded-2xl shadow-xl">
        <div className="text-xs font-semibold text-slate-400 px-3 py-1">Type</div>
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onTypeChange(opt.value);
              setTypeOpen(false);
            }}
            className={cn(
              'w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors flex items-center justify-between',
              active.value === opt.value
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <span>{opt.label}</span>
            {active.value === opt.value && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
