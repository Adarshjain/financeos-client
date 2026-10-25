'use client';

// The fields of a built-in's params form, one per server param spec (see paramsModel): a bounded number, a card /
// account / loan picker, an option select, and for list params the built-in's own editor from the registry.
// Renders nothing when the built-in has nothing to edit.

import React from 'react';

import { Select, TextField } from '@/components/ds';
import type { BuiltinParamResponse } from '@/lib/dashboards.types';

import { builtinParamsEditor } from '../builtins/registry';
import { fieldParams, humanize, listParams, paramFieldKind, paramLabel } from './paramsModel';
import { RefField } from './RefField';
import type { ParamsForm } from './useParamsForm';

function ParamField({ param, form }: { param: BuiltinParamResponse; form: ParamsForm }) {
  const kind = paramFieldKind(param);
  const label = paramLabel(param);
  const { setUnavailable } = form;
  const onUnavailableChange = React.useCallback((u: boolean) => setUnavailable(param.name, u), [setUnavailable, param.name]);
  const value = form.raw[param.name] ?? '';
  if (kind === 'int') {
    const error = form.errors[param.name];
    return (
      <TextField
        label={label}
        type="number"
        inputMode="numeric"
        min={param.min ?? undefined}
        max={param.max ?? undefined}
        step={1}
        value={value}
        error={error ?? undefined}
        helper={!error && param.min != null && param.max != null ? `Between ${param.min} and ${param.max}.` : undefined}
        onValueChange={(v) => form.setRaw(param.name, v)}
      />
    );
  }
  if (kind === 'enum') {
    const options = (param.options ?? []).filter((o): o is string => typeof o === 'string' && o !== '');
    return (
      <Select
        label={label}
        placeholder="Choose one"
        options={options.map((o) => ({ value: o, label: humanize(o) }))}
        value={value}
        onValueChange={(v) => form.setRaw(param.name, v as string)}
      />
    );
  }
  if (kind === 'credit_card' || kind === 'account' || kind === 'loan') {
    return (
      <RefField
        param={param}
        refKind={kind}
        label={label}
        value={value}
        onValueChange={(v) => form.setRaw(param.name, v)}
        onUnavailableChange={onUnavailableChange}
      />
    );
  }
  return null;
}

/** The form's fields; nothing for a built-in without editable params. */
export function ParamFields({ form }: { form: ParamsForm }) {
  const fields = fieldParams(form.def);
  const Editor = listParams(form.def).length > 0 ? builtinParamsEditor(form.def.key) : null;
  if (fields.length === 0 && !Editor) return null;
  return (
    <>
      {fields.map((p) => (
        <ParamField key={p.name} param={p} form={form} />
      ))}
      {Editor ? React.createElement(Editor, { def: form.def, value: form.extra, onChange: form.setExtra }) : null}
    </>
  );
}
