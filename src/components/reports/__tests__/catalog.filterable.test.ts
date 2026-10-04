import { describe, expect, it } from 'vitest';

import type { DatasourceCatalog } from '@/lib/reports.types';

import { filterableFields } from '../catalog';

const catalog = {
  operators: { date: { absolute: [], relative: [] }, string: [], number: [], enum: [], boolean: [] },
  fields: [
    { name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['CHART'] },
    { name: 'billingCycle', label: 'Billing cycle', type: 'string', role: 'dimension', allowedInReports: ['CHART'], filterable: false },
    { name: 'mcc', label: 'MCC', type: 'string', role: 'dimension', allowedInReports: ['CHART'], filterable: true },
    { name: 'txnCount', label: 'Eligible transactions', type: 'number', role: 'measure', allowedInReports: ['KPI'], filterable: false },
  ],
} as DatasourceCatalog;

describe('filterableFields', () => {
  it('offers every field except those the catalog marks filterable: false', () => {
    expect(filterableFields(catalog).map((f) => f.name)).toEqual(['date', 'mcc']);
  });

  it('treats a missing flag as filterable', () => {
    const plain = { ...catalog, fields: catalog.fields.map(({ filterable: _f, ...f }) => f) } as DatasourceCatalog;
    expect(filterableFields(plain).map((f) => f.name)).toEqual(['date', 'billingCycle', 'mcc', 'txnCount']);
  });
});
