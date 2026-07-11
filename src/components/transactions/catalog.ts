import type { DatasourceCatalog } from '@/lib/reports.types';

export const TRANSACTIONS_OPERATORS = {
  number: ['equals', 'greater_than', 'less_than', 'between'],
  string: ['exact', 'starts_with', 'ends_with', 'contains', 'in'],
  enum: ['is', 'is_not', 'in', 'not_in'],
  boolean: ['is'],
  date: {
    absolute: ['is', 'after', 'before', 'between'],
    relative: [
      'this_month',
      'this_week',
      'this_year',
      'previous_month',
      'previous_week',
      'previous_year',
      'last_x_days',
      'last_x_months',
      'last_x_years',
      'today',
      'yesterday',
      'current_fy',
      'prev_fy',
      'all_time',
    ],
  },
};

export const TRANSACTIONS_CATALOG: DatasourceCatalog = {
  operators: TRANSACTIONS_OPERATORS,
  fields: [
    { name: 'amount', label: 'Amount', type: 'number', role: 'filter', allowedInReports: [] },
    { name: 'date', label: 'Date', type: 'date', role: 'filter', allowedInReports: [] },
    { name: 'type', label: 'Type', type: 'enum', role: 'filter', values: ['DEBIT', 'CREDIT'], allowedInReports: [] },
    { name: 'source', label: 'Source', type: 'enum', role: 'filter', values: ['gmail_transaction_alert', 'gmail_statement', 'manual', 'file_upload'], allowedInReports: [] },
    { name: 'accountId', label: 'Account', type: 'enum', role: 'filter', dynamic: true, valueKey: 'id', allowedInReports: [] },
    { name: 'accountType', label: 'Account Type', type: 'enum', role: 'filter', values: ['bank_account', 'credit_card', 'stock', 'mutual_fund', 'generic'], allowedInReports: [] },
    { name: 'category', label: 'Category', type: 'enum', role: 'filter', dynamic: true, allowedInReports: [] },
    { name: 'reviewType', label: 'Review Type', type: 'enum', role: 'filter', values: ['NEEDS_REVIEW', 'AUTO_REVIEWED', 'MANUALLY_REVIEWED', 'NA'], allowedInReports: [] },
    { name: 'reviewReason', label: 'Review Reason', type: 'enum', role: 'filter', values: ['UNRECONCILED', 'CATEGORY_UNVERIFIED', 'DUPLICATE_SUSPECT', 'OTHER'], allowedInReports: [] },
    { name: 'description', label: 'Description', type: 'string', role: 'filter', allowedInReports: [] },
    { name: 'isUnderMonitoring', label: 'Under Monitoring', type: 'boolean', role: 'filter', allowedInReports: [] },
    { name: 'isExcluded', label: 'Excluded', type: 'boolean', role: 'filter', allowedInReports: [] },
    { name: 'coveredByStatement', label: 'Covered by Statement', type: 'boolean', role: 'filter', allowedInReports: [] },
  ],
};
