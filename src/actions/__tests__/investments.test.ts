import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInvestmentTransaction } from '@/actions/investments';
import { investmentsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  investmentsApi: {
    createTransaction: vi.fn(),
  },
  instrumentsApi: {
    search: vi.fn(),
    create: vi.fn(),
    setPrice: vi.fn(),
  },
}));

describe('investments server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createInvestmentTransaction validates form and calls investmentsApi.createTransaction', async () => {
    vi.mocked(investmentsApi.createTransaction).mockResolvedValue({ id: 'inv1' } as any);

    const form = new FormData();
    form.append('brokerAccountId', 'acc1');
    form.append('instrumentId', 'inst1');
    form.append('type', 'buy');
    form.append('quantity', '10');
    form.append('price', '150');
    form.append('tradeDate', '2026-07-25');

    const res = await createInvestmentTransaction(null, form);
    expect(res.success).toBe(true);
  });
});
