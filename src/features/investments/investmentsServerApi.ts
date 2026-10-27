import type { Account, Broker } from '@/lib/account.types';
import { accountsApi, corporateActionsApi, dividendsApi, instrumentsApi, investmentsApi } from '@/lib/apiClient';
import type {
  HoldingDetail,
  HoldingsQuery,
  HoldingsResponse,
  PricePage,
  SellEstimate,
} from '@/lib/investments.types';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import type { CorporateAction, Instrument, PagedDividendResponse, PagedInvestmentTransactionResponse,PriceHistoryPoint } from '@/lib/types';
import { AccountType } from '@/lib/types';

// The fetch helpers of the Investments pages. The pages import these (never apiClient directly), so a
// test replaces one module.

export function fetchHoldings(query: HoldingsQuery): Promise<HoldingsResponse> {
  return investmentsApi.getHoldings(query);
}

export function fetchHolding(instrumentId: string): Promise<HoldingDetail> {
  return investmentsApi.getHolding(instrumentId);
}

export function fetchSellEstimate(instrumentId: string, quantity?: number): Promise<SellEstimate> {
  return investmentsApi.getSellEstimate(instrumentId, quantity);
}

export function fetchTaxHarvest(size: number): Promise<TaxHarvestResponse> {
  return investmentsApi.getTaxHarvest({ page: 0, size });
}

export function fetchInstrument(instrumentId: string): Promise<Instrument> {
  return investmentsApi.getInstrument(instrumentId);
}

export function fetchPricesPage(instrumentId: string, page: number, size: number): Promise<PricePage> {
  return instrumentsApi.pricesPage(instrumentId, { page, size });
}

/** Every stored price of the instrument, for the chart. */
export function fetchPriceHistory(instrumentId: string): Promise<PriceHistoryPoint[]> {
  return instrumentsApi.getPriceHistory(instrumentId);
}

export function fetchInstrumentTrades(instrumentId: string, page: number, size: number): Promise<PagedInvestmentTransactionResponse> {
  return investmentsApi.getTrades({ instrumentId, page, size, sort: 'tradeDate,desc' });
}

export function fetchInstrumentDividends(instrumentId: string, page: number, size: number): Promise<PagedDividendResponse> {
  return dividendsApi.list({ instrumentId, page, size });
}

export function fetchInstrumentCorporateActions(instrumentId: string): Promise<CorporateAction[]> {
  return corporateActionsApi.list(instrumentId);
}

/** The broker accounts, for the Broker filter. */
export async function fetchBrokers(): Promise<Broker[]> {
  const accounts: Account[] = await accountsApi.list();
  return accounts.filter((a): a is Broker => a.type === AccountType.BROKER);
}
