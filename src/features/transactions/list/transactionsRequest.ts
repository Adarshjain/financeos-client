import type { FilterClause } from '@/lib/reports.types';
import type { TransactionSearchRequest } from '@/lib/transaction.types';

import { isAllTime, type Period, SORTS, type TransactionsQuery } from './transactionsUrl';

function periodClause(period: Period): FilterClause | null {
  if (isAllTime(period)) return null;
  if (period.kind === 'date') return { field: 'date', operator: 'is', value: period.date };
  if (period.kind === 'range') return { field: 'date', operator: 'between', value: { from: period.from, to: period.to } };
  if (period.id === 'last_14_days') return { field: 'date', operator: 'last_x_days', value: { amount: 14 } };
  return { field: 'date', operator: period.id };
}

/** One value is an `is` clause, several an `in` clause. */
function pickClause(field: string, values: string[]): FilterClause | null {
  if (values.length === 0) return null;
  return values.length === 1
    ? { field, operator: 'is', value: values[0] }
    : { field, operator: 'in', value: values };
}

/** The server's filter clauses for a query, the same shapes the Legacy filter bar and review page send. */
export function buildFilters(query: TransactionsQuery): FilterClause[] {
  const clauses: (FilterClause | null)[] = [
    periodClause(query.period),
    pickClause('accountId', query.accounts),
    query.uncategorized ? { field: 'category', operator: 'is_empty' } : pickClause('category', query.categories),
    query.type === 'all' ? null : { field: 'type', operator: 'is', value: query.type === 'debit' ? 'DEBIT' : 'CREDIT' },
    query.amount ? amountClause(query.amount) : null,
    query.review ? { field: 'reviewType', operator: 'is', value: query.review } : null,
    query.reason ? { field: 'reviewReason', operator: 'is', value: query.reason } : null,
    query.monitoring ? { field: 'isUnderMonitoring', operator: 'is', value: true } : null,
    query.excluded ? { field: 'isExcluded', operator: 'is', value: true } : null,
    query.upToStatement ? { field: 'coveredByStatement', operator: 'is', value: true } : null,
    query.source ? { field: 'source', operator: 'is', value: query.source } : null,
  ];
  return clauses.filter((c): c is FilterClause => c !== null);
}

function amountClause(amount: NonNullable<TransactionsQuery['amount']>): FilterClause | null {
  if (amount.op === 'greater_than') return amount.from === null ? null : { field: 'amount', operator: 'greater_than', value: amount.from };
  if (amount.op === 'less_than') return amount.to === null ? null : { field: 'amount', operator: 'less_than', value: amount.to };
  if (amount.from === null || amount.to === null) return null;
  return { field: 'amount', operator: 'between', value: { from: amount.from, to: amount.to } };
}

/** The search body for a query (the page and sort travel as query params, see `searchPaging`). */
export function buildSearchBody(query: TransactionsQuery): TransactionSearchRequest {
  return { filters: buildFilters(query), search: query.q || undefined };
}

export function searchPaging(query: TransactionsQuery): { page: number; size: number; sort: string[] } {
  const sort = SORTS.find((s) => s.id === query.sort) ?? SORTS[0];
  return { page: query.page, size: query.size, sort: [sort.server] };
}

/** The "Needs review" chip's count: everyone's NEEDS_REVIEW rows, whatever else is filtered. */
export const NEEDS_REVIEW_BODY: TransactionSearchRequest = {
  filters: [{ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' }],
};
