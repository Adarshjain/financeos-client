import type { FieldDefinition, ReportCatalog, ReportResponse } from '@/lib/reports.types';

const AGGS = ['sum', 'avg', 'count', 'min', 'max'] as const;

const field = (f: Partial<FieldDefinition> & Pick<FieldDefinition, 'name' | 'label' | 'type' | 'role'>): FieldDefinition => ({
  allowedInReports: ['KPI', 'CHART', 'TABLE'],
  ...f,
});

/** A trimmed copy of the server's datasource catalog: Transactions and Dividends with their real field names. */
export const catalogFixture: ReportCatalog = {
  operators: {
    date: {
      absolute: ['is', 'before', 'after', 'between'],
      relative: ['this_month', 'previous_month', 'last_x_days', 'last_x_months', 'current_fy', 'all_time'],
    },
    string: ['contains', 'equals', 'in'],
    number: ['equals', 'greater_than', 'less_than', 'between'],
    enum: ['is', 'is_not', 'in', 'not_in'],
    boolean: ['is'],
  },
  datasources: [
    {
      name: 'transactions',
      label: 'Transactions',
      fields: [
        field({ name: 'amount', label: 'Amount', type: 'number', role: 'measure', aggregations: [...AGGS], format: 'currency' }),
        field({ name: 'spend', label: 'Spend', type: 'number', role: 'measure', aggregations: [...AGGS], format: 'currency' }),
        field({ name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['CHART', 'TABLE'] }),
        field({ name: 'category', label: 'Category', type: 'enum', role: 'dimension', dynamic: true, allowedInReports: ['CHART', 'TABLE'] }),
        field({ name: 'type', label: 'Type', type: 'enum', role: 'dimension', values: ['DEBIT', 'CREDIT'], allowedInReports: ['CHART', 'TABLE'] }),
        field({ name: 'description', label: 'Description', type: 'string', role: 'dimension', allowedInReports: ['TABLE'] }),
        field({ name: 'isExcluded', label: 'Is Excluded', type: 'boolean', role: 'filter', allowedInReports: [] }),
      ],
    },
    {
      name: 'dividends',
      label: 'Dividends',
      fields: [
        field({ name: 'amount', label: 'Amount', type: 'number', role: 'measure', aggregations: ['sum'], format: 'currency' }),
        field({ name: 'payDate', label: 'Pay date', type: 'date', role: 'dimension', allowedInReports: ['CHART', 'TABLE'] }),
        field({ name: 'broker', label: 'Broker', type: 'enum', role: 'dimension', dynamic: true, allowedInReports: ['CHART', 'TABLE'] }),
      ],
    },
  ],
};

/** A saved report as the server returns it. */
export const savedChart: ReportResponse = {
  id: 'r1',
  name: 'Spend by category',
  description: 'Where it goes',
  type: 'CHART',
  datasource: 'transactions',
  definition: {
    chartType: 'bar',
    dimension: { field: 'category' },
    measure: { field: 'spend', aggregation: 'sum' },
    filters: [{ field: 'isExcluded', operator: 'is', value: false }],
    limit: 5,
    other: true,
  },
  createdAt: '2026-10-01T05:00:00Z',
  updatedAt: '2026-10-20T05:00:00Z',
};
