import { describe, expect, it } from 'vitest';

import type { DatasourceCatalog, FieldDefinition } from '@/lib/reports.types';

import { isRelativeDateOp, operatorsForField, valueKind } from '../catalog';

const catalog = {
  fields: [],
  operators: {
    date: {
      absolute: ['is', 'between'],
      relative: ['this_month', 'last_x_days'],
      cycle: ['this_billing_cycle', 'previous_billing_cycle'],
    },
    string: ['exact'],
    number: ['equals'],
    enum: ['is'],
    boolean: ['is'],
  },
} as DatasourceCatalog;

const cycleDate = { name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['CHART'], billingCycle: true } as FieldDefinition;
const plainDate = { name: 'tradeDate', label: 'Trade date', type: 'date', role: 'dimension', allowedInReports: ['CHART'] } as FieldDefinition;

describe('billing-cycle date operators', () => {
  it('are offered after the other date operators on a billing-cycle field', () => {
    expect(operatorsForField(catalog, cycleDate)).toEqual([
      'is', 'between', 'this_month', 'last_x_days', 'this_billing_cycle', 'previous_billing_cycle',
    ]);
  });

  it('are not offered on a date field without billingCycle', () => {
    expect(operatorsForField(catalog, plainDate)).toEqual(['is', 'between', 'this_month', 'last_x_days']);
  });

  it('are absent when the server sends no cycle list', () => {
    const legacy = { ...catalog, operators: { ...catalog.operators, date: { absolute: ['is'], relative: ['this_month'] } } } as DatasourceCatalog;
    expect(operatorsForField(legacy, cycleDate)).toEqual(['is', 'this_month']);
    expect(isRelativeDateOp(legacy, 'this_billing_cycle')).toBe(false);
  });

  it('count as relative operators and take no value', () => {
    expect(isRelativeDateOp(catalog, 'this_billing_cycle')).toBe(true);
    expect(isRelativeDateOp(catalog, 'previous_billing_cycle')).toBe(true);
    expect(valueKind(catalog, cycleDate, 'this_billing_cycle')).toBe('none');
    expect(valueKind(catalog, cycleDate, 'previous_billing_cycle')).toBe('none');
  });
});
