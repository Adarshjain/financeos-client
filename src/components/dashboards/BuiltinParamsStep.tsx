'use client';

// Second step of the Add-widget dialog for a built-in that takes params:
// int params get a bounded number input (prefilled with the default); an
// `accountId` uuid param gets a credit-card picker where "All cards" omits it.

import { useMemo, useState } from 'react';

import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isAccountClosed } from '@/lib/account.types';
import type { BuiltinParamResponse, BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { todayInAppZone } from '@/lib/date-range';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

const ALL_CARDS = '__all__';

/** Whether a param gets an input in this step (others are left to their server default). */
export function isEditableParam(param: BuiltinParamResponse): boolean {
  return param.type === 'int' || (param.type === 'uuid' && param.name === 'accountId');
}

/** Whether picking this built-in needs the params step. */
export function needsParamsStep(def: BuiltinWidgetResponse): boolean {
  return def.params.some(isEditableParam);
}

function initialValue(param: BuiltinParamResponse): string {
  if (param.type === 'int') return typeof param.defaultValue === 'number' ? String(param.defaultValue) : '';
  return ALL_CARDS;
}

/** An int input's error, or null when it is valid (or blank and optional). */
function intError(param: BuiltinParamResponse, raw: string): string | null {
  if (raw.trim() === '') return param.required ? 'Required' : null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return 'Enter a whole number';
  if (param.min != null && n < param.min) return `At least ${param.min}`;
  if (param.max != null && n > param.max) return `At most ${param.max}`;
  return null;
}

function paramLabel(param: BuiltinParamResponse): string {
  if (param.name === 'days') return 'Days ahead';
  if (param.name === 'accountId') return 'Card';
  return param.name;
}

interface BuiltinParamsStepProps {
  def: BuiltinWidgetResponse;
  onBack: () => void;
  onConfirm: (params: WidgetParams) => void;
}

export function BuiltinParamsStep({ def, onBack, onConfirm }: BuiltinParamsStepProps) {
  const editable = def.params.filter(isEditableParam);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(editable.map((p) => [p.name, initialValue(p)])),
  );
  const needsCards = editable.some((p) => p.type === 'uuid');
  const { data: accounts = [] } = useAccounts();
  const cards = useMemo(() => {
    const today = todayInAppZone();
    return accounts.filter((a) => a.type === AccountType.CREDIT_CARD && !isAccountClosed(a, today));
  }, [accounts]);

  const errors = Object.fromEntries(
    editable.filter((p) => p.type === 'int').map((p) => [p.name, intError(p, values[p.name] ?? '')]),
  );
  const invalid = Object.values(errors).some(Boolean);

  const confirm = () => {
    const params: WidgetParams = {};
    for (const p of editable) {
      const raw = values[p.name] ?? '';
      if (p.type === 'int' && raw.trim() !== '') params[p.name] = Number(raw);
      if (p.type === 'uuid' && raw !== ALL_CARDS) params[p.name] = raw;
    }
    onConfirm(params);
  };

  const set = (name: string, value: string) => setValues((prev) => ({ ...prev, [name]: value }));

  return (
    <>
      <DialogBody className="space-y-4">
        <p className="text-sm text-slate-500">{def.description}</p>
        {editable.map((p) => {
          const id = `builtin-param-${p.name}`;
          return (
            <div key={p.name} className="space-y-1.5">
              <Label htmlFor={id} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {paramLabel(p)}
              </Label>
              {p.type === 'int' ? (
                <>
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={p.min ?? undefined}
                    max={p.max ?? undefined}
                    step={1}
                    value={values[p.name] ?? ''}
                    onChange={(e) => set(p.name, e.currentTarget.value)}
                  />
                  {errors[p.name] ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors[p.name]}</p>
                  ) : p.min != null && p.max != null ? (
                    <p className="text-xs text-slate-500">Between {p.min} and {p.max}.</p>
                  ) : null}
                </>
              ) : (
                <Select value={values[p.name] ?? ALL_CARDS} onValueChange={(v) => set(p.name, v)}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CARDS}>All cards</SelectItem>
                    {cards.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
        {needsCards && cards.length === 0 && (
          <p className="text-xs text-slate-500">No open credit cards — the widget will show all cards.</p>
        )}
      </DialogBody>
      <DialogFooter
        secondaryAction={{ label: 'Back', onClick: onBack }}
        primaryAction={{ label: 'Add widget', onClick: confirm, disabled: invalid }}
      />
    </>
  );
}
