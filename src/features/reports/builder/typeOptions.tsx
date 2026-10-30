'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { ReorderList } from '@/components/ds/ReorderList/ReorderList';
import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';
import { Select } from '@/components/ds/Select/Select';
import { SettingsToggle } from '@/components/organisms/SettingsToggle/SettingsToggle';
import type { BreakdownBars, BreakdownColumn, DatasourceCatalog, SortClause } from '@/lib/reports.types';

import { defaultBreakdownColumns } from './breakdownColumnsModel';
import {
  type AggTableDraft,
  type BuilderAction,
  type BuilderState,
  type DimensionDraft,
  type MeasureDraft,
  newDraftId,
} from './builderReducerModel';
import { columnsFor, fieldByName, isDateFieldName } from './catalog';
import { ConfigSection } from './ConfigSection';
import type { GuardMeasure } from './guardsModel';
import { AGGREGATION_LABELS } from './labelsModel';
import { chartTypeOptions, dimensionOptions, granularityOptions } from './optionsModel';
import { CompareFields, CountField, DimensionPicker, FieldError, MeasurePicker, type MeasureValue, PAIR, PickSelect, RemoveButton, RevealPair } from './pickers';
import { aggregatedColumnKey, hasSeries,type IssueKey, SUB_LIMIT_MAX, TOP_N_MAX } from './serializeModel';

export type Issues = Partial<Record<IssueKey, string>>;

interface SectionProps {
  catalog: DatasourceCatalog;
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  /** The first message per field; empty until the first Preview or Save. */
  issues: Issues;
}

const STACK = 'flex flex-col gap-space-8 desk:gap-space-12';

// ---- KPI ---------------------------------------------------------------------

export function KpiOptions({ catalog, state, dispatch, issues }: SectionProps) {
  const k = state.kpi;
  const set = (value: Partial<typeof k>) => dispatch({ type: 'KPI_SET', value });
  const setMeasure = React.useCallback(
    (v: MeasureValue) => dispatch({ type: 'KPI_SET', value: { measure: v.field, aggregation: v.aggregation } }),
    [dispatch],
  );
  // A comparison needs a date field to shift; without one it is off whatever the draft says.
  const hasDateField = catalog.fields.some((f) => f.type === 'date');
  return (
    <>
      <ConfigSection>
        <MeasurePicker
          catalog={catalog}
          type="KPI"
          value={{ field: k.measure, aggregation: k.aggregation }}
          fieldError={issues.measure}
          aggregationError={issues.aggregation}
          onChange={setMeasure}
        />
      </ConfigSection>
      <ConfigSection>
        <CompareFields
          enabled={k.comparisonEnabled}
          disabledReason={hasDateField ? undefined : 'Needs a date field'}
          display={k.comparisonDisplay}
          onShowChange={(show) =>
            set({ comparisonEnabled: show !== 'none', comparisonDisplay: show === 'previous_value' ? 'previous_value' : undefined })
          }
          higherIsBetter={k.higherIsBetter}
          onHigherIsBetterChange={(higherIsBetter) => set({ higherIsBetter })}
        />
      </ConfigSection>
    </>
  );
}

// ---- Chart -------------------------------------------------------------------

const ORDER_OPTIONS = [
  { value: 'dimension', label: 'By category' },
  { value: 'value_desc', label: 'Value, high to low' },
  { value: 'value_asc', label: 'Value, low to high' },
];

const BREAKDOWN_COLUMN_OPTIONS: { value: BreakdownColumn; label: string }[] = [
  { value: 'amount', label: 'Amount' },
  { value: 'share', label: 'Share of total' },
  { value: 'count', label: 'Transactions' },
  { value: 'avg', label: 'Average' },
  { value: 'change', label: 'vs previous' },
];

const BREAKDOWN_BAR_OPTIONS = [
  { value: 'relative_to_largest', label: 'Relative to largest' },
  { value: 'share_of_total', label: 'Share of total' },
];

export function ChartOptions({ catalog, state, dispatch, issues }: SectionProps) {
  const c = state.chart;
  const set = (value: Partial<typeof c>) => dispatch({ type: 'CHART_SET', value });
  const setMeasure = React.useCallback(
    (v: MeasureValue) => dispatch({ type: 'CHART_SET', value: { measureField: v.field, measureAggregation: v.aggregation } }),
    [dispatch],
  );
  const chartMeasures = [{ field: c.measureField, aggregation: c.measureAggregation }];
  const isBreakdown = c.chartType === 'breakdown';
  const isSlices = c.chartType === 'pie' || c.chartType === 'donut';
  const dimensionLabel = isBreakdown ? 'Rows' : isSlices ? 'Slices' : 'Dimension (X-axis)';
  const isDateDimension = isDateFieldName(catalog, c.dimensionField);
  // A comparison is meaningless (and dropped) on a date dimension, so "vs previous" is not on offer there.
  const comparing = !!c.comparisonEnabled && !isDateDimension;
  const columnOptions = BREAKDOWN_COLUMN_OPTIONS.filter((o) => o.value !== 'change' || comparing);
  return (
    <>
      <ConfigSection>
        <PickSelect
          label="Chart type"
          value={c.chartType}
          options={chartTypeOptions()}
          onValueChange={(chartType) => chartType && set({ chartType: chartType as typeof c.chartType })}
        />
        <DimensionPicker
          catalog={catalog}
          type="CHART"
          label={dimensionLabel}
          value={{ field: c.dimensionField, granularity: c.dimensionGranularity }}
          measures={chartMeasures}
          error={issues.dimension}
          onChange={(v) => set({ dimensionField: v.field, dimensionGranularity: v.granularity })}
        />
        {hasSeries(c.chartType) ? (
          <DimensionPicker
            catalog={catalog}
            type="CHART"
            label="Series (optional split)"
            noneLabel="No series"
            placeholder="No series"
            value={{ field: c.seriesField, granularity: c.seriesGranularity }}
            measures={chartMeasures}
            error={issues.series}
            onChange={(v) => set({ seriesField: v.field, seriesGranularity: v.granularity })}
          />
        ) : null}
      </ConfigSection>
      {isBreakdown ? (
        <ConfigSection title="Breakdown">
          <RevealPair
            open={!!c.subDimensionField}
            first={
              <PickSelect
                label="Sub-rows"
                value={c.subDimensionField}
                options={dimensionOptions(catalog, 'CHART', c.dimensionField ? [c.dimensionField] : [], c.subDimensionField, chartMeasures)}
                noneLabel="No sub-rows"
                placeholder="No sub-rows"
                error={isDateFieldName(catalog, c.subDimensionField) ? undefined : issues.subDimension}
                onValueChange={(field) =>
                  set({
                    subDimensionField: field,
                    subDimensionGranularity: isDateFieldName(catalog, field) ? (c.subDimensionGranularity ?? 'month') : undefined,
                  })
                }
              />
            }
            second={
              <CountField
                label="Sub-rows per row"
                min={1}
                max={SUB_LIMIT_MAX}
                placeholder="3"
                value={c.subLimit}
                error={issues.subLimit}
                onValueChange={(subLimit) => set({ subLimit })}
              />
            }
          />
          {isDateFieldName(catalog, c.subDimensionField) ? (
            <PickSelect
              label="Sub-rows group by"
              value={c.subDimensionGranularity}
              options={granularityOptions()}
              placeholder="Select granularity"
              error={issues.subDimension}
              onValueChange={(granularity) => set({ subDimensionGranularity: granularity as typeof c.subDimensionGranularity })}
            />
          ) : null}
          <Select
            multiple
            label="Columns"
            placeholder="Amount, share"
            options={columnOptions}
            value={(c.columns ?? defaultBreakdownColumns(comparing)).filter((v) => columnOptions.some((o) => o.value === v))}
            error={issues.breakdownColumns}
            onValueChange={(v) => {
              // Keep the display order whatever order they were picked in.
              const picked = v as BreakdownColumn[];
              set({ columns: BREAKDOWN_COLUMN_OPTIONS.map((o) => o.value).filter((o) => picked.includes(o)) });
            }}
          />
          <PickSelect
            label="Bars"
            value={c.bars ?? 'relative_to_largest'}
            options={BREAKDOWN_BAR_OPTIONS}
            onValueChange={(bars) => bars && set({ bars: bars as BreakdownBars })}
          />
        </ConfigSection>
      ) : null}
      <ConfigSection>
        <MeasurePicker
          catalog={catalog}
          type="CHART"
          fieldLabel={isBreakdown ? 'Measure' : 'Measure (Y-axis)'}
          value={{ field: c.measureField, aggregation: c.measureAggregation }}
          fieldError={issues.measure}
          aggregationError={issues.aggregation}
          onChange={setMeasure}
        />
        <div className={PAIR}>
          <CountField
            label="Show top"
            min={1}
            max={TOP_N_MAX}
            placeholder="All"
            value={c.limit}
            error={issues.limit}
            onValueChange={(limit) => set({ limit, other: limit === undefined ? undefined : c.other })}
          />
          <PickSelect
            label="Order"
            value={c.order ?? (isBreakdown ? 'value_desc' : 'dimension')}
            options={ORDER_OPTIONS}
            onValueChange={(order) => set({ order: order as typeof c.order })}
          />
        </div>
        <SettingsToggle
          label="Group the rest as Other"
          description={c.limit === undefined ? 'Set a top number first.' : undefined}
          checked={!!c.other && c.limit !== undefined}
          disabled={c.limit === undefined}
          onCheckedChange={(other) => set({ other })}
        />
      </ConfigSection>
      <ConfigSection>
        <CompareFields
          enabled={!!c.comparisonEnabled}
          disabledReason={isDateDimension ? 'Not available on a date dimension' : undefined}
          display={c.comparisonDisplay}
          onShowChange={(show) =>
            set({ comparisonEnabled: show !== 'none', comparisonDisplay: show === 'previous_value' ? 'previous_value' : undefined })
          }
          higherIsBetter={c.comparisonHigherIsBetter}
          onHigherIsBetterChange={(comparisonHigherIsBetter) => set({ comparisonHigherIsBetter })}
        />
      </ConfigSection>
    </>
  );
}

// ---- Table -------------------------------------------------------------------

interface SortKey {
  key: string;
  label: string;
}

const DIRECTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

/** The "Sort" section of a table: a key (a column, a group-by or an aggregated measure) and a direction per clause. */
function SortSection({ keys, value, onChange }: { keys: SortKey[]; value: SortClause[]; onChange: (value: SortClause[]) => void }) {
  const options = keys.map((k) => ({ value: k.key, label: k.label }));
  const update = (i: number, patch: Partial<SortClause>) => onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  return (
    <ConfigSection
      title="Sort"
      action={
        keys.length > 0 ? (
          <Button size="sm" variant="link" onClick={() => onChange([...value, { key: keys[0].key, direction: 'asc' }])}>
            Add sort
          </Button>
        ) : undefined
      }
    >
      {value.map((clause, i) => (
        <div key={i} className="flex items-end gap-space-8">
          <div className="grid grid-cols-2 gap-space-8 flex-1 min-w-0">
            <PickSelect label={i === 0 ? 'Sort by' : 'Then by'} value={clause.key} options={options} onValueChange={(key) => key && update(i, { key })} />
            <PickSelect label="Direction" value={clause.direction} options={DIRECTIONS} onValueChange={(d) => d && update(i, { direction: d as SortClause['direction'] })} />
          </div>
          <RemoveButton label="Remove sort" onSelect={() => onChange(value.filter((_, idx) => idx !== i))} />
        </div>
      ))}
    </ConfigSection>
  );
}

function RawTableFields({ catalog, state, dispatch, issues }: SectionProps) {
  const raw = state.table.raw;
  const label = (name: string) => fieldByName(catalog, name)?.label ?? name;
  const setColumns = (columns: string[]) =>
    dispatch({ type: 'TABLE_SET_RAW', value: { columns, sort: raw.sort.filter((s) => columns.includes(s.key)) } });
  return (
    <>
      <Select
        multiple
        searchable
        label="Columns"
        placeholder="Select columns"
        searchPlaceholder="Search columns"
        options={columnsFor(catalog).map((f) => ({ value: f.name, label: f.label }))}
        value={raw.columns}
        error={issues.tableColumns}
        onValueChange={(v) => {
          // Keep the order already chosen; new columns go to the end.
          const picked = v as string[];
          setColumns([...raw.columns.filter((c) => picked.includes(c)), ...picked.filter((c) => !raw.columns.includes(c))]);
        }}
      />
      {raw.columns.length > 1 ? (
        <ReorderList
          size="sm"
          items={raw.columns.map((c) => ({ id: c, title: label(c), ariaLabel: label(c) }))}
          value={raw.columns}
          onValueChange={setColumns}
        />
      ) : null}
    </>
  );
}

const fieldNames = (drafts: DimensionDraft[]): string[] => drafts.filter((d) => d.field).map((d) => d.field as string);

/** Sort keys of an aggregated table: the row dimensions, and the measure keys only while there are no column dimensions. */
function aggSortKeys(catalog: DatasourceCatalog, rows: DimensionDraft[], columns: DimensionDraft[], measures: MeasureDraft[]): SortKey[] {
  const label = (name: string | undefined) => fieldByName(catalog, name)?.label ?? name ?? '';
  const keys: SortKey[] = rows.filter((g) => g.field).map((g) => ({ key: g.field as string, label: label(g.field) }));
  if (fieldNames(columns).length === 0) {
    for (const m of measures) {
      if (!m.field || !m.aggregation) continue;
      // The plain field name; the aggregation shows only when the same field is aggregated twice (else two identical options).
      const twice = measures.filter((o) => o.field === m.field).length > 1;
      keys.push({ key: aggregatedColumnKey(m.field, m.aggregation), label: twice ? `${AGGREGATION_LABELS[m.aggregation]} · ${label(m.field)}` : label(m.field) });
    }
  }
  return keys;
}

function AggTableFields({ catalog, state, dispatch, issues }: SectionProps) {
  const agg = state.table.agg;
  const apply = (patch: Partial<AggTableDraft>) => {
    const next = { ...agg, ...patch };
    const keys = aggSortKeys(catalog, next.rows, next.columns, next.measures);
    dispatch({ type: 'TABLE_SET_AGG', value: { ...patch, sort: agg.sort.filter((s) => keys.some((k) => k.key === s.key)) } });
  };

  return (
    <>
      <DimensionList
        title="Group by"
        addLabel="Add group"
        catalog={catalog}
        drafts={agg.rows}
        exclude={fieldNames(agg.columns)}
        measures={agg.measures}
        error={issues.rows}
        onChange={(rows) => apply({ rows })}
      />
      <DimensionList
        title="Pivot columns (optional)"
        addLabel="Add pivot column"
        catalog={catalog}
        drafts={agg.columns}
        exclude={fieldNames(agg.rows)}
        measures={agg.measures}
        error={issues.columns}
        onChange={(columns) => apply({ columns })}
      />
      <div className={STACK}>
        {agg.measures.map((m, i) => (
          <div key={m.id} className="flex items-end gap-space-8">
            <div className="flex-1 min-w-0">
              <MeasurePicker
                catalog={catalog}
                type="TABLE"
                fieldLabel={i === 0 ? 'Measures' : 'Measure'}
                value={m}
                fieldError={i === 0 ? issues.measures : undefined}
                onChange={(next) => apply({ measures: agg.measures.map((x) => (x.id === m.id ? { ...next, id: m.id } : x)) })}
              />
            </div>
            <RemoveButton label="Remove measure" onSelect={() => apply({ measures: agg.measures.filter((x) => x.id !== m.id) })} />
          </div>
        ))}
        <div>
          <Button variant="link" size="sm" onClick={() => apply({ measures: [...agg.measures, { id: newDraftId() }] })}>
            Add measure
          </Button>
        </div>
        {agg.measures.length === 0 && issues.measures ? <FieldError message={issues.measures} /> : null}
      </div>
    </>
  );
}

function DimensionList({
  title,
  addLabel,
  catalog,
  drafts,
  exclude,
  measures,
  error,
  onChange,
}: {
  title: string;
  addLabel: string;
  catalog: DatasourceCatalog;
  drafts: DimensionDraft[];
  exclude: string[];
  measures: GuardMeasure[];
  error?: string;
  onChange: (drafts: DimensionDraft[]) => void;
}) {
  return (
    <div className={STACK}>
      {drafts.map((d, i) => (
        <div key={d.id} className="flex items-end gap-space-8">
          <div className="flex-1 min-w-0">
            <DimensionPicker
              catalog={catalog}
              type="TABLE"
              label={i === 0 ? title : 'Then by'}
              value={d}
              measures={measures}
              exclude={[...exclude, ...drafts.filter((x) => x.id !== d.id && x.field).map((x) => x.field as string)]}
              error={i === 0 ? error : undefined}
              onChange={(next) => onChange(drafts.map((x) => (x.id === d.id ? { ...next, id: d.id } : x)))}
            />
          </div>
          <RemoveButton label={`Remove ${title.toLowerCase()}`} onSelect={() => onChange(drafts.filter((x) => x.id !== d.id))} />
        </div>
      ))}
      {drafts.length === 0 && error ? <FieldError message={error} /> : null}
      <div>
        <Button variant="link" size="sm" onClick={() => onChange([...drafts, { id: newDraftId() }])}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

export function TableOptions(props: SectionProps) {
  const { catalog, state, dispatch } = props;
  const raw = state.table.raw;
  const agg = state.table.agg;
  const isRaw = state.table.tableMode === 'raw';
  const label = (name: string) => fieldByName(catalog, name)?.label ?? name;
  return (
    <>
      <ConfigSection title="Columns">
        <SegmentedControl
          fullWidth
          size="sm"
          aria-label="Table type"
          options={[
            { value: 'raw', label: 'Raw rows' },
            { value: 'aggregated', label: 'Aggregated' },
          ]}
          value={state.table.tableMode}
          onValueChange={(tableMode) => dispatch({ type: 'TABLE_SET', value: { tableMode } })}
        />
        {isRaw ? <RawTableFields {...props} /> : <AggTableFields {...props} />}
      </ConfigSection>
      {isRaw ? (
        <SortSection
          keys={raw.columns.map((c) => ({ key: c, label: label(c) }))}
          value={raw.sort}
          onChange={(sort) => dispatch({ type: 'TABLE_SET_RAW', value: { sort } })}
        />
      ) : (
        <SortSection
          keys={aggSortKeys(catalog, agg.rows, agg.columns, agg.measures)}
          value={agg.sort}
          onChange={(sort) => dispatch({ type: 'TABLE_SET_AGG', value: { sort } })}
        />
      )}
    </>
  );
}
