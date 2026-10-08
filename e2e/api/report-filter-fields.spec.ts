import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createRewardCard, spend } from '../fixtures/seed/rewards';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, freshUser, test } from '../fixtures/test';

type Filter = { field: string; operator: string; value?: unknown };

async function kpi(api: ApiClient, datasource: string, measure: string, filters: Filter[]) {
  return api.POST('/api/v1/reports/data', {
    body: { type: 'KPI', datasource, definition: { measure, aggregation: 'sum', filters } } as never,
  });
}

test.describe('Report filter fields API (@api)', () => {
  test('grouping-only fields are marked not filterable and rejected as filters', async ({ request }) => {
    const { api } = await freshUser(request, 'filter-fields');
    const res = await api.GET('/api/v1/report/datasource');
    expectStatus(res, 200);
    const notFilterable = res.data!.datasources.flatMap((d) =>
      d.fields.filter((f) => f.filterable === false).map((f) => `${d.name}.${f.name}`),
    );
    expect(notFilterable.sort()).toEqual([
      'attention.href',
      'attention.id',
      'lendings.counterpartyId',
      'lendings.transactionId',
      'loan_payments.loanId',
      'loan_tax_summary.loanId',
      'net_worth.id',
      'obligations.href',
      'obligations.id',
      'obligations.refId',
      'reward_earnings.cycle',
      'reward_earnings.rewardYear',
      'reward_earnings.txnCount',
      'transactions.billingCycle',
    ]);
    // Every other field leaves the flag out (filterable).
    expect(res.data!.datasources.flatMap((d) => d.fields).filter((f) => f.filterable === true)).toEqual([]);

    const cases: Array<[string, string, Filter, string]> = [
      ['transactions', 'amount', { field: 'billingCycle', operator: 'contains', value: '2026' }, 'Billing cycle'],
      ['reward_earnings', 'valueInr', { field: 'rewardYear', operator: 'contains', value: '2026' }, 'Reward year'],
      ['reward_earnings', 'valueInr', { field: 'txnCount', operator: 'equals', value: 1 }, 'Eligible transactions'],
      ['lendings', 'amount', { field: 'counterpartyId', operator: 'exact', value: 'x' }, 'Counterparty ID'],
      ['loan_payments', 'paidAmount', { field: 'loanId', operator: 'exact', value: 'x' }, 'Loan ID'],
    ];
    for (const [ds, measure, filter, label] of cases) {
      const r = await kpi(api, ds, measure, [filter]);
      expect(r.response.status, `${ds}.${filter.field}`).toBe(400);
      expect((r.error as { message?: string }).message).toBe(`'${label}' can't be used as a filter; group by it or show it as a column instead`);
    }
  });

  test('source and channel list the real values and filter by them; cardholder is a dropdown', async ({ request }) => {
    const { api } = await freshUser(request, 'filter-fields');
    const res = await api.GET('/api/v1/report/datasource');
    const tx = res.data!.datasources.find((d) => d.name === 'transactions')!.fields;
    const field = (name: string) => tx.find((f) => f.name === name)!;
    expect(field('source').values).toEqual(['gmail_transaction_alert', 'gmail_statement', 'manual', 'file_upload']);
    expect(field('channel').values).toEqual(['ONLINE', 'POS', 'UPI', 'CONTACTLESS', 'ATM', 'OTHER']);
    expect(field('cardholder')).toMatchObject({ type: 'enum', dynamic: true });
    expect(res.data!.datasources.find((d) => d.name === 'loan_tax_summary')!.fields.find((f) => f.name === 'financialYear'))
      .toMatchObject({ type: 'enum', dynamic: true });

    const { account, cards } = await createRewardCard(api, { name: 'Filter Fields Card', cardholders: [{ name: 'Primary' }, { name: 'Asha' }] });
    await spend(api, account.id, { amount: 1000, date: istToday(), channel: 'ATM', cardId: cards[1].id });
    await createTransaction(api, account.id, { amount: -200, date: istToday(), description: 'No card' });

    const value = async (filters: Filter[]) => {
      const r = await kpi(api, 'transactions', 'amount', filters);
      expectStatus(r, 200);
      return Number((r.data as unknown as { value: number }).value);
    };
    expect(await value([{ field: 'channel', operator: 'is', value: 'ATM' }])).toBe(-1000);
    expect(await value([{ field: 'source', operator: 'is', value: 'manual' }])).toBe(-1200);

    const values = await api.GET('/api/v1/report/datasource/{name}/values', { params: { path: { name: 'transactions' } } });
    expectStatus(values, 200);
    expect(values.data!.values.cardholder).toEqual(['Asha', 'Unattributed']);
    expect(await value([{ field: 'cardholder', operator: 'is', value: 'Asha' }])).toBe(-1000);
    expect(await value([{ field: 'cardholder', operator: 'is', value: 'Unattributed' }])).toBe(-200);
  });
});
