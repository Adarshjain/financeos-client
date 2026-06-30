'use client';

// One filter clause: field → operator → value. The value editor is chosen from
// the (field type, operator) pair via `valueKind`, and every value is built with
// the shared helpers so valueless operators omit `value` entirely. Changing the
// field or operator resets the value to a fresh default for the new shape.

import { Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  buildFilter,
  dateBetween,
  numberBetween,
  relativeAmount,
} from '@/lib/reports.helpers';
import type {
  DatasourceCatalog,
  FieldDefinition,
  FilterClause,
  FilterValue,
} from '@/lib/reports.types';

import type { DynamicOptions } from './catalog';
import {
  enumOptionsFor,
  fieldByName,
  filterableFields,
  operatorsForField,
  valueKind,
} from './catalog';
import { humanizeToken } from './labels';
import { MultiSelect } from './MultiSelect';

/** A fresh clause for (field, operator) with an empty default value per kind. */
export function defaultFilterClause(
  catalog: DatasourceCatalog,
  field: FieldDefinition,
  operator: string,
): FilterClause {
  switch (valueKind(catalog, field, operator)) {
    case 'none':
      return buildFilter(field.name, operator);
    case 'multi':
      return buildFilter(field.name, operator, []);
    case 'numberBetween':
      return buildFilter(field.name, operator, numberBetween(0, 0));
    case 'dateBetween':
      return buildFilter(field.name, operator, dateBetween('', ''));
    case 'relativeAmount':
      return buildFilter(field.name, operator, relativeAmount(1));
    case 'boolean':
      return buildFilter(field.name, operator, true);
    default:
      return buildFilter(field.name, operator, '');
  }
}

interface FilterRowProps {
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  value: FilterClause;
  onChange: (clause: FilterClause) => void;
  onRemove: () => void;
}

export function FilterRow({
  catalog,
  dynamicOptions,
  value,
  onChange,
  onRemove,
}: FilterRowProps) {
  const fieldDef = fieldByName(catalog, value.field);

  const fieldOptions = filterableFields(catalog).map((f) => ({
    value: f.name,
    label: f.label,
  }));
  const operatorOptions = fieldDef
    ? operatorsForField(catalog, fieldDef).map((op) => ({
        value: op,
        label: humanizeToken(op),
      }))
    : [];

  const kind = fieldDef ? valueKind(catalog, fieldDef, value.operator) : 'none';

  const onFieldChange = (name: string) => {
    const f = fieldByName(catalog, name);
    if (!f) return;
    onChange(defaultFilterClause(catalog, f, operatorsForField(catalog, f)[0] ?? ''));
  };

  const onOperatorChange = (operator: string) => {
    if (!fieldDef) return;
    onChange(defaultFilterClause(catalog, fieldDef, operator));
  };

  const setValue = (v: FilterValue | undefined) =>
    onChange(buildFilter(value.field, value.operator, v));

  return (
    <div className="flex flex-wrap items-center gap-2 p-2">
      <NativeSelect
        className="w-auto min-w-[8rem] flex-1"
        options={fieldOptions}
        value={value.field}
        onChange={(e) => onFieldChange(e.currentTarget.value)}
      />
      <NativeSelect
        className="w-auto min-w-[8rem] flex-1"
        options={operatorOptions}
        value={value.operator}
        onChange={(e) => onOperatorChange(e.currentTarget.value)}
      />
      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <Trash className="h-4 w-4" />
      </Button>
      {!(!fieldDef || kind === 'none') && <div className="min-w-[10rem] flex-[2]">
        <ValueEditor
          kind={kind}
          field={fieldDef}
          dynamicOptions={dynamicOptions}
          value={value.value}
          onChange={setValue}
        />
      </div>}
    </div>
  );
}

interface ValueEditorProps {
  kind: ReturnType<typeof valueKind>;
  field: FieldDefinition | undefined;
  dynamicOptions: DynamicOptions;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
}

function ValueEditor({
  kind,
  field,
  dynamicOptions,
  value,
  onChange,
}: ValueEditorProps) {
  if (!field || kind === 'none') {
    return null;
  }

  switch (kind) {
    case 'scalar':
      return (
        <Input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value === undefined ? '' : String(value)}
          placeholder="Value"
          onChange={(e) => {
            const raw = e.currentTarget.value;
            if (field.type === 'number') {
              onChange(raw === '' ? '' : Number(raw));
            } else {
              onChange(raw);
            }
          }}
        />
      );

    case 'scalarEnum': {
      const options = [
        { value: '', label: 'Select…' },
        ...enumOptionsFor(field, dynamicOptions).map((o) => ({
          value: field.valueKey === 'id' ? (o.id ?? o.name) : o.name,
          label: o.name,
        })),
      ];
      return (
        <NativeSelect
          options={options}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );
    }

    case 'multi': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      if (field.type === 'enum') {
        const options = enumOptionsFor(field, dynamicOptions).map((o) => ({
          value: field.valueKey === 'id' ? (o.id ?? o.name) : o.name,
          label: o.name,
        }));
        return (
          <MultiSelect
            options={options}
            value={selected}
            onChange={(v) => onChange(v)}
            placeholder="Select values…"
          />
        );
      }
      // Free-text list (string field): comma-separated.
      return (
        <Input
          value={selected.join(', ')}
          placeholder="value1, value2"
          onChange={(e) =>
            onChange(
              e.currentTarget.value
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
        <Input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );

    case 'dateBetween': {
      const range =
        value && typeof value === 'object' && 'from' in value
          ? (value as { from: string; to: string })
          : { from: '', to: '' };
      return (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={range.from}
            onChange={(e) => onChange(dateBetween(e.currentTarget.value, range.to))}
          />
          <span className="text-xs text-slate-400">-</span>
          <Input
            type="date"
            value={range.to}
            onChange={(e) => onChange(dateBetween(range.from, e.currentTarget.value))}
          />
        </div>
      );
    }

    case 'numberBetween': {
      const range =
        value && typeof value === 'object' && 'from' in value
          ? (value as { from: number; to: number })
          : { from: 0, to: 0 };
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={String(range.from)}
            onChange={(e) =>
              onChange(numberBetween(Number(e.currentTarget.value), range.to))
            }
          />
          <span className="text-xs text-slate-400">to</span>
          <Input
            type="number"
            value={String(range.to)}
            onChange={(e) =>
              onChange(numberBetween(range.from, Number(e.currentTarget.value)))
            }
          />
        </div>
      );
    }

    case 'relativeAmount': {
      const amount =
        value && typeof value === 'object' && 'amount' in value
          ? (value as { amount: number }).amount
          : 1;
      return (
        <Input
          type="number"
          min={1}
          value={String(amount)}
          onChange={(e) => onChange(relativeAmount(Number(e.currentTarget.value)))}
        />
      );
    }

    case 'boolean':
      return (
        <NativeSelect
          options={[
            { value: 'true', label: 'True' },
            { value: 'false', label: 'False' },
          ]}
          value={value === false ? 'false' : 'true'}
          onChange={(e) => onChange(e.currentTarget.value === 'true')}
        />
      );

    default:
      return null;
  }
}
