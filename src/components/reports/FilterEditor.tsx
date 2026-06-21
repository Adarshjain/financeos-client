'use client';

// Manages the shared filters[] array. Any catalog field can be filtered,
// regardless of allowedInReports. Filters are AND-ed together server-side.

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { DatasourceCatalog, FilterClause } from '@/lib/reports.types';

import type { DynamicOptions } from './catalog';
import { filterableFields, operatorsForField } from './catalog';
import { defaultFilterClause, FilterRow } from './FilterRow';

interface FilterEditorProps {
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  filters: FilterClause[];
  onAdd: (clause: FilterClause) => void;
  onUpdate: (index: number, clause: FilterClause) => void;
  onRemove: (index: number) => void;
}

export function FilterEditor({
  catalog,
  dynamicOptions,
  filters,
  onAdd,
  onUpdate,
  onRemove,
}: FilterEditorProps) {
  const handleAdd = () => {
    const field = filterableFields(catalog)[0];
    if (!field) return;
    const operator = operatorsForField(catalog, field)[0] ?? '';
    onAdd(defaultFilterClause(catalog, field, operator));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xl">Filters</Label>
      {filters.length === 0 ? (
        <p className="text-xs text-slate-500">
          No filters — the report runs over all transactions.
        </p>
      ) : (
        <div className="rounded-lg border border-gray-300 dark:border-slate-700 divide-y divide-gray-300 dark:divide-slate-700">
          {filters.map((clause, i) => (
            <FilterRow
              key={i}
              catalog={catalog}
              dynamicOptions={dynamicOptions}
              value={clause}
              onChange={(c) => onUpdate(i, c)}
              onRemove={() => onRemove(i)}
            />
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add filter
      </Button>
    </div>
  );
}
