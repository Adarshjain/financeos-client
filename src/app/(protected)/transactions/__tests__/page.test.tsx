import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TransactionsPage from '@/app/(protected)/transactions/page';
import * as apiClient from '@/lib/apiClient';
import { renderWithQuery } from '@/test/renderWithQuery';

describe('TransactionsPage (CD-6)', () => {
  it('fetches accounts, categories, and needsReviewCount in parallel', async () => {
    vi.spyOn(apiClient.accountsApi, 'list').mockResolvedValue([{ id: 'acc1', name: 'HDFC' }] as any);
    vi.spyOn(apiClient.categoriesApi, 'list').mockResolvedValue([{ id: 'cat1', name: 'Food' }] as any);
    vi.spyOn(apiClient.transactionsApi, 'search').mockResolvedValue({
      content: [],
      page: 0,
      size: 1,
      totalElements: 7, // 7 NEEDS_REVIEW total
      totalPages: 7,
    } as any);

    const jsx = await TransactionsPage();
    renderWithQuery(jsx);

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('suppresses badge count (passes null, not 0) when review count fetch fails (CD-6)', async () => {
    vi.spyOn(apiClient.accountsApi, 'list').mockResolvedValue([{ id: 'acc1', name: 'HDFC' }] as any);
    vi.spyOn(apiClient.categoriesApi, 'list').mockResolvedValue([{ id: 'cat1', name: 'Food' }] as any);
    vi.spyOn(apiClient.transactionsApi, 'search').mockRejectedValue(new Error('500 Server Error'));

    const jsx = await TransactionsPage();
    renderWithQuery(jsx);

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
