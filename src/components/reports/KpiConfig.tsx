'use client';

// KPI configuration: a single aggregated measure plus an optional
// period-over-period comparison (on by default).

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { DatasourceCatalog } from '@/lib/reports.types';

import type { KpiDraft } from './builderReducer';
import { MeasureRefEditor } from './MeasureRefEditor';

interface KpiConfigProps {
  catalog: DatasourceCatalog;
  value: KpiDraft;
  onChange: (value: Partial<KpiDraft>) => void;
}

// Maps the tri-state higher-is-better preference to/from the select value.
const SENTIMENT_OPTIONS = [
  { value: 'neutral', label: 'No preference (neutral)' },
  { value: 'higher', label: 'Higher is better' },
  { value: 'lower', label: 'Lower is better' },
];

function sentimentToValue(higherIsBetter: boolean | undefined): string {
  if (higherIsBetter === true) return 'higher';
  if (higherIsBetter === false) return 'lower';
  return 'neutral';
}

function valueToSentiment(v: string): boolean | undefined {
  if (v === 'higher') return true;
  if (v === 'lower') return false;
  return undefined;
}

export function KpiConfig({ catalog, value, onChange }: KpiConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Measure</Label>
        <MeasureRefEditor
          catalog={catalog}
          type="KPI"
          value={{ field: value.measure, aggregation: value.aggregation }}
          onChange={(v) =>
            onChange({ measure: v.field, aggregation: v.aggregation })
          }
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={value.comparisonEnabled}
          onCheckedChange={(c) => onChange({ comparisonEnabled: c === true })}
        />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          Compare to previous period
        </span>
      </label>
      {value.comparisonEnabled && (
        <div>
          <Label>Change Perception</Label>
          <NativeSelect
            options={SENTIMENT_OPTIONS}
            value={sentimentToValue(value.higherIsBetter)}
            onChange={(e) =>
              onChange({ higherIsBetter: valueToSentiment(e.currentTarget.value) })
            }
          />
        </div>
      )}
    </div>
  );
}
