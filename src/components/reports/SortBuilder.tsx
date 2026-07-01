'use client';

// Manage a list of sort clauses. The available keys are supplied by the caller
// (column field names, or group-by names + aggregated `${field}_${agg}` keys).

import { ArrowDownUp, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SortClause } from '@/lib/reports.types';

export interface SortKey {
  key: string;
  label: string;
}

interface SortBuilderProps {
  availableKeys: SortKey[];
  value: SortClause[];
  onChange: (value: SortClause[]) => void;
}

const DIRECTION_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

export function SortBuilder({
  availableKeys,
  value,
  onChange,
}: SortBuilderProps) {
  const keyOptions = availableKeys.map((k) => ({ value: k.key, label: k.label }));

  const add = () => {
    const first = availableKeys[0];
    if (!first) return;
    onChange([...value, { key: first.key, direction: 'asc' }]);
  };

  const update = (index: number, patch: Partial<SortClause>) =>
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const remove = (index: number) =>
    onChange(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {value.map((clause, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select
            value={clause.key}
            onValueChange={(val) => update(i, { key: val })}
          >
            <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none">
              <SelectValue placeholder="Sort by field" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              {keyOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={clause.direction}
            onValueChange={(val) => update(i, { direction: val as 'asc' | 'desc' })}
          >
            <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              {DIRECTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            className="h-9 w-9 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full"
        disabled={availableKeys.length === 0}
      >
        <ArrowDownUp className="mr-1 h-3.5 w-3.5" />
        Add Sort
      </Button>
    </div>
  );
}
