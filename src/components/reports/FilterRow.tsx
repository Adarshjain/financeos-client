'use client';

// One filter clause: field → operator → value. The value editor is chosen from
// the (field type, operator) pair via `valueKind`, and every value is built with
// the shared helpers so valueless operators omit `value` entirely. Changing the
// field or operator resets the value to a fresh default for the new shape.

import { Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DynamicOptions } from '@/features/reports/builder/catalog';
import {
  fieldByName,
  filterableFields,
  operatorsForField,
  valueKind,
} from '@/features/reports/builder/catalog';
import { defaultFilterClause } from '@/features/reports/builder/filterClause';
import { humanizeToken } from '@/features/reports/builder/labels';
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

import { getFieldIcon } from './filter/fieldIcons';
import { ValueEditor } from './filter/ValueEditor';

export { getFieldIcon } from './filter/fieldIcons';

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
    onChange(
      defaultFilterClause(
        catalog,
        f,
        operatorsForField(catalog, f)[0] ?? ''
      )
    );
  };

  const onOperatorChange = (operator: string) => {
    if (!fieldDef) return;
    onChange(defaultFilterClause(catalog, fieldDef, operator));
  };

  const setValue = (v: FilterValue | undefined) =>
    onChange(buildFilter(value.field, value.operator, v));

  return (
    <div className="group relative flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm">
      {/* Field Selector */}
      <div className="min-w-[160px] flex-1">
        <Select value={value.field} onValueChange={onFieldChange}>
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-none hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {fieldOptions.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <div className="flex items-center gap-2">
                  {getFieldIcon(
                    opt.value,
                    fieldByName(catalog, opt.value)?.type
                  )}
                  <span>{opt.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Operator Selector */}
      <div className="min-w-[140px] flex-1">
        <Select value={value.operator} onValueChange={onOperatorChange}>
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-none hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <SelectValue placeholder="Select operator" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {operatorOptions.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span className="text-xs font-semibold">{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value Editor (takes up remaining space) */}
      {!(!fieldDef || kind === 'none') && (
        <div className="min-w-[180px] flex-[2]">
          <ValueEditor
            kind={kind}
            field={fieldDef}
            dynamicOptions={dynamicOptions}
            value={value.value}
            onChange={setValue}
          />
        </div>
      )}

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
        onClick={onRemove}
      >
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
}
