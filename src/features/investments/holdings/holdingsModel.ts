import { formatDayMonth } from '@/features/accounts/list/accountsList';
import type { HoldingRow, HoldingsGroup, HoldingsHeader, HoldingsQuery, HoldingsSort } from '@/lib/investments.types';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import type { InstrumentType } from '@/lib/types';

import { fyLabel, moveTone, plainPct, plainPrice, plainRupees, plainSignedRupees, quantity, rupees, shortDate, signedPct, signedRupees, unitPrice, unitWord } from '../investmentsFormat';
import { holdingHref,HOLDINGS_HREF } from '../investmentsTabs';

// ---- URL state ---------------------------------------------------------------

export const HOLDINGS_SIZE_OPTIONS = [25, 50, 100];
export const HOLDINGS_DEFAULT_SIZE = 50;

export interface HoldingsUrlState {
  q: string;
  /** '' = every asset type. */
  type: InstrumentType | '';
  /** A broker account id; '' = every broker. */
  broker: string;
  sort: HoldingsSort;
  page: number;
  size: number;
}

const TYPES: InstrumentType[] = ['stock', 'mutual_fund', 'etf'];
const SORTS: HoldingsSort[] = ['name', 'return_pct', 'return_abs'];

export function parseHoldingsUrl(params: {
  q?: string;
  type?: string;
  broker?: string;
  sort?: string;
  page?: string;
  size?: string;
}): HoldingsUrlState {
  const page = Math.floor(Number(params.page));
  const size = Number(params.size);
  return {
    q: (params.q ?? '').trim(),
    type: TYPES.includes(params.type as InstrumentType) ? (params.type as InstrumentType) : '',
    broker: (params.broker ?? '').trim(),
    sort: SORTS.includes(params.sort as HoldingsSort) ? (params.sort as HoldingsSort) : 'name',
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: HOLDINGS_SIZE_OPTIONS.includes(size) ? size : HOLDINGS_DEFAULT_SIZE,
  };
}

/** The Holdings tab URL for a state: defaults stay out of the query string. */
export function holdingsUrl(state: HoldingsUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.type) query.set('type', state.type);
  if (state.broker) query.set('broker', state.broker);
  if (state.sort !== 'name') query.set('sort', state.sort);
  if (state.page > 0) query.set('page', String(state.page));
  if (state.size !== HOLDINGS_DEFAULT_SIZE) query.set('size', String(state.size));
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
    page: state.page,
    size: state.size,
  };
}

export const TYPE_CHIPS: { value: InstrumentType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'stock', label: 'Stocks' },
  { value: 'mutual_fund', label: 'Funds' },
  { value: 'etf', label: 'ETFs' },
];

export const SORT_OPTIONS: { value: HoldingsSort; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'return_pct', label: '% return' },
  { value: 'return_abs', label: '₹ return' },
];

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
  /** "Prices as of 13 Oct", or null with no price at all. */
  priceAsOf: string | null;
}

export function heroModel(header: HoldingsHeader): HoldingsHeroModel {
  const day =
    header.dayChange == null
      ? null
      : {
          text: `${signedRupees(header.dayChange)} today${header.dayChangePct == null ? '' : ` · ${signedPct(header.dayChangePct)}`}`,
          tone: moveTone(header.dayChange),
        };
  const sub = [
    header.unrealisedPct == null ? null : signedPct(header.unrealisedPct),
    header.xirr == null ? null : `XIRR ${plainPct(header.xirr)}`,
  ].filter(Boolean);
  return {
    value: rupees(header.currentValue),
    day,
    invested: rupees(header.invested),
    unrealised: { text: signedRupees(header.unrealised), tone: moveTone(header.unrealised) },
    unrealisedSub: sub.length > 0 ? sub.join(' · ') : null,
    priceAsOf: header.priceAsOf ? formatDayMonth(header.priceAsOf) : null,
  };
}

export interface HoldingsTile {
  label: string;
  value: string;
  tone?: 'positive' | 'danger';
  context?: string;
}

/** The four desktop tiles. Realised comes from the tax-harvest endpoint; null when that failed. */
export function holdingsTiles(
  header: HoldingsHeader,
  /** Open holdings (the groups' counts); merged-away rows are not holdings. */
  holdingCount: number,
  tax: TaxHarvestResponse | null,
): (HoldingsTile | null)[] {
  const hero = heroModel(header);
  const realised = tax ? tax.realised : null;
  const ltcg = realised ? realised.ltcg - realised.ltcl : 0;
  const stcg = realised ? realised.stcg - realised.stcl : 0;
  return [
    {
      label: 'Current value',
      value: hero.value,
      context: hero.day?.text,
    },
    { label: 'Invested', value: hero.invested, context: `${holdingCount} ${holdingCount === 1 ? 'holding' : 'holdings'}` },
    { label: 'Unrealised P&L', value: hero.unrealised.text, tone: hero.unrealised.tone, context: hero.unrealisedSub ?? undefined },
    realised
      ? {
          label: 'Realised this FY',
          value: signedRealised(ltcg + stcg),
          context: `LTCG ${signedRealised(ltcg)} · STCG ${signedRealised(stcg)}`,
        }
      : null,
  ];
}

function signedRealised(value: number): string {
  return value < 0 ? signedRupees(value) : rupees(value);
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
  merged: { into: string; date: string | null } | null;
  noPrice: boolean;
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
  /** The part of the phone's second line before the day change: "40 × ₹1,742.60", "0 shares". */
  position: string;
}

export function holdingListRow(row: HoldingRow): HoldingListRow {
  const merged = row.mergedIntoName ? { into: row.mergedIntoName, date: row.mergedIntoDate } : null;
  const title = row.symbol || row.name;
  const priced = row.ltp != null && !row.noPrice;
  const qty = quantity(row.quantity);
  const position = merged
    ? `${qty} ${unitWord(row.assetType, row.quantity)}`
    : row.assetType === 'mutual_fund'
      ? `${qty} units × ${unitPrice(priced ? row.ltp! : row.avgCost)}`
      : `${qty} × ${unitPrice(priced ? row.ltp! : row.avgCost)}`;
  return {
    id: row.instrumentId,
    href: holdingHref(row.instrumentId),
    assetType: row.assetType,
    title,
    name: row.symbol && row.name !== row.symbol ? row.name : null,
    merged,
    noPrice: row.noPrice,
    manualPrice: row.manualPrice,
    quantity: qty,
    avgCost: merged ? null : plainPrice(row.avgCost),
    ltp: priced ? plainPrice(row.ltp!) : null,
    dayPct:
      priced && !row.manualPrice && row.dayChangePct != null
        ? { text: signedPct(row.dayChangePct), tone: moveTone(row.dayChangePct) }
        : null,
    invested: merged ? null : plainRupees(row.invested),
    current: rupees(row.currentValue),
    currentPlain: plainRupees(row.currentValue),
    pnl:
      merged || row.noPrice
        ? null
        : {
            amount: signedRupees(row.unrealised),
            plain: plainSignedRupees(row.unrealised),
            pct: row.unrealisedPct == null ? null : signedPct(row.unrealisedPct),
            tone: moveTone(row.unrealised),
          },
    position,
  };
}

/** "Merged into HDFCBANK · 13 Jul 23". */
export function mergedLine(merged: { into: string; date: string | null }): string {
  return merged.date ? `Merged into ${merged.into} · ${shortDate(merged.date)}` : `Merged into ${merged.into}`;
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
        total: rupees(g.value),
        share: all > 0 ? `${Math.round((g.value / all) * 100)}%` : '0%',
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
      label: `${GROUP_NAMES[g.assetType]} ${all > 0 ? Math.round((g.value / all) * 100) : 0}%`,
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
    { label: 'LTCG exemption left', value: rupees(realised.exemptionLeft) },
  ];
  if (summary) {
    rows.push({
      label: 'Harvestable gains',
      sub: gainNames.length > 0 ? gainNames.join(', ') : undefined,
      value: rupees(summary.harvestableLtcg),
    });
    const loss = summary.harvestableLosses.total;
    if (loss > 0) {
      rows.push({
        label: 'Loss to offset',
        sub: lossNames.length > 0 ? lossNames.join(', ') : undefined,
        value: signedRupees(-loss),
        tone: 'danger',
      });
    }
  }
  return { fy: fyLabel(tax.fy), rows };
}

function signedRealisedTotal(value: number): string {
  return value < 0 ? signedRupees(value) : rupees(value);
}

export interface Mover {
  id: string;
  symbol: string;
  amount: string;
  tone: Tone;
}

/** The three biggest day moves in rupees, up or down. */
export function topMovers(rows: readonly HoldingRow[]): Mover[] {
  return rows
    .filter((r) => r.dayChange != null && Math.round(r.dayChange) !== 0 && !r.mergedIntoName)
    .sort((a, b) => Math.abs(b.dayChange!) - Math.abs(a.dayChange!))
    .slice(0, 3)
    .map((r) => ({ id: r.instrumentId, symbol: r.symbol || r.name, amount: signedRupees(r.dayChange!), tone: moveTone(r.dayChange) }));
}
