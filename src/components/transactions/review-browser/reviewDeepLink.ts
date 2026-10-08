import { REVIEW_REASONS } from '@/components/transactions/catalog';

/** Filters the review page may start with, from a push deep link such as `?account=…&from=…&to=…`. */
export interface ReviewInitialFilters {
  accountIds?: string[];
  reason?: string;
  dateRange?: { from: string; to: string } | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Reads the review page's query string leniently: unknown reasons, malformed dates or ids are
 * dropped rather than breaking the page. `account` may be a comma-separated list.
 */
export function parseReviewSearchParams(
  params: Record<string, string | string[] | undefined> | undefined,
): ReviewInitialFilters | undefined {
  if (!params) return undefined;
  const out: ReviewInitialFilters = {};
  const accounts = (first(params.account) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID.test(s));
  if (accounts.length > 0) out.accountIds = accounts;
  const reason = first(params.reason);
  if (reason && (REVIEW_REASONS as readonly string[]).includes(reason)) out.reason = reason;
  const from = first(params.from);
  const to = first(params.to);
  if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to) && from <= to) out.dateRange = { from, to };
  return Object.keys(out).length > 0 ? out : undefined;
}
