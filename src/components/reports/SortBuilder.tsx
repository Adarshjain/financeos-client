'use client';

// Manage a list of sort clauses. The available keys are supplied by the caller
// (column field names, or group-by names + aggregated `${field}_${agg}` keys).

import { ArrowDownUp, Trash, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
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
          <NativeSelect
            options={keyOptions}
            value={clause.key}
            onChange={(e) => update(i, { key: e.currentTarget.value })}
          />
          <NativeSelect
            options={DIRECTION_OPTIONS}
            value={clause.direction}
            onChange={(e) =>
              update(i, { direction: e.currentTarget.value as 'asc' | 'desc' })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
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
