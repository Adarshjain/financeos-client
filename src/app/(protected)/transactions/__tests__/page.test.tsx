import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TransactionsPage from '@/app/(protected)/transactions/page';
import * as apiClient from '@/lib/apiClient';
import { renderWithQuery } from '@/test/renderWithQuery';

describe('TransactionsPage (CD-6)', () => {
  // The page lost its Review badge, so it no longer asks for the needs-review count.
  it('fetches accounts and categories only, with no review-count search', async () => {
    vi.spyOn(apiClient.accountsApi, 'list').mockResolvedValue([{ id: 'acc1', name: 'HDFC' }] as any);
    vi.spyOn(apiClient.categoriesApi, 'list').mockResolvedValue([{ id: 'cat1', name: 'Food' }] as any);
    const search = vi.spyOn(apiClient.transactionsApi, 'search');

    const jsx = await TransactionsPage();
    renderWithQuery(jsx);

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(apiClient.accountsApi.list).toHaveBeenCalled();
    expect(apiClient.categoriesApi.list).toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });
});
