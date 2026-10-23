import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

const SHOWN = '₹ —';
/** The Hide amounts switch: found through its row's description (the switch itself is only named "Toggle"). */
const hideSwitch = (page: Page, container: string, description: string) =>
  page.locator(container).locator('div').filter({ hasText: description }).filter({ has: page.getByRole('switch') }).last().getByRole('switch');
const row = (page: Page, text: string | RegExp) => page.getByRole('row').filter({ hasText: text });

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds Hide amounts, ${viewport.name} (${viewport.tag})`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-hide');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const api = makeApi(currentUser.cookie);
      const bank = await createBankAccount(api, { name: 'Main Bank', openingBalance: 7654 });
      await createTransaction(api, bank.id, { amount: -1250, date: todayString(-1), description: 'Uber Ride' });
      await createTransaction(api, bank.id, { amount: 50000, date: todayString(-2), description: 'Salary Credit' });
    });

    const openTransactions = async (page: Page) => {
      await page.goto('/ds/transactions');
      await expect(row(page, 'Uber Ride')).toBeVisible({ timeout: 45_000 });
    };

    /** The eye in the top bar (its name flips with the state). */
    const eye = (page: Page, name: 'Hide amounts' | 'Show amounts') =>
      page.getByRole('banner').getByRole('button', { name });

    test('the top-bar eye hides every amount and the balance line, and shows them again', async ({ page }) => {
      await openTransactions(page);
      const uber = row(page, 'Uber Ride');
      await expect(uber).toContainText('1,250');
      await expect(uber).toContainText('₹');

      await eye(page, 'Hide amounts').click();
      await expect(uber).toContainText(SHOWN);
      await expect(uber).not.toContainText('1,250');
      await expect(row(page, 'Salary Credit')).not.toContainText('50,000');
      // The running balance goes with it: on phone the line under the amount is gone, not "₹ —".
      if (phone) await expect(uber.getByText(SHOWN).locator('visible=true')).toHaveCount(1);
      await expect(page.locator('main')).not.toContainText(/\d,\d{3}/);

      await eye(page, 'Show amounts').click();
      await expect(uber).toContainText('1,250');
    });

    test('the choice survives a reload and the first HTML already hides the amounts', async ({ page }) => {
      await openTransactions(page);
      await eye(page, 'Hide amounts').click();
      await expect(row(page, 'Uber Ride')).toContainText(SHOWN);

      // The server renders from the cookie: strip scripts so only the painted markup is left.
      const response = await page.request.get('/ds/transactions');
      const markup = (await response.text()).replace(/<script[\s\S]*?<\/script>/g, '');
      expect(markup).toContain('Uber Ride');
      expect(markup).not.toContain('1,250');
      expect(markup).not.toContain('50,000');

      await page.reload();
      await expect(row(page, 'Uber Ride')).toContainText(SHOWN);
      await expect(row(page, 'Uber Ride')).not.toContainText('1,250');
      await expect(eye(page, 'Show amounts')).toBeVisible();
    });

    test('Accounts: balances read "₹ —" while hidden', async ({ page }) => {
      await page.goto('/ds/accounts');
      await expect(page.getByText('Main Bank').first()).toBeVisible({ timeout: 45_000 });
      await expect(page.locator('main')).toContainText('56,404');

      await eye(page, 'Hide amounts').click();
      await expect(page.locator('main')).not.toContainText('56,404');
      await expect(page.locator('main')).toContainText(SHOWN);
    });

    test('Settings: the switch hides amounts, the top-bar eye follows it', async ({ page }) => {
      await page.goto('/ds/settings');
      const toggle = hideSwitch(page, 'main', 'balances and amounts');
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      await expect(eye(page, 'Show amounts')).toBeVisible();

      await page.reload();
      await expect(hideSwitch(page, 'main', 'balances and amounts')).toHaveAttribute('aria-checked', 'true');
      await openTransactions(page);
      await expect(row(page, 'Uber Ride')).toContainText(SHOWN);

      await page.goto('/ds/settings');
      await hideSwitch(page, 'main', 'balances and amounts').click();
      await openTransactions(page);
      await expect(row(page, 'Uber Ride')).toContainText('1,250');
    });

    test('inputs are not hidden: the amount typed in Add transaction stays readable', async ({ page }) => {
      await openTransactions(page);
      await eye(page, 'Hide amounts').click();
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Add transaction' });
      await expect(dialog).toBeVisible();
      const amount = dialog.getByRole('textbox', { name: 'Amount', exact: true });
      await amount.fill('4321');
      await expect(amount).toHaveValue('4321');
    });

    if (phone) {
      test('the More sheet has the switch too', async ({ page }) => {
        await openTransactions(page);
        await page.getByRole('navigation', { name: 'Primary' }).getByRole('tab', { name: 'Menu' }).click();
        const toggle = hideSwitch(page, '[role="dialog"]', 'instead of amounts');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('Escape');
        await expect(row(page, 'Uber Ride')).toContainText(SHOWN);
      });
    }
  });
}
