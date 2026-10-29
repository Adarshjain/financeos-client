import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/apiClient', async (orig) => ({ ...(await orig<typeof import('@/lib/apiClient')>()), accountsApi: {}, dividendsApi: {} }));
vi.mock('./dividendsServerApi', () => ({ fetchPositions: vi.fn() }));

import {
  confirmDividendMatches,
  createDividend,
  deleteDividend,
  linkDividendCredit,
  loadDividendReconciliation,
  loadUnrecordedDividendCredits,
  setDividendReceiptNote,
  unlinkDividendCredit,
  updateDividend,
} from './dividendsActions';

beforeEach(() => vi.resetAllMocks());

describe('dividendsActions writes', () => {
  it('records, changes and deletes a dividend', async () => {
    api.POST.mockResolvedValue({ data: { id: 'd1' } });
    expect(await createDividend({ amount: 5 } as never)).toEqual({ success: true, data: { id: 'd1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/dividends', { body: { amount: 5 } });
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    await updateDividend('d1', { amount: 6 } as never);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}', { params: { path: { id: 'd1' } }, body: { amount: 6 } });
    api.DELETE.mockResolvedValue({});
    await deleteDividend('d1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}', { params: { path: { id: 'd1' } } });
  });

  it('links and unlinks the bank credit', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    await linkDividendCredit('d1', 't1', true);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: 'd1' } }, body: { transactionId: 't1', updateTds: true } });
    api.DELETE.mockResolvedValue({});
    await unlinkDividendCredit('d1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: 'd1' } } });
  });

  it('sends a receipt note, and null for "derived"', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    await setDividendReceiptNote('d1', 'derived');
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/investments/dividends/{id}/receipt-status', { params: { path: { id: 'd1' } }, body: { status: null } });
    await setDividendReceiptNote('d1', 'not_received' as never);
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/investments/dividends/{id}/receipt-status', { params: { path: { id: 'd1' } }, body: { status: 'not_received' } });
  });

  it('reads the reconciliation and the unrecorded credits, and confirms matches', async () => {
    api.GET.mockResolvedValue({ data: { items: [] } });
    expect(await loadDividendReconciliation({ brokerAccountId: 'b1' })).toEqual({ success: true, data: { items: [] } });
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/investments/dividends/reconciliation', { params: { query: { brokerAccountId: 'b1' } } });
    await loadUnrecordedDividendCredits();
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/investments/dividends/reconciliation/unrecorded', { params: { query: {} } });
    api.POST.mockResolvedValue({ data: { linked: [], skipped: [] } });
    const items = [{ dividendId: 'd1', transactionId: 't1', updateTds: false }];
    expect(await confirmDividendMatches(items)).toEqual({ success: true, data: { linked: [], skipped: [] } });
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/investments/dividends/reconciliation/confirm', { body: { items } });
  });

  it('reports a failure instead of throwing', async () => {
    api.POST.mockRejectedValue(new Error('down'));
    expect(await confirmDividendMatches([])).toMatchObject({ success: false, error: { message: "Couldn't link dividends. Try again." } });
  });
});
