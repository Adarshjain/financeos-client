import { describe, expect, it } from 'vitest';

import {
  columnsFor,
  defaultExcludedFilter,
  enumOptionsFor,
  fieldByName,
  fieldsFor,
  filterableFields,
  isDateFieldName,
  isRelativeDateOp,
  operatorsForField,
  valueKind,
} from '@/components/reports/catalog';
import type { DatasourceCatalog, FieldDefinition } from '@/lib/reports.types';

const mockCatalog: DatasourceCatalog = {
  fields: [
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      role: 'dimension',
      allowedInReports: ['TABLE'],
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      role: 'measure',
      allowedInReports: ['TABLE'],
      aggregations: ['sum', 'avg'],
    },
    {
      name: 'category',
      label: 'Category',
      type: 'enum',
      role: 'dimension',
      allowedInReports: ['TABLE'],
      dynamic: true,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'enum',
      role: 'dimension',
      allowedInReports: ['TABLE'],
      values: ['OPEN', 'CLOSED'],
    },
    {
      name: 'isExcluded',
      label: 'Excluded',
      type: 'boolean',
      role: 'filter',
      allowedInReports: ['TABLE'],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'string',
      role: 'dimension',
      allowedInReports: ['TABLE'],
    },
  ],
  operators: {
    string: ['equals', 'contains'],
    number: ['equals', 'between', 'greater_than'],
    boolean: ['is'],
    enum: ['is', 'in'],
    date: {
      absolute: ['on', 'between'],
      relative: ['this_month', 'last_x_days'],
    },
  },
};

describe('reports catalog selectors', () => {
  it('fieldByName and isDateFieldName', () => {
    expect(fieldByName(mockCatalog, undefined)).toBeUndefined();
    expect(fieldByName(mockCatalog, 'date')?.label).toBe('Date');
    expect(isDateFieldName(mockCatalog, 'date')).toBe(true);
    expect(isDateFieldName(mockCatalog, 'amount')).toBe(false);
    expect(isDateFieldName(mockCatalog, undefined)).toBe(false);
  });

  it('fieldsFor, columnsFor, and filterableFields', () => {
    const measures = fieldsFor(mockCatalog, 'measure', 'TABLE');
    expect(measures).toHaveLength(1);
    expect(measures[0].name).toBe('amount');

    const tableColumns = columnsFor(mockCatalog);
    expect(tableColumns.map((f) => f.name)).not.toContain('isExcluded');

    const allFilters = filterableFields(mockCatalog);
    expect(allFilters).toHaveLength(6);
  });

  it('defaultExcludedFilter', () => {
    const clause = defaultExcludedFilter(mockCatalog);
    expect(clause).toEqual({ field: 'isExcluded', operator: 'is', value: false });

    const catalogWithoutExcluded: DatasourceCatalog = {
      ...mockCatalog,
      fields: mockCatalog.fields.filter((f) => f.name !== 'isExcluded'),
    };
    expect(defaultExcludedFilter(catalogWithoutExcluded)).toBeNull();
  });

  it('operatorsForField and isRelativeDateOp', () => {
    const dateField = mockCatalog.fields.find((f) => f.name === 'date')!;
    const ops = operatorsForField(mockCatalog, dateField);
    expect(ops).toContain('this_month');
    expect(ops).toContain('on');

    const amountField = mockCatalog.fields.find((f) => f.name === 'amount')!;
    expect(operatorsForField(mockCatalog, amountField)).toEqual(['equals', 'between', 'greater_than']);

    expect(isRelativeDateOp(mockCatalog, 'this_month')).toBe(true);
    expect(isRelativeDateOp(mockCatalog, 'on')).toBe(false);
  });

  it('enumOptionsFor static and dynamic', () => {
    const categoryField = mockCatalog.fields.find((f) => f.name === 'category')!;
    const dynamicOpts = enumOptionsFor(categoryField, {
      category: [{ id: 'c1', name: 'Food' }],
    });
    expect(dynamicOpts).toEqual([{ id: 'c1', name: 'Food' }]);

    const statusField = mockCatalog.fields.find((f) => f.name === 'status')!;
    const staticOpts = enumOptionsFor(statusField, {});
    expect(staticOpts).toEqual([
      { id: 'OPEN', name: 'OPEN' },
      { id: 'CLOSED', name: 'CLOSED' },
    ]);
  });

  it('valueKind for all field types and operators', () => {
    const dateField = mockCatalog.fields.find((f) => f.name === 'date')!;
    const amountField = mockCatalog.fields.find((f) => f.name === 'amount')!;
    const excludedField = mockCatalog.fields.find((f) => f.name === 'isExcluded')!;
    const statusField = mockCatalog.fields.find((f) => f.name === 'status')!;
    const descField = mockCatalog.fields.find((f) => f.name === 'description')!;

    expect(valueKind(mockCatalog, statusField, 'in')).toBe('multi');
    expect(valueKind(mockCatalog, dateField, 'this_month')).toBe('none');
    expect(valueKind(mockCatalog, dateField, 'last_x_days')).toBe('relativeAmount');
    expect(valueKind(mockCatalog, dateField, 'between')).toBe('dateBetween');
    expect(valueKind(mockCatalog, dateField, 'on')).toBe('absoluteDate');

    expect(valueKind(mockCatalog, amountField, 'between')).toBe('numberBetween');
    expect(valueKind(mockCatalog, amountField, 'equals')).toBe('scalar');

    expect(valueKind(mockCatalog, excludedField, 'is')).toBe('boolean');
    expect(valueKind(mockCatalog, statusField, 'is')).toBe('scalarEnum');
    expect(valueKind(mockCatalog, descField, 'contains')).toBe('scalar');
  });
});
