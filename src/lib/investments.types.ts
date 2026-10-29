// Response shapes of the Investments endpoints added for the Dinero Investments pages
// (HoldingsService, SellEstimateResponse, dividend / F&O reports, corporate-action page, price history page).
// Field names follow the server DTOs in financeos-server (api/investment/dto, api/instrument/dto).

import type { Page } from '@/lib/pagination';
import type { FnoTradeResponse, InstrumentType } from '@/lib/types';

/** The server's own page envelope of the newer endpoints (`items`, not Spring's `content`). */
export interface ItemsPage<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Where a paged list stands: the current page, its size and the totals. */
export interface PagePosition {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---- Holdings ----------------------------------------------------------------

export type HoldingsSort = 'name' | 'return_pct' | 'return_abs';

/** Sort direction of the holdings list; without it each key keeps its default (name A to Z, returns high to low). */
export type HoldingsSortDir = 'asc' | 'desc';

export interface HoldingsQuery {
  brokerAccountId?: string;
  assetType?: InstrumentType;
  search?: string;
  sort?: HoldingsSort;
  dir?: HoldingsSortDir;
  page?: number;
  size?: number;
}

/** Totals over the whole filtered set (all pages). `xirr` is a percent. */
export interface HoldingsHeader {
  currentValue: number;
  dayChange: number | null;
  dayChangePct: number | null;
  invested: number;
  unrealised: number;
  unrealisedPct: number | null;
  xirr: number | null;
  priceAsOf: string | null;
  /** When the newest price was struck (ISO, +05:30); null for date-only prices. */
  priceAt?: string | null;
}

export interface HoldingsGroup {
  assetType: InstrumentType;
  value: number;
  count: number;
}

export interface HoldingRow {
  instrumentId: string;
  symbol: string | null;
  name: string;
  assetType: InstrumentType;
  quantity: number;
  avgCost: number;
  ltp: number | null;
  priceAsOf: string | null;
  /** When the price was struck (ISO, +05:30); null for date-only prices (AMFI, manual). */
  priceAt?: string | null;
  /** ltp is the user's own price. */
  manualPrice: boolean;
  /** An open holding without any price: valued at cost. */
  noPrice: boolean;
  currentValue: number;
  invested: number;
  unrealised: number;
  unrealisedPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  /** How many broker accounts hold it. */
  brokerCount: number;
  mergedIntoName: string | null;
  mergedIntoDate: string | null;
}

export interface HoldingsResponse {
  header: HoldingsHeader;
  groups: HoldingsGroup[];
  holdings: HoldingRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  /** Up to three biggest day moves over the whole filtered set, biggest first. */
  movers: HoldingsMover[];
  /** Groups for the broker filter alone (the type filter is not applied). */
  portfolioGroups: HoldingsGroup[];
}

export interface HoldingsMover {
  instrumentId: string;
  symbol: string | null;
  name: string;
  dayChange: number;
}

export type HoldingTerm = 'long' | 'short' | 'slab' | 'mixed';

export interface HoldingBroker {
  brokerAccountId: string;
  accountName: string;
  quantity: number;
  avgCost: number;
  currentValue: number;
}

export type HoldingDetail = Omit<HoldingRow, 'brokerCount'> & {
  realisedPnl: number;
  totalCharges: number;
  dividends: number;
  xirr: number | null;
  firstBuyDate: string | null;
  term: HoldingTerm | null;
  brokers: HoldingBroker[];
};

export interface SellEstimateLot {
  buyDate: string;
  quantity: number;
  costPerUnit: number;
  cost: number;
  proceeds: number;
  gain: number;
  term: string;
}

export interface SellEstimate {
  instrumentId: string;
  quantity: number;
  price: number | null;
  noPrice: boolean;
  proceeds: number;
  cost: number;
  gain: number;
  longTermGain: number;
  shortTermGain: number;
  equity: boolean;
  fy: number;
  stcgRate: number | null;
  ltcgRate: number | null;
  stcgTax: number | null;
  ltcgTax: number | null;
  tax: number | null;
  exemptionLeftBefore: number | null;
  exemptionLeftAfter: number | null;
  /** Equity only (null otherwise, and on an older server): the FY's booked gains the sale is set off against. */
  bookedShortTermGain?: number | null;
  bookedEquityLongTermGain?: number | null;
  bookedOtherLongTermGain?: number | null;
  exemptionLimit?: number | null;
  lots: SellEstimateLot[];
}

// ---- Tradebook ----------------------------------------------------------------

export interface TradesQuery {
  page?: number;
  size?: number;
  sort?: string;
  brokerAccountId?: string;
  instrumentId?: string;
  holdingId?: string;
  search?: string;
  type?: 'buy' | 'sell';
  fy?: number;
}

// ---- Dividends ----------------------------------------------------------------

export type DividendReceiptFilter =
  | 'received'
  | 'received_untracked'
  | 'not_received'
  | 'awaiting'
  | 'overdue'
  | 'unverifiable';

export interface DividendFilters {
  holdingId?: string;
  brokerAccountId?: string;
  instrumentId?: string;
  type?: 'dividend' | 'interest' | 'other';
  from?: string;
  to?: string;
  fy?: number;
  receipt?: DividendReceiptFilter;
}

export interface DividendInstrumentTotal {
  instrumentId: string;
  instrumentName: string;
  symbol: string | null;
  gross: number;
  tds: number;
  net: number;
  payouts: number;
}

/** A CSV the server built, with the file name it suggested. */
export interface CsvDownload {
  csv: string;
  filename: string;
}

// ---- F&O ---------------------------------------------------------------------

export type FnoSort = 'newest' | 'oldest' | 'pnl_desc' | 'pnl_asc';

export interface FnoPageQuery {
  page?: number;
  size?: number;
  fy?: number;
  optionType?: 'CE' | 'PE' | 'FUT' | 'OPT';
  brokerAccountId?: string;
  underlying?: string;
  /** Case-insensitive contains over trading symbol, underlying and notes. */
  search?: string;
  sort?: FnoSort;
}

export interface FnoMonthPnl {
  month: string;
  pnl: number;
}

export interface FnoUnderlyingPnl {
  underlying: string;
  pnl: number;
  trades: number;
}

export interface FnoSummary {
  fy: number;
  fromDate: string;
  toDate: string;
  realisedPnl: number;
  tradeCount: number;
  winRate: number;
  winCount: number;
  totalCharges: number;
  byMonth: FnoMonthPnl[];
  byUnderlying: FnoUnderlyingPnl[];
}

// ---- Corporate actions ----------------------------------------------------------

/** The kinds the corporate-actions page filters and returns. */
export type CorporateActionKind = 'split' | 'bonus' | 'demerger' | 'merger';

export type CorporateActionSort = 'newest' | 'oldest' | 'name';

export interface CorporateActionPageQuery {
  type?: CorporateActionKind;
  search?: string;
  sort?: CorporateActionSort;
  page?: number;
  size?: number;
}

export interface CorporateActionItem {
  id: string;
  instrumentId: string;
  instrumentName: string;
  instrumentSymbol: string | null;
  type: CorporateActionKind;
  ratioFrom: number | null;
  ratioTo: number | null;
  exDate: string;
  notes: string | null;
  targetInstrumentId: string | null;
  targetInstrumentName: string | null;
  targetInstrumentSymbol: string | null;
  costAllocationPct: number | null;
  fractionalCashInLieu: number | null;
  createdAt: string;
  quantityBefore: number | null;
  quantityAfter: number | null;
  /** Cost per share before and after the action; null when the holding is not open. */
  costPerUnitBefore: number | null;
  costPerUnitAfter: number | null;
}

export interface CorporateActionPreviewHolding {
  brokerAccountId: string;
  brokerAccountName: string;
  quantityBefore: number;
  quantityAfter: number;
  avgCostBefore: number;
  avgCostAfter: number;
  openCostBefore: number;
  openCostAfter: number;
  childInstrumentId: string | null;
  childQuantity: number | null;
  childCost: number | null;
  fractionalRealized: number | null;
}

export interface CorporateActionPreview {
  holdings: CorporateActionPreviewHolding[];
}

// ---- Instruments and prices -------------------------------------------------------

export interface InstrumentPageQuery {
  search?: string;
  type?: InstrumentType;
  sort?: 'name,desc';
  /** Only instruments whose last price is stale. */
  stale?: boolean;
  /** true = held by the user, false = not held. */
  held?: boolean;
  page?: number;
  size?: number;
}

export interface PricePoint {
  id: string | null;
  asOf: string;
  close: number;
  source: string;
  /** When the price was struck (ISO, +05:30); null for date-only prices. */
  priceAt?: string | null;
  /** True only for the signed-in user's own manual prices. */
  editable: boolean;
}

export type PricePage = ItemsPage<PricePoint>;

/** One Spring page of F&O trades (`GET /investments/fno/page`). */
export type PageFnoTrades = Page<FnoTradeResponse>;
