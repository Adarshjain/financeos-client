import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';
import { expectStatus } from '../api';
import { istToday } from '../dates';
import type { DashboardWidget } from './reports';

export type BuiltinWidgetResponse = components['schemas']['BuiltinWidgetResponse'];
export type BuiltinDefinitionResponse = components['schemas']['BuiltinDefinitionResponse'];
export type EmergencyFundResponse = components['schemas']['EmergencyFundResponse'];
export type TaxHarvestResponse = components['schemas']['TaxHarvestResponse'];
export type BalancePointResponse = components['schemas']['BalancePointResponse'];

/** The built-in catalog in registry order (GET /dashboards/builtins). */
export const BUILTIN_KEYS = [
  'net_worth',
  'attention',
  'upcoming',
  'bills_due',
  'card_utilisation',
  'milestone_progress',
  'cap_headroom',
  'rewards_earned',
  'spend_heatmap',
  'portfolio_snapshot',
  'top_movers',
  'allocation',
  'tax_harvest',
  'loan_payoff',
  'lending_balances',
  'account_tile',
  'emergency_fund',
  'shortcuts',
] as const;

/** The shortcuts widget's default items (the registry's SHORTCUTS_DEFAULT). */
export const SHORTCUTS_DEFAULT = ['action:add-transaction', 'page:/transactions/review', 'page:/transactions/import', 'page:/upcoming'];

/** POST /dashboards/builtins/{key}/data, returned as-is (status not checked). */
export async function runBuiltin(
  api: ApiClient,
  key: string,
  params?: unknown,
  query: { page?: number; size?: number; sort?: string } = {}
) {
  return api.POST('/api/v1/dashboards/builtins/{key}/data', {
    params: { path: { key }, query },
    body: params === undefined ? undefined : ({ params } as never),
  });
}

/** POST /dashboards/builtins/{key}/definition, returned as-is (status not checked). */
export async function resolveBuiltin(api: ApiClient, key: string, params?: unknown) {
  return api.POST('/api/v1/dashboards/builtins/{key}/definition', {
    params: { path: { key } },
    body: params === undefined ? undefined : ({ params } as never),
  });
}

/** A built-in widget as the dashboard save takes it. */
export function builtinWidget(
  id: string,
  builtinKey: string,
  w: number,
  params?: unknown,
  layout: { x?: number; y?: number; h?: number } = {}
): DashboardWidget {
  return {
    id,
    kind: 'builtin',
    builtinKey,
    params: params as never,
    layout: { x: layout.x ?? 0, y: layout.y ?? 0, w, h: layout.h ?? 10 },
  };
}

/** GET /dashboards/builtins as a map by key (throws unless 200). */
export async function builtinCatalog(api: ApiClient): Promise<Record<string, BuiltinWidgetResponse>> {
  const res = await api.GET('/api/v1/dashboards/builtins');
  expectStatus(res, 200);
  return Object.fromEntries(res.data!.map((b) => [b.key, b]));
}

/** The IST calendar month `offset` months from today's, as {year, month}. */
export function istMonth(offset = 0): { year: number; month: number } {
  const [y, m] = istToday().split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** YYYY-MM of a {year, month}. */
export function ym(month: { year: number; month: number }): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}

/** First and last day of a {year, month}. */
export function monthRange(month: { year: number; month: number }): { from: string; to: string } {
  const last = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  return { from: `${ym(month)}-01`, to: `${ym(month)}-${String(last).padStart(2, '0')}` };
}

/** POST /transaction-links with the first transaction as the anchor (throws unless 201). */
export async function linkTransactions(
  api: ApiClient,
  type: 'TRANSFER' | 'CC_PAYMENT' | 'REFUND' | 'REVERSAL' | 'FEE' | 'EMI',
  anchorId: string,
  otherId: string
): Promise<void> {
  const res = await api.POST('/api/v1/transaction-links', {
    body: { type, members: [{ transactionId: anchorId, isAnchor: true }, { transactionId: otherId, isAnchor: false }] },
  });
  expectStatus(res, 201);
}

/**
 * Stores a manual close for an instrument on a date (POST /instruments/{id}/price). Manual prices
 * are per user: only `api`'s user sees it, so seed with the same client that owns the holdings.
 * Prices are only seeded here, never asserted on as an endpoint, so a change to the price API lands
 * in one place.
 */
export async function seedClose(api: ApiClient, instrumentId: string, price: number, asOf: string): Promise<void> {
  const res = await api.POST('/api/v1/instruments/{id}/price', {
    params: { path: { id: instrumentId } },
    body: { price, asOf },
  });
  if (res.response.status !== 200 && res.response.status !== 201) {
    throw new Error(`seedClose failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

/** The current Indian financial year's start year (IST). */
export function currentFy(): number {
  const [y, m] = istToday().split('-').map(Number);
  return m >= 4 ? y : y - 1;
}

/** One decimal, half up, the way the server reports utilisation and months covered. */
export function round1(value: number): number {
  return Math.round(value * 10 + Number.EPSILON) / 10;
}

/** The shape of a CHART report run: categories and one value array per series. */
export interface ChartRun {
  categories: string[];
  series: Array<{ name?: string; data: Array<number | null> }>;
  valueLabels?: Record<string, string> | null;
}

/** A chart run's first series as category → value. */
export function chartValues(data: unknown): Record<string, number> {
  const chart = data as ChartRun;
  const out: Record<string, number> = {};
  chart.categories.forEach((c, i) => {
    out[c] = Number(chart.series[0]?.data[i] ?? 0);
  });
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A day bucket label ("09 Oct 26") or ISO date as YYYY-MM-DD (the heatmap reads either); null when unreadable. */
export function dayLabelToIso(label: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(label);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{2,4})$/.exec(label.trim());
  if (!m) return null;
  const month = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (month < 0) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${year}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** A spend heatmap run as ISO day → amount (days with nothing spent left out). */
export function heatmapDays(data: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [label, value] of Object.entries(chartValues(data))) {
    const day = dayLabelToIso(label);
    if (day && value > 0) out[day] = (out[day] ?? 0) + value;
  }
  return out;
}

/** The rows of a pivot (aggregated TABLE) run as dimension value → measure cells. */
export function pivotByRow(data: unknown, dimension: string): Record<string, Record<string, number>> {
  const rows = (data as { rows: Array<{ values: Record<string, unknown>; cells: Record<string, Record<string, unknown>> }> }).rows;
  return Object.fromEntries(
    rows.map((r) => [
      String(r.values[dimension]),
      Object.fromEntries(Object.entries(r.cells[''] ?? {}).map(([k, v]) => [k, Number(v ?? 0)])),
    ])
  );
}

/** The rows of a raw TABLE run. */
export function rawRowsOf(data: unknown): Array<Record<string, unknown>> {
  return (data as { rows: Array<Record<string, unknown>> }).rows;
}
