/**
 * App-wide search (GET /api/v1/search). The browser calls it directly through the /api/v1 rewrite, with
 * the session cookie, so a request can be cancelled; server actions run one at a time and can't be.
 * Kept apart from apiClient (server-only). Types are hand-written to the endpoint's contract.
 */

import { notifyIfAppLocked } from '@/lib/appLock';
import { notifyIfSessionExpired } from '@/lib/authExpiry';

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_MAX_CHARS = 100;

export interface SearchAccount {
  id: string;
  name: string;
  bank: string | null;
  type: string;
  last4: string | null;
}

export interface SearchTransaction {
  id: string;
  /** Calendar date, YYYY-MM-DD. */
  date: string;
  description: string;
  accountId: string;
  accountName: string;
  /** Signed: credit +, debit −. */
  amount: number;
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

export interface GlobalSearchResult {
  accounts: SearchAccount[];
  transactions: SearchTransaction[];
  holdings: SearchHolding[];
  people: SearchPerson[];
  loans: SearchLoan[];
  reports: SearchReport[];
  dashboards: SearchDashboard[];
}

export const EMPTY_SEARCH_RESULT: GlobalSearchResult = {
  accounts: [],
  transactions: [],
  holdings: [],
  people: [],
  loans: [],
  reports: [],
  dashboards: [],
};

/** Searches every group for `q` (already trimmed, 3 to 100 characters). Rejects on any non-2xx answer. */
export async function fetchGlobalSearch(q: string, signal?: AbortSignal): Promise<GlobalSearchResult> {
  const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (res.status === 401) notifyIfSessionExpired({ status: 401 });
  if (res.status === 423) notifyIfAppLocked({ status: 423 });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return { ...EMPTY_SEARCH_RESULT, ...((await res.json()) as Partial<GlobalSearchResult>) };
}
