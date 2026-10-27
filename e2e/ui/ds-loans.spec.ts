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
        await page.locator('nav.desk\\:hidden').getByRole('tab', { name: 'Menu' }).click();
        await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Loans & lendings' }).click();
      }
      await page.waitForURL('**/loans/lendings');

      const tabs = page.getByRole('tab');
      await expect(tabs.first()).toContainText('Lendings');
      await expect(tabs.first()).toHaveAttribute('data-state', 'active');
      await expect(tabs.nth(1)).toContainText('Loans');
      await expect(page.locator('main').getByRole('tab', { name: 'Lendings', exact: true })).toBeVisible();

      await page.getByRole('tab', { name: /^Loans/ }).click();
      await page.waitForURL(/\/loans$/);
      await expect(page.getByRole('tab', { name: /^Loans/ })).toHaveAttribute('data-state', 'active');
    });

    test('Lendings: tiles show the seeded totals, chips filter on the server and search narrows', async ({ page }) => {
      await seedPeople();
      await page.goto('/loans/lendings');

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
      await page.getByPlaceholder('Search').fill('priya');
      await page.waitForURL(/q=priya/);
      await expect(page.getByText('Priya Nair').first()).toBeVisible();
      await expect(page.getByText('Rahul Sharma')).toHaveCount(0);
    });

    test('Lendings: a person row links to the Dinero person page', async ({ page }) => {
      const { rahul } = await seedPeople();
      await page.goto('/loans/lendings');
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

    /** Rahul lent 25,000 and was repaid 10,000: he owes 15,000. */
    async function seedLedger() {
      const api = makeApi(currentUser.cookie);
      const rahul = await createCounterparty(api, { name: 'Rahul Sharma', notes: 'College friend' });
      await addLending(api, { counterpartyId: rahul.id, direction: 'lent', amount: 25000, entryDate: monthsAgo(3), notes: 'Laptop advance' });
      await addLending(api, { counterpartyId: rahul.id, direction: 'borrowed', amount: 10000, entryDate: monthsAgo(1), notes: 'Part repayment' });
      return { api, rahul };
    }

    const personPath = (id: string) => `/loans/lendings/${id}`;

    test('Person: opening a person from the list shows the ledger with the running balance, outside the tabs', async ({ page }) => {
      const { rahul } = await seedPeople();
      await page.goto('/loans/lendings');
      if (viewport.width >= 1024) await page.getByRole('link', { name: 'Open Rahul Sharma' }).click();
      else await page.getByText('Rahul Sharma').first().click();
      await page.waitForURL(`**${personPath(rahul.id)}`);

      await expect(page.getByText('Owes you', { exact: true })).toBeVisible();
      await expect(page.getByText('₹15,000').first()).toBeVisible();
      await expect(page.getByText('Running balance · positive means Rahul owes you')).toBeVisible();
      await expect(page.getByText('Opening ₹0 · lent ₹15,000 · received ₹0 · closing ₹15,000')).toBeVisible();
      // The Lendings · Loans tabs belong to the two lists, not to a person's page.
      await expect(page.locator('main').getByRole('tab', { name: /^(Lendings|Loans)$/ })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Back' }).first()).toHaveAttribute('href', '/loans/lendings');
    });

    test('Person: entries show Lent, Received and the balance after each', async ({ page }) => {
      const { rahul } = await seedLedger();
      await page.goto(personPath(rahul.id));

      await expect(page.getByText('Laptop advance').first()).toBeVisible();
      await expect(page.getByText('Part repayment').first()).toBeVisible();
      await expect(page.getByText('Opening ₹0 · lent ₹25,000 · received ₹10,000 · closing ₹15,000')).toBeVisible();
      if (viewport.width >= 1024) {
        await expect(page.getByRole('columnheader', { name: 'Balance' })).toBeVisible();
        const newest = page.getByRole('button').filter({ hasText: 'Part repayment' });
        await expect(newest).toContainText('+10,000');
        await expect(newest).toContainText('15,000');
        const oldest = page.getByRole('button').filter({ hasText: 'Laptop advance' });
        await expect(oldest).toContainText('25,000');
      } else {
        await expect(page.getByText(/^\d+ \w+ · borrowed ₹10,000/)).toBeVisible();
        await expect(page.getByText(/^\d+ \w+ · lent ₹25,000/)).toBeVisible();
      }
    });

    test('Person: the + opens Add ledger entry with this person already picked', async ({ page }) => {
      const { rahul } = await seedLedger();
      await page.goto(personPath(rahul.id));
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Add ledger entry' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('combobox', { name: /^Person/ })).toContainText('Rahul Sharma');
      await dialog.getByRole('textbox', { name: /^Amount/ }).fill('700');
      await dialog.getByRole('button', { name: 'Save entry' }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.getByText('Opening ₹0 · lent ₹25,700 · received ₹10,000 · closing ₹15,700')).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(personPath(rahul.id));
    });

    test('Person: Settle up with a picked transaction links it to the entry', async ({ page }) => {
      const { api, rahul } = await seedLedger();
      const bank = await createBankAccount(api, { name: 'Settle Bank' });
      await createTransaction(api, bank.id, { amount: 15000, date: todayString(-1), description: 'UPI from Rahul Sharma' });

      await page.goto(personPath(rahul.id));
      await page.getByRole('button', { name: 'Settle up' }).click();
      const dialog = page.getByRole('dialog', { name: 'Settle up with Rahul' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Balance ₹15,000 in your favour')).toBeVisible();

      await dialog.getByRole('radio', { name: /UPI from Rahul Sharma/ }).click();
      await dialog.getByRole('button', { name: 'Record settlement' }).click();

      await expect(dialog).not.toBeVisible();
      await expect(page.getByText('Settled', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Linked', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Opening ₹0 · lent ₹25,000 · received ₹25,000 · closing ₹0')).toBeVisible();

      const res = await api.GET('/api/v1/counterparties/{id}/ledger', { params: { path: { id: rahul.id } } });
      const newest = res.data!.entries.content[0];
      expect(newest.kind).toBe('settlement');
      expect(newest.transaction?.description).toBe('UPI from Rahul Sharma');
    });

    test('Person: Export ledger opens from the menu, the share row and ?export=1, and previews the entries', async ({ page }) => {
      const { rahul } = await seedLedger();
      const preview = page.getByTestId('ledger-export-preview');

      await page.goto(personPath(rahul.id));
      await page.getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('menuitem', { name: 'Export ledger' }).click();
      const dialog = page.getByRole('dialog', { name: 'Export ledger' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId('export-selected-count')).toHaveText('2 selected');
      await expect(preview).toHaveValue(/Laptop advance/);
      await expect(preview).toHaveValue(/Part repayment/);
      await dialog.getByRole('button', { name: 'None' }).click();
      await expect(preview).toHaveValue(/No entries selected/);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();

      await page.getByRole('button', { name: 'Export ledger' }).click();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();

      await page.goto(`${personPath(rahul.id)}?export=1`);
      await expect(page.getByRole('dialog', { name: 'Export ledger' })).toBeVisible();
      await expect(preview).toHaveValue(/Laptop advance/);
    });

    test('Person: an entry opens in a dialog to edit and deletes after a confirm', async ({ page }) => {
      const { rahul } = await seedLedger();
      await page.goto(personPath(rahul.id));
      await page.getByText('Laptop advance').first().click();
      const dialog = page.getByRole('dialog', { name: 'Edit ledger entry' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('textbox', { name: /^Amount/ }).fill('26000');
      await dialog.getByRole('button', { name: 'Save changes' }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.getByText('Opening ₹0 · lent ₹26,000 · received ₹10,000 · closing ₹16,000')).toBeVisible();

      await page.getByText('Part repayment').first().click();
      await dialog.getByRole('button', { name: 'Delete entry' }).click();
      const confirm = page.getByRole('dialog', { name: 'Delete entry' });
      await expect(confirm.getByText(/Delete this lent entry of ₹10,000\?|Delete this borrowed entry of ₹10,000\?|Delete this repayment entry of ₹10,000\?/)).toBeVisible();
      await confirm.getByRole('button', { name: 'Delete entry' }).click();
      await expect(page.getByText('Opening ₹0 · lent ₹26,000 · received ₹0 · closing ₹26,000')).toBeVisible();
    });

    test('Person: Delete person asks first, then returns to Lendings without them', async ({ page }) => {
      const { rahul } = await seedLedger();
      await page.goto(personPath(rahul.id));
      await page.getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('menuitem', { name: 'Delete person' }).click();

      const confirm = page.getByRole('dialog', { name: 'Delete person' });
      await expect(confirm.getByText('Delete Rahul Sharma?')).toBeVisible();
      await expect(confirm.getByText('Their whole ledger goes (2 entries).')).toBeVisible();
      await confirm.getByRole('button', { name: 'Delete person' }).click();

      await page.waitForURL((u) => u.pathname === '/loans/lendings');
      await expect(page.getByText('Rahul Sharma')).toHaveCount(0);
    });

    test('the + opens Add ledger entry; saving a new person adds a row', async ({ page }) => {
      await seedPeople();
      await page.goto('/loans/lendings');
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
      expect(new URL(page.url()).pathname).toBe('/loans/lendings');
    });

    test('Loans: tiles, search by lender, Closed · n · Show, and row links', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      const home = await createLoan(api, { name: 'Home Loan', lender: 'SBI MaxGain', loanType: 'home', principal: 1000000, tenureMonths: 120 });
      await createLoan(api, { name: 'Car Loan', lender: 'HDFC Bank', loanType: 'car', principal: 500000, tenureMonths: 60 });
      const old = await createLoan(api, { name: 'Old Bike Loan', lender: 'Bajaj Finserv', loanType: 'two_wheeler', principal: 60000, tenureMonths: 12 });
      await closeLoan(api, old.id);

      await page.goto('/loans');
      for (const label of ['Outstanding', 'EMIs per month', 'Overdue', 'Interest this FY']) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      }
      await expect(page.getByText('of ₹15L borrowed')).toBeVisible();
      await expect(page.getByText('Home Loan').first()).toBeVisible();
      await expect(page.getByText('Car Loan').first()).toBeVisible();
      await expect(page.getByText('Old Bike Loan')).toHaveCount(0);
      if (viewport.width >= 1024) {
        await expect(page.getByRole('link', { name: 'Open Home Loan' })).toHaveAttribute('href', `/loans/${home.id}`);
      }

      await page.getByPlaceholder('Search').fill('SBI');
      await page.waitForURL(/q=SBI/);
      await expect(page.getByText('Home Loan').first()).toBeVisible();
      await expect(page.getByText('Car Loan')).toHaveCount(0);

      await page.getByPlaceholder('Search').fill('');
      await page.waitForURL((u) => !u.search.includes('q='));
      await expect(page.getByText('Car Loan').first()).toBeVisible();
      await expect(page.getByText('Closed · 1')).toBeVisible();
      await page.getByRole('button', { name: /Show/ }).click();
      await expect(page.getByText('Old Bike Loan').first()).toBeVisible();
      await page.getByRole('button', { name: 'Hide', exact: true }).click();
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

      await page.goto('/loans/lendings');
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
      await page.goto('/loans');
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
      expect(new URL(page.url()).pathname).toBe('/loans');
    });
  });
}
