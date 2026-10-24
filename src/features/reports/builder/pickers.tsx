'use client';

import React from 'react';

import { Button, Icon, Select, type SelectOption, Text, TextField } from '@/components/ds';
import { SettingsToggle } from '@/components/organisms';
import type { Aggregation, ComparisonDisplay, DatasourceCatalog, DimensionRef, Granularity, ReportType } from '@/lib/reports.types';

import { fieldByName, isDateFieldName } from './catalog';
import { aggregationOptions, dimensionOptions, granularityOptions, measureOptions, NONE, parseCount } from './options';

/** The grid of a row of two fields: stacked on phone, side by side from `desk`. */
export const PAIR = 'grid grid-cols-1 desk:grid-cols-2 gap-space-12';

/** A single-choice dropdown with an optional "nothing chosen" entry. */
export function PickSelect({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  noneLabel,
  error,
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
  const aggs = aggregationOptions(catalog, value.field);
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
}) {
  const isDate = isDateFieldName(catalog, value.field);
  return (
    <div className={isDate ? PAIR : 'grid grid-cols-1 gap-space-12'}>
      <PickSelect
        label={label}
        value={value.field}
        options={dimensionOptions(catalog, type, exclude, value.field)}
        placeholder={placeholder}
        noneLabel={noneLabel}
        error={isDate ? undefined : error}
        onValueChange={(field) =>
          // A date dimension starts at month; any other has no granularity.
          onChange({ field, granularity: isDateFieldName(catalog, field) ? (value.granularity ?? 'month') : undefined })
        }
      />
      {isDate ? (
        <PickSelect
          label="Group by"
          value={value.granularity}
          options={granularityOptions()}
          placeholder="Select granularity"
          error={error}
          onValueChange={(granularity) => onChange({ field: value.field, granularity: granularity as Granularity | undefined })}
        />
      ) : null}
    </div>
  );
}

// ---- Comparison -------------------------------------------------------------

const DISPLAY_OPTIONS: { value: ComparisonDisplay; label: string }[] = [
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

/** "Compare to previous period", and once on, what the comparison shows and which direction reads as good. */
export function CompareFields({
  enabled,
  onEnabledChange,
  disabledReason,
  display,
  onDisplayChange,
  higherIsBetter,
  onHigherIsBetterChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** Why the toggle is off and cannot be changed (no date field, a date dimension…). */
  disabledReason?: string;
  display: ComparisonDisplay | undefined;
  onDisplayChange: (display: ComparisonDisplay | undefined) => void;
  higherIsBetter: boolean | undefined;
  onHigherIsBetterChange: (higherIsBetter: boolean | undefined) => void;
}) {
  const on = enabled && !disabledReason;
  return (
    <div className="flex flex-col gap-space-12">
      <SettingsToggle
        label="Compare to previous period"
        description={disabledReason}
        checked={on}
        disabled={!!disabledReason}
        onCheckedChange={onEnabledChange}
      />
      {on ? (
        <div className={PAIR}>
          <PickSelect
            label="Show"
            value={display ?? 'change'}
            options={DISPLAY_OPTIONS}
            onValueChange={(v) => onDisplayChange(v === 'previous_value' ? 'previous_value' : undefined)}
          />
          <PickSelect
            label="Change perception"
            value={perceptionOf(higherIsBetter)}
            options={PERCEPTION_OPTIONS}
            onValueChange={(v) => onHigherIsBetterChange(v === 'higher' ? true : v === 'lower' ? false : undefined)}
          />
        </div>
      ) : null}
    </div>
  );
}
