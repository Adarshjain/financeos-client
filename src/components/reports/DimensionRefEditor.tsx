'use client';

// Dimension picker: a dimension field + a granularity that appears ONLY when the
// field is a date (and is required there). Reused by the chart dimension/series
// and each aggregated-table group-by.

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  DatasourceCatalog,
  DimensionRef,
  Granularity,
  ReportType,
} from '@/lib/reports.types';

import { fieldsFor, isDateFieldName } from './catalog';
import { GRANULARITY_LABELS } from './labels';

const GRANULARITY_OPTIONS = (
  Object.keys(GRANULARITY_LABELS) as Granularity[]
).map((g) => ({ value: g, label: GRANULARITY_LABELS[g] }));

interface DimensionRefEditorProps {
  catalog: DatasourceCatalog;
  type: ReportType;
  value: Partial<DimensionRef>;
  onChange: (value: Partial<DimensionRef>) => void;
  placeholder?: string;
  /** Field names to hide (e.g. already used in the other pivot bucket). */
  exclude?: string[];
}

export function DimensionRefEditor({
  catalog,
  type,
  value,
  onChange,
  placeholder = 'Select field',
  exclude = [],
}: DimensionRefEditorProps) {
  const dimensions = fieldsFor(catalog, 'dimension', type);
  const isDate = isDateFieldName(catalog, value.field);

  // Hide excluded fields, but never the one this editor currently holds.
  const fieldOpts = dimensions.filter(
    (d) => d.name === value.field || !exclude.includes(d.name)
  );

  return (
    <div className="flex gap-2">
      <Select
        value={value.field ?? 'none'}
        onValueChange={(val) => {
          const field = val === 'none' ? undefined : val;
          const date = isDateFieldName(catalog, field);
          // Default a date dimension to a sensible granularity; clear it otherwise.
          onChange({
            field,
            granularity: date ? (value.granularity ?? 'month') : undefined,
          });
        }}
      >
        <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <SelectItem value="none" className="text-xs text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900">{placeholder}</SelectItem>
          {fieldOpts.map((d) => (
            <SelectItem key={d.name} value={d.name} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isDate && (
        <Select
          value={value.granularity ?? 'month'}
          onValueChange={(val) =>
            onChange({
              field: value.field,
              granularity: val as Granularity,
            })
          }
        >
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none">
            <SelectValue placeholder="Select granularity" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {GRANULARITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
