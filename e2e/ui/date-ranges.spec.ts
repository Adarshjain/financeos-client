import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istNow } from '../fixtures/dates';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { addCardholder, createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { createRewardCard, createRewardRule } from '../fixtures/seed/rewards';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

// Date-range labels (src/lib/date-range.ts) at every surface that shows a range.
// The rules themselves are unit-tested; these check each surface is wired to
// them. Fixed dates sit in past years so the labels do not depend on the run date.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Label of the whole month `monthsAgo` before the current one: "Aug", or "Dec 25" in another year. */
function monthLabel(monthsAgo: number): string {
  const now = istNow();
  const year = now.getUTCFullYear();
  const d = new Date(year, now.getUTCMonth() - monthsAgo, 1);
  const suffix = d.getFullYear() === year ? '' : ` ${String(d.getFullYear() % 100).padStart(2, '0')}`;
  return `${MONTHS[d.getMonth()]}${suffix}`;
}

test.describe('Date ranges (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-date-ranges');
    await loginContext(context, currentUser.cookie);
  });

  test('KPI widgets show the compact range and compared window', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const between = { field: 'date', operator: 'between', value: { from: '2024-09-01', to: '2024-09-30' } };
    const plain = await createReport(api, {
      name: 'Range KPI plain',
      type: 'KPI',
      datasource: 'transactions',
      // The SQL KPI path enables comparison when the definition omits it.
      definition: {
        measure: 'amount',
        aggregation: 'sum',
        filters: [between],
        comparison: { enabled: false, period: 'previous_period' },
      },
    });
    const shifted = await createReport(api, {
      name: 'Range KPI shifted',
      type: 'KPI',
      datasource: 'transactions',
      definition: {
        measure: 'amount',
        aggregation: 'sum',
        filters: [between],
        comparison: { enabled: true, period: 'previous_period', higherIsBetter: false },
      },
    });
    const monthly = await createReport(api, {
      name: 'Range KPI monthly',
      type: 'KPI',
      datasource: 'transactions',
      definition: {
        measure: 'amount',
        aggregation: 'sum',
        filters: [{ field: 'date', operator: 'previous_month', value: null }],
        comparison: { enabled: true, period: 'previous_period', higherIsBetter: false },
      },
    });
    const dashboard = await createDashboard(api, {
      name: 'Date range board',
      widgets: [
        // 100-column grid, 1px rows (DASHBOARD_GRID_COLUMNS / DEFAULT_WIDGET_HEIGHT).
        widget(plain.id, { x: 0, y: 0, w: 50, h: 24 }),
        widget(shifted.id, { x: 50, y: 0, w: 50, h: 24 }),
        widget(monthly.id, { x: 0, y: 24, w: 50, h: 24 }),
      ],
    });

    await page.goto(`/dashboards/${dashboard.id}`);
    const card = (name: string) => page.getByTestId('dashboard-widget').filter({ hasText: name });
    await expect(card('Range KPI plain')).toBeVisible({ timeout: 45_000 });

    // No comparison: the range alone, no stray "vs previous period".
    await expect(card('Range KPI plain').getByText('Sep 24', { exact: true })).toBeVisible();
    await expect(card('Range KPI plain').getByText(/\bvs\b/)).toHaveCount(0);

    // between → previous_period is a flat 30-day shift: equal length, right before.
    await expect(card('Range KPI shifted').getByText('Sep 24', { exact: true })).toBeVisible();
    await expect(card('Range KPI shifted').getByText('vs prev 30d', { exact: true })).toBeVisible();

    // previous_month compares against the month before it, by name.
    await expect(card('Range KPI monthly').getByText(monthLabel(1), { exact: true })).toBeVisible();
    await expect(card('Range KPI monthly').getByText(`vs ${monthLabel(2)}`, { exact: true })).toBeVisible();
  });

  test('statement detail shows its period', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const spec: BankSpec = {
      bank: 'HDFC Bank',
      accountLast10: '4455667788',
      periodStart: '2024-04-05',
      periodEnd: '2024-05-04',
      opening: 10000.0,
      rows: [
        { date: '2024-04-10', description: 'RANGE SALARY CREDIT', credit: 30000.0 },
        { date: '2024-04-22', description: 'RANGE GROCERIES', debit: 1800.0 },
      ],
    };
    const account = await createBankAccount(api, { name: 'Range Bank', openingBalance: spec.opening });
    await uploadAndIngest(api, account.id, [{ filename: 'range-stmt.pdf', buffer: await genBankPdf(spec) }]);

    await page.goto(`/accounts/${account.id}/statements`);
    await expect(page.getByText('Period 5 Apr 24 → 4 May 24')).toBeVisible({ timeout: 45_000 });
  });

  test('reward rules show their active window compactly', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const { account } = await createRewardCard(api, { name: 'Range Rules Card' });
    // activeTo is exclusive: the rule's last day is the day before.
    await createRewardRule(api, account.id, {
      name: 'Range FY Rule',
      activeFrom: '2024-04-01',
      activeTo: '2025-04-01',
    });
    await createRewardRule(api, account.id, { name: 'Range Since Rule', activeFrom: '2024-04-05' });
    await createRewardRule(api, account.id, { name: 'Range Until Rule', activeTo: '2025-04-01' });
    await createRewardRule(api, account.id, { name: 'Range Always Rule' });

    await page.goto('/rewards/rules');
    const rule = (text: string) => page.getByText(text, { exact: true });
    await expect(rule('Range FY Rule · exclusive · FY25 · ended')).toBeVisible({ timeout: 45_000 });
    await expect(rule('Range Until Rule · exclusive · until 31 Mar 25 · ended')).toBeVisible();
    await expect(rule('Range Since Rule · exclusive · since 5 Apr 24')).toBeVisible();
    // No dates at all: no window is shown.
    await expect(rule('Range Always Rule · exclusive')).toBeVisible();
  });

  test('replaced plastics show their issued–closed span compactly', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createCreditCard(api, { name: 'Range Plastics Card' });
    const holder = await addCardholder(api, account.id, {
      personName: 'Range Addon',
      last4: '8888',
      openedOn: '2024-05-01',
      issuedOn: '2024-05-10',
    });
    const res = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/replace',
      {
        params: { path: { accountId: account.id, cardholderId: holder.id, cardId: holder.cards![0].id } },
        body: { newLast4: '8889', issuedOn: '2025-02-14' },
      },
    );
    expect(res.response.ok).toBe(true);

    await page.goto(`/accounts/${account.id}/cards`);
    await expect(page.getByText('10 May 24 → 14 Feb 25')).toBeVisible({ timeout: 45_000 });
  });
});
