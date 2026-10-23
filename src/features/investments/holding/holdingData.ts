import { notFound } from 'next/navigation';
import { cache } from 'react';

import { orNull, signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { ApiError } from '@/lib/api/client';
import type { HoldingDetail, PricePage, SellEstimate } from '@/lib/investments.types';
import type { CorporateAction, Instrument, PagedDividendResponse, PagedInvestmentTransactionResponse,PriceHistoryPoint } from '@/lib/types';

import {
  fetchHolding,
  fetchInstrument,
  fetchInstrumentCorporateActions,
  fetchInstrumentDividends,
  fetchInstrumentTrades,
  fetchPriceHistory,
  fetchPricesPage,
  fetchSellEstimate,
} from '../investmentsServerApi';
import { type HoldingTab, OVERVIEW_SIZES, TAB_PAGE_SIZE } from './holdingModel';

export interface HoldingPageData {
  holding: HoldingDetail;
  instrument: Instrument | null;
  /** The sell-all estimate; null when it could not be read. */
  estimate: SellEstimate | null;
  trades: PagedInvestmentTransactionResponse | null;
  dividends: PagedDividendResponse | null;
  corporateActions: CorporateAction[] | null;
  prices: PricePage | null;
  /** Every stored price, oldest or newest first; null when it could not be read. */
  history: PriceHistoryPoint[] | null;
}

/** Rows read for one section: the tab's own page, the newest few on Overview, one row (just the count) elsewhere. */
function sizeFor(section: 'trades' | 'dividends' | 'prices', tab: HoldingTab): number {
  if (tab === section) return TAB_PAGE_SIZE;
  return tab === 'overview' ? OVERVIEW_SIZES[section] : 1;
}

/**
 * The holding and the sections of the tab being shown, one request pass per render. A holding the user has
 * never held is a 404; any other failure of the holding throws to the route's error state. The sections are
 * secondary: when one fails the page still shows the rest.
 */
export const loadHoldingPage = cache(async (instrumentId: string, tab: HoldingTab, page: number): Promise<HoldingPageData> => {
  const pageOf = (section: 'trades' | 'dividends' | 'prices') => (tab === section ? page : 0);
  const [holding, instrument, estimate, trades, dividends, corporateActions, prices, history] = await Promise.all([
    fetchHolding(instrumentId).catch(async (e: unknown) => {
      await signInIfSessionEnded(e);
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }),
    orNull(fetchInstrument(instrumentId)),
    orNull(fetchSellEstimate(instrumentId)),
    orNull(fetchInstrumentTrades(instrumentId, pageOf('trades'), sizeFor('trades', tab))),
    orNull(fetchInstrumentDividends(instrumentId, pageOf('dividends'), sizeFor('dividends', tab))),
    orNull(fetchInstrumentCorporateActions(instrumentId)),
    orNull(fetchPricesPage(instrumentId, pageOf('prices'), sizeFor('prices', tab))),
    tab === 'overview' ? orNull(fetchPriceHistory(instrumentId)) : Promise.resolve(null),
  ]);
  if (!holding) notFound();
  return { holding, instrument, estimate, trades, dividends, corporateActions, prices, history };
});
