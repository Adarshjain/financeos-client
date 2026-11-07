import { type ApiClient, expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedCardBill } from '../fixtures/seed/obligations';
import { expect, test } from '../fixtures/test';

/**
 * Bill reminders in the Notifications feed. The feed producer runs once a day per user from their send hour; the
 * on-demand evaluate endpoint runs it now (send hour 0 so the hour has always passed). The E2E clock cannot be moved,
 * so "soon" and "overdue" bills are made by pinning the statement's due date relative to today.
 */
async function evaluateFromMidnight(api: ApiClient): Promise<void> {
  expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 0 } }), 200);
  expectStatus(await api.POST('/api/v1/notifications/evaluate'), 200);
}

test.describe('Bill reminders (@ui)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    test.setTimeout(120000);
    user = await createUser(request, 'ui-bill-reminders');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('a bill due soon and an overdue one each get a reminder; it opens that statement on the card page', async ({ page }) => {
    const api = makeApi(user.cookie);
    const soon = await seedCardBill(api, { name: 'Reminder Soon Card', last4: '8101', dueInDays: 2 });
    const late = await seedCardBill(api, { name: 'Reminder Late Card', last4: '8102', dueInDays: -5 });
    await evaluateFromMidnight(api);

    await page.goto('/inbox/updates');
    const rows = page.getByTestId('notification-row');
    const soonRow = rows.filter({ hasText: 'Reminder Soon Card bill due in 2 days' });
    const lateRow = rows.filter({ hasText: 'Reminder Late Card bill overdue by 5 days' });
    await expect(soonRow).toHaveCount(1, { timeout: 45000 });
    await expect(lateRow).toHaveCount(1);
    await expect(soonRow).toContainText('₹6,000');
    await expect(soonRow).toContainText(/due \d+ \w+/);

    // The soon-due row opens the card's Statements tab on that statement.
    await expect(async () => {
      await soonRow.click();
      await expect(page).toHaveURL(new RegExp(`/accounts/${soon.cardId}/statements\\?statement=${soon.statementId}`), { timeout: 5000 });
    }).toPass({ timeout: 30000 });
    await expect(page.getByText('Credit limit').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Due date').first()).toBeVisible();

    // The overdue one opens its own card's statement.
    await page.goto('/inbox/updates');
    await expect(async () => {
      await rows.filter({ hasText: 'Reminder Late Card' }).click();
      await expect(page).toHaveURL(new RegExp(`/accounts/${late.cardId}/statements\\?statement=${late.statementId}`), { timeout: 5000 });
    }).toPass({ timeout: 30000 });
  });

  test('running the reminders again does not add a second row, and paying the bill clears its reminder', async ({ page }) => {
    const api = makeApi(user.cookie);
    const bill = await seedCardBill(api, { name: 'Reminder Pay Card', last4: '8103', dueInDays: 1 });
    await evaluateFromMidnight(api);
    expectStatus(await api.POST('/api/v1/notifications/evaluate'), 200);

    await page.goto('/inbox/updates');
    const row = page.getByTestId('notification-row').filter({ hasText: 'Reminder Pay Card bill due tomorrow' });
    await expect(row).toHaveCount(1, { timeout: 45000 });

    expectStatus(await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: bill.statementId } }, body: {} }), 200);
    await page.reload();
    await expect(page.getByText('No notifications yet')).toBeVisible({ timeout: 45000 });
  });

  test('the Quiet reminder style saves, shows its one-reminder description, and leaves the feed row as it was', async ({ page }) => {
    const api = makeApi(user.cookie);
    await seedCardBill(api, { name: 'Reminder Quiet Card', last4: '8104', dueInDays: 2 });
    await evaluateFromMidnight(api);

    await page.goto('/settings/notifications');
    const reminders = page.getByRole('radiogroup', { name: 'Reminders' }).or(page.getByRole('group', { name: 'Reminders' }));
    await expect(page.getByText('3 days before, the day before, on the day, and weekly while overdue')).toBeVisible({ timeout: 45000 });
    await expect(reminders.first()).toBeVisible();
    // The page is server-rendered: a click before hydration is dropped, so click again until the change shows.
    await expect(async () => {
      await reminders.first().getByRole('radio', { name: 'Quiet' }).click();
      await expect(page.getByText('One reminder the day before. No repeats.')).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await expect.poll(async () => (await api.GET('/api/v1/notifications/settings')).data?.reminderStyle, { timeout: 15000 }).toBe('QUIET');

    await page.reload();
    await expect(page.getByText('One reminder the day before. No repeats.')).toBeVisible({ timeout: 45000 });
    await expect(async () => {
      await reminders.first().getByRole('radio', { name: 'Standard' }).click();
      await expect(page.getByText('3 days before, the day before, on the day, and weekly while overdue')).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await expect.poll(async () => (await api.GET('/api/v1/notifications/settings')).data?.reminderStyle, { timeout: 15000 }).toBe('STANDARD');

    // Style only changes push; the in-app row stays one row either way.
    await page.goto('/inbox/updates');
    await expect(page.getByTestId('notification-row').filter({ hasText: 'Reminder Quiet Card bill due in 2 days' })).toHaveCount(1, { timeout: 45000 });
  });
});
