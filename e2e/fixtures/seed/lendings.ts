import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';

export type LendingResponse = components['schemas']['LendingResponse'];
export type LendingMatchSuggestionsResponse = components['schemas']['LendingMatchSuggestionsResponse'];
export type PageTransactionResponse = components['schemas']['PageTransactionResponse'];
export type FilterClause = components['schemas']['FilterClause'];

/** PUT /api/v1/lendings/{id}/transaction — attach or replace the linked bank transaction. */
export async function linkLendingTransaction(
  api: ApiClient,
  lendingId: string,
  transactionId: string
): Promise<LendingResponse> {
  const res = await api.PUT('/api/v1/lendings/{id}/transaction', {
    params: { path: { id: lendingId } },
    body: { transactionId },
  });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `linkLendingTransaction failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

/** DELETE /api/v1/lendings/{id}/transaction — detach the linked transaction (idempotent, 204). */
export async function unlinkLendingTransaction(api: ApiClient, lendingId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/lendings/{id}/transaction', {
    params: { path: { id: lendingId } },
  });
  if (res.response.status !== 204) {
    throw new Error(`unlinkLendingTransaction failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

/** GET /api/v1/counterparties/{id}/match-suggestions */
export async function matchSuggestions(
  api: ApiClient,
  counterpartyId: string
): Promise<LendingMatchSuggestionsResponse> {
  const res = await api.GET('/api/v1/counterparties/{id}/match-suggestions', {
    params: { path: { id: counterpartyId } },
  });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `matchSuggestions failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

/** POST /api/v1/transactions/search — a single page, returned as-is (not accumulated across pages). */
export async function searchTransactions(
  api: ApiClient,
  filters?: FilterClause[],
  search?: string,
  page = 0,
  size = 50
): Promise<PageTransactionResponse> {
  const res = await api.POST('/api/v1/transactions/search', {
    body: {
      filters: filters ?? null,
      search: search ?? null,
    },
    params: { query: { page, size } },
  });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `searchTransactions failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}
