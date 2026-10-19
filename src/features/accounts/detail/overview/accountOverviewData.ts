import { type BankAccount,type Broker, type GenericAccount } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import type { StatementSummary } from '@/lib/statement.types';
import type { Transaction } from '@/lib/transaction.types';

import type { FlowInput } from './accountOverviewModel';
import { loadIdentifiers, loadRecent, RECENT_TRANSACTIONS } from './cardOverviewData';

type Recent = { items: Transaction[]; total: number };

export const WALLET_RECENT = 5;

export interface PaymentsFrom {
  emis: { loanId: string; name: string; amount: number; nextDueDate?: string | null }[];
  cardBills: { accountId: string; name: string }[];
}

export interface GmailSummary {
  lastAlert: { description: string; amount: number; date: string } | null;
  unmatchedCount: number;
}

/** Each piece is null when its own request failed. */
export interface BankOverviewData {
  flow: FlowInput | null;
  statements: StatementSummary[] | null;
  gmail: GmailSummary | null;
  identifiers: string[] | null;
  payments: PaymentsFrom | null;
  recent: Recent | null;
}

export interface WalletOverviewData {
  recent: Recent | null;
}

export interface BrokerOverviewData {
  recent: Recent | null;
}

const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

async function loadFlow(id: string): Promise<FlowInput> {
  const { data } = await serverApi.GET('/api/v1/accounts/{id}/flow-summary', { params: { path: { id } } });
  if (!data) throw new Error('flow-summary failed');
  return data;
}

/** Throws on a failed request (statementsApi.listByAccount would return [] and hide the failure). */
async function loadStatements(accountId: string): Promise<StatementSummary[]> {
  const { data } = await serverApi.GET('/api/v1/accounts/{accountId}/statements', {
    params: { path: { accountId } },
  });
  if (!data) throw new Error('statements failed');
  return data as StatementSummary[];
}

async function loadPayments(id: string): Promise<PaymentsFrom> {
  const { data } = await serverApi.GET('/api/v1/accounts/{id}/payments-from', { params: { path: { id } } });
  if (!data) throw new Error('payments-from failed');
  return data;
}

async function loadGmailSummary(id: string): Promise<GmailSummary> {
  const { data } = await serverApi.GET('/api/v1/accounts/{id}/gmail-summary', { params: { path: { id } } });
  if (!data) throw new Error('gmail-summary failed');
  return {
    lastAlert: data.lastAlert
      ? {
          description: data.lastAlert.description,
          amount: data.lastAlert.amount,
          date: data.lastAlert.date,
        }
      : null,
    unmatchedCount: data.unmatchedCount,
  };
}

/** Everything the bank Overview needs, fetched in parallel; each piece degrades on its own. */
export async function loadBankOverviewData(account: BankAccount): Promise<BankOverviewData> {
  const id = account.id;
  const [flow, statements, gmail, identifiers, payments, recent] = await Promise.allSettled([
    loadFlow(id),
    loadStatements(id),
    loadGmailSummary(id),
    loadIdentifiers(id),
    loadPayments(id),
    loadRecent(id, RECENT_TRANSACTIONS),
  ]);
  return {
    flow: ok(flow),
    statements: ok(statements),
    gmail: ok(gmail),
    identifiers: ok(identifiers),
    payments: ok(payments),
    recent: ok(recent),
  };
}

export async function loadWalletOverviewData(account: GenericAccount): Promise<WalletOverviewData> {
  const [recent] = await Promise.allSettled([loadRecent(account.id, WALLET_RECENT)]);
  return { recent: ok(recent) };
}

export async function loadBrokerOverviewData(account: Broker): Promise<BrokerOverviewData> {
  const [recent] = await Promise.allSettled([loadRecent(account.id, RECENT_TRANSACTIONS)]);
  return { recent: ok(recent) };
}
