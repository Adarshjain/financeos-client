import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../browser/AddLendingDialog', () => ({
  AddLendingDialog: () => null,
}));

vi.mock('../browser/CounterpartiesList', () => ({
  CounterpartiesList: () => <div data-testid="counterparties-list" />,
}));

import { api } from '@/lib/api/client';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { LoansSummaryResponse } from '@/lib/types';

import { LendingsBrowser } from '../LendingsBrowser';

const emptyPage = {
  content: [],
  number: 0,
  size: 50,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  empty: true,
};

const summaryBefore: LoansSummaryResponse = {
  totalOutstanding: 0,
  activeLoanCount: 0,
  lentOutstanding: 1000,
  borrowedOutstanding: 250,
  netReceivable: 750,
};

const summaryAfter: LoansSummaryResponse = {
  totalOutstanding: 0,
  activeLoanCount: 0,
  lentOutstanding: 2500,
  borrowedOutstanding: 250,
  netReceivable: 2250,
};

/**
 * Invalidation-loop regression for the stale summary cards: the page seeds
 * keys.loans.summary() from the RSC prefetch, and a ledger mutation must be
 * able to refresh those cards without a reload.
 */
describe('LendingsBrowser summary cards', () => {
  let serverSummary: LoansSummaryResponse;

  beforeEach(() => {
    vi.clearAllMocks();
    serverSummary = summaryBefore;
    (api.GET as unknown as Mock).mockImplementation(async (path: string) =>
      path === '/api/v1/loans/summary' ? { data: serverSummary } : { data: emptyPage },
    );
  });

  it('refresh after invalidateLendingQueries() without a reload', async () => {
    // staleTime: Infinity so a mount refetch can't mask a missing invalidation.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(keys.loans.summary(), summaryBefore);
    queryClient.setQueryData(keys.lendings.counterparties({ page: 0, size: 50 }), emptyPage);

    render(
      <QueryClientProvider client={queryClient}>
        <LendingsBrowser />
      </QueryClientProvider>,
    );

    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
    expect(screen.getByText('+₹750.00')).toBeInTheDocument();

    // Simulates a ledger mutation's onSuccess (every lending mutation goes through this helper).
    serverSummary = summaryAfter;
    await invalidateLendingQueries(queryClient);

    await waitFor(() => {
      expect(screen.getByText('₹2,500.00')).toBeInTheDocument();
    });
    expect(screen.getByText('+₹2,250.00')).toBeInTheDocument();
    expect(screen.queryByText('₹1,000.00')).not.toBeInTheDocument();
  });
});
