'use client';

// Measure picker: a measure field + an aggregation drawn ONLY from that field's
// declared aggregations. Reused by the chart measure and each aggregated-table
// measure. Emits a partial so callers can detect incomplete selections.

import { useEffect } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Aggregation,
  DatasourceCatalog,
  ReportType,
} from '@/lib/reports.types';

import { aggsFor, fieldsFor } from './catalog';
import { AGGREGATION_LABELS } from './labels';

export interface MeasureValue {
  field?: string;
  aggregation?: Aggregation;
}

interface MeasureRefEditorProps {
  catalog: DatasourceCatalog;
  type: ReportType;
  value: MeasureValue;
  onChange: (value: MeasureValue) => void;
}

export function MeasureRefEditor({
  catalog,
  type,
  value,
  onChange,
}: MeasureRefEditorProps) {
  const measures = fieldsFor(catalog, 'measure', type);
  const aggs = aggsFor(catalog, value.field);
  const soleMeasure = measures.length === 1 ? measures[0] : undefined;

  // When only one choice exists, select it automatically: a sole measure field
  // (and its first aggregation), or a sole aggregation once a measure is picked.
  useEffect(() => {
    if (!value.field && soleMeasure) {
      onChange({
        field: soleMeasure.name,
        aggregation: (soleMeasure.aggregations ?? [])[0],
      });
    } else if (value.field && !value.aggregation && aggs.length === 1) {
      onChange({ field: value.field, aggregation: aggs[0] });
    }
  }, [value.field, value.aggregation, soleMeasure, aggs, onChange]);

  const aggOptions = aggs.map((a) => ({ value: a, label: AGGREGATION_LABELS[a] }));

  return (
    <div className="flex gap-2">
      <Select
        value={value.field ?? 'none'}
        onValueChange={(val) => {
          const field = val === 'none' ? undefined : val;
          const nextAggs = aggsFor(catalog, field);
          const aggregation =
            value.aggregation && nextAggs.includes(value.aggregation)
              ? value.aggregation
              : nextAggs[0];
          onChange({ field, aggregation });
        }}
      >
        <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none">
          <SelectValue placeholder="Select measure" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <SelectItem value="none" className="text-xs text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900">Select deselect</SelectItem>
          {measures.map((m) => (
            <SelectItem key={m.name} value={m.name} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.aggregation ?? 'none'}
        disabled={!value.field}
        onValueChange={(val) =>
          onChange({
            field: value.field,
            aggregation: (val === 'none' ? undefined : val) as Aggregation,
          })
        }
      >
        <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none">
          <SelectValue placeholder="Select aggregation" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          {aggOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
