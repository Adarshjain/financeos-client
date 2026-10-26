import { type BankAccountRequest, createBankAccount } from '../fixtures/seed/accounts';
import { createReport, runSaved } from '../fixtures/seed/reports';
import { createTransaction } from '../fixtures/seed/transactions';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Report account filter (@api)', () => {
  test('an "account is <id>" filter keeps its figure after the account is renamed', async ({ request }) => {
    const { api } = await newUser(request, 'report-account-filter');
    const account = await createBankAccount(api, { name: 'Filter Bank' });
    await createTransaction(api, account.id, { amount: -250, description: 'Account filter spend' });

    const values = await api.GET('/api/v1/report/datasource/{name}/values', { params: { path: { name: 'transactions' } } });
    expect(values.response.status).toBe(200);
    expect(values.data?.options?.account).toContainEqual({ value: account.id, label: 'Filter Bank' });

    const report = await createReport(api, {
      name: 'Spend in one account',
      type: 'KPI',
      datasource: 'transactions',
      definition: {
        measure: 'amount',
        aggregation: 'sum',
        filters: [{ field: 'account', operator: 'is', value: account.id }],
      },
    });
    const before = (await runSaved(api, report.id)) as { value: number };
    expect(before.value).not.toBe(0);

    const rename: BankAccountRequest = {
      type: 'bank_account',
      name: 'Filter Bank Renamed',
      last4: '1234',
      openingBalance: 1000,
      financialPosition: 'asset',
      excludeFromNetAsset: false,
    };
    const renamed = await api.PUT('/api/v1/accounts/{id}', {
      params: { path: { id: account.id } },
      body: rename,
    });
    expect(renamed.response.status).toBe(200);

    const after = (await runSaved(api, report.id)) as { value: number };
    expect(after.value).toBe(before.value);
  });
});
