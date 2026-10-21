import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { addLending, closeLoan, createCounterparty, createLoan, monthsAgo } from '../fixtures/seed/loans';
import { createTransaction, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Loans & lendings, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-loans');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    /** Three people: Rahul owes 15,000; Priya is owed 12,000; Meera is settled. */
    async function seedPeople() {
      const api = makeApi(currentUser.cookie);
      const rahul = await createCounterparty(api, { name: 'Rahul Sharma' });
      const priya = await createCounterparty(api, { name: 'Priya Nair' });
      const meera = await createCounterparty(api, { name: 'Meera Iyer' });
      await addLending(api, { counterpartyId: rahul.id, direction: 'lent', amount: 15000, entryDate: monthsAgo(1) });
      await addLending(api, { counterpartyId: priya.id, direction: 'borrowed', amount: 12000, entryDate: monthsAgo(1) });
      await addLending(api, { counterpartyId: meera.id, direction: 'lent', amount: 500, entryDate: monthsAgo(2) });
      await addLending(api, { counterpartyId: meera.id, direction: 'borrowed', amount: 500, entryDate: monthsAgo(1) });
      return { rahul, priya, meera };
    }

    test('the nav item opens Lendings first, selected, and the tab switches to Loans', async ({ page }) => {
      await seedPeople();
      await page.goto('/ds');
      if (viewport.width >= 1024) {
        await page.locator('nav.w-container-xs').getByRole('link', { name: 'Loans & lendings' }).click();
      } else {
        await page.locator('nav.desk\\:hidden').getByRole('tab', { name: 'More' }).click();
        await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name: 'Loans & lendings' }).click();
      }
      await page.waitForURL('**/ds/loans/lendings');

      const tabs = page.getByRole('tab');
      await expect(tabs.first()).toContainText('Lendings');
      await expect(tabs.first()).toHaveAttribute('data-state', 'active');
      await expect(tabs.nth(1)).toContainText('Loans');
      await expect(page.getByRole('tab', { name: 'Lendings · 3' })).toBeVisible();

      await page.getByRole('tab', { name: /^Loans/ }).click();
      await page.waitForURL(/\/ds\/loans$/);
      await expect(page.getByRole('tab', { name: /^Loans/ })).toHaveAttribute('data-state', 'active');
    });

    test('Lendings: tiles show the seeded totals, chips filter on the server and search narrows', async ({ page }) => {
      await seedPeople();
      await page.goto('/ds/loans/lendings');

      await expect(page.getByText('₹15,000').first()).toBeVisible(); // Owed to you
      await expect(page.getByText('₹12,000').first()).toBeVisible(); // You owe
      await expect(page.getByText('1 person').first()).toBeVisible();
      for (const name of ['Rahul Sharma', 'Priya Nair', 'Meera Iyer']) {
        await expect(page.getByText(name).first()).toBeVisible();
      }

      await page.getByRole('button', { name: 'Owed to you' }).click();
      await page.waitForURL(/filter=owed/);
      await expect(page.getByText('Rahul Sharma').first()).toBeVisible();
      await expect(page.getByText('Priya Nair')).toHaveCount(0);
      await expect(page.getByText('Meera Iyer')).toHaveCount(0);

      await page.getByRole('button', { name: 'You owe' }).click();
      await page.waitForURL(/filter=owe/);
      await expect(page.getByText('Priya Nair').first()).toBeVisible();
      await expect(page.getByText('Rahul Sharma')).toHaveCount(0);

      await page.getByRole('button', { name: 'Settled' }).click();
      await page.waitForURL(/filter=settled/);
      await expect(page.getByText('Meera Iyer').first()).toBeVisible();
      await expect(page.getByText('Priya Nair')).toHaveCount(0);

      await page.getByRole('button', { name: 'All', exact: true }).click();
      await page.getByPlaceholder('Search people').fill('priya');
      await page.waitForURL(/q=priya/);
      await expect(page.getByText('Priya Nair').first()).toBeVisible();
      await expect(page.getByText('Rahul Sharma')).toHaveCount(0);
    });

    test('Lendings: a person row links to the Legacy person page', async ({ page }) => {
      const { rahul } = await seedPeople();
      await page.goto('/ds/loans/lendings');
      if (viewport.width >= 1024) {
        await expect(page.getByRole('link', { name: 'Open Rahul Sharma' })).toHaveAttribute(
          'href',
          `/loans/lendings/${rahul.id}`,
        );
      } else {
        // On phone the whole row opens the person.
        await page.getByText('Rahul Sharma').first().click();
        await page.waitForURL(`**/loans/lendings/${rahul.id}`);
      }
    });

    test('the + opens Add ledger entry; saving a new person adds a row', async ({ page }) => {
      await seedPeople();
      await page.goto('/ds/loans/lendings');
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();

      const dialog = page.getByRole('dialog', { name: 'Add ledger entry' });
      await expect(dialog).toBeVisible();
      const name = `Kavita Rao ${Date.now()}`;
      await dialog.getByRole('combobox', { name: /^Person/ }).click();
      await page.getByPlaceholder('Type a name').fill(name);
      await page.getByRole('button', { name: `Add "${name}"` }).click();
      await dialog.getByRole('textbox', { name: /^Amount/ }).fill('40000');
      await dialog.getByRole('button', { name: 'Save entry' }).click();

      await expect(dialog).not.toBeVisible();
      await expect(page.getByText(name).first()).toBeVisible();
      await expect(page.getByText('+40,000').first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/ds/loans/lendings');
    });

    test('Loans: tiles, search by lender, Closed · n · Show, and row links', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      const home = await createLoan(api, { name: 'Home Loan', lender: 'SBI MaxGain', loanType: 'home', principal: 1000000, tenureMonths: 120 });
      await createLoan(api, { name: 'Car Loan', lender: 'HDFC Bank', loanType: 'car', principal: 500000, tenureMonths: 60 });
      const old = await createLoan(api, { name: 'Old Bike Loan', lender: 'Bajaj Finserv', loanType: 'two_wheeler', principal: 60000, tenureMonths: 12 });
      await closeLoan(api, old.id);

      await page.goto('/ds/loans');
      for (const label of ['Outstanding', 'EMIs per month', 'Overdue', 'Interest this FY']) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      }
      await expect(page.getByText('of ₹15L borrowed')).toBeVisible();
      await expect(page.getByText('Home Loan').first()).toBeVisible();
      await expect(page.getByText('Car Loan').first()).toBeVisible();
      await expect(page.getByText('Old Bike Loan')).toHaveCount(0);
      if (viewport.width >= 1024) {
        await expect(page.getByRole('link', { name: 'Open Home Loan' })).toHaveAttribute('href', `/ds/loans/${home.id}`);
      }

      await page.getByPlaceholder('Search loans').fill('SBI');
      await page.waitForURL(/q=SBI/);
      await expect(page.getByText('Home Loan').first()).toBeVisible();
      await expect(page.getByText('Car Loan')).toHaveCount(0);

      await page.getByPlaceholder('Search loans').fill('');
      await page.waitForURL((u) => !u.search.includes('q='));
      await expect(page.getByText('Car Loan').first()).toBeVisible();
      await expect(page.getByText('Closed · 1')).toBeVisible();
      await page.getByRole('button', { name: /Show/ }).click();
      await expect(page.getByText('Old Bike Loan').first()).toBeVisible();
      await page.getByRole('button', { name: /Hide/ }).click();
      await expect(page.getByText('Old Bike Loan')).toHaveCount(0);

      // A row opens the loan's (Legacy) page.
      await page.getByText('Home Loan').first().click();
      await page.waitForURL(`**/loans/${home.id}`);
    });

    test('Lendings: a transfer naming a person with no entry is recorded as a settlement, and Undo restores it', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      const asha = await createCounterparty(api, { name: 'Asha Verma' });
      await addLending(api, { counterpartyId: asha.id, direction: 'lent', amount: 2000, entryDate: monthsAgo(1) });
      const bank = await createBankAccount(api, { name: 'Settle Bank' });
      await createTransaction(api, bank.id, { amount: 2000, date: todayString(-1), description: 'UPI from Asha Verma' });

      await page.goto('/ds/loans/lendings');
      const row = page.getByText('Received from Asha Verma · ₹2,000');
      await expect(row).toBeVisible();
      await expect(page.getByText('+2,000')).toBeVisible();

      await page.getByRole('button', { name: 'Record as settlement' }).click();
      await expect(page.getByText('Recorded as settlement with Asha Verma')).toBeVisible();
      await expect(row).toHaveCount(0);
      await expect(page.getByText('+2,000')).toHaveCount(0);
      await expect(page.getByText('Settled').first()).toBeVisible();

      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(row).toBeVisible();
      await expect(page.getByText('+2,000')).toBeVisible();
    });

    test('the + on Loans opens Add loan; creating one adds a row', async ({ page }) => {
      await page.goto('/ds/loans');
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();

      const dialog = page.getByRole('dialog', { name: 'Add loan' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Create loan' }).click();
      await expect(dialog.getByText('Loan name is required')).toBeVisible();

      await dialog.getByRole('textbox', { name: /^Loan name/ }).fill('Scooter Loan UI');
      await dialog.getByRole('textbox', { name: /^Lender/ }).fill('Bajaj Finserv');
      await dialog.getByRole('textbox', { name: /^Principal/ }).fill('90000');
      await dialog.getByRole('textbox', { name: /^Annual rate/ }).fill('11');
      await dialog.getByRole('textbox', { name: /^Tenure/ }).fill('24');
      await dialog.getByRole('button', { name: 'Create loan' }).click();

      await expect(dialog).not.toBeVisible();
      await expect(page.getByText('Scooter Loan UI').first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/ds/loans');
    });
  });
}
