import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { fyStartYear } from '@/features/loans/detail/financialYear';
import { DS_PREFIX } from '@/features/shell/routes';
import { todayInAppZone } from '@/lib/date-range';
import type { TradesQuery } from '@/lib/investments.types';
import type { JobResponse } from '@/lib/jobs.types';
import type { ImportCommitResult, InvestmentTransactionResponse } from '@/lib/types';

import { fyLabel, moveTone, plainPrice, plainRupees, quantity, shortDate, signedRupees, unitPrice } from '../investmentsFormat';

/** The Tradebook page's own address (always the Dinero route, whatever the tab links point at). */
export const TRADEBOOK_HREF = `${DS_PREFIX}/investments/tradebook`;

// ---- URL state ---------------------------------------------------------------

export const TRADEBOOK_SIZE_OPTIONS = [25, 50, 100];
export const TRADEBOOK_DEFAULT_SIZE = 25;
/** Newest trade first. */
export const TRADEBOOK_SORT = 'tradeDate,desc';

export type TradeSide = 'buy' | 'sell';

export interface TradebookUrlState {
  q: string;
  /** A broker account id; '' = every broker. */
  broker: string;
  /** '' = both sides. */
  type: TradeSide | '';
  /** The financial year's starting year (2026 = FY 26-27); null = every year (`fy=all`). The current FY when the address has none. */
  fy: number | null;
  page: number;
  size: number;
}

/** The financial year the business date is in (start year). */
export function currentFy(): number {
  return fyStartYear(todayInAppZone());
}

export function parseTradebookUrl(params: {
  q?: string;
  broker?: string;
  type?: string;
  fy?: string;
  page?: string;
  size?: string;
}): TradebookUrlState {
  const page = Math.floor(Number(params.page));
  const size = Number(params.size);
  const fy = Math.floor(Number(params.fy));
  return {
    q: (params.q ?? '').trim(),
    broker: (params.broker ?? '').trim(),
    type: params.type === 'buy' || params.type === 'sell' ? params.type : '',
    fy: params.fy === 'all' ? null : Number.isFinite(fy) && fy >= 1990 && fy <= 2200 ? fy : currentFy(),
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: TRADEBOOK_SIZE_OPTIONS.includes(size) ? size : TRADEBOOK_DEFAULT_SIZE,
  };
}

/** The Tradebook URL for a state: defaults stay out of the query string. */
export function tradebookUrl(state: TradebookUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.broker) query.set('broker', state.broker);
  if (state.type) query.set('type', state.type);
  if (state.fy == null) query.set('fy', 'all');
  else if (state.fy !== currentFy()) query.set('fy', String(state.fy));
  if (state.page > 0) query.set('page', String(state.page));
  if (state.size !== TRADEBOOK_DEFAULT_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${TRADEBOOK_HREF}?${text}` : TRADEBOOK_HREF;
}

/** The trades request for a state. */
export function tradebookQuery(state: TradebookUrlState): TradesQuery {
  return {
    search: state.q || undefined,
    brokerAccountId: state.broker || undefined,
    type: state.type || undefined,
    fy: state.fy ?? undefined,
    sort: TRADEBOOK_SORT,
    page: state.page,
    size: state.size,
  };
}

export function isTradebookFiltered(state: TradebookUrlState): boolean {
  return state.q !== '' || state.broker !== '' || state.type !== '' || state.fy !== currentFy();
}

/** The FY dropdown: every year, then the current FY and the seven before it. The selected year stays listed. */
export function fyOptions(today: string, selected: number | null): { value: string; label: string }[] {
  const current = fyStartYear(today);
  const years = Array.from({ length: 8 }, (_, i) => current - i);
  if (selected != null && !years.includes(selected)) years.push(selected);
  return [{ value: '', label: 'All years' }, ...years.map((y) => ({ value: String(y), label: fyLabel(y) }))];
}

// ---- Rows --------------------------------------------------------------------

type Tone = 'positive' | 'danger' | undefined;

export interface TradebookRow {
  id: string;
  raw: InvestmentTransactionResponse;
  /** "5 Oct 26". */
  date: string;
  /** The symbol, or the name when the instrument has none (funds). */
  title: string;
  broker: string;
  side: 'Buy' | 'Sell';
  /** "Delivery" or "Intraday"; "—" for a fund. */
  settlement: string;
  quantity: string;
  pricePlain: string;
  /** Without the ₹ (desktop column). */
  valuePlain: string;
  /** With the ₹ (phone). */
  value: string;
  chargesPlain: string;
  /** "5 Oct", "55.98 units @ ₹89.32", realised, settlement: the phone's second line, in parts. */
  sub: { date: string; position: string; realised: { text: string; tone: Tone } | null; settlement: string | null };
}

/** "89.32" or "710": a unit price with no trailing ".00". */
function looseUnitPrice(price: number): string {
  return unitPrice(price).replace(/\.00$/, '');
}

export function tradebookRow(t: InvestmentTransactionResponse): TradebookRow {
  const qty = Number(t.quantity);
  const price = Number(t.price);
  const fund = t.instrument.type === 'mutual_fund';
  const side = t.type === 'sell' ? 'Sell' : 'Buy';
  const settlement = fund ? '—' : t.settlementType === 'intraday' ? 'Intraday' : 'Delivery';
  const charges = Number(t.totalCharges ?? 0);
  const realised = side === 'Sell' && t.realisedPnl != null ? t.realisedPnl : null;
  return {
    id: t.id,
    raw: t,
    date: shortDate(t.tradeDate),
    title: t.instrument.symbol || t.instrument.name,
    broker: t.brokerName,
    side,
    settlement,
    quantity: quantity(qty),
    pricePlain: plainPrice(price),
    valuePlain: plainRupees(qty * price),
    value: `₹${plainRupees(qty * price)}`,
    chargesPlain: charges > 0 ? plainPrice(charges) : '0',
    sub: {
      date: formatDayMonth(t.tradeDate),
      position: `${quantity(qty)}${fund ? ' units' : ''} @ ${looseUnitPrice(price)}`,
      realised: realised == null ? null : { text: `realised ${signedRupees(realised)}`, tone: moveTone(realised) },
      settlement: fund ? null : settlement.toLowerCase(),
    },
  };
}

/** What the phone's second line says as plain text (tests, and the confirm dialog's name). */
export function subLineText(row: TradebookRow): string {
  const { date, position, realised, settlement } = row.sub;
  return [date, position, realised?.text, settlement].filter(Boolean).join(' · ');
}

/** "TATAMOTORS · 1 Oct 26 sell": what the delete confirmation names. */
export function tradeLabel(t: InvestmentTransactionResponse): string {
  return `${t.instrument.symbol || t.instrument.name} · ${shortDate(t.tradeDate)} ${t.type}`;
}

// ---- Last import / last reconcile line ---------------------------------------------

export interface TradebookJobLine {
  /** "Last import 13 Oct, 11:02 · 14 trades". */
  text: string;
  jobId: string;
}

/** "13 Oct, 11:02" in the app's zone (24-hour). */
export function jobTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month')}, ${get('hour')}:${get('minute')}`;
}

/** The line for the newest job of a kind; null when none ran. The trade count shows for a finished import. */
export function jobLine(label: string, job: JobResponse | null, withCount: boolean): TradebookJobLine | null {
  if (!job) return null;
  const at = jobTime(job.finishedAt ?? job.createdAt);
  const committed = withCount && job.status === 'SUCCEEDED' ? (job.result as ImportCommitResult | null | undefined)?.committed : undefined;
  const text = [`${label} ${at}`.trim(), committed != null ? `${committed} ${committed === 1 ? 'trade' : 'trades'}` : null]
    .filter(Boolean)
    .join(' · ');
  return { text, jobId: job.id };
}

// ---- The record / edit form ----------------------------------------------------------

export const CHARGE_FIELDS = [
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'stt', label: 'STT' },
  { key: 'exchangeTxnCharges', label: 'Exchange txn charges' },
  { key: 'sebiCharges', label: 'SEBI charges' },
  { key: 'stampDuty', label: 'Stamp duty' },
  { key: 'gst', label: 'GST' },
  { key: 'dpCharges', label: 'DP charges' },
  { key: 'otherCharges', label: 'Other' },
] as const;

export type ChargeKey = (typeof CHARGE_FIELDS)[number]['key'];
export type ChargeTexts = Record<ChargeKey, string>;

export const EMPTY_CHARGES: ChargeTexts = {
  brokerage: '',
  stt: '',
  exchangeTxnCharges: '',
  sebiCharges: '',
  stampDuty: '',
  gst: '',
  dpCharges: '',
  otherCharges: '',
};

/** A stored amount as field text: "35.50" for 35.5, "" for none. */
function fieldText(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

export function chargeTextsOf(t: InvestmentTransactionResponse): ChargeTexts {
  return {
    brokerage: fieldText(t.brokerage),
    stt: fieldText(t.stt),
    exchangeTxnCharges: fieldText(t.exchangeTxnCharges),
    sebiCharges: fieldText(t.sebiCharges),
    stampDuty: fieldText(t.stampDuty),
    gst: fieldText(t.gst),
    dpCharges: fieldText(t.dpCharges),
    otherCharges: fieldText(t.otherCharges),
  };
}

/** The price as field text, keeping every decimal the server has ("89.3214"), at least two. */
export function priceText(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(Math.max(2, (String(n).split('.')[1] ?? '').length));
}

/** The quantity as field text without a trailing ".0000" ("55.98", "50"). */
export function quantityText(value: string | number): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Number(n.toFixed(4))) : '';
}

const num = (text: string): number => {
  const n = Number(text.replace(/,/g, ''));
  return text.trim() !== '' && Number.isFinite(n) ? n : 0;
};

export function chargesTotal(charges: ChargeTexts): number {
  return CHARGE_FIELDS.reduce((sum, f) => sum + num(charges[f.key]), 0);
}

export interface TradeTotals {
  value: number;
  charges: number;
  /** Buy: value plus charges. Sell: value less charges, never below zero. */
  total: number;
}

export function tradeTotals(side: TradeSide, qtyText: string, priceTextValue: string, charges: ChargeTexts): TradeTotals {
  const value = num(qtyText) * num(priceTextValue);
  const total = chargesTotal(charges);
  return { value, charges: total, total: side === 'buy' ? value + total : Math.max(0, value - total) };
}

/** "₹30,254" for a whole amount, "₹35,457.90" when it has paise: the form's summary figures. */
export function exactRupees(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const hasPaise = Math.round(rounded * 100) % 100 !== 0;
  return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export interface TradeFormInput {
  side: TradeSide;
  quantity: string;
  price: string;
  date: string;
  notes: string;
  charges: ChargeTexts;
}

export interface TradeFormErrors {
  quantity?: string;
  price?: string;
  date?: string;
}

/** What Legacy refused: no quantity, a negative price, no date. */
export function validateTrade(input: Pick<TradeFormInput, 'quantity' | 'price' | 'date'>): TradeFormErrors {
  const errors: TradeFormErrors = {};
  const qty = Number(input.quantity.replace(/,/g, ''));
  if (input.quantity.trim() === '' || !Number.isFinite(qty) || qty <= 0) errors.quantity = 'Quantity must be above zero';
  const price = Number(input.price.replace(/,/g, ''));
  if (input.price.trim() === '' || !Number.isFinite(price) || price < 0) errors.price = 'Enter the price per unit';
  if (!input.date) errors.date = 'Trade date is required';
  return errors;
}

/** A new trade's charges: every item, empty ones as zero. */
export function allCharges(charges: ChargeTexts): Record<ChargeKey, number> {
  return Object.fromEntries(CHARGE_FIELDS.map((f) => [f.key, num(charges[f.key])])) as Record<ChargeKey, number>;
}

/** An edited trade's charges: only the items that have a figure (the server keeps the rest). */
export function filledCharges(charges: ChargeTexts): Partial<Record<ChargeKey, number>> {
  const out: Partial<Record<ChargeKey, number>> = {};
  for (const f of CHARGE_FIELDS) if (charges[f.key].trim() !== '') out[f.key] = num(charges[f.key]);
  return out;
}
