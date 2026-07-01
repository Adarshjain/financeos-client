'use client';

// Chart configuration: chart type, an X-axis dimension, an optional series split
// (hidden for pie/donut), and a single measure. Date dimensions/series surface a
// granularity control via DimensionRefEditor.

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChartDefinition, DatasourceCatalog } from '@/lib/reports.types';

import type { ChartDraft } from './builderReducer';
import { DimensionRefEditor } from './DimensionRefEditor';
import { CHART_TYPE_LABELS } from './labels';
import { MeasureRefEditor } from './MeasureRefEditor';

const CHART_TYPE_OPTIONS = (
  Object.keys(CHART_TYPE_LABELS) as ChartDefinition['chartType'][]
).map((t) => ({ value: t, label: CHART_TYPE_LABELS[t] }));

interface ChartConfigProps {
  catalog: DatasourceCatalog;
  value: ChartDraft;
  onChange: (value: Partial<ChartDraft>) => void;
}

export function ChartConfig({ catalog, value, onChange }: ChartConfigProps) {
  const isPieDonut = value.chartType === 'pie' || value.chartType === 'donut';

  return (
    <div className="space-y-4">
      <div>
        <Label>Chart type</Label>
        <Select
          value={value.chartType}
          onValueChange={(v) =>
            onChange({
              chartType: v as ChartDefinition['chartType'],
            })
          }
        >
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none">
            <SelectValue placeholder="Select chart type" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {CHART_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{isPieDonut ? 'Slices' : 'Dimension (X-axis)'}</Label>
        <DimensionRefEditor
          catalog={catalog}
          type="CHART"
          value={{
            field: value.dimensionField,
            granularity: value.dimensionGranularity,
          }}
          onChange={(v) =>
            onChange({
              dimensionField: v.field,
              dimensionGranularity: v.granularity,
            })
          }
        />
      </div>

      {!isPieDonut && (
        <div>
          <Label>Series (optional split)</Label>
          <DimensionRefEditor
            catalog={catalog}
            type="CHART"
            placeholder="No series"
            value={{
              field: value.seriesField,
              granularity: value.seriesGranularity,
            }}
            onChange={(v) =>
              onChange({ seriesField: v.field, seriesGranularity: v.granularity })
            }
          />
        </div>
      )}

      <div>
        <Label>Measure (Y-axis)</Label>
        <MeasureRefEditor
          catalog={catalog}
          type="CHART"
          value={{
            field: value.measureField,
            aggregation: value.measureAggregation,
          }}
          onChange={(v) =>
            onChange({ measureField: v.field, measureAggregation: v.aggregation })
          }
        />
      </div>
    </div>
  );
}
