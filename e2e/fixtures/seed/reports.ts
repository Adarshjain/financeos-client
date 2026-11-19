import type { components } from '../../../src/lib/api/schema.d.ts';
import { type ApiClient } from '../api';
import { istToday } from '../dates';
import { createBankAccount } from './accounts';
import {
} from './investments';
import {
} from './loans';
import { fixedMonth } from './rewards';
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
  foodCat: components['schemas']['TagResponse'];
  travelCat: components['schemas']['TagResponse'];
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
    tagIds: [foodCat.id],
    description: 'Swiggy Food 1',
  });
  await createTransaction(api, account.id, {
    amount: -500,
    date: `${curYm}-10`,
    tagIds: [foodCat.id],
    description: 'Zomato Food 2',
  });
  await createTransaction(api, account.id, {
    amount: -2000,
    date: `${curYm}-15`,
    tagIds: [travelCat.id],
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
    tagIds: [foodCat.id],
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

// ============================================================================
// Fixed categories: sub-category, "Others", uncategorised, transfer and excluded rows
// ============================================================================

export interface SeededCategoriesDataset {
  account: components['schemas']['BankAccountResponse'];
  /** Descriptions of the seeded rows, by what they stand for. */
  descriptions: {
    delivery: string;
    dining: string;
    foodOthers: string;
    cabs: string;
    transportOthers: string;
    uncategorised: string;
    selfTransfer: string;
    excluded: string;
  };
  /** The amount of each row (debits, positive here). */
  amounts: {
    delivery: number;
    dining: number;
    foodOthers: number;
    cabs: number;
    transportOthers: number;
    uncategorised: number;
    selfTransfer: number;
    excluded: number;
  };
  /** What "counts as spend or income" keeps: every row but the self transfer and the excluded one. */
  countedSpend: number;
}

/**
 * This month's rows, all debits on one new account of `api`'s user, with fixed categories chosen explicitly:
 * a sub-category row, a category with no sub-category (twice, in two categories), an uncategorised row, a row in
 * `self_transfer` and a row excluded by hand. Use a fresh user when a user-wide figure is asserted.
 */
export async function seedCategoriesDataset(api: ApiClient): Promise<SeededCategoriesDataset> {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const account = await createBankAccount(api, { name: `Categories Account ${tag}` });
  const date = istToday();
  const descriptions = {
    delivery: `Cat delivery ${tag}`,
    dining: `Cat dining ${tag}`,
    foodOthers: `Cat food others ${tag}`,
    cabs: `Cat cabs ${tag}`,
    transportOthers: `Cat transport others ${tag}`,
    // A name the built-in engine cannot place, so the row stays uncategorised.
    uncategorised: `Zxqv uncategorised ${tag}`,
    selfTransfer: `Cat self transfer ${tag}`,
    excluded: `Cat excluded ${tag}`,
  };
  const amounts = { delivery: 300, dining: 200, foodOthers: 100, cabs: 400, transportOthers: 60, uncategorised: 50, selfTransfer: 999, excluded: 777 };
  const add = (description: string, amount: number, extra: { categoryKey?: string; subcategoryKey?: string; isTransactionExcluded?: boolean }) =>
    createTransaction(api, account.id, { amount: -amount, date, description, ...extra });

  await add(descriptions.delivery, amounts.delivery, { categoryKey: 'food', subcategoryKey: 'food.delivery' });
  await add(descriptions.dining, amounts.dining, { categoryKey: 'food', subcategoryKey: 'food.dining' });
  await add(descriptions.foodOthers, amounts.foodOthers, { categoryKey: 'food' });
  await add(descriptions.cabs, amounts.cabs, { categoryKey: 'transport', subcategoryKey: 'transport.cabs' });
  await add(descriptions.transportOthers, amounts.transportOthers, { categoryKey: 'transport' });
  await add(descriptions.uncategorised, amounts.uncategorised, {});
  await add(descriptions.selfTransfer, amounts.selfTransfer, { categoryKey: 'self_transfer' });
  await add(descriptions.excluded, amounts.excluded, { categoryKey: 'food', subcategoryKey: 'food.delivery', isTransactionExcluded: true });

  return {
    account,
    descriptions,
    amounts,
    countedSpend: amounts.delivery + amounts.dining + amounts.foodOthers + amounts.cabs + amounts.transportOthers + amounts.uncategorised,
  };
}
