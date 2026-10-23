import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  dividendsApi: { list: vi.fn(), summary: vi.fn(), receiptSummary: vi.fn(), byInstrument: vi.fn() },
  investmentsApi: { getPositions: vi.fn() },
}));
vi.mock('@/lib/apiClient', () => api);

import { fetchByInstrument, fetchDividends, fetchDividendSummary, fetchPositions, fetchReceiptSummary, fetchSymbolsByReceipt } from './dividendsServerApi';

beforeEach(() => vi.clearAllMocks());

describe('dividends fetchers', () => {
  it('asks for a page of the filtered list', async () => {
    api.dividendsApi.list.mockResolvedValue('page');
    expect(await fetchDividends({ fy: 2026, receipt: 'overdue' }, 2, 50)).toBe('page');
    expect(api.dividendsApi.list).toHaveBeenCalledWith({ fy: 2026, receipt: 'overdue', page: 2, size: 50 });
  });

  it('passes the figure filters to the summary and the receipt summary', async () => {
    await fetchDividendSummary({ brokerAccountId: 'b1' });
    await fetchReceiptSummary({ fy: 2026 });
    expect(api.dividendsApi.summary).toHaveBeenCalledWith({ brokerAccountId: 'b1' });
    expect(api.dividendsApi.receiptSummary).toHaveBeenCalledWith({ fy: 2026 });
  });

  it('asks the by-instrument report for the years and the page', async () => {
    api.dividendsApi.byInstrument.mockResolvedValue({ content: [], number: 1, size: 10, totalElements: 0, totalPages: 0 });
    await fetchByInstrument(3, 1, 10);
    expect(api.dividendsApi.byInstrument).toHaveBeenCalledWith({ years: 3, page: 1, size: 10 });
  });

  it('reads the by-instrument rows from the page the server sends (content)', async () => {
    const row = { instrumentId: 'i1' };
    api.dividendsApi.byInstrument.mockResolvedValueOnce({ content: [row], number: 2, size: 10, totalElements: 23, totalPages: 3 });
    expect(await fetchByInstrument(3, 2, 10)).toEqual({ items: [row], page: 2, size: 10, totalElements: 23, totalPages: 3 });
  });

  it('reads the held positions, or none', async () => {
    api.investmentsApi.getPositions.mockResolvedValueOnce({ positions: [{ holdingId: 'h1' }] });
    expect(await fetchPositions()).toEqual([{ holdingId: 'h1' }]);
    api.investmentsApi.getPositions.mockResolvedValueOnce({});
    expect(await fetchPositions()).toEqual([]);
  });

  it('names the instruments of one receipt status from three rows', async () => {
    api.dividendsApi.list.mockResolvedValue({ content: [{ symbol: 'ITC' }, { symbol: '', instrumentName: 'Infosys' }, {}] });
    expect(await fetchSymbolsByReceipt({ fy: 2026 }, 'overdue')).toEqual(['ITC', 'Infosys']);
    expect(api.dividendsApi.list).toHaveBeenCalledWith({ fy: 2026, receipt: 'overdue', page: 0, size: 3 });
  });
});
