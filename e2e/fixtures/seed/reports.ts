import type { components } from '../../../src/lib/api/schema.d.ts';
import { type ApiClient, expectStatus } from '../api';
import { createBankAccount, createBrokerAccount } from './accounts';
import {
  createDividend,
  createFnoTrade,
  createInstrument,
  generateIsin,
  generateYahooSymbol,
  trade,
} from './investments';
import {
  addDays,
  addLending,
  createCounterparty,
  createLoan,
  pay,
} from './loans';
import { createRewardCard, createRule, fixedMonth, spend } from './rewards';
import { createCategory, createTransaction } from './transactions';

export type CreateReportRequest = components['schemas']['CreateReportRequest'];
export type UpdateReportRequest = components['schemas']['UpdateReportRequest'];
export type ReportResponse = components['schemas']['ReportResponse'];
export type ReportSummaryResponse = components['schemas']['ReportSummaryResponse'];
export type ReportCatalogView = components['schemas']['ReportCatalogView'];
export type ReportData = components['schemas']['ReportData'];
export type RunReportRequest = components['schemas']['RunReportRequest'];
export type CreateDashboardRequest = components['schemas']['CreateDashboardRequest'];
export type UpdateDashboardRequest = components['schemas']['UpdateDashboardRequest'];
export type DashboardResponse = components['schemas']['DashboardResponse'];
export type DashboardWidget = components['schemas']['DashboardWidget'];
export type DashboardSummary = components['schemas']['DashboardSummary'];

let seedCounter = 0;

export { fixedMonth };

/**
 * Returns Indian Financial Year label (e.g. 'FY 25-26' for 2026-01-15, 'FY 26-27' for 2026-06-01).
 */
export function fyLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + (date.length === 10 ? 'T00:00:00Z' : '')) : date;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const sy = String(Math.abs(startYear) % 100).padStart(2, '0');
  const ey = String(Math.abs(endYear) % 100).padStart(2, '0');
  return `FY ${sy}-${ey}`;
}

export function widget(
  reportId: string,
  layout: { x: number; y: number; w: number; h: number },
  title?: string | null,
  id?: string
): DashboardWidget {
  seedCounter += 1;
  return {
    id: id ?? `w-${seedCounter}-${Date.now().toString().slice(-4)}`,
    reportId,
    title: title ?? null,
    layout,
  };
}

export async function createReport(
  api: ApiClient,
  body: CreateReportRequest
): Promise<ReportResponse> {
  const res = await api.POST('/api/v1/reports', {
    body,
  });
  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createReport failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function runSaved(
  api: ApiClient,
  id: string,
  page?: number,
  size?: number
): Promise<ReportData> {
  const res = await api.POST('/api/v1/reports/{id}/data', {
    params: {
      path: { id },
      query: { page, size },
    },
  });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `runSaved failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function runAdHoc(
  api: ApiClient,
  body: RunReportRequest,
  page?: number,
  size?: number
): Promise<ReportData> {
  const res = await api.POST('/api/v1/reports/data', {
    params: {
      query: { page, size },
    },
    body,
  });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `runAdHoc failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function catalog(api: ApiClient): Promise<ReportCatalogView> {
  const res = await api.GET('/api/v1/report/datasource');
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `catalog failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function createDashboard(
  api: ApiClient,
  body: CreateDashboardRequest
): Promise<DashboardResponse> {
  const res = await api.POST('/api/v1/dashboards', {
    body,
  });
  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createDashboard failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

// ============================================================================
// Seed builders for exact-number datasets across all datasources
// ============================================================================

export interface SeededTransactionsDataset {
  account: components['schemas']['BankAccountResponse'];
  foodCat: components['schemas']['CategoryResponse'];
  travelCat: components['schemas']['CategoryResponse'];
  currentMonth: { from: string; to: string; year: number; month: number };
  prevMonth: { from: string; to: string; year: number; month: number };
  currentMonthFoodDebitTotal: number; // e.g. -1500 (-1000 + -500)
  currentMonthTravelDebitTotal: number; // e.g. -2000
  currentMonthCreditTotal: number; // e.g. 5000
  prevMonthFoodDebitTotal: number; // e.g. -800
}

export async function seedTransactionsDataset(
  api: ApiClient
): Promise<SeededTransactionsDataset> {
  const currentMonth = fixedMonth();
  // 1 month prior to currentMonth
  const dPrev = new Date(Date.UTC(currentMonth.year, currentMonth.month - 2, 1));
  const prevYear = dPrev.getUTCFullYear();
  const prevMonthNum = dPrev.getUTCMonth() + 1;
  const prevLastDay = new Date(Date.UTC(prevYear, prevMonthNum, 0)).getUTCDate();
  const prevMonth = {
    from: `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-01`,
    to: `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`,
    year: prevYear,
    month: prevMonthNum,
  };

  const account = await createBankAccount(api, { name: `Reports Account ${Date.now()}` });
  const foodCat = await createCategory(api, `Food-${Date.now()}`);
  const travelCat = await createCategory(api, `Travel-${Date.now()}`);

  const curYm = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;
  const prevYm = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

  // Current month txns
  await createTransaction(api, account.id, {
    amount: -1000,
    date: `${curYm}-05`,
    categoryIds: [foodCat.id],
    description: 'Swiggy Food 1',
  });
  await createTransaction(api, account.id, {
    amount: -500,
    date: `${curYm}-10`,
    categoryIds: [foodCat.id],
    description: 'Zomato Food 2',
  });
  await createTransaction(api, account.id, {
    amount: -2000,
    date: `${curYm}-15`,
    categoryIds: [travelCat.id],
    description: 'Uber Ride',
  });
  await createTransaction(api, account.id, {
    amount: 5000,
    date: `${curYm}-20`,
    description: 'Salary Credit',
  });

  // Previous month txns
  await createTransaction(api, account.id, {
    amount: -800,
    date: `${prevYm}-12`,
    categoryIds: [foodCat.id],
    description: 'Prev Swiggy',
  });

  return {
    account,
    foodCat,
    travelCat,
    currentMonth,
    prevMonth,
    currentMonthFoodDebitTotal: -1500,
    currentMonthTravelDebitTotal: -2000,
    currentMonthCreditTotal: 5000,
    prevMonthFoodDebitTotal: -800,
  };
}
