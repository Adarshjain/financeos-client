'use client';

import { Calendar, Hash, Type } from 'lucide-react';
import React from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  dateBetween,
  numberBetween,
  relativeAmount,
} from '@/lib/reports.helpers';
import type {
  FieldDefinition,
  FilterValue,
} from '@/lib/reports.types';

import type { DynamicOptions } from '../catalog';
import { enumOptionsFor, valueKind } from '../catalog';
import { MultiSelect } from '../MultiSelect';

export interface ValueEditorProps {
  kind: ReturnType<typeof valueKind>;
  field: FieldDefinition | undefined;
  dynamicOptions: DynamicOptions;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
}

export function ValueEditor({
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
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
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
                  .filter(Boolean)
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
              onChange={(e) =>
                onChange(dateBetween(e.currentTarget.value, range.to))
              }
            />
          </div>
          <span className="text-xs font-medium text-slate-400 shrink-0">
            to
          </span>
          <div className="relative flex-1">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="date"
              className="pl-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 text-xs"
              value={range.to}
              onChange={(e) =>
                onChange(dateBetween(range.from, e.currentTarget.value))
              }
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
          <span className="text-xs font-medium text-slate-400 shrink-0">
            to
          </span>
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
            onChange={(e) =>
              onChange(relativeAmount(Number(e.currentTarget.value)))
            }
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
            <SelectItem
              value="true"
              className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                True
              </span>
            </SelectItem>
            <SelectItem
              value="false"
              className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
            >
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
