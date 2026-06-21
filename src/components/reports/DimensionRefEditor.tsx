'use client';

// Dimension picker: a dimension field + a granularity that appears ONLY when the
// field is a date (and is required there). Reused by the chart dimension/series
// and each aggregated-table group-by.

import { NativeSelect } from '@/components/ui/native-select';
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
}

export function DimensionRefEditor({
  catalog,
  type,
  value,
  onChange,
  placeholder = 'Select field',
}: DimensionRefEditorProps) {
  const dimensions = fieldsFor(catalog, 'dimension', type);
  const isDate = isDateFieldName(catalog, value.field);

  const fieldOptions = [
    { value: '', label: placeholder },
    ...dimensions.map((d) => ({ value: d.name, label: d.label })),
  ];

  return (
    <div className="flex gap-2">
      <NativeSelect
        options={fieldOptions}
        value={value.field ?? ''}
        onChange={(e) => {
          const field = e.currentTarget.value || undefined;
          const date = isDateFieldName(catalog, field);
          // Default a date dimension to a sensible granularity; clear it otherwise.
          onChange({
            field,
            granularity: date ? (value.granularity ?? 'month') : undefined,
          });
        }}
      />
      {isDate && (
        <NativeSelect
          options={GRANULARITY_OPTIONS}
          value={value.granularity ?? 'month'}
          onChange={(e) =>
            onChange({
              field: value.field,
              granularity: e.currentTarget.value as Granularity,
            })
          }
        />
      )}
    </div>
  );
}
