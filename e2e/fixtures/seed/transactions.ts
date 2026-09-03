import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';

export type CreateTransactionRequest = components['schemas']['CreateTransactionRequest'];
export type UpdateTransactionRequest = components['schemas']['UpdateTransactionRequest'];
export type TransactionResponse = components['schemas']['TransactionResponse'];
export type PageTransactionResponse = components['schemas']['PageTransactionResponse'];
export type FilterClause = components['schemas']['FilterClause'];
export type CategoryResponse = components['schemas']['CategoryResponse'];

let seedCounter = 0;

export function todayString(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function createCategory(
  api: ApiClient,
  name?: string
): Promise<CategoryResponse> {
  seedCounter += 1;
  const catName = name ?? `Category ${seedCounter}`;
  const res = await api.POST('/api/v1/categories', {
    body: { name: catName },
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createCategory failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function createTransaction(
  api: ApiClient,
  accountId: string,
  overrides?: Partial<CreateTransactionRequest>
): Promise<TransactionResponse> {
  seedCounter += 1;
  const body: CreateTransactionRequest = {
    accountId,
    amount: -100, // debit by default
    date: todayString(),
    description: `Seed Transaction ${seedCounter}`,
    ...overrides,
  };

  const res = await api.POST('/api/v1/transactions', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createTransaction failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export interface CreateTransactionsOptions {
  startDate?: string;
  stepDays?: number;
  amounts?: number[];
  descriptionPrefix?: string;
}

export async function createTransactions(
  api: ApiClient,
  accountId: string,
  n: number,
  options: CreateTransactionsOptions = {}
): Promise<TransactionResponse[]> {
  const {
    startDate = todayString(-n),
    stepDays = 1,
    amounts,
    descriptionPrefix = 'Bulk Txn',
  } = options;

  const results: TransactionResponse[] = [];
  const baseDate = new Date(startDate);

  for (let i = 0; i < n; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i * stepDays);
    const dateStr = d.toISOString().slice(0, 10);
    const amount = amounts ? amounts[i % amounts.length] : -((i + 1) * 10);

    const txn = await createTransaction(api, accountId, {
      amount,
      date: dateStr,
      description: `${descriptionPrefix} ${i + 1}`,
    });
    results.push(txn);
  }

  return results;
}

export async function searchAll(
  api: ApiClient,
  filters?: FilterClause[],
  search?: string
): Promise<TransactionResponse[]> {
  const all: TransactionResponse[] = [];
  let page = 0;
  const size = 50;

  while (true) {
    const res = await api.POST('/api/v1/transactions/search', {
      body: {
        filters: filters ?? null,
        search: search ?? null,
      },
      params: {
        query: { page, size, sort: ['date,desc', 'createdAt,desc', 'id,desc'] },
      },
    });

    if (res.error || !res.data || res.response.status !== 200) {
      throw new Error(
        `searchAll failed at page ${page} (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
      );
    }

    const pageData = res.data;
    if (pageData.content) {
      all.push(...pageData.content);
    }

    if (pageData.last || !pageData.content || pageData.content.length === 0) {
      break;
    }
    page += 1;
  }

  return all;
}

export async function findById(
  api: ApiClient,
  id: string
): Promise<TransactionResponse | null> {
  const all = await searchAll(api);
  return all.find((t) => t.id === id) ?? null;
}

/**
 * Creates two near-duplicate transactions (same account, amount, date) representing a candidate pair.
 * Note: In financeos-server, manual transactions are always marked ReviewType.NA with empty review reasons.
 * Review reasons (DUPLICATE_SUSPECT, CATEGORY_UNVERIFIED, UNRECONCILED) are only populated via statement/file
 * ingestion (Phase 8) or Gmail ingestion (Phase 15).
 */
export async function createNeedsReviewPair(
  api: ApiClient,
  accountId: string,
  options?: { amount?: number; date?: string; description?: string }
): Promise<[TransactionResponse, TransactionResponse]> {
  const amount = options?.amount ?? -250;
  const date = options?.date ?? todayString(-1);
  const desc = options?.description ?? 'Near Duplicate Transaction';

  const txn1 = await createTransaction(api, accountId, {
    amount,
    date,
    description: `${desc} A`,
  });

  const txn2 = await createTransaction(api, accountId, {
    amount,
    date,
    description: `${desc} B`,
  });

  return [txn1, txn2];
}

