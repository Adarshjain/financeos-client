import { act,renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BuiltinParamResponse, BuiltinWidgetResponse } from '@/lib/dashboards.types';

import { buildParams, hasEditableParams, isFormValid } from './paramsModel';
import { useParamsForm } from './useParamsForm';

const def = (params: BuiltinParamResponse[], key = 'w'): BuiltinWidgetResponse => ({ key, label: 'W', description: '', category: 'c', kind: 'component', minW: 50, params });
const list: BuiltinParamResponse = { name: 'items', type: 'string_list', required: true, defaultValue: ['a'] };
const days: BuiltinParamResponse = { name: 'days', type: 'int', required: false, min: 1, max: 90, defaultValue: 14 };

describe('the params model takes whether the built-in has an editor for its list params', () => {
  it('a list param alone is editable only with an editor', () => {
    expect(hasEditableParams(def([list]), false)).toBe(false);
    expect(hasEditableParams(def([list]), true)).toBe(true);
    expect(hasEditableParams(def([days]), false)).toBe(true);
  });

  it('a required list that is empty blocks saving when there is an editor, and is ignored without one', () => {
    expect(isFormValid(def([list]), {}, { items: [] }, true)).toBe(false);
    expect(isFormValid(def([list]), {}, { items: ['a'] }, true)).toBe(true);
    expect(isFormValid(def([list]), {}, { items: [] }, false)).toBe(true);
  });

  it('builds the list param only when there is an editor, and keeps what the form does not edit', () => {
    expect(buildParams(def([list, days]), { days: '30' }, { items: ['x'] }, { other: 1 }, true)).toEqual({ other: 1, items: ['x'], days: 30 });
    expect(buildParams(def([list, days]), { days: '30' }, { items: ['x'] }, { items: ['stored'] }, false)).toEqual({ items: ['stored'], days: 30 });
  });
});

describe('useParamsForm', () => {
  it('starts from the stored params or the defaults', () => {
    const { result } = renderHook(() => useParamsForm(def([days]), { days: 30 }));
    expect(result.current.raw).toEqual({ days: '30' });
    const fresh = renderHook(() => useParamsForm(def([days])));
    expect(fresh.result.current.raw).toEqual({ days: '14' });
  });

  it('starts over for a different built-in (the picker keeps one form while the choice changes)', () => {
    const { result, rerender } = renderHook(({ d }) => useParamsForm(d), { initialProps: { d: def([days], 'upcoming') } });
    act(() => result.current.setRaw('days', '60'));
    expect(result.current.raw.days).toBe('60');
    rerender({ d: def([{ ...days, name: 'n', defaultValue: 5 }], 'top_movers') });
    expect(result.current.raw).toEqual({ n: '5' });
    rerender({ d: def([days], 'upcoming') });
    expect(result.current.raw).toEqual({ days: '14' });
  });

  it('reports validity and the params to save', () => {
    const { result } = renderHook(() => useParamsForm(def([days])));
    act(() => result.current.setRaw('days', '500'));
    expect(result.current.valid).toBe(false);
    expect(result.current.errors.days).toBe('At most 90');
    act(() => result.current.setRaw('days', '7'));
    expect(result.current.valid).toBe(true);
    expect(result.current.params()).toEqual({ days: 7 });
  });
});
