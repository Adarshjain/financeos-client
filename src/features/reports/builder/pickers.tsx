'use client';

import React from 'react';

import { Button, Icon, Reveal, Select, type SelectOption, Text, TextField } from '@/components/ds';
import type { Aggregation, ComparisonDisplay, DatasourceCatalog, DimensionRef, Granularity, ReportType } from '@/lib/reports.types';

import { fieldByName, isDateFieldName } from './catalog';
import type { GuardMeasure } from './guardsModel';
import { aggregationOptions, dimensionOptions, granularityOptions, measureOptions, NONE, parseCount } from './optionsModel';

/** The grid of a row of two fields, side by side at every width. */
export const PAIR = 'grid grid-cols-2 items-start gap-x-space-12 gap-y-space-8 desk:gap-y-space-12';

/**
 * A row where the second field slides in (from the right, in its half) only while `open`; the first field takes
 * the whole row otherwise. The 6px each side add up to the 12px gap between the two halves.
 */
export function RevealPair({ open, first, second }: { open: boolean; first: React.ReactNode; second: React.ReactNode }) {
  return (
    <div className="flex items-start">
      <div className="grow basis-0 min-w-0">
        <div className={`transition-all duration-base ${open ? 'pr-space-6' : ''}`}>{first}</div>
      </div>
      <Reveal axis="x" open={open} className={open ? 'grow basis-0 min-w-0' : 'grow-0 basis-0 h-0'}>
        <div className="pl-space-6">{second}</div>
      </Reveal>
    </div>
  );
}

/** A single-choice dropdown with an optional "nothing chosen" entry. */
export function PickSelect({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  noneLabel,
  error,
  helper,
  disabled,
  searchable,
}: {
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  noneLabel?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const all = noneLabel ? [{ value: NONE, label: noneLabel }, ...options] : options;
  return (
    <Select
      label={label}
      value={value ?? (noneLabel ? NONE : '')}
      options={all}
      placeholder={placeholder}
      searchable={searchable ?? all.length > 8}
      disabled={disabled}
      error={error}
      helper={helper}
      onValueChange={(v) => {
        const next = Array.isArray(v) ? v[0] : v;
        onValueChange(next === NONE || next === '' ? undefined : next);
      }}
    />
  );
}

/** A whole-number box (Top N, sub-rows kept); empty means "not set". */
export function CountField({
  label,
  value,
  onValueChange,
  placeholder,
  error,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  placeholder?: string;
  error?: string;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  return (
    <TextField
      label={label}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      placeholder={placeholder}
      value={value === undefined || Number.isNaN(value) ? '' : String(value)}
      error={error}
      disabled={disabled}
      onValueChange={(text) => onValueChange(parseCount(text))}
    />
  );
}

/** A validation message under a list that has no field of its own to carry it. */
export function FieldError({ message }: { message: string }) {
  return (
    <Text variant="caption" tone="danger" as="p">
      {message}
    </Text>
  );
}

/** The ✕ at the end of a list row (a sort, a row, a measure). */
export function RemoveButton({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <Button variant="ghost" size="sm" iconOnly aria-label={label} onClick={onSelect}>
      <Icon name="delete" size="sm" />
    </Button>
  );
}

// ---- Measure and dimension pickers ------------------------------------------

export interface MeasureValue {
  field?: string;
  aggregation?: Aggregation;
}

/**
 * A measure field and the aggregation it allows. When only one measure exists it is chosen for the user, and a
 * sole aggregation once a measure is picked.
 */
export function MeasurePicker({
  catalog,
  type,
  value,
  onChange,
  fieldError,
  aggregationError,
  fieldLabel = 'Measure',
}: {
  catalog: DatasourceCatalog;
  type: ReportType;
  value: MeasureValue;
  onChange: (value: MeasureValue) => void;
  fieldError?: string;
  aggregationError?: string;
  fieldLabel?: string;
}) {
  const fields = measureOptions(catalog, type);
  const aggs = aggregationOptions(catalog, value.field, value.aggregation);
  const onlyField = fields.length === 1 ? fields[0].value : undefined;
  const onlyAggregation = aggs.length === 1 ? (aggs[0].value as Aggregation) : undefined;

  React.useEffect(() => {
    if (!value.field && onlyField) {
      onChange({ field: onlyField, aggregation: (fieldByName(catalog, onlyField)?.aggregations ?? [])[0] });
    } else if (value.field && !value.aggregation && onlyAggregation) {
      onChange({ field: value.field, aggregation: onlyAggregation });
    }
  }, [value.field, value.aggregation, onlyField, onlyAggregation, catalog, onChange]);

  return (
    <div className={PAIR}>
      <PickSelect
        label={fieldLabel}
        value={value.field}
        options={fields}
        placeholder="Select measure"
        error={fieldError}
        onValueChange={(field) => {
          const allowed = fieldByName(catalog, field)?.aggregations ?? [];
          const aggregation = value.aggregation && allowed.includes(value.aggregation) ? value.aggregation : allowed[0];
          onChange({ field, aggregation });
        }}
      />
      <PickSelect
        label="Aggregation"
        value={value.aggregation}
        options={aggs}
        placeholder="Select aggregation"
        disabled={!value.field}
        error={aggregationError}
        onValueChange={(aggregation) => onChange({ field: value.field, aggregation: aggregation as Aggregation | undefined })}
      />
    </div>
  );
}

/** A dimension field and, only for a date field, the granularity it is grouped by. */
export function DimensionPicker({
  catalog,
  type,
  label,
  value,
  onChange,
  placeholder = 'Select field',
  noneLabel,
  exclude,
  error,
  measures,
}: {
  catalog: DatasourceCatalog;
  type: ReportType;
  label: string;
  value: Partial<DimensionRef>;
  onChange: (value: Partial<DimensionRef>) => void;
  placeholder?: string;
  noneLabel?: string;
  exclude?: string[];
  error?: string;
  /** The measures in use: a field their guards forbid splitting by is disabled. */
  measures?: GuardMeasure[];
}) {
  const isDate = isDateFieldName(catalog, value.field);
  return (
    <RevealPair
      open={isDate}
      first={
        <PickSelect
          label={label}
          value={value.field}
          options={dimensionOptions(catalog, type, exclude, value.field, measures)}
          placeholder={placeholder}
          noneLabel={noneLabel}
          error={isDate ? undefined : error}
          onValueChange={(field) =>
            // A date dimension starts at month; any other has no granularity.
            onChange({ field, granularity: isDateFieldName(catalog, field) ? (value.granularity ?? 'month') : undefined })
          }
        />
      }
      second={
        <PickSelect
          label="Group by"
          value={value.granularity}
          options={granularityOptions()}
          placeholder="Select granularity"
          error={isDate ? error : undefined}
          onValueChange={(granularity) => onChange({ field: value.field, granularity: granularity as Granularity | undefined })}
        />
      }
    />
  );
}

// ---- Comparison -------------------------------------------------------------

type Show = 'none' | ComparisonDisplay;

const SHOW_OPTIONS: { value: Show; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'change', label: 'Change vs previous period' },
  { value: 'previous_value', label: 'Previous period value' },
];

const PERCEPTION_OPTIONS: SelectOption[] = [
  { value: 'neutral', label: 'No preference (neutral)' },
  { value: 'higher', label: 'Higher is better' },
  { value: 'lower', label: 'Lower is better' },
];

const perceptionOf = (higherIsBetter: boolean | undefined): string =>
  higherIsBetter === true ? 'higher' : higherIsBetter === false ? 'lower' : 'neutral';

/** "Comparison" (None, the change, or the previous value) and, once something is shown, which direction reads as good. */
export function CompareFields({
  enabled,
  disabledReason,
  display,
  onShowChange,
  higherIsBetter,
  onHigherIsBetterChange,
}: {
  enabled: boolean;
  /** Why the comparison cannot be turned on (no date field, a date dimension…). */
  disabledReason?: string;
  display: ComparisonDisplay | undefined;
  /** None turns the comparison off; the others turn it on with that display (`change` = the default). */
  onShowChange: (show: Show) => void;
  higherIsBetter: boolean | undefined;
  onHigherIsBetterChange: (higherIsBetter: boolean | undefined) => void;
}) {
  const show: Show = enabled && !disabledReason ? (display === 'previous_value' ? 'previous_value' : 'change') : 'none';
  return (
    <RevealPair
      open={show !== 'none'}
      first={
        <PickSelect
          label="Comparison"
          value={show}
          options={SHOW_OPTIONS}
          disabled={!!disabledReason}
          helper={disabledReason}
          onValueChange={(v) => onShowChange(v === 'previous_value' ? 'previous_value' : v === 'change' ? 'change' : 'none')}
        />
      }
      second={
        <PickSelect
          label="Change perception"
          value={perceptionOf(higherIsBetter)}
          options={PERCEPTION_OPTIONS}
          onValueChange={(v) => onHigherIsBetterChange(v === 'higher' ? true : v === 'lower' ? false : undefined)}
        />
      }
    />
  );
}
