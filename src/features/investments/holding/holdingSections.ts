import type { CorporateAction } from '@/lib/types';

import {
  fetchInstrumentCorporateActions,
  fetchInstrumentDividends,
  fetchInstrumentTrades,
  fetchPricesPage,
} from '../investmentsServerApi';
import {
  corporateActionRow,
  type CorporateActionRowModel,
  dividendRow,
  type DividendRowModel,
  type HoldingSection,
  priceRow,
  type PriceRowModel,
  SECTION_PAGE_SIZE,
  type TradeRow,
  tradeRow,
} from './holdingModel';

// One page of each list of the holding page, as row models. The page render reads page 0 of the first
// three; the cards read the other pages (and the Price history dialog every page) through holdingActions.

export async function tradesSection(instrumentId: string, page: number): Promise<HoldingSection<TradeRow>> {
  const result = await fetchInstrumentTrades(instrumentId, page, SECTION_PAGE_SIZE);
  return {
    rows: result.content.map(tradeRow),
    position: { page: result.number, size: result.size, totalElements: result.totalElements, totalPages: result.totalPages },
  };
}

export async function dividendsSection(instrumentId: string, page: number): Promise<HoldingSection<DividendRowModel>> {
  const result = await fetchInstrumentDividends(instrumentId, page, SECTION_PAGE_SIZE);
  return {
    rows: result.content.map(dividendRow),
    position: { page: result.number, size: result.size, totalElements: result.totalElements, totalPages: result.totalPages },
  };
}

/** The server has no paged read of one instrument's corporate actions (a holding has a handful), so the page is cut here, never in the browser. */
export async function corporateActionsSection(instrumentId: string, page: number): Promise<HoldingSection<CorporateActionRowModel>> {
  return corporateActionsPage(await fetchInstrumentCorporateActions(instrumentId), page);
}

/** One page of already-read corporate actions, so the page load reads them once for both the list and the chart's splits. */
export function corporateActionsPage(all: CorporateAction[], page: number): HoldingSection<CorporateActionRowModel> {
  const totalPages = Math.ceil(all.length / SECTION_PAGE_SIZE);
  const current = Math.min(Math.max(page, 0), Math.max(totalPages - 1, 0));
  return {
    rows: all.slice(current * SECTION_PAGE_SIZE, (current + 1) * SECTION_PAGE_SIZE).map(corporateActionRow),
    position: { page: current, size: SECTION_PAGE_SIZE, totalElements: all.length, totalPages },
  };
}

export async function pricesSection(instrumentId: string, page: number): Promise<HoldingSection<PriceRowModel>> {
  const result = await fetchPricesPage(instrumentId, page, SECTION_PAGE_SIZE);
  return {
    rows: result.items.map(priceRow),
    position: { page: result.page, size: result.size, totalElements: result.totalElements, totalPages: result.totalPages },
  };
}
