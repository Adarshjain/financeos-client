'use client';

import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { DATE_PRESETS } from './constants';

type CustomMode = 'single' | 'range';

interface DatePresetsPopoverProps {
  activeDate: { operator: string; label: string; from?: string; to?: string; date?: string };
  onDateSelect: (op: string) => void;
  onApplyCustomDate: (from: string, to: string) => void;
  onApplySingleDate: (date: string) => void;
}

export function DatePresetsPopover({
  activeDate,
  onDateSelect,
  onApplyCustomDate,
  onApplySingleDate,
}: DatePresetsPopoverProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [customMode, setCustomMode] = useState<CustomMode>('single');
  const [singleDate, setSingleDate] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Reopening the popover shows the applied custom date, not stale typing.
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setCustomMode(activeDate.operator === 'between' ? 'range' : 'single');
      setSingleDate(activeDate.date ?? '');
      setCustomDateFrom(activeDate.from ?? '');
      setCustomDateTo(activeDate.to ?? '');
    }
    setDateOpen(open);
  };

  const handleSelect = (op: string) => {
    onDateSelect(op);
    setDateOpen(false);
  };

  const rangeValid = Boolean(customDateFrom && customDateTo && customDateFrom <= customDateTo);
  const canApply = customMode === 'single' ? Boolean(singleDate) : rangeValid;

  const handleApply = () => {
    if (!canApply) return;
    if (customMode === 'single') onApplySingleDate(singleDate);
    else onApplyCustomDate(customDateFrom, customDateTo);
    setDateOpen(false);
  };

  return (
    <Popover open={dateOpen} onOpenChange={handleOpenChange}>
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Custom Date</span>
            <div
              role="radiogroup"
              aria-label="Custom date mode"
              className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full"
            >
              {(['single', 'range'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={customMode === mode}
                  onClick={() => setCustomMode(mode)}
                  className={cn(
                    'px-2.5 py-0.5 text-2xs font-semibold rounded-full transition-all touch-manipulation',
                    customMode === mode
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {mode === 'single' ? 'Single Date' : 'Range'}
                </button>
              ))}
            </div>
          </div>
          {customMode === 'single' ? (
            <div>
              <label htmlFor="txn-filter-date" className="text-2xs text-slate-400 block mb-1">
                Date
              </label>
              <DateInput
                id="txn-filter-date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="h-8 text-xs rounded-lg px-2"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="txn-filter-from" className="text-2xs text-slate-400 block mb-1">
                  From
                </label>
                <DateInput
                  id="txn-filter-from"
                  value={customDateFrom}
                  max={customDateTo || undefined}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="h-8 text-xs rounded-lg px-2"
                />
              </div>
              <div>
                <label htmlFor="txn-filter-to" className="text-2xs text-slate-400 block mb-1">
                  To
                </label>
                <DateInput
                  id="txn-filter-to"
                  value={customDateTo}
                  min={customDateFrom || undefined}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="h-8 text-xs rounded-lg px-2"
                />
              </div>
            </div>
          )}
          <Button className="w-full mt-1" onClick={handleApply} disabled={!canApply}>
            {customMode === 'single' ? 'Apply Date' : 'Apply Range'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
