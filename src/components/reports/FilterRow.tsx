'use client';

// One filter clause: field → operator → value. The value editor is chosen from
// the (field type, operator) pair via `valueKind`, and every value is built with
// the shared helpers so valueless operators omit `value` entirely. Changing the
// field or operator resets the value to a fresh default for the new shape.

import {
  ArrowLeftRight,
  Ban,
  Calendar,
  CheckSquare,
  Eye,
  FolderOpen,
  Hash,
  HelpCircle,
  Landmark,
  List,
  Mail,
  ToggleLeft,
  Trash,
  Type,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildFilter,
  dateBetween,
  numberBetween,
  relativeAmount,
} from '@/lib/reports.helpers';
import type {
  DatasourceCatalog,
  FieldDefinition,
  FieldType,
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

/**
 * Icons for the transactions datasource's fields, by name.
 *
 * Named-keyed and therefore datasource-specific, which is why it lives beside
 * the field list rather than pretending to be generic. It used to be a 12-branch
 * switch whose `default` returned a question mark, so every field of any second
 * datasource would have rendered as "unknown".
 */
const FIELD_ICONS: Record<string, React.ReactNode> = {
  amount: <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />,
  tradeValue: <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />,
  cashflow: <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />,
  realizedPnl: <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />,
  totalCharges: <Hash className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />,
  tds: <Hash className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />,
  date: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  tradeDate: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  payDate: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  exDate: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  entryDate: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  exitDate: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  expiryDate: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  type: <ArrowLeftRight className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />,
  source: <Mail className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />,
  accountId: <Wallet className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />,
  accountType: <Landmark className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />,
  account: <Wallet className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />,
  broker: <Landmark className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />,
  instrument: <FolderOpen className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />,
  category: <FolderOpen className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />,
  reviewType: <CheckSquare className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" />,
  description: <Type className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />,
  isUnderMonitoring: <Eye className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />,
  isExcluded: <Ban className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />,
};

/**
 * Fallback by the field's declared `type`, so a field this module has never
 * heard of still gets a meaningful icon from catalog data alone instead of a
 * question mark.
 */
const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  number: <Hash className="h-3.5 w-3.5 text-slate-400" />,
  date: <Calendar className="h-3.5 w-3.5 text-slate-400" />,
  string: <Type className="h-3.5 w-3.5 text-slate-400" />,
  enum: <List className="h-3.5 w-3.5 text-slate-400" />,
  boolean: <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />,
};

export function getFieldIcon(fieldName: string, type?: FieldType) {
  return (
    FIELD_ICONS[fieldName] ??
    (type ? FIELD_TYPE_ICONS[type] : undefined) ??
    <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
  );
}

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
    <div className="group relative flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm">
      {/* Field Selector */}
      <div className="min-w-[160px] flex-1">
        <Select value={value.field} onValueChange={onFieldChange}>
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-none hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {fieldOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                <div className="flex items-center gap-2">
                  {getFieldIcon(opt.value, fieldByName(catalog, opt.value)?.type)}
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
              <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                <span className="text-[11px] font-semibold">{opt.label}</span>
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

      {/* Remove Button - Positioned nicely at the end */}
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
        <div className="relative">
          {field.type === 'number' ? (
            <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          ) : (
            <Type className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          )}
          <Input
            type={field.type === 'number' ? 'number' : 'text'}
            className="pl-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
            value={value === undefined ? '' : String(value)}
            placeholder={field.type === 'number' ? '0.00' : 'Value…'}
            onChange={(e) => {
              const raw = e.currentTarget.value;
              if (field.type === 'number') {
                onChange(raw === '' ? '' : Number(raw));
              } else {
                onChange(raw);
              }
            }}
          />
        </div>
      );

    case 'scalarEnum': {
      const options = [
        ...enumOptionsFor(field, dynamicOptions).map((o) => ({
          value: field.valueKey === 'id' ? (o.id ?? o.name) : o.name,
          label: o.name,
        })),
      ];
      return (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={onChange}
        >
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs text-slate-700 dark:text-slate-200 shadow-none">
            <SelectValue placeholder="Select option…" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <div className="relative">
          <Type className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            className="pl-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
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
        </div>
      );
    }

    case 'absoluteDate':
      return (
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="date"
            className="pl-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.currentTarget.value)}
          />
        </div>
      );

    case 'dateBetween': {
      const range =
        value && typeof value === 'object' && 'from' in value
          ? (value as { from: string; to: string })
          : { from: '', to: '' };
      return (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="date"
              className="pl-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
              value={range.from}
              onChange={(e) => onChange(dateBetween(e.currentTarget.value, range.to))}
            />
          </div>
          <span className="text-xs font-medium text-slate-400 shrink-0">to</span>
          <div className="relative flex-1">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="date"
              className="pl-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
              value={range.to}
              onChange={(e) => onChange(dateBetween(range.from, e.currentTarget.value))}
            />
          </div>
        </div>
      );
    }

    case 'numberBetween': {
      const range =
        value && typeof value === 'object' && 'from' in value
          ? (value as { from: number; to: number })
          : { from: 0, to: 0 };
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
            value={String(range.from)}
            placeholder="Min"
            onChange={(e) =>
              onChange(numberBetween(Number(e.currentTarget.value), range.to))
            }
          />
          <span className="text-xs font-medium text-slate-400 shrink-0">to</span>
          <Input
            type="number"
            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
            value={String(range.to)}
            placeholder="Max"
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
        <div className="relative">
          <Input
            type="number"
            min={1}
            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
            value={String(amount)}
            placeholder="Amount"
            onChange={(e) => onChange(relativeAmount(Number(e.currentTarget.value)))}
          />
        </div>
      );
    }

    case 'boolean':
      return (
        <Select
          value={value === false ? 'false' : 'true'}
          onValueChange={(v) => onChange(v === 'true')}
        >
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs text-slate-700 dark:text-slate-200 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <SelectItem value="true" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                True
              </span>
            </SelectItem>
            <SelectItem value="false" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
              <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                False
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      );

    default:
      return null;
  }
}

