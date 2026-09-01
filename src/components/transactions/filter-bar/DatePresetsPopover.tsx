'use client';

import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { DATE_PRESETS } from './constants';

interface DatePresetsPopoverProps {
  activeDate: { operator: string; label: string; from?: string; to?: string };
  onDateSelect: (op: string) => void;
  onApplyCustomDate: (from: string, to: string) => void;
}

export function DatePresetsPopover({
  activeDate,
  onDateSelect,
  onApplyCustomDate,
}: DatePresetsPopoverProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const handleSelect = (op: string) => {
    onDateSelect(op);
    setDateOpen(false);
  };

  const handleApply = () => {
    if (customDateFrom && customDateTo) {
      onApplyCustomDate(customDateFrom, customDateTo);
      setDateOpen(false);
    }
  };

  return (
    <Popover open={dateOpen} onOpenChange={setDateOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={activeDate.operator !== 'all_time' ? 'filter-active' : 'filter'}
          size="pill"
        >
          <CalendarIcon className="h-3 w-3 opacity-70" />
          <span>{activeDate.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2 rounded-2xl shadow-xl">
        <div className="text-xs font-semibold text-slate-500 px-2 py-1">Select Date Window</div>
        <div className="grid grid-cols-2 gap-1 py-1">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSelect(preset.value)}
              className={cn(
                'text-left px-2.5 py-2 rounded-xl text-xs transition-colors touch-manipulation',
                activeDate.operator === preset.value
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 px-1 space-y-2">
          <span className="text-xs font-semibold text-slate-500">Custom Date Range</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-2xs text-slate-400 block mb-1">From</label>
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-8 text-xs rounded-lg px-2"
              />
            </div>
            <div>
              <label className="text-2xs text-slate-400 block mb-1">To</label>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-8 text-xs rounded-lg px-2"
              />
            </div>
          </div>
          <Button
            className="w-full mt-1"
            onClick={handleApply}
            disabled={!customDateFrom || !customDateTo}
          >
            Apply Range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
