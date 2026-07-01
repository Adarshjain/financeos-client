'use client';

// Manages the shared filters[] array. Any catalog field can be filtered,
// regardless of allowedInReports. Filters are AND-ed together server-side.

import { Filter, Plus } from 'lucide-react';
import { Fragment } from 'react';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-slate-800 dark:text-slate-100">Filters</Label>
      </div>

      {filters.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50/20 dark:bg-slate-900/10">
          <Filter className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            No active filters
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 text-center">
            The report runs over all transactions without restriction.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-3">
          {filters.map((clause, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <div className="relative flex justify-center items-center my-1">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-100 dark:border-slate-850" />
                  </div>
                  <span className="relative z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-slate-700/40 font-mono tracking-wider uppercase shadow-none">
                    and
                  </span>
                </div>
              )}
              <FilterRow
                catalog={catalog}
                dynamicOptions={dynamicOptions}
                value={clause}
                onChange={(c) => onUpdate(i, c)}
                onRemove={() => onRemove(i)}
              />
            </Fragment>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full h-9 border-dashed border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-none font-medium gap-1.5"
        onClick={handleAdd}
      >
        <Plus className="h-4 w-4" />
        Add filter rule
      </Button>
    </div>
  );
}
