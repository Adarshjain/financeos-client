'use server';

import { createDomainAction } from '@/lib/domainApi';

import type { CorporateActionRowModel, DividendRowModel, HoldingSection, PriceRowModel, TradeRow } from './holdingModel';
import { corporateActionsSection, dividendsSection, pricesSection, tradesSection } from './holdingSections';

/** Page `page` of a holding's trades, for the Trades card's pager. */
export const loadTradesPage = createDomainAction(
  { fallbackError: "Couldn't load the trades. Try again." },
  async (instrumentId: string, page: number): Promise<HoldingSection<TradeRow>> => tradesSection(instrumentId, page),
);

export const loadDividendsPage = createDomainAction(
  { fallbackError: "Couldn't load the dividends. Try again." },
  async (instrumentId: string, page: number): Promise<HoldingSection<DividendRowModel>> => dividendsSection(instrumentId, page),
);

export const loadCorporateActionsPage = createDomainAction(
  { fallbackError: "Couldn't load the corporate actions. Try again." },
  async (instrumentId: string, page: number): Promise<HoldingSection<CorporateActionRowModel>> => corporateActionsSection(instrumentId, page),
);

/** Page `page` of the price history, for the Price history dialog (read when it opens, then per page). */
export const loadPricesPage = createDomainAction(
  { fallbackError: "Couldn't load the price history. Try again." },
  async (instrumentId: string, page: number): Promise<HoldingSection<PriceRowModel>> => pricesSection(instrumentId, page),
);
