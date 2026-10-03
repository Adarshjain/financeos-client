import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istNow } from '../fixtures/dates';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { addCardholder, createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { createMilestone, createRewardCard, createRewardRule } from '../fixtures/seed/rewards';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

// Compact date-range labels (src/lib/date-range.ts) at every surface that shows
// a range. The rules themselves are unit-tested; these check each surface is
// wired to them and keeps the full dates in the hover title. Fixed dates sit in
// past years so the labels do not depend on the run date.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Label of the whole month `monthsAgo` before the current one: "Aug", or "Dec 25" in another year. */
function monthLabel(monthsAgo: number): string {
  const now = istNow();
  const year = now.getUTCFullYear();
  const d = new Date(year, now.getUTCMonth() - monthsAgo, 1);
  const suffix = d.getFullYear() === year ? '' : ` ${String(d.getFullYear() % 100).padStart(2, '0')}`;
  return `${MONTHS[d.getMonth()]}${suffix}`;
}

// formatDate renders September as "Sep" or "Sept" depending on the ICU build.
const SEP = 'Sept?';

test.describe('Compact date ranges (@ui)', () => {
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
    await expect(page.getByRole('heading', { name: 'Date range board' })).toBeVisible();

    // No comparison: the range alone — no stray "vs previous period".
    const plainLine = page.getByText('Sep 24', { exact: true });
    await expect(plainLine).toBeVisible();
    await expect(plainLine).toHaveAttribute('title', new RegExp(`^1 ${SEP} 24 – 30 ${SEP} 24$`));

    // between → previous_period is a flat 30-day shift: equal length, right before.
    const shiftedLine = page.getByText('Sep 24 vs prev 30d', { exact: true });
    await expect(shiftedLine).toBeVisible();
    await expect(shiftedLine).toHaveAttribute(
      'title',
      new RegExp(`^1 ${SEP} 24 – 30 ${SEP} 24 vs 2 Aug 24 – 31 Aug 24$`),
    );

    // previous_month compares against the month before it, by name.
    await expect(
      page.getByText(`${monthLabel(1)} vs ${monthLabel(2)}`, { exact: true }),
    ).toBeVisible();
  });

  test('statements archive and detail show the compact period @mobile', async ({ page }) => {
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
    await uploadAndIngest(api, account.id, [
      { filename: 'range-stmt.pdf', buffer: await genBankPdf(spec) },
    ]);

    await page.goto('/accounts');
    await expect(page.getByText('Range Bank')).toBeVisible();
    const card = page.getByText('Range Bank').locator('xpath=ancestor::div[contains(@class, "group")]');
    await card.getByRole('button', { name: 'Statements' }).first().click();

    const archive = page.getByRole('dialog');
    await expect(archive.getByText('Statements Archive')).toBeVisible();
    // Desktop table or mobile list, whichever this viewport renders.
    const period = archive.getByText('5 Apr – 4 May 24', { exact: true }).filter({ visible: true });
    await expect(period).toBeVisible();
    await expect(period).toHaveAttribute('title', '5 Apr 24 – 4 May 24');

    await archive.getByRole('button', { name: /View details/i }).first().click();
    await expect(page.getByText('Statement Details', { exact: true })).toBeVisible();
    const header = page.getByTitle('5 Apr 24 – 4 May 24').filter({ hasText: /^5 Apr – 4 May 24$/ }).last();
    await expect(header).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Reward Rules', exact: true })).toBeVisible();
    await page.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Range Rules Card' }).click();

    const fyWindow = page.getByText('FY25', { exact: true });
    await expect(fyWindow).toBeVisible();
    await expect(fyWindow).toHaveAttribute('title', '1 Apr 24 – 31 Mar 25');

    const untilWindow = page.getByText('until 31 Mar 25', { exact: true });
    await expect(untilWindow).toBeVisible();
    await expect(untilWindow).toHaveAttribute('title', 'until 31 Mar 25');

    const sinceWindow = page.getByText('since 5 Apr 24', { exact: true });
    await expect(sinceWindow).toBeVisible();
    await expect(sinceWindow).toHaveAttribute('title', 'since 5 Apr 24');

    // No dates at all keeps the plain word.
    const alwaysRow = page.getByText('Range Always Rule').locator('xpath=../..');
    await expect(alwaysRow.getByText(/·\s*always$/)).toBeVisible();
  });

  test('milestones show their window compactly', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const { account } = await createRewardCard(api, { name: 'Range Milestone Card' });
    await createMilestone(api, account.id, { name: 'Range Monthly Milestone', windowType: 'CALENDAR_MONTH' });

    await page.goto('/rewards');
    await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible();
    await page.locator('button[role="combobox"]:visible').first().click();
    await page.getByRole('option', { name: 'Range Milestone Card' }).click();
    await page.locator('button[role="combobox"]:visible').nth(1).click();
    await page.getByRole('option', { name: 'This month' }).click();

    await expect(page.getByText('Range Monthly Milestone')).toBeVisible();
    // The current calendar month is a whole named month in the current year.
    const milestoneWindow = page.getByText(monthLabel(0), { exact: true });
    await expect(milestoneWindow).toBeVisible();
    await expect(milestoneWindow).toHaveAttribute('title', /^1 \S+ \d\d – \d\d \S+ \d\d$/);
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

    await page.goto('/accounts');
    await expect(page.getByText('Range Plastics Card')).toBeVisible();
    await page.getByRole('button', { name: 'Cards' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Replaced \/ Closed Plastics/i)).toBeVisible();
    const span = dialog.getByText('(10 May 24 – 14 Feb 25)', { exact: true });
    await expect(span).toBeVisible();
    await expect(span).toHaveAttribute('title', '10 May 24 – 14 Feb 25');
  });
});
