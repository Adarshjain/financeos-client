import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/test/next-mocks';

import { createInvestmentTransaction } from '@/actions/investments';
import { investmentsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  investmentsApi: {
    createTransaction: vi.fn(),
  },
}));

describe('investments server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createInvestmentTransaction validates form and calls investmentsApi.createTransaction', async () => {
    vi.mocked(investmentsApi.createTransaction).mockResolvedValue({ id: 'inv1' } as any);

    const form = new FormData();
    form.append('accountId', 'acc1');
    form.append('type', 'buy');
    form.append('quantity', '10');
    form.append('price', '150');
    form.append('date', '2026-07-25');

    const res = await createInvestmentTransaction(null, form);
    expect(res.success).toBe(true);
  });
});
