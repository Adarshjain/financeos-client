import { afterEach, describe, expect, it } from 'vitest';

import type { BuiltinParamResponse, BuiltinWidgetResponse } from '@/lib/dashboards.types';

import { BUILTIN_REGISTRY } from '../../builtins/registry';
import {
  buildParams,
  fieldError,
  fieldErrors,
  fieldParams,
  hasEditableParams,
  humanize,
  initialRawValues,
  intError,
  isFormValid,
  listDefaults,
  listParams,
  paramFieldKind,
  paramLabel,
} from '../paramsModel';

const p = (over: Partial<BuiltinParamResponse> & { name: string; type: string }): BuiltinParamResponse => ({
  required: false,
  ...over,
});

const def = (params: BuiltinParamResponse[], key = 'w'): BuiltinWidgetResponse => ({
  key,
  label: 'W',
  description: '',
  kind: 'component',
  minW: 50,
  category: 'overview',
  params,
});

const days = p({ name: 'days', type: 'int', min: 1, max: 90, defaultValue: 14 });
const card = p({ name: 'accountId', type: 'uuid', ref: 'credit_card' });
const account = p({ name: 'accountId', type: 'uuid', ref: 'account', required: true });
const loan = p({ name: 'loanId', type: 'uuid', ref: 'loan' });
const mode = p({ name: 'sort_mode', type: 'enum', options: ['biggest_first', 'newest'], defaultValue: 'newest' });
const items = p({ name: 'items', type: 'string_list', maxItems: 12, defaultValue: ['page:/upcoming'] });

const registry = BUILTIN_REGISTRY as Record<string, unknown>;
afterEach(() => {
  delete registry.with_editor;
});

describe('paramFieldKind', () => {
  it('maps int, ref-ed uuids and enums with options; nothing else gets a field', () => {
    expect(paramFieldKind(days)).toBe('int');
    expect(paramFieldKind(card)).toBe('credit_card');
    expect(paramFieldKind(account)).toBe('account');
    expect(paramFieldKind(loan)).toBe('loan');
    expect(paramFieldKind(mode)).toBe('enum');
    expect(paramFieldKind(items)).toBeNull();
    expect(paramFieldKind(p({ name: 'x', type: 'uuid' }))).toBeNull();
    expect(paramFieldKind(p({ name: 'x', type: 'uuid', ref: 'planet' }))).toBeNull();
    expect(paramFieldKind(p({ name: 'x', type: 'enum', options: [] }))).toBeNull();
    expect(paramFieldKind(p({ name: 'x', type: 'string' }))).toBeNull();
  });

  it('splits field params from list params', () => {
    const d = def([days, items, p({ name: 'note', type: 'string' })]);
    expect(fieldParams(d)).toEqual([days]);
    expect(listParams(d)).toEqual([items]);
  });
});

describe('hasEditableParams', () => {
  it('is true with a field, false with none', () => {
    expect(hasEditableParams(def([days]))).toBe(true);
    expect(hasEditableParams(def([]))).toBe(false);
    expect(hasEditableParams(def([p({ name: 'note', type: 'string' })]))).toBe(false);
  });

  it('list params count only when the built-in registers a ParamsEditor', () => {
    expect(hasEditableParams(def([items], 'with_editor'))).toBe(false);
    registry.with_editor = { icon: () => null, ParamsEditor: () => null };
    expect(hasEditableParams(def([items], 'with_editor'))).toBe(true);
  });
});

describe('labels', () => {
  it('humanizes camelCase and snake_case', () => {
    expect(humanize('sortMode')).toBe('Sort mode');
    expect(humanize('biggest_first')).toBe('Biggest first');
    expect(humanize('')).toBe('');
  });

  it('labels refs by kind, known names, else humanized', () => {
    expect(paramLabel(card)).toBe('Card');
    expect(paramLabel(account)).toBe('Account');
    expect(paramLabel(loan)).toBe('Loan');
    expect(paramLabel(days)).toBe('Days ahead');
    expect(paramLabel(p({ name: 'n', type: 'int' }))).toBe('How many');
    expect(paramLabel(p({ name: 'months', type: 'int' }))).toBe('Months');
    expect(paramLabel(mode)).toBe('Sort mode');
  });
});

describe('initialRawValues', () => {
  it('uses the defaults when adding', () => {
    expect(initialRawValues(def([days, card, mode, items]))).toEqual({ days: '14', accountId: '', sort_mode: 'newest' });
  });

  it('prefers the stored params (Widget settings)', () => {
    expect(initialRawValues(def([days, card, mode]), { days: 30, accountId: 'c1', sort_mode: 'biggest_first' })).toEqual({
      days: '30',
      accountId: 'c1',
      sort_mode: 'biggest_first',
    });
  });

  it('ignores a stored value of the wrong type', () => {
    expect(initialRawValues(def([days, card]), { days: 'x', accountId: 7 })).toEqual({ days: '14', accountId: '' });
  });
});

describe('validation', () => {
  it('int: bounds, whole numbers, required', () => {
    expect(intError(days, '0')).toBe('At least 1');
    expect(intError(days, '91')).toBe('At most 90');
    expect(intError(days, '2.5')).toBe('Enter a whole number');
    expect(intError(days, '')).toBeNull();
    expect(intError({ ...days, required: true }, ' ')).toBe('Required');
    expect(intError(days, '90')).toBeNull();
  });

  it('pickers and enums only fail when required and unset', () => {
    expect(fieldError(card, '')).toBeNull();
    expect(fieldError(account, '')).toBe('Required');
    expect(fieldError(account, 'a1')).toBeNull();
    expect(fieldError({ ...mode, required: true }, '')).toBe('Required');
  });

  it('collects every field error and the form validity', () => {
    const d = def([days, account]);
    expect(fieldErrors(d, { days: '0', accountId: '' })).toEqual({ days: 'At least 1', accountId: 'Required' });
    expect(isFormValid(d, { days: '5', accountId: '' }, {})).toBe(false);
    expect(isFormValid(d, { days: '5', accountId: 'a1' }, {})).toBe(true);
  });

  it('a required list param blocks only when an editor exists and it is empty', () => {
    const d = def([{ ...items, required: true }], 'with_editor');
    expect(isFormValid(d, {}, {})).toBe(true);
    registry.with_editor = { icon: () => null, ParamsEditor: () => null };
    expect(isFormValid(d, {}, { items: [] })).toBe(false);
    expect(isFormValid(d, {}, { items: 'x' })).toBe(false);
    expect(isFormValid(d, {}, { items: ['page:/upcoming'] })).toBe(true);
  });

  it('an explicitly empty list never saves, even when the param is optional (absent = server default is fine)', () => {
    const d = def([{ name: 'items', type: 'string_list', required: false, maxItems: 12 }], 'with_editor');
    registry.with_editor = { icon: () => null, ParamsEditor: () => null };
    expect(isFormValid(d, {}, {})).toBe(true);
    expect(isFormValid(d, {}, { items: [] })).toBe(false);
    expect(isFormValid(d, {}, { items: ['action:add-transaction'] })).toBe(true);
  });
});

describe('buildParams', () => {
  it('numbers ints, keeps picked ids/options, drops unset fields', () => {
    const d = def([days, card, mode]);
    expect(buildParams(d, { days: ' 30 ', accountId: 'c1', sort_mode: 'newest' }, {})).toEqual({
      days: 30,
      accountId: 'c1',
      sort_mode: 'newest',
    });
    expect(buildParams(d, { days: '', accountId: '', sort_mode: '' }, {})).toEqual({});
  });

  it('keeps stored params the form does not edit and clears a field set back to All', () => {
    const d = def([card, p({ name: 'note', type: 'string' })]);
    expect(buildParams(d, { accountId: '' }, {}, { accountId: 'c1', note: 'keep' })).toEqual({ note: 'keep' });
  });

  it('list params: kept as stored without an editor, taken from the editor with one', () => {
    const d = def([items], 'with_editor');
    expect(buildParams(d, {}, { items: ['action:x'] }, { items: ['page:/a'] })).toEqual({ items: ['page:/a'] });
    registry.with_editor = { icon: () => null, ParamsEditor: () => null };
    expect(buildParams(d, {}, { items: ['action:x'] }, { items: ['page:/a'] })).toEqual({ items: ['action:x'] });
    expect(buildParams(d, {}, {}, { items: ['page:/a'] })).toEqual({});
  });

  it('listDefaults seeds the editor with the list params` server defaults', () => {
    expect(listDefaults(def([items, days, p({ name: 'other', type: 'string_list' })]))).toEqual({
      items: ['page:/upcoming'],
    });
  });
});
