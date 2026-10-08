'use client';

// KPI configuration: a single aggregated measure plus an optional
// period-over-period comparison (on by default), shown either as the change
// against the previous period or as that period's value.

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ComparisonDisplay, DatasourceCatalog } from '@/lib/reports.types';

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

// What the comparison line shows. `change` is the server default, kept as
// undefined on the draft so it is never serialized.
const DISPLAY_OPTIONS: { value: ComparisonDisplay; label: string }[] = [
  { value: 'change', label: 'Change vs previous period' },
  { value: 'previous_value', label: 'Previous period value' },
];

const SELECT_TRIGGER_CLASS =
  'w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none';
const SELECT_CONTENT_CLASS = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950';
const SELECT_ITEM_CLASS = 'text-xs hover:bg-slate-50 dark:hover:bg-slate-900';

export function KpiConfig({ catalog, value, onChange }: KpiConfigProps) {
  // A comparison needs a date field to shift; without one it is off whatever
  // the draft says, and the options below follow the effective state.
  const hasDateField = catalog.fields.some((f) => f.type === 'date');
  const comparisonOn = hasDateField && value.comparisonEnabled;
  return (
    <div className="space-y-2">
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
          checked={comparisonOn}
          disabled={!hasDateField}
          onCheckedChange={(c) => onChange({ comparisonEnabled: c === true })}
        />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          Compare to previous period {!hasDateField && <span className="text-xs text-slate-400 font-normal">(needs a date field)</span>}
        </span>
      </label>
      {comparisonOn && (
        <div>
          <Label>Show</Label>
          <Select
            value={value.comparisonDisplay ?? 'change'}
            onValueChange={(val) =>
              onChange({ comparisonDisplay: val === 'previous_value' ? 'previous_value' : undefined })
            }
          >
            <SelectTrigger className={SELECT_TRIGGER_CLASS} aria-label="Show">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT_CLASS}>
              {DISPLAY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={SELECT_ITEM_CLASS}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {comparisonOn && (
        <div>
          <Label>Change Perception</Label>
          <Select
            value={sentimentToValue(value.higherIsBetter)}
            onValueChange={(val) =>
              onChange({ higherIsBetter: valueToSentiment(val) })
            }
          >
            <SelectTrigger className={SELECT_TRIGGER_CLASS} aria-label="Change Perception">
              <SelectValue placeholder="Select sentiment preference" />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT_CLASS}>
              {SENTIMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={SELECT_ITEM_CLASS}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
