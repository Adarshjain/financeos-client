import { ratioText } from '@/features/investments/corporate-actions/corporateActionRatioModel';
import { moveTone, priceTimeLabel, unitWord } from '@/features/investments/investmentsFormatModel';
import { formatDate, formatMoney, formatPercent, formatQuantity, formatTime } from '@/lib/format';
import type { HoldingDetail, PagePosition, PricePoint, SellEstimate } from '@/lib/investments.types';
import type { CorporateAction, Dividend, Instrument, InvestmentTransactionResponse } from '@/lib/types';

// ---- Sections ------------------------------------------------------------------

/** Rows per page of each list on the holding page (Trades, Dividends, Corporate actions, Price history). */
export const SECTION_PAGE_SIZE = 10;

/** One page of a section's rows and where it stands; the server builds it, the card pages through it. */
export interface HoldingSection<R> {
  rows: R[];
  position: PagePosition;
}

// ---- Header ----------------------------------------------------------------------

export interface HoldingHeaderModel {
  /** "INFY · Infosys", or the name alone. */
  title: string;
}

export function holdingHeader(holding: HoldingDetail): HoldingHeaderModel {
  const title = holding.symbol && holding.symbol !== holding.name ? `${holding.symbol} · ${holding.name}` : holding.name;
  return { title };
}

export interface HoldingHeroModel {
  value: string;
  /** "+₹1,240 today · +2.1%"; null when the price did not move or is a manual one. */
  line: { text: string; tone: 'positive' | 'danger' | undefined } | null;
}

export function holdingHero(holding: HoldingDetail): HoldingHeroModel {
  const value = formatMoney(holding.currentValue);
  if (holding.noPrice || holding.manualPrice || (holding.dayChange == null && holding.dayChangePct == null)) return { value, line: null };
  const parts: string[] = [];
  if (holding.dayChange != null) parts.push(`${formatMoney(holding.dayChange, { sign: 'always' })} today`);
  if (holding.dayChangePct != null) parts.push(holding.dayChange == null ? `today ${formatPercent(holding.dayChangePct, { sign: 'always' })}` : formatPercent(holding.dayChangePct, { sign: 'always' }));
  return { value, line: { text: parts.join(' · '), tone: moveTone(holding.dayChange ?? holding.dayChangePct) } };
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

/** The three figures the hero shows under the value; the other five are the Position card's rows. */
export const HERO_FIGURE_IDS: readonly string[] = ['invested', 'return', 'xirr'];

/** The eight figures of the holding, in board order. `tradeCount` is the holding's trades in the tradebook. */
export function holdingFigures(holding: HoldingDetail, instrument: Instrument | null, tradeCount: number, now: Date = new Date()): HoldingFigure[] {
  const unit = unitWord(holding.assetType, holding.quantity);
  const source = holding.manualPrice ? 'manual price' : sourceWord(instrument?.lastPriceSource);
  const day = holding.priceAsOf ? formatDate(holding.priceAsOf, 'list') : '';
  const timed = holding.manualPrice || !day ? '' : priceTimeLabel(day, holding.priceAt, now);
  const asOf = timed || (day ? [day, formatTime(holding.priceAt)].filter(Boolean).join(', ') : '');
  return [
    { id: 'quantity', label: 'Quantity', value: formatQuantity(holding.quantity) },
    { id: 'avgCost', label: 'Avg cost', value: formatMoney(holding.avgCost, { decimals: 'exact' }) },
    {
      id: 'ltp',
      label: 'LTP',
      value: holding.ltp != null && !holding.noPrice ? formatMoney(holding.ltp, { decimals: 'exact' }) : '—',
      context: (timed ? [asOf] : [source, asOf]).filter(Boolean).join(' · ') || undefined,
      override: true,
    },
    {
      id: 'xirr',
      label: 'XIRR',
      value: holding.xirr == null ? '—' : formatPercent(holding.xirr),
      tone: moveTone(holding.xirr),
      context: holding.firstBuyDate ? `since ${formatDate(holding.firstBuyDate, 'list')}` : undefined,
    },
    {
      id: 'invested',
      label: 'Invested',
      value: formatMoney(holding.invested),
      context: holding.quantity > 0 ? `${formatQuantity(holding.quantity)} ${unit} at ${formatMoney(holding.avgCost, { decimals: 'exact' })} avg` : undefined,
    },
    {
      id: 'return',
      label: '₹ return',
      value: holding.noPrice ? '—' : formatMoney(holding.unrealised, { sign: 'always' }),
      tone: holding.noPrice ? undefined : moveTone(holding.unrealised),
      context: holding.noPrice ? 'no price' : `unrealised${holding.unrealisedPct == null ? '' : ` · ${formatPercent(holding.unrealisedPct, { sign: 'always' })}`}`,
    },
    {
      id: 'realised',
      label: 'Realised P&L',
      value: formatMoney(holding.realisedPnl, { sign: 'always' }),
      tone: moveTone(holding.realisedPnl),
      context: Math.round(holding.realisedPnl) === 0 ? 'nothing sold yet' : 'booked on sells',
    },
    {
      id: 'charges',
      label: 'Total charges',
      value: formatMoney(holding.totalCharges, { decimals: 'exact' }),
      context: tradeCount > 0 ? `across ${tradeCount} ${tradeCount === 1 ? 'trade' : 'trades'}` : undefined,
    },
  ];
}

// ---- If you sell today ---------------------------------------------------------------

/** "Gain ₹48,162 · long term · tax ≈ ₹0 · ₹1,06,521 exemption left". */
export function sellLine(est: SellEstimate): string {
  if (est.noPrice) return 'No price to estimate with';
  const parts = [`${est.gain < 0 ? 'Loss' : 'Gain'} ${formatMoney(Math.abs(est.gain))}`];
  const longTerm = Math.round(est.longTermGain) !== 0;
  const shortTerm = Math.round(est.shortTermGain) !== 0;
  if (longTerm && shortTerm) parts.push('long and short term');
  else if (longTerm) parts.push('long term');
  else if (shortTerm) parts.push('short term');
  if (est.tax != null) parts.push(`tax ≈ ${formatMoney(est.tax)}`);
  if (est.exemptionLeftAfter != null) parts.push(`${formatMoney(est.exemptionLeftAfter)} exemption left`);
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
  const pnl = side === 'Sell' && t.realisedPnl != null ? { text: `P&L ${formatMoney(t.realisedPnl, { sign: 'always' })}`, plain: `P&L ${formatMoney(t.realisedPnl, { sign: 'always', symbol: false })}`, tone: moveTone(t.realisedPnl) } : null;
  const date = formatDate(t.tradeDate, 'list');
  return {
    id: t.id,
    date,
    side,
    broker: t.brokerName,
    quantity: formatQuantity(qty),
    price: formatMoney(price, { decimals: 'exact' }),
    value: formatMoney(qty * price),
    pricePlain: formatMoney(price, { decimals: 'exact', symbol: false }),
    valuePlain: formatMoney(qty * price, { symbol: false }),
    pnl,
    phoneSub: [date, `${formatQuantity(qty)} @ ${formatMoney(price, { decimals: 'exact' })}`, pnl?.text].filter(Boolean).join(' · '),
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
    d.exDate ? `ex ${formatDate(d.exDate, 'list')}` : '',
    `paid ${formatDate(d.payDate, 'list')}`,
    tds != null ? `TDS ${formatMoney(tds, { decimals: 'exact' })}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: d.id,
    title: perUnit != null ? `${word} ${formatMoney(perUnit, { decimals: 'exact' })} / share` : word,
    subtitle,
    amount: `+${formatMoney(Number(d.amount), { decimals: 'exact' })}`,
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
    subtitle: [a.exDate ? `ex ${formatDate(a.exDate, 'list')}` : '', target, a.notes ?? ''].filter(Boolean).join(' · '),
  };
}

export interface PriceRowModel {
  id: string | null;
  asOf: string;
  date: string;
  /** "15:30" IST when the price has a time, else ''. */
  time: string;
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
    date: formatDate(p.asOf, 'list'),
    time: formatTime(p.priceAt),
    source: sourceWord(p.source),
    amount: formatMoney(p.close, { decimals: 'exact' }),
    close: p.close,
    editable: p.editable && Boolean(p.id),
  };
}

export interface InstrumentRow {
  label: string;
  value: string;
}

/** Exchange, ISIN, Yahoo symbol, price source, overrides: the rows of the Instrument card. */
export function instrumentRows(instrument: Instrument): InstrumentRow[] {
  const rows: InstrumentRow[] = [];
  if (instrument.exchange) rows.push({ label: 'Exchange', value: instrument.exchange });
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
