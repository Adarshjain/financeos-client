import { fyLabel, moveTone, priceTimeLabel } from '@/features/investments/investmentsFormatModel';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { formatDate, formatMoney, formatPercent, formatQuantity, formatTime } from '@/lib/format';
import type { HoldingRow, HoldingsGroup, HoldingsHeader, HoldingsMover, HoldingsQuery, HoldingsSort, HoldingsSortDir } from '@/lib/investments.types';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import type { InstrumentType } from '@/lib/types';

import { holdingHref,HOLDINGS_HREF } from '../investmentsTabs';

// ---- URL state ---------------------------------------------------------------

export interface HoldingsUrlState {
  q: string;
  /** '' = every asset type. */
  type: InstrumentType | '';
  /** A broker account id; '' = every broker. */
  broker: string;
  sort: HoldingsSort;
  /** Always resolved: the key's default when the URL has none. */
  dir: HoldingsSortDir;
}

const TYPES: InstrumentType[] = ['stock', 'mutual_fund', 'etf'];
const SORTS: HoldingsSort[] = ['name', 'return_pct', 'return_abs'];
const DIRS: HoldingsSortDir[] = ['asc', 'desc'];

/** Name runs A to Z; the returns run high to low. */
export function defaultSortDir(sort: HoldingsSort): HoldingsSortDir {
  return sort === 'name' ? 'asc' : 'desc';
}

export function parseHoldingsUrl(params: SearchParamsRecord): HoldingsUrlState {
  const sort = SORTS.includes(first(params.sort) as HoldingsSort) ? (first(params.sort) as HoldingsSort) : 'name';
  return {
    q: (first(params.q) ?? '').trim(),
    type: TYPES.includes(first(params.type) as InstrumentType) ? (first(params.type) as InstrumentType) : '',
    broker: (first(params.broker) ?? '').trim(),
    sort,
    dir: DIRS.includes(first(params.dir) as HoldingsSortDir) ? (first(params.dir) as HoldingsSortDir) : defaultSortDir(sort),
  };
}

/** The Holdings tab URL for a state: defaults stay out of the query string. */
export function holdingsUrl(state: HoldingsUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.type) query.set('type', state.type);
  if (state.broker) query.set('broker', state.broker);
  if (state.sort !== 'name') query.set('sort', state.sort);
  if (state.dir !== defaultSortDir(state.sort)) query.set('dir', state.dir);
  const text = query.toString();
  return text ? `${HOLDINGS_HREF}?${text}` : HOLDINGS_HREF;
}

/** The holdings request for a state. */
export function holdingsQuery(state: HoldingsUrlState): HoldingsQuery {
  return {
    search: state.q || undefined,
    assetType: state.type || undefined,
    brokerAccountId: state.broker || undefined,
    sort: state.sort,
    dir: state.dir !== defaultSortDir(state.sort) ? state.dir : undefined,
  };
}

export const TYPE_OPTIONS: { value: InstrumentType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'stock', label: 'Stocks' },
  { value: 'mutual_fund', label: 'Mutual funds' },
  { value: 'etf', label: 'ETFs' },
];

/** One Sort option: the key and its direction, encoded as `key:dir` for the Select. */
export const SORT_OPTIONS: { value: string; label: string; sort: HoldingsSort; dir: HoldingsSortDir }[] = [
  { value: 'name:asc', label: 'Name A–Z', sort: 'name', dir: 'asc' },
  { value: 'name:desc', label: 'Name Z–A', sort: 'name', dir: 'desc' },
  { value: 'return_pct:desc', label: 'Best % return', sort: 'return_pct', dir: 'desc' },
  { value: 'return_pct:asc', label: 'Worst % return', sort: 'return_pct', dir: 'asc' },
  { value: 'return_abs:desc', label: 'Best ₹ return', sort: 'return_abs', dir: 'desc' },
  { value: 'return_abs:asc', label: 'Worst ₹ return', sort: 'return_abs', dir: 'asc' },
];

/** The Select value of a state's sort and direction. */
export function sortValue(state: Pick<HoldingsUrlState, 'sort' | 'dir'>): string {
  return `${state.sort}:${state.dir}`;
}

/** The sort and direction a Select value stands for. */
export function sortFromValue(value: string): { sort: HoldingsSort; dir: HoldingsSortDir } {
  const option = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];
  return { sort: option.sort, dir: option.dir };
}

export const GROUP_NAMES: Record<InstrumentType, string> = {
  stock: 'Stocks',
  mutual_fund: 'Mutual funds',
  etf: 'ETFs',
};

// ---- Figures -----------------------------------------------------------------

type Tone = 'positive' | 'danger' | undefined;

export interface HoldingsHeroModel {
  value: string;
  /** "+₹3,566 today · +0.56%"; null when no price moved. */
  day: { text: string; tone: Tone } | null;
  invested: string;
  unrealised: { text: string; tone: Tone };
  /** "+29.4% · XIRR 24.1%". */
  unrealisedSub: string | null;
  /** "13 Oct" or "13 Oct, 15:30" (the date only when the price has no time), or null with no price at all. */
  priceAsOf: string | null;
  /** The line's wording: "Live · 11:45", "Close · 13 Oct, 15:30", or "Prices as of 13 Oct" when the price has no time; null with no price. */
  priceLine: string | null;
}

export function heroModel(header: HoldingsHeader, now: Date = new Date()): HoldingsHeroModel {
  const day =
    header.dayChange == null
      ? null
      : {
          text: `${formatMoney(header.dayChange, { sign: 'always' })} today${header.dayChangePct == null ? '' : ` · ${formatPercent(header.dayChangePct, { sign: 'always', decimals: 2, fixed: true })}`}`,
          tone: moveTone(header.dayChange),
        };
  const sub = [
    header.unrealisedPct == null ? null : formatPercent(header.unrealisedPct, { sign: 'always' }),
    header.xirr == null ? null : `XIRR ${formatPercent(header.xirr)}`,
  ].filter(Boolean);
  return {
    value: formatMoney(header.currentValue),
    day,
    invested: formatMoney(header.invested),
    unrealised: { text: formatMoney(header.unrealised, { sign: 'always' }), tone: moveTone(header.unrealised) },
    unrealisedSub: sub.length > 0 ? sub.join(' · ') : null,
    priceAsOf: header.priceAsOf
      ? [formatDate(header.priceAsOf, 'list'), formatTime(header.priceAt)].filter(Boolean).join(', ')
      : null,
    priceLine: header.priceAsOf
      ? priceTimeLabel(formatDate(header.priceAsOf, 'list'), header.priceAt, now) || `Prices as of ${formatDate(header.priceAsOf, 'list')}`
      : null,
  };
}

// ---- Rows --------------------------------------------------------------------

export interface HoldingListRow {
  id: string;
  href: string;
  assetType: InstrumentType;
  /** Symbol, or the name when the instrument has none (funds). */
  title: string;
  /** The name beside a symbol on desktop; null when the title already is the name. */
  name: string | null;
  noPrice: boolean;
  /** "Delisted" or "Not trading" when the server says so, else "at cost (no price)" for an unpriced row, else null. */
  priceNote: string | null;
  manualPrice: boolean;
  quantity: string;
  avgCost: string | null;
  ltp: string | null;
  dayPct: { text: string; tone: Tone } | null;
  invested: string | null;
  /** With the ₹ (phone). */
  current: string;
  /** Without it (desktop column). */
  currentPlain: string;
  pnl: { amount: string; plain: string; pct: string | null; tone: Tone } | null;
  phone: HoldingPhoneLines;
}

/** The lines of a phone row: three rows by two columns. */
export interface HoldingPhoneLines {
  /** Middle left: the ticker, or the name for a fund (its symbol is an ISIN). */
  title: string;
  /** Top left: "3 qty · avg ₹1,132.02", "12.345 units · avg ₹45.67". */
  caption: string;
  /** Top right: the return %, coloured by sign. */
  returnPct: { text: string; tone: Tone } | null;
  /** Middle right: the return amount with ₹, coloured by sign. */
  returnAmount: { text: string; tone: Tone } | null;
  /** Bottom left: "Invested ₹3,396.05". */
  invested: string | null;
  /** Bottom right: "LTP ₹1,877.85" with the day % after it, or "LTP ₹X · manual price", or the no-price note. */
  ltp: { text: string; dayPct: { text: string; tone: Tone } | null } | null;
  /** Under the ticker: "Delisted" for a priced holding that has a status note. */
  note: string | null;
}

/** "3 qty", "12.345 units". */
function quantityLabel(type: InstrumentType, qty: string): string {
  return `${qty} ${type === 'mutual_fund' ? 'units' : 'qty'}`;
}

/** The status a holding shows in place of its price: Delisted, else Not trading, else the unpriced note. */
export function holdingPriceNote(row: Pick<HoldingRow, 'delisted' | 'notTrading' | 'noPrice'>): string | null {
  if (row.delisted) return 'Delisted';
  if (row.notTrading) return 'Not trading';
  return row.noPrice ? 'at cost (no price)' : null;
}

export function holdingListRow(row: HoldingRow): HoldingListRow {
  const title = row.symbol || row.name;
  // A delisted holding is a priced row worth zero, never "No price".
  const unpriced = row.noPrice && !row.delisted;
  const priced = row.ltp != null && !unpriced;
  const qty = formatQuantity(row.quantity);
  const dayPct =
    priced && !row.manualPrice && row.dayChangePct != null
      ? { text: formatPercent(row.dayChangePct, { sign: 'always' }), tone: moveTone(row.dayChangePct) }
      : null;
  const priceNote = holdingPriceNote(row);
  const phone: HoldingPhoneLines = {
    title: row.assetType === 'mutual_fund' ? row.name : title,
    caption: `${quantityLabel(row.assetType, qty)} · avg ${formatMoney(row.avgCost, { decimals: 'exact' })}`,
    returnPct: unpriced || row.unrealisedPct == null ? null : { text: formatPercent(row.unrealisedPct, { sign: 'always' }), tone: moveTone(row.unrealised) },
    returnAmount: unpriced ? null : { text: formatMoney(row.unrealised, { sign: 'always', decimals: 'auto' }), tone: moveTone(row.unrealised) },
    invested: `Invested ${formatMoney(row.invested, { decimals: 'auto' })}`,
    ltp: priced
      ? { text: `LTP ${formatMoney(row.ltp!, { decimals: 'exact' })}${row.manualPrice ? ' · manual price' : ''}`, dayPct }
      : priceNote
        ? { text: priceNote, dayPct: null }
        : null,
    note: priced && priceNote ? priceNote : null,
  };
  return {
    id: row.instrumentId,
    href: holdingHref(row.instrumentId),
    assetType: row.assetType,
    title,
    name: row.symbol && row.name !== row.symbol ? row.name : null,
    noPrice: unpriced && !row.notTrading,
    priceNote,
    manualPrice: row.manualPrice,
    quantity: qty,
    avgCost: formatMoney(row.avgCost, { decimals: 'exact', symbol: false }),
    ltp: priced ? formatMoney(row.ltp!, { decimals: 'exact', symbol: false }) : null,
    dayPct,
    invested: formatMoney(row.invested, { symbol: false }),
    current: formatMoney(row.currentValue),
    currentPlain: formatMoney(row.currentValue, { symbol: false }),
    pnl:
      unpriced
        ? null
        : {
            amount: formatMoney(row.unrealised, { sign: 'always' }),
            plain: formatMoney(row.unrealised, { sign: 'always', symbol: false }),
            pct: row.unrealisedPct == null ? null : formatPercent(row.unrealisedPct, { sign: 'always' }),
            tone: moveTone(row.unrealised),
          },
    phone,
  };
}

/** A holding merged out entirely (0 shares, merged into another) is not listed; the server no longer sends it. */
export function isListedHolding(row: Pick<HoldingRow, 'quantity' | 'mergedIntoName'>): boolean {
  return !(row.quantity === 0 && row.mergedIntoName);
}

// ---- Groups ------------------------------------------------------------------

export interface GroupBand {
  key: string;
  name: string;
  /** "₹4,01,290". */
  total: string;
  /** "63%". */
  share: string;
}

/** The band of each asset type: its name, current value and share of the value. */
export function groupBands(groups: readonly HoldingsGroup[]): Map<InstrumentType, GroupBand> {
  const all = groups.reduce((sum, g) => sum + g.value, 0);
  return new Map(
    groups.map((g) => [
      g.assetType,
      {
        key: g.assetType,
        name: GROUP_NAMES[g.assetType],
        total: formatMoney(g.value),
        share: all > 0 ? formatPercent((g.value / all) * 100, { decimals: 0 }) : '0%',
      },
    ]),
  );
}

/** Allocation segments: each asset type's share of the value, in the order the server sent them. */
export function allocationModel(groups: readonly HoldingsGroup[]) {
  const all = groups.reduce((sum, g) => sum + g.value, 0);
  const chartColors = ['chart-1', 'chart-2', 'chart-3'] as const;
  return groups
    .filter((g) => g.value > 0)
    .map((g, i) => ({
      value: g.value,
      label: `${GROUP_NAMES[g.assetType]} ${all > 0 ? formatPercent((g.value / all) * 100, { decimals: 0 }) : '0%'}`,
      color: chartColors[i % chartColors.length],
    }));
}

// ---- Side cards ----------------------------------------------------------------

export interface TaxCardModel {
  fy: string;
  rows: { label: string; sub?: string; value: string; tone?: 'danger' }[];
}

function distinct(names: string[], max: number): string[] {
  return [...new Set(names)].slice(0, max);
}

export function taxCardModel(tax: TaxHarvestResponse): TaxCardModel {
  const { realised, summary } = tax;
  const lots = tax.openLots.items;
  const gainNames = distinct(
    lots.filter((l) => l.term === 'long' && l.taxClass === 'EQUITY_ORIENTED' && l.gain > 0).map((l) => l.instrument),
    3,
  );
  const lossNames = distinct(lots.filter((l) => l.gain < 0).map((l) => l.instrument), 3);
  const rows: TaxCardModel['rows'] = [
    { label: 'Realised gains', value: signedRealisedTotal(realised.ltcg - realised.ltcl + realised.stcg - realised.stcl) },
    { label: 'LTCG exemption left', value: formatMoney(realised.exemptionLeft) },
  ];
  if (summary) {
    rows.push({
      label: 'Harvestable gains',
      sub: gainNames.length > 0 ? gainNames.join(', ') : undefined,
      value: formatMoney(summary.harvestableLtcg),
    });
    const loss = summary.harvestableLosses.total;
    if (loss > 0) {
      rows.push({
        label: 'Loss to offset',
        sub: lossNames.length > 0 ? lossNames.join(', ') : undefined,
        value: formatMoney(-loss, { sign: 'always' }),
        tone: 'danger',
      });
    }
  }
  return { fy: fyLabel(tax.fy), rows };
}

function signedRealisedTotal(value: number): string {
  return value < 0 ? formatMoney(value, { sign: 'always' }) : formatMoney(value);
}

export interface Mover {
  id: string;
  symbol: string;
  amount: string;
  tone: Tone;
}

/** The server's top movers (already the three biggest, biggest first) as card rows. */
export function moversFromResponse(movers: readonly HoldingsMover[]): Mover[] {
  return movers.map((m) => ({ id: m.instrumentId, symbol: m.symbol || m.name, amount: formatMoney(m.dayChange, { sign: 'always' }), tone: moveTone(m.dayChange) }));
}

/** The three biggest day moves in rupees, up or down. */
export function topMovers(rows: readonly HoldingRow[]): Mover[] {
  return rows
    .filter((r) => r.dayChange != null && Math.round(r.dayChange) !== 0 && !r.mergedIntoName)
    .sort((a, b) => Math.abs(b.dayChange!) - Math.abs(a.dayChange!))
    .slice(0, 3)
    .map((r) => ({ id: r.instrumentId, symbol: r.symbol || r.name, amount: formatMoney(r.dayChange!, { sign: 'always' }), tone: moveTone(r.dayChange) }));
}
