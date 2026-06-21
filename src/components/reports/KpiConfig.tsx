'use client';

// KPI configuration: a single aggregated measure plus an optional
// period-over-period comparison (on by default).

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DatasourceCatalog } from '@/lib/reports.types';

import type { KpiDraft } from './builderReducer';
import { MeasureRefEditor } from './MeasureRefEditor';

interface KpiConfigProps {
  catalog: DatasourceCatalog;
  value: KpiDraft;
  onChange: (value: Partial<KpiDraft>) => void;
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
    </div>
  );
}
