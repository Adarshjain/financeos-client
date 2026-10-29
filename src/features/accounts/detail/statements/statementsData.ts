import type { Account } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import type { CardBillResponse } from '@/lib/api/types';
import { billsApi } from '@/lib/apiClient';
import type { StatementSummary } from '@/lib/statement.types';
import { AccountType } from '@/lib/types';

import { buildHeaderModel, type MarkPaidTarget } from '../overview/headerModel';
import type { StatementDetailData } from './detailModel';
import { buildStatementsView, fyBounds, type StatementsView } from './listModel';

export interface StatementsData {
  /** Null when the statements request failed: nothing else can show. */
  statements: StatementSummary[] | null;
  view: StatementsView | null;
  /** The selected statement's detail; null when its request failed or nothing is selected. */
  detail: StatementDetailData | null;
  detailFailed: boolean;
  /** Bill per statement of the shown year (cards only); a failed bill is simply missing. */
  bills: Record<string, CardBillResponse>;
  /** The card's current open bill, for the header's Mark paid. */
  markPaid: MarkPaidTarget | null;
}

/** The account's statements; null when the request failed (the helper in apiClient turns errors into an empty list). */
async function loadStatements(accountId: string): Promise<StatementSummary[] | null> {
  try {
    const { data, error } = await serverApi.GET('/api/v1/accounts/{accountId}/statements', {
      params: { path: { accountId } },
    });
    return error || data == null ? null : (data as StatementSummary[]);
  } catch {
    return null;
  }
}

async function loadDetail(statementId: string): Promise<StatementDetailData | null> {
  const { data } = await serverApi.GET('/api/v1/statements/{statementId}', {
    params: { path: { statementId } },
  });
  return data ?? null;
}

/** The card's bills dated in the year, one request; a failed request leaves every bill missing. */
async function loadBills(accountId: string, fy: string): Promise<CardBillResponse[]> {
  const { data } = await serverApi.GET('/api/v1/bills/history', {
    params: { query: { accountId, ...fyBounds(fy) } },
  });
  return data ?? [];
}

/**
 * The Statements tab's data: the account's statements first (they decide the year and the selected
 * statement), then the selected detail, the year's bills (one request) and the current bill in parallel. Every
 * piece after the list degrades on its own.
 */
export async function loadStatementsData(
  account: Account,
  params: { fy?: string; statement?: string },
  today: string
): Promise<StatementsData> {
  const isCard = account.type === AccountType.CREDIT_CARD;
  const statements = await loadStatements(account.id);
  if (!statements) {
    return { statements: null, view: null, detail: null, detailFailed: false, bills: {}, markPaid: null };
  }
  const view = buildStatementsView(statements, params.fy, params.statement, today);

  // Bills and the current bill are optional pieces; the statement detail failing is surfaced as 'failed'.
  const [detail, billList, current] = await Promise.all([
    view.selectedId ? loadDetail(view.selectedId).catch(() => 'failed' as const) : Promise.resolve(null),
    isCard && view.inFy.length > 0 ? loadBills(account.id, view.fy).catch(() => []) : Promise.resolve([]),
    isCard ? billsApi.list(account.id).catch(() => null) : Promise.resolve(null),
  ]);

  const bills: Record<string, CardBillResponse> = {};
  const inFyIds = new Set(view.inFy.map((s) => s.id));
  for (const bill of billList) {
    if (bill.statementId && inFyIds.has(bill.statementId)) bills[bill.statementId] = bill;
  }
  const currentBill = current?.find((b) => b.accountId === account.id) ?? current?.[0] ?? null;

  return {
    statements,
    view,
    detail: detail === 'failed' ? null : detail,
    detailFailed: detail === 'failed' || (view.selectedId != null && detail == null),
    bills,
    markPaid: isCard ? buildHeaderModel(account, currentBill, today).markPaid : null,
  };
}
