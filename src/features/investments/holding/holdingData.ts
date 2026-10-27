import { notFound } from 'next/navigation';
import { cache } from 'react';

import { orNull, signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { ApiError } from '@/lib/api/client';
import type { HoldingDetail, SellEstimate } from '@/lib/investments.types';
import type { Instrument, PriceHistoryPoint } from '@/lib/types';

import { fetchHolding, fetchInstrument, fetchInstrumentCorporateActions, fetchPriceHistory, fetchSellEstimate } from '../investmentsServerApi';
import type { CorporateActionRowModel, DividendRowModel, HoldingSection, TradeRow } from './holdingModel';
import { corporateActionsPage, dividendsSection, tradesSection } from './holdingSections';
import { type PriceSplit, splitsOf } from './priceChart';

export interface HoldingPageData {
  holding: HoldingDetail;
  instrument: Instrument | null;
  /** The sell-all estimate; null when it could not be read. */
  estimate: SellEstimate | null;
  /** Page 0 of each list; null when it could not be read. */
  trades: HoldingSection<TradeRow> | null;
  dividends: HoldingSection<DividendRowModel> | null;
  corporateActions: HoldingSection<CorporateActionRowModel> | null;
  /** Every split and bonus, for the chart's adjusted prices; empty when the corporate actions could not be read. */
  splits: PriceSplit[];
  /** Every stored price, for the chart; null when it could not be read. */
  history: PriceHistoryPoint[] | null;
}

/**
 * The holding and the first page of each of its lists, one request pass per render. A holding the user has
 * never held is a 404; any other failure of the holding throws to the route's error state. The sections are
 * secondary: when one fails the page still shows the rest. Later pages come from holdingActions.
 */
export const loadHoldingPage = cache(async (instrumentId: string): Promise<HoldingPageData> => {
  const [holding, instrument, estimate, trades, dividends, actions, history] = await Promise.all([
    fetchHolding(instrumentId).catch(async (e: unknown) => {
      await signInIfSessionEnded(e);
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }),
    orNull(fetchInstrument(instrumentId)),
    orNull(fetchSellEstimate(instrumentId)),
    orNull(tradesSection(instrumentId, 0)),
    orNull(dividendsSection(instrumentId, 0)),
    orNull(fetchInstrumentCorporateActions(instrumentId)),
    orNull(fetchPriceHistory(instrumentId)),
  ]);
  if (!holding) notFound();
  return { holding, instrument, estimate, trades, dividends, corporateActions: actions && corporateActionsPage(actions, 0), splits: actions ? splitsOf(actions) : [], history };
});
