'use client';

// The fields of a built-in's params form, one per server param spec (see
// paramsModel): a bounded number input, a card / account / loan picker, an
// option select, and — for list params — the built-in's own registry editor.
// Renders nothing when the built-in has nothing to edit.

import { createElement, useCallback } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BuiltinParamResponse } from '@/lib/dashboards.types';

import { builtinParamsEditor } from '../builtins/registry';
import { fieldParams, humanize, listParams, paramFieldKind, paramLabel } from './paramsModel';
import { RefSelect } from './RefSelect';
import type { ParamsForm } from './useParamsForm';

const labelClass = 'text-xs font-medium text-slate-500 dark:text-slate-400';
const errorClass = 'text-xs text-rose-600 dark:text-rose-400';
const hintClass = 'text-xs text-slate-500';

function IntField({ id, param, form }: { id: string; param: BuiltinParamResponse; form: ParamsForm }) {
  const error = form.errors[param.name];
  return (
    <>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={param.min ?? undefined}
        max={param.max ?? undefined}
        step={1}
        value={form.raw[param.name] ?? ''}
        onChange={(e) => form.setRaw(param.name, e.currentTarget.value)}
      />
      {error ? (
        <p className={errorClass}>{error}</p>
      ) : param.min != null && param.max != null ? (
        <p className={hintClass}>
          Between {param.min} and {param.max}.
        </p>
      ) : null}
    </>
  );
}

function EnumField({ id, param, form }: { id: string; param: BuiltinParamResponse; form: ParamsForm }) {
  const options = (param.options ?? []).filter((o): o is string => typeof o === 'string' && o !== '');
  return (
    <Select value={form.raw[param.name] ?? ''} onValueChange={(v) => form.setRaw(param.name, v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Choose one" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {humanize(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ParamField({ param, form }: { param: BuiltinParamResponse; form: ParamsForm }) {
  const id = `builtin-param-${param.name}`;
  const kind = paramFieldKind(param);
  const { setUnavailable } = form;
  const onUnavailableChange = useCallback((u: boolean) => setUnavailable(param.name, u), [setUnavailable, param.name]);
  // A required picker / option shows its placeholder until set (Add / Save stay disabled meanwhile).
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={labelClass}>
        {paramLabel(param)}
      </Label>
      {kind === 'int' ? (
        <IntField id={id} param={param} form={form} />
      ) : kind === 'enum' ? (
        <EnumField id={id} param={param} form={form} />
      ) : kind ? (
        <RefSelect
          id={id}
          param={param}
          refKind={kind}
          value={form.raw[param.name] ?? ''}
          onChange={(v) => form.setRaw(param.name, v)}
          onUnavailableChange={onUnavailableChange}
        />
      ) : null}
    </div>
  );
}

/** The form's fields; nothing for a built-in without editable params. */
export function BuiltinParamsFields({ form }: { form: ParamsForm }) {
  const fields = fieldParams(form.def);
  const Editor = listParams(form.def).length > 0 ? builtinParamsEditor(form.def.key) : null;
  if (fields.length === 0 && !Editor) return null;
  return (
    <div className="space-y-4">
      {fields.map((p) => (
        <ParamField key={p.name} param={p} form={form} />
      ))}
      {Editor && createElement(Editor, { def: form.def, value: form.extra, onChange: form.setExtra })}
    </div>
  );
}
