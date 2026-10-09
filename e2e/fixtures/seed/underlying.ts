import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';
import { createBankAccount } from './accounts';
import { fixedMonth } from './rewards';
import { createCategory, createTransaction } from './transactions';

export type KpiUnderlyingResponse = components['schemas']['KpiUnderlyingResponse'];
export type RowBreakdownResponse = components['schemas']['RowBreakdownResponse'];
export type BreakdownStep = components['schemas']['BreakdownStep'];
export type BreakdownSectionData = components['schemas']['BreakdownSectionData'];
export type RunReportRequest = components['schemas']['RunReportRequest'];

/** The raw table a KPI's underlying data, a breakdown section or a raw report run returns. */
export interface RawTable {
  type: string;
  mode: string;
  columns: Array<{ key: string; label: string; type: string; format: string | null }>;
  rows: Array<Record<string, unknown>>;
  page: { number: number; size: number; totalElements: number; totalPages: number };
}

export interface UnderlyingQuery {
  period?: 'current' | 'previous';
  page?: number;
  size?: number;
  sort?: string;
}

/** A filter clause as the report definitions take it. */
export type Filter = { field: string; operator: string; value?: unknown };

/** The table of a KPI's underlying data, typed. */
export function tableOf(res: { table: unknown }): RawTable {
  return res.table as unknown as RawTable;
}

function failIfNot200(name: string, res: { response: Response; error?: unknown; data?: unknown }): void {
  if (res.response.status !== 200 || res.error || !res.data) {
    throw new Error(`${name} failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
}

/** POST /reports/{id}/underlying — one page of a saved KPI's underlying rows (throws unless 200). */
export async function underlyingSaved(api: ApiClient, id: string, query: UnderlyingQuery = {}): Promise<KpiUnderlyingResponse> {
  const res = await api.POST('/api/v1/reports/{id}/underlying', { params: { path: { id }, query } });
  failIfNot200('underlyingSaved', res);
  return res.data!;
}

/** POST /reports/underlying — one page of an ad-hoc KPI's underlying rows (throws unless 200). */
export async function underlyingAdHoc(
  api: ApiClient,
  body: RunReportRequest,
  query: UnderlyingQuery = {}
): Promise<KpiUnderlyingResponse> {
  const res = await api.POST('/api/v1/reports/underlying', { params: { query }, body });
  failIfNot200('underlyingAdHoc', res);
  return res.data!;
}

/** POST /dashboards/builtins/{key}/underlying — one page of a KPI built-in's underlying rows (throws unless 200). */
export async function underlyingBuiltin(
  api: ApiClient,
  key: string,
  params?: unknown,
  query: UnderlyingQuery = {}
): Promise<KpiUnderlyingResponse> {
  const res = await api.POST('/api/v1/dashboards/builtins/{key}/underlying', {
    params: { path: { key }, query },
    body: params === undefined ? undefined : ({ params } as never),
  });
  failIfNot200('underlyingBuiltin', res);
  return res.data!;
}

/** A KPI definition for the transactions-style ad-hoc body. */
export function kpiBody(datasource: string, definition: Record<string, unknown>): RunReportRequest {
  return { type: 'KPI', datasource, definition } as never;
}

/** The KPI's own figures from POST /reports/data: its value and, when compared, the previous value. */
export async function kpiFigures(
  api: ApiClient,
  body: RunReportRequest
): Promise<{ value: number | null; previousValue: number | null | undefined; comparison: unknown }> {
  const res = await api.POST('/api/v1/reports/data', { body });
  failIfNot200('kpiFigures', res);
  const data = res.data as unknown as { value: number | null; comparison: { previousValue: number | null } | null };
  return { value: data.value, previousValue: data.comparison?.previousValue, comparison: data.comparison };
}

/** A downloaded CSV: the raw bytes, the text after the byte-order mark, and the response headers. */
export interface CsvDownload {
  status: number;
  bytes: Uint8Array;
  /** The document after the 3-byte UTF-8 BOM, decoded. */
  body: string;
  contentType: string | null;
  disposition: string | null;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf];

async function csv(res: { response: Response; data?: unknown; error?: unknown }): Promise<CsvDownload> {
  const bytes = res.data instanceof ArrayBuffer ? new Uint8Array(res.data) : new Uint8Array();
  const hasBom = UTF8_BOM.every((b, i) => bytes[i] === b);
  return {
    status: res.response.status,
    bytes,
    body: new TextDecoder('utf-8', { ignoreBOM: true }).decode(hasBom ? bytes.slice(3) : bytes),
    contentType: res.response.headers.get('content-type'),
    disposition: res.response.headers.get('content-disposition'),
  };
}

/** True when the download starts with the UTF-8 byte-order mark. */
export function startsWithBom(download: CsvDownload): boolean {
  return UTF8_BOM.every((b, i) => download.bytes[i] === b);
}

/** Splits a CSV body (CRLF line ends, ends with CRLF) into its lines; asserts nothing. */
export function csvLines(download: CsvDownload): string[] {
  const body = download.body.endsWith('\r\n') ? download.body.slice(0, -2) : download.body;
  return body === '' ? [] : body.split('\r\n');
}

export async function underlyingSavedCsv(
  api: ApiClient,
  id: string,
  query: { period?: string; sort?: string } = {}
): Promise<CsvDownload> {
  return csv(
    await api.POST('/api/v1/reports/{id}/underlying/csv', {
      params: { path: { id }, query },
      parseAs: 'arrayBuffer',
    })
  );
}

export async function underlyingAdHocCsv(
  api: ApiClient,
  body: RunReportRequest,
  query: { period?: string; sort?: string } = {}
): Promise<CsvDownload> {
  return csv(
    await api.POST('/api/v1/reports/underlying/csv', {
      params: { query },
      body,
      parseAs: 'arrayBuffer',
    })
  );
}

export async function underlyingBuiltinCsv(
  api: ApiClient,
  key: string,
  params?: unknown,
  query: { period?: string; sort?: string } = {}
): Promise<CsvDownload> {
  return csv(
    await api.POST('/api/v1/dashboards/builtins/{key}/underlying/csv', {
      params: { path: { key }, query },
      body: params === undefined ? undefined : ({ params } as never),
      parseAs: 'arrayBuffer',
    })
  );
}

/** GET a row's breakdown (throws unless 200). */
export async function rowBreakdown(
  api: ApiClient,
  datasource: string,
  rowId: string,
  size?: number
): Promise<RowBreakdownResponse> {
  const res = await api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', {
    params: { path: { name: datasource, rowId }, query: { size } },
  });
  failIfNot200('rowBreakdown', res);
  return res.data!;
}

/** GET one page of a breakdown section (throws unless 200). */
export async function breakdownSection(
  api: ApiClient,
  datasource: string,
  rowId: string,
  section: string,
  query: { page?: number; size?: number } = {}
): Promise<RawTable> {
  const res = await api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}', {
    params: { path: { name: datasource, rowId, section }, query },
  });
  failIfNot200('breakdownSection', res);
  return res.data as unknown as RawTable;
}

/** A breakdown section by key, its table typed. */
export function sectionOf(b: RowBreakdownResponse, key: string): BreakdownSectionData & { rows: RawTable } {
  const section = b.sections.find((s) => s.key === key);
  if (!section) {
    throw new Error(`breakdown has no section ${key}: ${b.sections.map((s) => s.key).join(', ')}`);
  }
  return { ...section, rows: section.table as unknown as RawTable };
}

/** Whole paise, so chains can be summed without float drift. */
export function paise(amount: number | null | undefined): number {
  return Math.round(Number(amount ?? 0) * 100);
}

/**
 * Sums a breakdown's start/add/subtract steps (info steps take no part) in paise and returns it
 * with the equals step's amount, so a spec can assert the chain reconciles exactly.
 */
export function chainTotals(steps: BreakdownStep[]): { running: number; equals: number } {
  let running = 0;
  for (const step of steps) {
    if (step.op === 'start' || step.op === 'add') running += paise(step.amount);
    if (step.op === 'subtract') running -= paise(step.amount);
  }
  const equals = steps.filter((s) => s.op === 'equals');
  if (equals.length !== 1) {
    throw new Error(`expected exactly one equals step, got ${equals.length}`);
  }
  return { running, equals: paise(equals[0].amount) };
}

/** The steps as (op, label, amount) triples, the shape specs compare exactly. */
export function stepsOf(b: RowBreakdownResponse): Array<[string, string, number | null]> {
  return b.steps.map((s) => [s.op, s.label, s.amount ?? null]);
}

/** YYYY-MM-DD → dd/mm/yyyy, the way the server writes dates for people. */
export function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** A day of a {year, month} as YYYY-MM-DD. */
export function dayOf(month: { year: number; month: number }, day: number): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The calendar month before {@code month}, with its bounds. */
export function monthBefore(month: { year: number; month: number }): { from: string; to: string; year: number; month: number } {
  const d = new Date(Date.UTC(month.year, month.month - 2, 1));
  const year = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, '0')}`, year, month: m };
}

export interface SpendMonthsDataset {
  account: components['schemas']['BankAccountResponse'];
  food: components['schemas']['CategoryResponse'];
  travel: components['schemas']['CategoryResponse'];
  current: { from: string; to: string; year: number; month: number };
  previous: { from: string; to: string; year: number; month: number };
  /** Transaction ids by description. */
  ids: Record<string, string>;
}

/**
 * Two calendar months of transactions on one bank account (opening balance 10000):
 *
 * current month (fixedMonth): Swiggy −700 Food (03), Zomato −700 Food (08), Uber −300 Travel (12),
 *   Bus −100 Travel (18), Salary +5000 (25)
 * previous month: Cafe −50 Food (04), Tea −50 Food (09), Taxi −400 Travel (21)
 *
 * Spend (debits as positive) in the current month: 700, 700, 300, 100 (sum 1800, avg 450, max 700
 * twice, min 100) plus the salary at −5000; in the previous month 50, 50, 400.
 */
export async function seedSpendMonths(api: ApiClient): Promise<SpendMonthsDataset> {
  const current = fixedMonth();
  const previous = monthBefore(current);
  const tag = Date.now().toString(36);
  const account = await createBankAccount(api, { name: `VUD Bank ${tag}`, openingBalance: 10000 });
  const food = await createCategory(api, `VUD Food ${tag}`);
  const travel = await createCategory(api, `VUD Travel ${tag}`);
  const ids: Record<string, string> = {};
  const add = async (description: string, amount: number, date: string, categoryIds: string[] = []) => {
    const t = await createTransaction(api, account.id, { amount, date, description, categoryIds });
    ids[description] = t.id;
  };
  await add('Swiggy', -700, dayOf(current, 3), [food.id]);
  await add('Zomato', -700, dayOf(current, 8), [food.id]);
  await add('Uber', -300, dayOf(current, 12), [travel.id]);
  await add('Bus', -100, dayOf(current, 18), [travel.id]);
  await add('Salary', 5000, dayOf(current, 25));
  await add('Cafe', -50, dayOf(previous, 4), [food.id]);
  await add('Tea', -50, dayOf(previous, 9), [food.id]);
  await add('Taxi', -400, dayOf(previous, 21), [travel.id]);
  return { account, food, travel, current, previous, ids };
}

/** A month's date filter: between its first and last day. */
export function inMonth(month: { from: string; to: string }, field = 'date'): Filter {
  return { field, operator: 'between', value: { from: month.from, to: month.to } };
}

/** The comparison block that turns on the previous period. */
export const PREVIOUS_PERIOD = { enabled: true, period: 'previous_period', higherIsBetter: false } as const;
