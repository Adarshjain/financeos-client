import { describe, expect, it } from 'vitest';

import { isRelativeDateOp, valueKind } from '@/components/reports/catalog';
import type { DatasourceCatalog, FieldDefinition } from '@/lib/reports.types';

const catalog = {
  fields: [],
  operators: { date: { relative: ['this_month', 'last_x_days', 'next_x_days'], cycle: [] } },
} as unknown as DatasourceCatalog;
const dateField = { name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['TABLE'] } as FieldDefinition;

describe('next_x_days operator', () => {
  it('is a relative operator that takes an amount', () => {
    expect(isRelativeDateOp(catalog, 'next_x_days')).toBe(true);
    expect(valueKind(catalog, dateField, 'next_x_days')).toBe('relativeAmount');
  });
  it('a valueless relative operator still has no value editor', () => {
    expect(valueKind(catalog, dateField, 'this_month')).toBe('none');
  });
  it('when the server catalog does not offer it, it is treated as an absolute date op', () => {
    const without = { ...catalog, operators: { date: { relative: ['this_month'], cycle: [] } } } as unknown as DatasourceCatalog;
    expect(isRelativeDateOp(without, 'next_x_days')).toBe(false);
    expect(valueKind(without, dateField, 'next_x_days')).toBe('absoluteDate');
  });
});
