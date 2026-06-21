'use client';

// Measure picker: a measure field + an aggregation drawn ONLY from that field's
// declared aggregations. Reused by the chart measure and each aggregated-table
// measure. Emits a partial so callers can detect incomplete selections.

import { NativeSelect } from '@/components/ui/native-select';
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

  const measureOptions = [
    { value: '', label: 'Select measure' },
    ...measures.map((m) => ({ value: m.name, label: m.label })),
  ];
  const aggOptions = aggs.map((a) => ({ value: a, label: AGGREGATION_LABELS[a] }));

  return (
    <div className="flex gap-2">
      <NativeSelect
        options={measureOptions}
        value={value.field ?? ''}
        onChange={(e) => {
          const field = e.currentTarget.value || undefined;
          const nextAggs = aggsFor(catalog, field);
          const aggregation =
            value.aggregation && nextAggs.includes(value.aggregation)
              ? value.aggregation
              : nextAggs[0];
          onChange({ field, aggregation });
        }}
      />
      <NativeSelect
        options={aggOptions}
        value={value.aggregation ?? ''}
        disabled={!value.field}
        onChange={(e) =>
          onChange({
            field: value.field,
            aggregation: e.currentTarget.value as Aggregation,
          })
        }
      />
    </div>
  );
}
