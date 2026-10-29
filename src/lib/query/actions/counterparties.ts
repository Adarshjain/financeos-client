'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { CounterpartyResponse } from '@/lib/lending.types';
import type { Page } from '@/lib/pagination';

const emptyPage = (size: number): Page<CounterpartyResponse> => ({
  content: [],
  number: 0,
  size,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  empty: true,
});

/** First page of the caller's counterparties whose name contains `q` (an empty `q` lists all). */
export const searchCounterparties = createDomainAction(
  { fallbackError: "Couldn't search people. Try again." },
  async (q: string, size: number): Promise<Page<CounterpartyResponse>> => {
    const { data } = await serverApi.GET('/api/v1/counterparties', {
      params: { query: { page: 0, size, ...(q ? { q } : {}) } },
    });
    return (data ?? emptyPage(size)) as unknown as Page<CounterpartyResponse>;
  },
);

/** Best name match for a transaction description, or null when nothing overlaps. */
export const suggestCounterparty = createDomainAction(
  { fallbackError: "Couldn't suggest a person. Try again." },
  async (text: string): Promise<CounterpartyResponse | null> => {
    const { data } = await serverApi.GET('/api/v1/counterparties/suggest', { params: { query: { text } } });
    return (data?.counterparty ?? null) as unknown as CounterpartyResponse | null;
  },
);

/** One page of people with a nonzero balance, largest |net| first. */
export const loadOutstandingCounterparties = createDomainAction(
  { fallbackError: "Couldn't load balances. Try again." },
  async (size: number): Promise<Page<CounterpartyResponse>> => {
    const { data } = await serverApi.GET('/api/v1/counterparties', {
      params: { query: { page: 0, size, outstanding: true, sort: ['net'] } },
    });
    return (data ?? emptyPage(size)) as unknown as Page<CounterpartyResponse>;
  },
);
