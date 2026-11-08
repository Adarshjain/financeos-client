import { type Loaded } from '@/features/shell/loadHelpers';
import { formatCount, formatDate, formatMoney, formatPercent } from '@/lib/format';
import type { HoldingsResponse } from '@/lib/investments.types';

import { type EpfEmployer, epfFigures, type EpfSummary } from '../epf/epfModel';
import { heroModel } from '../holdings/holdingsModel';
import { HOLDINGS_HREF, INVESTMENTS_IMPORT_HREF } from '../investmentsTabs';
import { type NpsSummary } from '../nps/npsModel';
import { accountNavDate, EPF_EMPTY, epfRetirementRow, NPS_EMPTY, npsRetirementRows } from '../retirement/retirementModel';

export type OverviewTone = 'positive' | 'danger' | undefined;

/** A figure with its tone and an optional caption under it. */
export interface OverviewFigure {
  text: string;
  tone: OverviewTone;
  caption?: string;
}

/** What one product is: a row of the table on desktop, a tile on phone. */
export type OverviewCardModel =
  /** A product with data: the whole row or tile opens its page. */
  | {
      kind: 'product';
      id: string;
      title: string;
      /** The line under the name: "6 holdings", the employer, "PRAN ••7731", "For Aarav" (the table adds "· Not in net worth" when inNetWorth is false). */
      subtitle: string;
      href: string;
      value: number;
      /** Whole rupees. */
      valueText: string;
      /** Stocks only: today's move under the value ("+₹1,395 today"). */
      dayMove: OverviewFigure | null;
      /** The Gain column: unrealised P&L, the NPS gain, or the EPF interest so far. */
      gain: OverviewFigure | null;
      /** The phone tile's change line: the gain, or "≈₹25,419 interest" for EPF. */
      delta: { text: string; tone: OverviewTone } | null;
      /** Prices date (stocks), passbook month (EPF) or NAV date (NPS); '' when unknown. */
      updated: string;
      /** Counted in net worth: false for a child's account. */
      inNetWorth: boolean;
    }
  /** A product with nothing yet: not a link; one line and the link that adds it. */
  | { kind: 'empty'; id: string; title: string; line: string; action: { label: string; href: string } }
  /** A product that could not be read: the other rows still draw. */
  | { kind: 'error'; id: string; title: string; what: string };

const tone = (n: number): OverviewTone => (n > 0 ? 'positive' : n < 0 ? 'danger' : undefined);

const failed = (id: string, title: string, what: string): OverviewCardModel => ({ kind: 'error', id, title, what });

/** Stocks & funds: the Holdings hero (current value, today's move, unrealised P&L with its percent and XIRR, the prices date). */
export function stocksCard(holdings: Loaded<HoldingsResponse>, now: Date = new Date()): OverviewCardModel {
  const title = 'Stocks & funds';
  if (!holdings.ok) return failed('stocks', title, 'holdings');
  if (holdings.data.totalElements === 0) {
    return { kind: 'empty', id: 'stocks', title, line: 'Record a trade or import your tradebook.', action: { label: 'Import tradebook', href: INVESTMENTS_IMPORT_HREF } };
  }
  const { header } = holdings.data;
  const hero = heroModel(header, now);
  return {
    kind: 'product',
    id: 'stocks',
    title,
    subtitle: formatCount(holdings.data.totalElements, ['holding', 'holdings']),
    href: HOLDINGS_HREF,
    value: header.currentValue,
    valueText: hero.value,
    dayMove: hero.day && header.dayChange != null ? { text: `${formatMoney(header.dayChange, { sign: 'always' })} today`, tone: hero.day.tone } : null,
    gain: { text: hero.unrealised.text, tone: hero.unrealised.tone, caption: hero.unrealisedSub ?? undefined },
    delta: { text: hero.unrealised.text, tone: hero.unrealised.tone },
    updated: hero.priceAsOf ?? '',
    inNetWorth: true,
  };
}

/** EPF: the EPF hero's balance, interest so far and passbook month. */
export function epfCard(summary: Loaded<EpfSummary>, employers: Loaded<EpfEmployer[]>): OverviewCardModel {
  if (!summary.ok || !employers.ok) return failed('epf', 'EPF', 'EPF');
  const row = epfRetirementRow(summary.data, employers.data);
  if (!row) return { kind: 'empty', id: 'epf', title: 'EPF', line: EPF_EMPTY.line, action: EPF_EMPTY.action };
  const { interest } = epfFigures(summary.data);
  const hasInterest = interest.value !== '—';
  return {
    kind: 'product',
    id: 'epf',
    title: 'EPF',
    subtitle: row.sub || row.idLabel,
    href: row.href,
    value: row.value,
    valueText: row.valueText,
    dayMove: null,
    gain: hasInterest ? { text: interest.value, tone: undefined, caption: 'Interest so far' } : null,
    delta: hasInterest ? { text: `${interest.value} interest`, tone: undefined } : null,
    updated: row.updated,
    inNetWorth: true,
  };
}

/** One card per NPS account (a child's Vatsalya account is its own, so it never joins your net worth): value, gain and NAV date. */
export function npsCards(nps: Loaded<NpsSummary>): OverviewCardModel[] {
  if (!nps.ok) return [failed('nps', 'NPS', 'NPS')];
  const rows = npsRetirementRows(nps.data);
  if (rows.length === 0) return [{ kind: 'empty', id: 'nps', title: 'NPS', line: NPS_EMPTY.line, action: NPS_EMPTY.action }];
  return nps.data.accounts.map((account, i) => {
    const row = rows[i];
    const gain = account.tiers.reduce((sum, t) => sum + t.gain, 0);
    const navDate = accountNavDate(account, nps.data.holdings);
    const gainFigure = { text: formatMoney(gain, { sign: 'always' }), tone: tone(gain) };
    return {
      kind: 'product' as const,
      id: row.id,
      title: row.name,
      subtitle: account.relation === 'CHILD' ? row.sub : row.idLabel,
      href: row.href,
      value: row.value,
      valueText: row.valueText,
      dayMove: null,
      gain: gainFigure,
      delta: gainFigure,
      updated: navDate ? formatDate(navDate, 'list') : '',
      inNetWorth: row.inNetWorth,
    };
  });
}

/** The landing's cards in order: Stocks & funds, EPF, then every NPS account (your own first, as the Retirement rows list them). */
export function overviewCards(input: {
  holdings: Loaded<HoldingsResponse>;
  epf: Loaded<EpfSummary>;
  employers: Loaded<EpfEmployer[]>;
  nps: Loaded<NpsSummary>;
}): OverviewCardModel[] {
  return [stocksCard(input.holdings), epfCard(input.epf, input.employers), ...npsCards(input.nps)];
}

// ---- Hero and split ---------------------------------------------------------------

const SERIES = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;
export type OverviewSeries = (typeof SERIES)[number] | 'chart-rest';

/** A share of the total in whole percent; anything above 0 and below 1% reads "<1%". */
export function shareText(value: number, total: number): string {
  if (total <= 0 || value <= 0) return formatPercent(0, { decimals: 0 });
  const pct = (value / total) * 100;
  return pct < 1 ? '<1%' : formatPercent(pct, { decimals: 0 });
}

export interface OverviewHeroModel {
  /** Whole rupees: every loaded product, all NPS accounts included. */
  totalText: string;
  /** "In your net worth": the total without a child's account; null when there is no child account. */
  netWorthText: string | null;
  /** "Without EPF and NPS": the products that failed, so the total is never silently partial; null when all loaded. */
  without: string | null;
  /** One segment per product with a value, in row order, with its legend label ("EPF 12%"). */
  segments: { value: number; label: string; color: OverviewSeries }[];
}

const listWords = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : (names[0] ?? ''));

/** The hero of the landing: the total, the net-worth figure, a partial-load notice and the split bar's segments. */
export function overviewHero(cards: OverviewCardModel[]): OverviewHeroModel {
  const products = cards.flatMap((c) => (c.kind === 'product' ? [c] : []));
  const total = products.reduce((sum, c) => sum + c.value, 0);
  const child = products.filter((c) => !c.inNetWorth);
  const failedNames = cards.flatMap((c) => (c.kind === 'error' ? [c.title] : []));
  const segments = products
    .filter((c) => c.value > 0)
    .map((c, i) => ({ value: c.value, label: `${c.title} ${shareText(c.value, total)}`, color: (SERIES[i] ?? 'chart-rest') as OverviewSeries }));
  return {
    totalText: formatMoney(total),
    netWorthText: child.length > 0 ? formatMoney(total - child.reduce((sum, c) => sum + c.value, 0)) : null,
    without: failedNames.length > 0 ? `Without ${listWords(failedNames)}` : null,
    segments,
  };
}

/** The Share column: a product's part of the total. */
export function overviewShare(cards: OverviewCardModel[], card: OverviewCardModel): string {
  if (card.kind !== 'product') return '';
  return shareText(card.value, cards.reduce((sum, c) => sum + (c.kind === 'product' ? c.value : 0), 0));
}
