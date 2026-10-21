import type { Account } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import { accountsApi } from '@/lib/apiClient';
import type {
  CounterpartyDirectionFilter,
  CounterpartyListItem,
  CounterpartyMatchSuggestions,
  CounterpartySummary,
  UnrecordedTransfer,
} from '@/lib/lending.types';
import type { LoanMatchSuggestions, LoanResponse, LoansSummaryDetail, LoanStatus } from '@/lib/loan.types';
import type { Page } from '@/lib/pagination';

// The generated schema predates the Loans & lendings list endpoints (q, direction, the new
// summaries and the all-loans / all-people match suggestions), so these calls go through one
// loosely typed GET and each result is typed once here, at the boundary.
type Query = Record<string, string | number | boolean | undefined>;
type LooseGet = (path: string, init?: { params?: { query?: Query } }) => Promise<{ data?: unknown }>;
const get = serverApi.GET as unknown as LooseGet;

async function read<T>(path: string, query?: Query): Promise<T> {
  const { data } = await get(path, query ? { params: { query } } : undefined);
  return data as T;
}

export interface LoanListQuery {
  status: LoanStatus;
  q?: string;
  page?: number;
  size?: number;
}

export function fetchLoans({ status, q, page = 0, size = 25 }: LoanListQuery): Promise<Page<LoanResponse>> {
  return read('/api/v1/loans', { status, q: q || undefined, page, size });
}

export function fetchLoansSummary(): Promise<LoansSummaryDetail> {
  return read('/api/v1/loans/summary');
}

export function fetchLoanMatches(): Promise<LoanMatchSuggestions[]> {
  return read('/api/v1/loans/match-suggestions');
}

export interface PeopleListQuery {
  q?: string;
  direction?: CounterpartyDirectionFilter;
  page?: number;
  size?: number;
}

export function fetchPeople({ q, direction, page = 0, size = 25 }: PeopleListQuery): Promise<Page<CounterpartyListItem>> {
  return read('/api/v1/counterparties', { q: q || undefined, direction, page, size });
}

export function fetchPeopleSummary(): Promise<CounterpartySummary> {
  return read('/api/v1/counterparties/summary');
}

export function fetchPeopleMatches(): Promise<CounterpartyMatchSuggestions[]> {
  return read('/api/v1/counterparties/match-suggestions');
}

export function fetchUnrecordedTransfers(): Promise<UnrecordedTransfer[]> {
  return read('/api/v1/counterparties/unrecorded-transfers');
}

export function fetchAccounts(): Promise<Account[]> {
  return accountsApi.list();
}
