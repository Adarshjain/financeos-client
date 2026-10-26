import { describe, expect, it } from 'vitest';

import type { FilterClause } from '@/lib/reports.types';

import { DYNAMIC_OPTIONS_FAILED, type DynamicOptions } from './catalog';
import { catalogFixture } from './editor.fixtures';
import { workingCatalog } from './editorState';
import { describeFilter } from './filterLabel';

const catalog = workingCatalog(catalogFixture, 'transactions');
const dynamic = { category: [{ id: 'c1', name: 'Food & dining' }] } as DynamicOptions;
const label = (c: FilterClause) => describeFilter(catalog, c, dynamic);

describe('describeFilter', () => {
  it('reads a valueless date operator in words', () => {
    expect(label({ field: 'date', operator: 'this_month' })).toBe('Date · this month');
  });

  it('puts the amount into a relative operator', () => {
    expect(label({ field: 'date', operator: 'last_x_days', value: { amount: 90 } })).toBe('Date · last 90 days');
  });

  it('shows a boolean as its value', () => {
    expect(label({ field: 'isExcluded', operator: 'is', value: false })).toBe('Is Excluded · false');
  });

  it('shows enum values by their label, and says when nothing is chosen yet', () => {
    expect(label({ field: 'category', operator: 'in', value: ['Food & dining', 'x'] })).toBe('Category · in Food & dining, x (not found)');
    expect(label({ field: 'category', operator: 'in', value: [] })).toBe('Category · in …');
    expect(label({ field: 'type', operator: 'is', value: 'DEBIT' })).toBe('Type · is DEBIT');
  });

  it('shows a range and a plain value', () => {
    expect(label({ field: 'date', operator: 'between', value: { from: '2026-01-01', to: '2026-03-31' } })).toBe('Date · between 2026-01-01 – 2026-03-31');
    expect(label({ field: 'description', operator: 'contains', value: 'swiggy' })).toBe('Description · contains swiggy');
    expect(label({ field: 'description', operator: 'contains', value: '' })).toBe('Description · contains …');
  });

  it('survives a field the catalog no longer has', () => {
    expect(label({ field: 'gone', operator: 'is', value: 'x' })).toBe('gone');
  });

  it('is not thrown by failed dynamic options', () => {
    const failed = { [DYNAMIC_OPTIONS_FAILED]: true } as DynamicOptions;
    expect(describeFilter(catalog, { field: 'category', operator: 'is', value: 'c1' }, failed)).toBe('Category · is c1');
  });

  it('flags a dynamic value that matches no loaded option, but not while options load', () => {
    const uuid = '3f2c1a9e-0b1d-4c55-9a1e-123456789abc';
    expect(label({ field: 'category', operator: 'is', value: 'Old name' })).toBe('Category · is Old name (not found)');
    expect(label({ field: 'category', operator: 'is', value: uuid })).toBe('Category · is Unknown category');
    expect(label({ field: 'category', operator: 'is', value: 'c1' })).toBe('Category · is Food & dining');
    expect(describeFilter(catalog, { field: 'category', operator: 'is', value: 'Old name' }, {} as DynamicOptions)).toBe('Category · is Old name');
  });
});
