'use client';

// Chart configuration: chart type, an X-axis dimension, an optional series split
// (hidden for pie/donut), and a single measure. Date dimensions/series surface a
// granularity control via DimensionRefEditor.

import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
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
        <NativeSelect
          options={CHART_TYPE_OPTIONS}
          value={value.chartType}
          onChange={(e) =>
            onChange({
              chartType: e.currentTarget.value as ChartDefinition['chartType'],
            })
          }
        />
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
