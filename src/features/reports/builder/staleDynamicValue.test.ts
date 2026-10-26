import { describe, expect, it } from 'vitest';

import type { FieldDefinition } from '@/lib/reports.types';

import { DYNAMIC_OPTIONS_FAILED, type DynamicOptions } from './catalog';
import { staleLabelFor, staleOptions, staleValueLabel } from './staleDynamicValue';

const field = { name: 'account', label: 'Account', type: 'enum', role: 'dimension', dynamic: true, allowedInReports: [] } as FieldDefinition;
const staticField = { ...field, dynamic: false, values: ['A'] } as FieldDefinition;
const loaded = { account: [{ id: 'a1', name: 'HDFC' }] } as DynamicOptions;
const UUID = '3f2c1a9e-0b1d-4c55-9a1e-123456789abc';

describe('stale dynamic values', () => {
  it('labels a name and a uuid differently', () => {
    expect(staleValueLabel(field, 'Old bank')).toBe('Old bank (not found)');
    expect(staleValueLabel(field, UUID)).toBe('Unknown account');
  });

  it('flags only values that match no loaded option', () => {
    expect(staleLabelFor(field, loaded, 'a1')).toBeNull();
    expect(staleLabelFor(field, loaded, 'HDFC')).toBeNull();
    expect(staleLabelFor(field, loaded, 'gone')).toBe('gone (not found)');
  });

  it('shows nothing while loading, after a failure, or for a static field', () => {
    expect(staleLabelFor(field, {} as DynamicOptions, 'gone')).toBeNull();
    expect(staleLabelFor(field, { [DYNAMIC_OPTIONS_FAILED]: true } as DynamicOptions, 'gone')).toBeNull();
    expect(staleLabelFor(staticField, {} as DynamicOptions, 'gone')).toBeNull();
    expect(staleOptions(field, {} as DynamicOptions, 'gone', [])).toEqual([]);
  });

  it('shows nothing when the server capped the options (a valid value may be past the cap)', () => {
    const capped = { account: Array.from({ length: 500 }, (_, i) => ({ id: `a${i}`, name: `Bank ${i}` })) } as DynamicOptions;
    expect(staleLabelFor(field, capped, 'Zeta bank')).toBeNull();
    expect(staleOptions(field, capped, 'Zeta bank', [])).toEqual([]);
  });

  it('builds extra options for single and array values, skipping known and empty ones', () => {
    expect(staleOptions(field, loaded, 'gone', ['a1'])).toEqual([{ value: 'gone', label: 'gone (not found)' }]);
    expect(staleOptions(field, loaded, ['a1', UUID, 'gone', 'gone'], ['a1'])).toEqual([
      { value: UUID, label: 'Unknown account' },
      { value: 'gone', label: 'gone (not found)' },
    ]);
    expect(staleOptions(field, loaded, 'HDFC', ['a1'])).toEqual([{ value: 'HDFC', label: 'HDFC' }]);
    expect(staleOptions(field, loaded, ['HDFC', 'gone'], ['a1'])).toEqual([
      { value: 'HDFC', label: 'HDFC' },
      { value: 'gone', label: 'gone (not found)' },
    ]);
    expect(staleOptions(field, loaded, '', ['a1'])).toEqual([]);
    expect(staleOptions(field, loaded, undefined, ['a1'])).toEqual([]);
  });
});
