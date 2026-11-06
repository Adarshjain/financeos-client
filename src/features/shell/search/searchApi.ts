/**
 * App-wide search (GET /api/v1/search). The browser calls it directly through the /api/v1 rewrite, with
 * the session cookie, so a request can be cancelled; server actions run one at a time and can't be.
 * Kept apart from apiClient (server-only). Types are hand-written to the endpoint's contract.
 */

import { notifyIfAppLocked } from '@/lib/appLock';
import { currentSessionGeneration, notifyIfSessionExpired } from '@/lib/authExpiry';

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_CHARS = 100;

/** A credit card's unpaid bill. */
export interface SearchOpenBill {
  statementId: string;
  remainingAmount: number;
  /** Calendar date, YYYY-MM-DD. */
  paymentDueDate: string | null;
}

export interface SearchAccount {
  id: string;
  name: string;
  bank: string | null;
  type: string;
  last4: string | null;
  /** Credit cards only; null (or absent) when nothing is unpaid. */
  openBill?: SearchOpenBill | null;
}

export interface SearchTransaction {
  id: string;
  /** Calendar date, YYYY-MM-DD. */
  date: string;
  description: string;
  accountId: string;
  accountName: string;
  /** Signed: credit +, debit −. Null for a foreign charge still waiting for its statement. */
  amount: number | null;
  originalAmount?: number | null;
  originalCurrency?: string | null;
}

export interface SearchHolding {
  instrumentId: string;
  name: string;
  symbol: string | null;
}

export interface SearchPerson {
  /** The counterparty id. */
  id: string;
  name: string;
}

export interface SearchLoan {
  id: string;
  name: string;
  lender: string | null;
}

export interface SearchReport {
  id: string;
  name: string;
  type: 'KPI' | 'CHART' | 'TABLE';
}

export interface SearchDashboard {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface SearchCategory {
  /** The Transactions filter value: `category` when parentName is null, else `subcategory`. */
  key: string;
  name: string;
  parentName: string | null;
}

export interface SearchRule {
  id: string;
  matchText: string;
  categoryName: string;
}

export interface GlobalSearchResult {
  accounts: SearchAccount[];
  transactions: SearchTransaction[];
  holdings: SearchHolding[];
  people: SearchPerson[];
  loans: SearchLoan[];
  reports: SearchReport[];
  dashboards: SearchDashboard[];
  categories: SearchCategory[];
  rules: SearchRule[];
}

export const EMPTY_SEARCH_RESULT: GlobalSearchResult = {
  accounts: [],
  transactions: [],
  holdings: [],
  people: [],
  loans: [],
  reports: [],
  dashboards: [],
  categories: [],
  rules: [],
};

// Browser fetch on purpose (documented exception): server actions run one at a time per tab and would queue search.
/** Searches every group for `q` (already trimmed, 2 to 100 characters). Rejects on any non-2xx answer. */
export async function fetchGlobalSearch(q: string, signal?: AbortSignal): Promise<GlobalSearchResult> {
  const startedIn = currentSessionGeneration();
  const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (res.status === 401) notifyIfSessionExpired({ status: 401 }, startedIn);
  if (res.status === 423) notifyIfAppLocked({ status: 423 });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return { ...EMPTY_SEARCH_RESULT, ...((await res.json()) as Partial<GlobalSearchResult>) };
}
