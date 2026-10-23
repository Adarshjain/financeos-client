import { formatDayMonth } from '@/features/accounts/list/accountsList';
import type { HoldingDetail, PricePoint, SellEstimate } from '@/lib/investments.types';
import type { CorporateAction, Dividend, Instrument, InvestmentTransactionResponse } from '@/lib/types';

import { ratioText } from '../corporate-actions/corporateActionRatio';
import { moveTone, plainPct, plainPrice, plainRupees, plainSignedRupees, quantity, rupees, shortDate, signedPct, signedRupees, TYPE_WORDS, unitPrice, unitWord } from '../investmentsFormat';
import { holdingHref } from '../investmentsTabs';

// ---- Tabs ----------------------------------------------------------------------

export type HoldingTab = 'overview' | 'trades' | 'dividends' | 'corporate-actions' | 'prices';

export const HOLDING_TABS: { id: HoldingTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'trades', label: 'Trades' },
  { id: 'dividends', label: 'Dividends' },
  { id: 'corporate-actions', label: 'Corporate actions' },
  { id: 'prices', label: 'Prices' },
];

export function parseHoldingTab(value: string | undefined): HoldingTab {
  return HOLDING_TABS.some((t) => t.id === value) ? (value as HoldingTab) : 'overview';
}

export function parsePage(value: string | undefined): number {
  const page = Math.floor(Number(value));
  return Number.isFinite(page) && page > 0 ? page : 0;
}

/** A holding's page on a tab: Overview is the plain address. */
export function holdingTabHref(instrumentId: string, tab: HoldingTab, page = 0): string {
  const query = new URLSearchParams();
  if (tab !== 'overview') query.set('tab', tab);
  if (page > 0) query.set('page', String(page));
  const text = query.toString();
  return text ? `${holdingHref(instrumentId)}?${text}` : holdingHref(instrumentId);
}

/** Rows per page on a tab's own list; Overview shows the newest of each section. */
export const TAB_PAGE_SIZE = 25;
export const OVERVIEW_SIZES = { trades: 10, dividends: 5, prices: 10 } as const;

// ---- Header ----------------------------------------------------------------------


const TERM_WORDS: Record<string, string> = {
  long: 'long term',
  short: 'short term',
  slab: 'taxed at slab rate',
  mixed: 'long and short term',
};

export interface HoldingHeaderModel {
  /** "INFY · Infosys", or the name alone. */
  title: string;
  badge: string;
  /** "NSE · INE009A01021 · 2 brokers · long term". */
  meta: string;
}

export function holdingHeader(holding: HoldingDetail, instrument: Instrument | null): HoldingHeaderModel {
  const title = holding.symbol && holding.symbol !== holding.name ? `${holding.symbol} · ${holding.name}` : holding.name;
  const brokers = holding.brokers.length;
  const parts = [
    [instrument?.exchange, instrument?.isin].filter(Boolean).join(' · '),
    brokers > 0 ? `${brokers} ${brokers === 1 ? 'broker' : 'brokers'}` : '',
    holding.term ? TERM_WORDS[holding.term] : '',
  ].filter(Boolean);
  return { title, badge: TYPE_WORDS[holding.assetType], meta: parts.join(' · ') };
}

export interface HoldingHeroModel {
  value: string;
  /** "+₹48,162 · +113% · today +2.1%". */
  line: { text: string; tone: 'positive' | 'danger' | undefined } | null;
}

export function holdingHero(holding: HoldingDetail): HoldingHeroModel {
  if (holding.noPrice) return { value: rupees(holding.currentValue), line: null };
  const parts = [signedRupees(holding.unrealised)];
  if (holding.unrealisedPct != null) parts.push(signedPct(holding.unrealisedPct));
  if (holding.dayChangePct != null && !holding.manualPrice) parts.push(`today ${signedPct(holding.dayChangePct)}`);
  return { value: rupees(holding.currentValue), line: { text: parts.join(' · '), tone: moveTone(holding.unrealised) } };
}

// ---- Figures ---------------------------------------------------------------------

export interface HoldingFigure {
  id: string;
  label: string;
  value: string;
  tone?: 'positive' | 'danger';
  context?: string;
  /** The LTP figure ends its line with an "override" link. */
  override?: boolean;
}

const SOURCE_WORDS: Record<string, string> = { YAHOO: 'Yahoo', AMFI: 'AMFI', MANUAL: 'manual price' };

export function sourceWord(source: string | null | undefined): string {
  if (!source) return '';
  return SOURCE_WORDS[source.toUpperCase()] ?? source;
}

/** The eight figures of the holding, in board order. `tradeCount` is the holding's trades in the tradebook. */
export function holdingFigures(holding: HoldingDetail, instrument: Instrument | null, tradeCount: number): HoldingFigure[] {
  const unit = unitWord(holding.assetType, holding.quantity);
  const source = holding.manualPrice ? 'manual price' : sourceWord(instrument?.lastPriceSource);
  const asOf = holding.priceAsOf ? formatDayMonth(holding.priceAsOf) : '';
  return [
    { id: 'quantity', label: 'Quantity', value: quantity(holding.quantity) },
    { id: 'avgCost', label: 'Avg cost', value: unitPrice(holding.avgCost) },
    {
      id: 'ltp',
      label: 'LTP',
      value: holding.ltp != null && !holding.noPrice ? unitPrice(holding.ltp) : '—',
      context: [source, asOf].filter(Boolean).join(' · ') || undefined,
      override: true,
    },
    {
      id: 'xirr',
      label: 'XIRR',
      value: holding.xirr == null ? '—' : plainPct(holding.xirr),
      tone: moveTone(holding.xirr),
      context: holding.firstBuyDate ? `since ${shortDate(holding.firstBuyDate)}` : undefined,
    },
    {
      id: 'invested',
      label: 'Invested',
      value: rupees(holding.invested),
      context: holding.quantity > 0 ? `${quantity(holding.quantity)} ${unit} at ${unitPrice(holding.avgCost).replace(/\.00$/, '')} avg` : undefined,
    },
    {
      id: 'return',
      label: '₹ return',
      value: holding.noPrice ? '—' : signedRupees(holding.unrealised),
      tone: holding.noPrice ? undefined : moveTone(holding.unrealised),
      context: holding.noPrice ? 'no price' : `unrealised${holding.unrealisedPct == null ? '' : ` · ${signedPct(holding.unrealisedPct)}`}`,
    },
    {
      id: 'realised',
      label: 'Realised P&L',
      value: Math.round(holding.realisedPnl) === 0 ? '₹0' : signedRupees(holding.realisedPnl),
      tone: moveTone(holding.realisedPnl),
      context: Math.round(holding.realisedPnl) === 0 ? 'nothing sold yet' : 'booked on sells',
    },
    {
      id: 'charges',
      label: 'Total charges',
      value: `₹${plainPrice(holding.totalCharges)}`,
      context: tradeCount > 0 ? `across ${tradeCount} ${tradeCount === 1 ? 'trade' : 'trades'}` : undefined,
    },
  ];
}

// ---- If you sell today ---------------------------------------------------------------

/** "Gain ₹48,162 · long term · tax ≈ ₹0 · ₹1,06,521 exemption left". */
export function sellLine(est: SellEstimate): string {
  if (est.noPrice) return 'No price to estimate with';
  const parts = [`${est.gain < 0 ? 'Loss' : 'Gain'} ${rupees(Math.abs(est.gain))}`];
  const longTerm = Math.round(est.longTermGain) !== 0;
  const shortTerm = Math.round(est.shortTermGain) !== 0;
  if (longTerm && shortTerm) parts.push('long and short term');
  else if (longTerm) parts.push('long term');
  else if (shortTerm) parts.push('short term');
  if (est.tax != null) parts.push(`tax ≈ ${rupees(est.tax)}`);
  if (est.exemptionLeftAfter != null) parts.push(`${rupees(est.exemptionLeftAfter)} exemption left`);
  return parts.join(' · ');
}

// ---- Rows --------------------------------------------------------------------------

export interface TradeRow {
  id: string;
  date: string;
  side: 'Buy' | 'Sell';
  broker: string;
  quantity: string;
  price: string;
  value: string;
  /** Sells only: "P&L +₹1,200". */
  pnl: { text: string; plain: string; tone: 'positive' | 'danger' | undefined } | null;
  /** The desktop columns carry no ₹. */
  pricePlain: string;
  valuePlain: string;
  phoneSub: string;
}

export function tradeRow(t: InvestmentTransactionResponse): TradeRow {
  const qty = Number(t.quantity);
  const price = Number(t.price);
  const side = t.type === 'sell' ? 'Sell' : 'Buy';
  const pnl = side === 'Sell' && t.realisedPnl != null ? { text: `P&L ${signedRupees(t.realisedPnl)}`, plain: `P&L ${plainSignedRupees(t.realisedPnl)}`, tone: moveTone(t.realisedPnl) } : null;
  const date = shortDate(t.tradeDate);
  return {
    id: t.id,
    date,
    side,
    broker: t.brokerName,
    quantity: quantity(qty),
    price: unitPrice(price),
    value: rupees(qty * price),
    pricePlain: plainPrice(price),
    valuePlain: plainRupees(qty * price),
    pnl,
    phoneSub: [date, `${quantity(qty)} @ ${unitPrice(price).replace(/\.00$/, '')}`, pnl?.text].filter(Boolean).join(' · '),
  };
}

export interface DividendRowModel {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
}

const DIVIDEND_WORDS: Record<string, string> = { dividend: 'Dividend', interest: 'Interest', other: 'Other income' };

export function dividendRow(d: Dividend): DividendRowModel {
  const perUnit = d.perUnit != null ? Number(d.perUnit) : null;
  const word = DIVIDEND_WORDS[d.type] ?? 'Dividend';
  const tds = d.tds != null && Number(d.tds) > 0 ? Number(d.tds) : null;
  const subtitle = [
    d.exDate ? `ex ${shortDate(d.exDate)}` : '',
    `paid ${shortDate(d.payDate)}`,
    tds != null ? `TDS ${rupees(tds)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: d.id,
    title: perUnit != null ? `${word} ${unitPrice(perUnit).replace(/\.00$/, '')} / share` : word,
    subtitle,
    amount: `+${rupees(Number(d.amount))}`,
  };
}

export interface CorporateActionRowModel {
  id: string;
  title: string;
  subtitle: string;
}

const ACTION_WORDS: Record<string, string> = { split: 'Split', bonus: 'Bonus', demerger: 'Demerger', merger: 'Merger' };

export function corporateActionRow(a: CorporateAction): CorporateActionRowModel {
  const kind = String(a.type ?? a.actionType ?? '').toLowerCase();
  const text = ratioText(kind, a.ratioFrom ?? null, a.ratioTo ?? null, true);
  const ratio = text ? ` ${text}` : '';
  const target = a.targetInstrumentName ? `into ${a.targetInstrumentName}` : '';
  return {
    id: a.id,
    title: `${ACTION_WORDS[kind] ?? kind}${ratio}`,
    subtitle: [a.exDate ? `ex ${shortDate(a.exDate)}` : '', target, a.notes ?? ''].filter(Boolean).join(' · '),
  };
}

export interface PriceRowModel {
  id: string | null;
  asOf: string;
  date: string;
  source: string;
  amount: string;
  /** The raw price, for the edit field. */
  close: number;
  editable: boolean;
}

export function priceRow(p: PricePoint): PriceRowModel {
  return {
    id: p.id,
    asOf: p.asOf,
    date: shortDate(p.asOf),
    source: sourceWord(p.source),
    amount: unitPrice(p.close),
    close: p.close,
    editable: p.editable && Boolean(p.id),
  };
}

export interface InstrumentRow {
  label: string;
  value: string;
}

/** ISIN, Yahoo symbol, price source, overrides: the rows of the Instrument card. */
export function instrumentRows(instrument: Instrument): InstrumentRow[] {
  const rows: InstrumentRow[] = [];
  if (instrument.isin) rows.push({ label: 'ISIN', value: instrument.isin });
  if (instrument.yahooSymbol) rows.push({ label: 'Yahoo symbol', value: instrument.yahooSymbol });
  if (instrument.amfiCode) rows.push({ label: 'AMFI code', value: instrument.amfiCode });
  rows.push({ label: 'Price source', value: sourceWord(instrument.lastPriceSource) || '—' });
  rows.push({ label: 'Overrides', value: instrument.overriddenFields && instrument.overriddenFields.length > 0 ? instrument.overriddenFields.join(', ') : 'none' });
  return rows;
}

/** Whole rupees for the delete confirmation: "₹1,470.00 on 10 Oct 26". */
export function priceDescription(row: PriceRowModel): string {
  return `${row.amount} on ${row.date}`;
}
