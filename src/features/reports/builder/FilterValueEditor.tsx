'use client';

import React from 'react';

import { DateField, Select, TextField } from '@/components/ds';
import { todayInAppZone } from '@/lib/date-range';
import { dateBetween, numberBetween, relativeAmount } from '@/lib/reports.helpers';
import type { FieldDefinition, FilterValue } from '@/lib/reports.types';

import { DYNAMIC_OPTIONS_FAILED, type DynamicOptions, enumOptionsFor, type valueKind } from './catalog';
import { PAIR } from './pickers';
import { staleOptions } from './staleDynamicValueModel';

export interface FilterValueEditorProps {
  kind: ReturnType<typeof valueKind>;
  field: FieldDefinition;
  dynamicOptions: DynamicOptions;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
}

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
];

/** The editor for a filter's value; which one comes from the (field type, operator) pair. Valueless operators show none. */
export function FilterValueEditor({ kind, field, dynamicOptions, value, onChange }: FilterValueEditorProps) {
  if (kind === 'none') return null;

  // Dynamic values come from the API; the field is absent until they load.
  const dynamicFailed = !!field.dynamic && !!dynamicOptions[DYNAMIC_OPTIONS_FAILED];
  const dynamicLoading = !!field.dynamic && !dynamicFailed && !(field.name in dynamicOptions);
  const emptyHint = dynamicFailed ? 'Couldn’t load values. Try again shortly.' : dynamicLoading ? 'Loading values…' : 'No values in your data yet';
  // Fields with a stable id store the id and show the label; static enums store the stored value.
  const byId = field.valueKey === 'id' || !!field.idField;
  const storesId = byId || (field.type === 'enum' && !field.dynamic);
  // A stored value that matches no loaded option stays selectable, labelled as stale.
  const options = () => {
    const real = enumOptionsFor(field, dynamicOptions).map((o) => ({ value: storesId ? (o.id ?? o.name) : o.name, label: o.name }));
    return [
      ...real,
      ...staleOptions(
        field,
        dynamicOptions,
        value,
        real.map((o) => o.value),
      ),
    ];
  };

  switch (kind) {
    case 'scalar':
      return (
        <TextField
          label="Value"
          type={field.type === 'number' ? 'number' : 'text'}
          placeholder={field.type === 'number' ? '0' : 'Value'}
          value={value === undefined ? '' : String(value)}
          onValueChange={(raw) => onChange(field.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw)}
        />
      );

    case 'scalarEnum': {
      const opts = options();
      return (
        <Select
          label="Value"
          searchable={opts.length > 8}
          placeholder={opts.length === 0 ? emptyHint : 'Select value'}
          options={opts}
          value={typeof value === 'string' ? value : ''}
          loading={dynamicLoading}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        />
      );
    }

    case 'multi': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      if (field.type === 'enum') {
        const opts = options();
        return (
          <Select
            multiple
            searchable
            label="Values"
            searchPlaceholder="Search values"
            placeholder={opts.length === 0 ? emptyHint : 'Select values'}
            options={opts}
            value={selected}
            loading={dynamicLoading}
            onValueChange={(v) => onChange(v as string[])}
          />
        );
      }
      // A string field: a comma-separated list.
      return (
        <TextField
          label="Values"
          placeholder="value1, value2"
          value={selected.join(', ')}
          onValueChange={(raw) =>
            onChange(
              raw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      );
    }

    case 'absoluteDate':
      return (
        <DateField
          label="Date"
          today={todayInAppZone()}
          value={typeof value === 'string' ? value : ''}
          onValueChange={(v) => onChange(typeof v === 'string' ? v : '')}
        />
      );

    case 'dateBetween': {
      const range = value && typeof value === 'object' && 'from' in value ? (value as { from: string; to: string }) : { from: '', to: '' };
      return (
        <DateField
          range
          label="Between"
          today={todayInAppZone()}
          value={{ start: range.from, end: range.to }}
          onValueChange={(v) => {
            const r = typeof v === 'object' && v ? v : { start: '', end: '' };
            onChange(dateBetween(r.start ?? '', r.end ?? ''));
          }}
        />
      );
    }

    case 'numberBetween': {
      const range = value && typeof value === 'object' && 'from' in value ? (value as { from: number; to: number }) : { from: 0, to: 0 };
      return (
        <div className={PAIR}>
          <TextField label="From" type="number" value={String(range.from)} onValueChange={(raw) => onChange(numberBetween(Number(raw), range.to))} />
          <TextField label="To" type="number" value={String(range.to)} onValueChange={(raw) => onChange(numberBetween(range.from, Number(raw)))} />
        </div>
      );
    }

    case 'relativeAmount': {
      const amount = value && typeof value === 'object' && 'amount' in value ? (value as { amount: number }).amount : 1;
      return (
        <TextField
          label="Amount"
          type="number"
          min={1}
          value={String(amount)}
          onValueChange={(raw) => onChange(relativeAmount(Number(raw)))}
        />
      );
    }

    case 'boolean':
      return (
        <Select
          label="Value"
          options={BOOLEAN_OPTIONS}
          value={value === false ? 'false' : 'true'}
          onValueChange={(v) => onChange((Array.isArray(v) ? v[0] : v) === 'true')}
        />
      );

    default:
      return null;
  }
}
