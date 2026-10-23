import { dividendsApi, investmentsApi } from '@/lib/apiClient';
import type { DividendFilters, DividendInstrumentTotal, ItemsPage } from '@/lib/investments.types';
import type { DividendReceiptSummary, DividendSummary, PagedDividendResponse, Position } from '@/lib/types';

import { type NotReceivedStatus } from './dividendsModel';

// The fetch helpers of the Dividends page. The page imports these (never apiClient directly), so a test replaces one module.

export function fetchDividends(filters: DividendFilters, page: number, size: number): Promise<PagedDividendResponse> {
  return dividendsApi.list({ ...filters, page, size });
}

/** Every FY's totals (the list's filters except the FY and the receipt), for the FY choices and the tiles. */
export function fetchDividendSummary(filters: DividendFilters): Promise<DividendSummary> {
  return dividendsApi.summary(filters);
}

export function fetchReceiptSummary(filters: DividendFilters): Promise<DividendReceiptSummary> {
  return dividendsApi.receiptSummary(filters);
}

/** The by-instrument report: the server's Spring page, read as the page the report card takes. */
export async function fetchByInstrument(years: number, page: number, size: number): Promise<ItemsPage<DividendInstrumentTotal>> {
  const raw = await dividendsApi.byInstrument({ years, page, size });
  return { items: raw.content, page: raw.number, size: raw.size, totalElements: raw.totalElements, totalPages: raw.totalPages };
}

/** The held positions, for the instrument choices of the record form. */
export async function fetchPositions(): Promise<Position[]> {
  return (await investmentsApi.getPositions()).positions ?? [];
}

/** The instruments (symbols) of the payouts in one receipt status, for the "Not received" tile's line. */
export async function fetchSymbolsByReceipt(filters: DividendFilters, status: NotReceivedStatus): Promise<string[]> {
  const page = await dividendsApi.list({ ...filters, receipt: status, page: 0, size: 3 });
  return page.content.map((d) => d.symbol || d.instrumentName || '').filter(Boolean);
}
