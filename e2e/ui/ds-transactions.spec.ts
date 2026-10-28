import type { Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { scriptCategorize } from '../fixtures/llm';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import { uploadAndIngest } from '../fixtures/seed/statements';
import type { TransactionResponse } from '../fixtures/seed/transactions';
import { createTransaction, searchAll, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

type Reason = 'UNRECONCILED' | 'CATEGORY_UNVERIFIED' | 'DUPLICATE_SUSPECT' | 'DATE_CORRECTED';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const monthYear = (iso: string) => `${LONG_MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

const SEARCH = 'Search';

const row = (page: Page, text: string | RegExp) => page.getByRole('row').filter({ hasText: text });
const needsReviewChip = (page: Page) => page.getByRole('button', { name: 'Needs review', exact: true });

/** Puts a transaction in Needs review with the given reasons. */
async function flag(api: ApiClient, t: TransactionResponse, reasons: Reason[]) {
  const res = await api.PUT('/api/v1/transactions/{id}', {
    params: { path: { id: t.id } },
    body: {
      accountId: t.accountId,
      amount: t.amount,
      date: t.date,
      description: t.description ?? undefined,
      reviewType: 'NEEDS_REVIEW',
      reviewReasons: reasons,
    },
  });
  if (res.response.status !== 200) throw new Error(`flag failed (${res.response.status}): ${JSON.stringify(res.error)}`);
}

const undoSpec: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '5566778899',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 20000,
  rows: [
    { date: '2026-04-09', description: 'OLA CABS RIDE', debit: 260 },
    { date: '2026-04-12', description: 'OLA CABS RIDE', debit: 310 },
  ],
};

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds Transactions, ${viewport.name} (${viewport.tag})`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-txns');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    /**
     * One bank account with four recent rows and one old one. Uber Ride needs review for Duplicate,
     * Swiggy Dinner for Category unverified: one reason each, so both approve with one tap.
     */
    async function seedList() {
      const api = makeApi(currentUser.cookie);
      const bank = await createBankAccount(api, { name: 'Main Bank' });
      const swiggy = await createTransaction(api, bank.id, { amount: -450, date: todayString(-1), description: 'Swiggy Dinner' });
      const uber = await createTransaction(api, bank.id, { amount: -1250, date: todayString(-2), description: 'Uber Ride' });
      const rent = await createTransaction(api, bank.id, { amount: -3600, date: todayString(-3), description: 'Rent Advance' });
      const salary = await createTransaction(api, bank.id, { amount: 50000, date: todayString(-4), description: 'Salary Credit' });
      const old = await createTransaction(api, bank.id, { amount: -9000, date: todayString(-60), description: 'Old Furniture' });
      await flag(api, uber, ['DUPLICATE_SUSPECT']);
      await flag(api, swiggy, ['CATEGORY_UNVERIFIED']);
      return { api, bank, swiggy, uber, rent, salary, old };
    }

    const open = async (page: Page, search = '') => {
      await page.goto(`/transactions${search}`);
      await expect(page.getByRole('row').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 45_000 });
    };

    test('?txn opens a transaction outside the filters in its detail, and closing drops it from the address', async ({ page }) => {
      const { old } = await seedList();
      await open(page, `?q=Swiggy&txn=${old.id}`);
      const detail = page.getByRole('dialog', { name: 'Old Furniture' });
      await expect(detail).toBeVisible({ timeout: 30_000 });
      await expect(row(page, 'Old Furniture')).toHaveCount(0);

      await page.keyboard.press('Escape');
      await expect(detail).toHaveCount(0);
      await expect(page).not.toHaveURL(/txn=/);
      await expect(page).toHaveURL(/q=Swiggy/);
      await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
    });

    test('?txn with an unknown id opens no dialog and the list renders', async ({ page }) => {
      await seedList();
      await open(page, '?txn=00000000-0000-4000-8000-000000000000');
      await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page).not.toHaveURL(/txn=/);
    });

    if (phone) {
      test('sticky day headers stop under the top bar', async ({ page }) => {
        const { api, bank } = await seedList();
        for (let i = 5; i <= 30; i++) {
          await createTransaction(api, bank.id, { amount: -100 - i, date: todayString(-i), description: `Filler ${i}` });
        }
        await open(page, '?period=last_90_days');
        await page.evaluate(() => window.scrollTo(0, 700));
        await page.waitForTimeout(600);
        const r = await page.evaluate(() => {
          const bar = document.querySelector('main')!.previousElementSibling as HTMLElement;
          const bb = bar.getBoundingClientRect();
          const tops = Array.from(document.querySelectorAll('main *'))
            .filter((e) => getComputedStyle(e).position === 'sticky' && e.getBoundingClientRect().height > 0)
            .map((e) => e.getBoundingClientRect().top);
          const hit = document.elementFromPoint(bb.left + bb.width / 2, bb.top + bb.height / 2);
          return { barBottom: bb.bottom, tops, onTop: !!hit && bar.contains(hit) };
        });
        expect(r.tops.length).toBeGreaterThan(0);
        expect(Math.min(...r.tops)).toBeGreaterThanOrEqual(r.barBottom - 0.5);
        expect(r.onTop).toBe(true);
      });
    }

    test('Filters dialog: nothing reaches the URL until Show, and Cancel drops the draft', async ({ page }) => {
      await seedList();
      await open(page);
      await page.getByRole('button', { name: /^(\+ More|All filters)/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Filters' });
      await expect(dialog).toBeVisible();

      await dialog.getByRole('textbox', { name: 'From' }).fill('1000');
      await expect(dialog.getByRole('button', { name: phone ? /^Show \d+$/ : /^Show \d+ transactions?$/ })).toBeVisible();
      expect(page.url()).not.toContain('amount');

      await dialog.getByRole('button', { name: /^Show/ }).click();
      await page.waitForURL(/amount=gt/);
      expect(new URL(page.url()).searchParams.get('amountFrom')).toBe('1000');
      await expect(dialog).not.toBeVisible();
      // The amount chip is desktop-only; phone shows the count on "All filters" instead.
      if (!phone) await expect(page.getByRole('button', { name: /Over ₹1,000/ })).toBeVisible();
      // The amount is signed, as in the Legacy list: over 1,000 is money in, debits are negative.
      await expect(row(page, 'Salary Credit')).toHaveCount(1);
      await expect(row(page, 'Rent Advance')).toHaveCount(0);
      await expect(row(page, 'Swiggy Dinner')).toHaveCount(0);

      // Cancel: a changed draft never reaches the URL.
      const applied = page.url();
      await page.getByRole('button', { name: /^(\+ More|All filters)/ }).click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('textbox', { name: 'From' }).fill('5');
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      expect(page.url()).toBe(applied);
    });

    if (!phone) {
      test('list: seeded rows render under a month band, newest first', async ({ page }) => {
        await seedList();
        await open(page, '?period=last_14_days');
        await expect(page.getByText(monthYear(todayString(-1))).first()).toBeVisible();
        for (const name of ['Swiggy Dinner', 'Uber Ride', 'Rent Advance', 'Salary Credit']) {
          await expect(row(page, name)).toHaveCount(1);
        }
        await expect(row(page, 'Swiggy Dinner')).toContainText('450.00');
        await expect(row(page, 'Salary Credit')).toContainText('+50,000.00');
        await expect(row(page, 'Old Furniture')).toHaveCount(0);
        const names = await page.getByRole('row').allInnerTexts();
        const order = ['Swiggy Dinner', 'Uber Ride', 'Rent Advance', 'Salary Credit'].map((n) => names.findIndex((t) => t.includes(n)));
        expect(order).toEqual([...order].sort((a, b) => a - b));
      });

      test('search by text and by number updates the URL q and narrows the list', async ({ page }) => {
        await seedList();
        await open(page);
        const search = page.getByPlaceholder(SEARCH);

        await search.fill('swiggy');
        await page.waitForURL(/[?&]q=swiggy/);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
        await expect(row(page, 'Uber Ride')).toHaveCount(0);

        await search.fill('3600');
        await page.waitForURL(/[?&]q=3600/);
        await expect(row(page, 'Rent Advance')).toHaveCount(1);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(0);

        await search.fill('');
        await page.waitForURL((u) => !u.search.includes('q='));
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
      });

      test('the Needs review chip (no count) toggles the URL and narrows the list', async ({ page }) => {
        await seedList();
        await open(page);
        await expect(needsReviewChip(page)).toBeVisible();

        await needsReviewChip(page).click();
        await page.waitForURL(/[?&]review=needs_review/);
        await expect(row(page, 'Uber Ride')).toHaveCount(1);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
        await expect(row(page, 'Rent Advance')).toHaveCount(0);
        await expect(needsReviewChip(page)).toBeVisible();

        await needsReviewChip(page).click();
        await page.waitForURL((u) => !u.search.includes('review='));
        await expect(row(page, 'Rent Advance')).toHaveCount(1);
      });

      test('the period defaults to all time; ?period=last_14_days shows a chip that removing clears', async ({ page }) => {
        await seedList();
        await open(page);
        expect(new URL(page.url()).searchParams.has('period')).toBe(false);
        await expect(page.getByRole('button', { name: 'Period' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Remove filter' })).toHaveCount(0);
        await expect(row(page, 'Old Furniture')).toHaveCount(1);

        await open(page, '?period=last_14_days');
        await expect(page.getByRole('button', { name: 'Last 14 days' })).toBeVisible();
        await expect(row(page, 'Old Furniture')).toHaveCount(0);

        await page.getByRole('button', { name: 'Remove filter' }).click();
        await page.waitForURL((u) => !u.search.includes('period='));
        await expect(row(page, 'Old Furniture')).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Last 14 days' })).toHaveCount(0);
      });

      test('the Period chip opens a dropdown; Last 14 days + Apply sets the URL and drops the old row', async ({ page }) => {
        await seedList();
        await open(page);
        await expect(row(page, 'Old Furniture')).toHaveCount(1);

        await page.getByRole('button', { name: 'Period' }).click();
        await expect(page.getByRole('dialog', { name: 'Filters' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Single date' })).toBeVisible();
        await expect(page.getByRole('radio', { name: 'Range' })).toBeVisible();
        await page.getByRole('combobox', { name: 'Preset' }).click();
        await page.getByRole('option', { name: 'Last 14 days' }).click();
        await page.getByRole('button', { name: 'Apply', exact: true }).click();

        await page.waitForURL(/period=last_14_days/);
        await expect(row(page, 'Old Furniture')).toHaveCount(0);
        await expect(row(page, 'Rent Advance')).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Last 14 days' })).toBeVisible();
      });

      test('Set category on a row opens the small dialog; Save shows the category and it survives a reload', async ({ page }) => {
        const { api } = await seedList();
        const food = await createCategory(api, 'Groceries E2E');
        await open(page);

        await row(page, 'Rent Advance').getByText('Set category').locator('visible=true').click();
        const dialog = page.getByRole('dialog', { name: 'Set category' });
        await expect(dialog).toBeVisible();
        await expect(page.getByRole('dialog', { name: 'Edit transaction' })).toHaveCount(0);
        await dialog.getByRole('combobox', { name: 'Categories' }).click();
        await page.getByRole('option', { name: food.name }).click();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(dialog).not.toBeVisible();
        await expect(row(page, 'Rent Advance')).toContainText(food.name);

        // The row updates optimistically and the save goes out after the dialog closes: reload until it has landed.
        await expect(async () => {
          await open(page);
          await expect(row(page, 'Rent Advance')).toContainText(food.name, { timeout: 3_000 });
        }).toPass({ timeout: 30_000 });
      });

      test('the pager moves to the next page through the URL', async ({ page }) => {
        const api = makeApi(currentUser.cookie);
        const bank = await createBankAccount(api, { name: 'Pager Bank' });
        await Promise.all(
          Array.from({ length: 27 }, (_, i) =>
            createTransaction(api, bank.id, { amount: -(i + 1) * 10, date: todayString(-(i % 10)), description: `Pager Txn ${i + 1}` }),
          ),
        );
        await open(page);
        expect(new URL(page.url()).searchParams.has('size')).toBe(false);
        await expect(row(page, 'Pager Txn')).toHaveCount(25);

        await page.getByRole('button', { name: 'Page 2' }).first().click();
        await page.waitForURL(/[?&]page=1/);
        await expect(row(page, 'Pager Txn')).toHaveCount(2);
        await expect(page.getByRole('button', { name: 'Page 2' }).first()).toHaveAttribute('aria-current', 'page');
      });

      test('a row press opens the side panel without touching the URL, and another row swaps it', async ({ page }) => {
        await seedList();
        await open(page);
        const before = page.url();

        await row(page, 'Swiggy Dinner').getByText('Swiggy Dinner').click();
        const panel = page.getByRole('dialog', { name: 'Swiggy Dinner' });
        await expect(panel).toBeVisible();
        await expect(panel).toContainText('₹450');
        expect(page.url()).toBe(before);

        await row(page, 'Uber Ride').getByText('Uber Ride').click();
        await expect(page.getByRole('dialog', { name: 'Uber Ride' })).toBeVisible();
        await expect(page.getByRole('dialog', { name: 'Swiggy Dinner' })).toHaveCount(0);
        expect(page.url()).toBe(before);
      });

      test('Add: the + creates a debit with the amount field and the row appears', async ({ page }) => {
        await seedList();
        await open(page);
        await page.getByRole('button', { name: 'Add', exact: true }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Add transaction' });
        await expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: 'Save transaction' }).click();
        await expect(dialog).toBeVisible();

        await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('777.5');
        await dialog.getByRole('textbox', { name: 'Description' }).fill('Coffee Beans Added');
        await dialog.getByRole('combobox', { name: /^Account/ }).click();
        await page.getByRole('option', { name: /Main Bank/ }).click();
        await dialog.getByRole('button', { name: 'Save transaction' }).click();

        await expect(dialog).not.toBeVisible();
        const added = row(page, 'Coffee Beans Added');
        await expect(added).toHaveCount(1);
        await expect(added).toContainText('777.50');
        await expect(added).not.toContainText('+777.50');
      });

      test('Edit from the panel changes the amount', async ({ page }) => {
        await seedList();
        await open(page);
        await row(page, 'Rent Advance').getByText('Rent Advance').click();
        await page.getByRole('dialog', { name: 'Rent Advance' }).getByRole('button', { name: 'Edit', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit transaction' });
        await expect(dialog).toBeVisible();

        await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('4200');
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(dialog).not.toBeVisible();
        await expect(row(page, 'Rent Advance')).toContainText('4,200.00');
        await expect(row(page, 'Rent Advance')).not.toContainText('3,600.00');
      });

      test('Edit to Needs review with no reason shows the Review status error and blocks Save', async ({ page }) => {
        await seedList();
        await open(page);
        await row(page, 'Rent Advance').getByText('Rent Advance').click();
        await page.getByRole('dialog', { name: 'Rent Advance' }).getByRole('button', { name: 'Edit', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit transaction' });

        await dialog.getByRole('combobox', { name: /^Review status/ }).click();
        await page.getByRole('option', { name: 'Needs review' }).click();
        await expect(dialog.getByText('Pick at least one reason it needs review')).toBeVisible();

        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('Pick at least one reason it needs review')).toBeVisible();
        await expect(page.getByText('Transaction saved!')).toHaveCount(0);
      });

      test('Delete from the panel asks first, then removes the row', async ({ page }) => {
        await seedList();
        await open(page);
        await row(page, 'Rent Advance').getByText('Rent Advance').click();
        await page.getByRole('dialog', { name: 'Rent Advance' }).getByRole('button', { name: 'Delete', exact: true }).click();

        const confirm = page.getByRole('dialog', { name: /^Delete Rent Advance/ });
        await expect(confirm).toBeVisible();
        await confirm.getByRole('button', { name: 'Delete transaction' }).click();

        await expect(page.getByText('Transaction deleted').first()).toBeVisible();
        await expect(row(page, 'Rent Advance')).toHaveCount(0);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
      });

      test('Link to… links two transactions as a Transfer and the Links section shows it', async ({ page }) => {
        const api = makeApi(currentUser.cookie);
        const a = await createBankAccount(api, { name: 'Out Bank' });
        const b = await createBankAccount(api, { name: 'In Bank' });
        await createTransaction(api, a.id, { amount: -2000, date: todayString(-1), description: 'Transfer Out' });
        await createTransaction(api, b.id, { amount: 2000, date: todayString(-1), description: 'Transfer In' });
        await open(page);

        await row(page, 'Transfer Out').getByText('Transfer Out').click();
        await page.getByRole('dialog', { name: 'Transfer Out' }).getByRole('button', { name: 'Link to…' }).click();
        const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Link transactions' }) });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('radio', { name: /Transfer In/ }).click();
        await dialog.getByRole('button', { name: 'Link transactions' }).click();
        await expect(dialog).not.toBeVisible();

        const panel = page.getByRole('dialog', { name: 'Transfer Out' });
        await expect(panel.getByText('Links', { exact: true })).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Transfer In' })).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Unlink' })).toBeVisible();
      });

      test('Unlink removes the link and Undo restores it', async ({ page }) => {
        const api = makeApi(currentUser.cookie);
        const a = await createBankAccount(api, { name: 'Out Bank' });
        const b = await createBankAccount(api, { name: 'In Bank' });
        const out = await createTransaction(api, a.id, { amount: -2000, date: todayString(-1), description: 'Transfer Out' });
        const into = await createTransaction(api, b.id, { amount: 2000, date: todayString(-1), description: 'Transfer In' });
        const linked = await api.POST('/api/v1/transaction-links', {
          body: { type: 'TRANSFER', members: [{ transactionId: out.id, isAnchor: true }, { transactionId: into.id }] },
        });
        expect(linked.response.status).toBe(201);
        await open(page);

        await row(page, 'Transfer Out').getByText('Transfer Out').first().click();
        const panel = page.getByRole('dialog', { name: 'Transfer Out' });
        await expect(panel.getByRole('button', { name: 'Transfer In' })).toBeVisible();

        await panel.getByRole('button', { name: 'Unlink' }).click();
        await expect(page.getByText('Link removed')).toBeVisible();
        await expect(panel.getByText('Links', { exact: true })).toHaveCount(0);

        await page.getByRole('button', { name: 'Undo' }).click();
        await expect(page.getByText('Link restored')).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Transfer In' })).toBeVisible();
      });

      test('select two rows, Merge and resolve leaves one', async ({ page }) => {
        const api = makeApi(currentUser.cookie);
        const bank = await createBankAccount(api, { name: 'Merge Bank' });
        await createTransaction(api, bank.id, { amount: -300, date: todayString(-1), description: 'Zomato Order' });
        await createTransaction(api, bank.id, { amount: -300, date: todayString(-1), description: 'Zomato Order Dup' });
        await createTransaction(api, bank.id, { amount: -80, date: todayString(-2), description: 'Metro Ride' });
        await open(page);

        await page.getByRole('checkbox', { name: 'Select Zomato Order', exact: true }).click();
        await page.getByRole('checkbox', { name: 'Select Zomato Order Dup' }).click();
        await expect(page.getByText('2 selected')).toBeVisible();
        await page.getByRole('button', { name: 'Merge', exact: true }).click();

        const dialog = page.getByRole('dialog', { name: 'Merge transactions' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Merge and resolve' }).click();

        await expect(dialog).not.toBeVisible();
        await expect(row(page, /Zomato Order/)).toHaveCount(1);
        await expect(row(page, 'Metro Ride')).toHaveCount(1);
        await expect(page.getByText('2 selected')).toHaveCount(0);
      });

      test('select rows needing review, Approve clears them', async ({ page }) => {
        await seedList();
        await open(page);
        await expect(needsReviewChip(page)).toBeVisible();

        await page.getByRole('checkbox', { name: 'Select Swiggy Dinner' }).click();
        await page.getByRole('checkbox', { name: 'Select Uber Ride' }).click();
        await expect(page.getByText('2 selected')).toBeVisible();
        await page.getByRole('button', { name: 'Approve 2' }).click();

        const dialog = page.getByRole('dialog').filter({ hasText: 'Tick the reasons to clear' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Approve 2' }).click();

        await expect(dialog).not.toBeVisible();
        await expect(page.getByText('2 selected')).toHaveCount(0);
        // Nothing is left in review: the Needs review view lists neither row.
        await needsReviewChip(page).click();
        await page.waitForURL(/[?&]review=needs_review/);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(0);
        await expect(row(page, 'Uber Ride')).toHaveCount(0);
      });

      test('detail Review on a one-reason row opens the approve dialog; approving clears it with an Approved toast', async ({ page }) => {
        await seedList();
        await open(page);
        await row(page, 'Uber Ride').getByText('Uber Ride').click();
        const panel = page.getByRole('dialog', { name: 'Uber Ride' });
        await panel.getByRole('button', { name: 'Review', exact: true }).click();

        const approve = page.getByRole('dialog', { name: /^Approve 1 transaction/ });
        await expect(approve).toBeVisible();
        await approve.getByRole('button', { name: 'Approve 1', exact: true }).click();
        await expect(approve).not.toBeVisible();

        // A clean run through the dialog ends in the "Approved" toast, which offers Undo.
        await expect(page.getByText('Approved', { exact: true })).toBeVisible();
        await needsReviewChip(page).click();
        await page.waitForURL(/[?&]review=needs_review/);
        await expect(row(page, 'Uber Ride')).toHaveCount(0);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);

        await page.getByRole('button', { name: 'Undo' }).click();
        await expect(row(page, 'Uber Ride')).toHaveCount(1);
      });
    }

    if (!phone) {
      test('Filters dialog: the Amount condition shows only the From/To fields it needs', async ({ page }) => {
        await seedList();
        await open(page);
        await page.getByRole('button', { name: /^(\+ More|All filters)/ }).click();
        const dialog = page.getByRole('dialog', { name: 'Filters' });
        const to = dialog.getByRole('textbox', { name: 'To' });
        const from = dialog.getByRole('textbox', { name: 'From' });
        await expect(from).toBeVisible();
        await expect(to).not.toBeVisible();

        await dialog.getByRole('combobox', { name: 'Condition' }).click();
        await page.getByRole('option', { name: 'Between' }).click();
        await expect(from).toBeVisible();
        await expect(to).toBeVisible();

        await dialog.getByRole('combobox', { name: 'Condition' }).click();
        await page.getByRole('option', { name: 'Less than' }).click();
        await expect(to).toBeVisible();
        await expect(from).not.toBeVisible();

        await dialog.getByRole('combobox', { name: 'Condition' }).click();
        await page.getByRole('option', { name: 'Greater than' }).click();
        await expect(from).toBeVisible();
        await expect(to).not.toBeVisible();
      });
    }

    if (phone) {
      /** A real drag on the row: the swipe lives on the wrapper around it. */
      const swipe = async (page: Page, target: ReturnType<typeof row>, dx: number) => {
        const box = await target.boundingBox();
        if (!box) throw new Error('swipe target is not visible');
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + dx / 2, y, { steps: 4 });
        await page.mouse.move(x + dx, y, { steps: 4 });
        await page.mouse.up();
      };

      test('rows sit under day group headers', async ({ page }) => {
        await seedList();
        await open(page, '?period=last_14_days');
        for (const offset of [-1, -2, -3, -4]) {
          await expect(page.getByText(dayMonth(todayString(offset)), { exact: true }).first()).toBeVisible();
        }
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
        await expect(row(page, 'Old Furniture')).toHaveCount(0);
      });

      test('long-press starts selection and the selection bar shows', async ({ page }) => {
        await seedList();
        await open(page);
        const target = row(page, 'Rent Advance');
        const box = await target.boundingBox();
        if (!box) throw new Error('row is not visible');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await expect(page.getByText('1 selected')).toBeVisible();
        await page.mouse.up();

        await expect(page.getByText('1 selected')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Merge', exact: true })).toBeDisabled();

        // In selection mode a tap toggles instead of opening the detail.
        await row(page, 'Salary Credit').click();
        await expect(page.getByText('2 selected')).toBeVisible();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      });

      test('All filters opens the Filters dialog with Cancel, Clear all and Show in the footer', async ({ page }) => {
        await seedList();
        await open(page);
        // Phone shows only Period, Account and All filters.
        await expect(page.getByRole('button', { name: 'Period' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Type/ })).not.toBeVisible();
        await expect(page.getByRole('button', { name: /^Needs review/ })).not.toBeVisible();

        await page.getByRole('button', { name: /^All filters/ }).click();
        const dialog = page.getByRole('dialog', { name: 'Filters' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Clear all', exact: true })).toBeVisible();
        await expect(dialog.getByRole('button', { name: /^Show \d+$/ })).toBeVisible();
      });

      test('focusing the search expands it inside the chip row', async ({ page }) => {
        await seedList();
        await open(page);
        const search = page.getByPlaceholder(SEARCH);
        const before = await search.boundingBox();
        await search.focus();
        await expect.poll(async () => (await search.boundingBox())?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 20);
      });

      test('long-press selection hides the tab bar behind the selection bar', async ({ page }) => {
        await seedList();
        await open(page);
        const tabBar = page.locator('nav.desk\\:hidden');
        await expect(tabBar).toBeVisible();

        const box = await row(page, 'Rent Advance').boundingBox();
        if (!box) throw new Error('row is not visible');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await expect(page.getByText('1 selected')).toBeVisible();
        await page.mouse.up();

        await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
        await expect(tabBar).not.toBeVisible();
      });

      test('Quick add Transaction in the More sheet opens the Add transaction dialog without leaving the page', async ({ page }) => {
        await seedList();
        await open(page);
        const before = page.url();
        await page.locator('nav.desk\\:hidden').getByRole('tab', { name: 'Menu' }).click();
        await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Transaction' }).click();

        await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible();
        await expect(page.getByRole('dialog', { name: 'Menu' })).not.toBeVisible();
        expect(page.url()).toBe(before);
      });

      test('right-click does nothing special on the phone layout', async ({ page }) => {
        await seedList();
        await open(page);
        await row(page, 'Rent Advance').dispatchEvent('contextmenu', { button: 2, cancelable: true });
        await expect(page.getByRole('menu')).toHaveCount(0);
      });

      test('swipe right on a one-reason row approves it with a toast', async ({ page }) => {
        await seedList();
        // The Needs review chip is desktop-only; the review filter in the URL narrows the phone list to the two flagged rows.
        await open(page, '?review=needs_review');
        await expect(row(page, 'Uber Ride')).toHaveCount(1);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);

        await swipe(page, row(page, 'Uber Ride'), 160);
        await expect(page.getByText('Approved', { exact: true })).toBeVisible();
        await expect(row(page, 'Uber Ride')).toHaveCount(0);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
      });

      test('swipe left asks first, then deletes the row', async ({ page }) => {
        await seedList();
        await open(page);

        await swipe(page, row(page, 'Rent Advance'), -160);
        const confirm = page.getByRole('dialog', { name: /^Delete Rent Advance/ });
        await expect(confirm).toBeVisible();

        await confirm.getByRole('button', { name: 'Delete transaction' }).click();
        await expect(row(page, 'Rent Advance')).toHaveCount(0);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
      });

      test('the search rests narrow and widens to most of the screen while focused or filled', async ({ page }) => {
        await seedList();
        await open(page);
        const search = page.getByPlaceholder(SEARCH);
        const width = async () => (await search.boundingBox())?.width ?? 0;
        expect(await width()).toBeLessThanOrEqual(100);
        await search.focus();
        await expect.poll(width).toBeGreaterThan(250);
        await search.fill('rent');
        await search.blur();
        await expect.poll(width).toBeGreaterThan(250);
        await search.fill('');
        await search.blur();
        await expect.poll(width).toBeLessThanOrEqual(100);
      });

      test('the page tabs stay visible while a row is selected', async ({ page }) => {
        await seedList();
        await open(page);
        const allTab = page.getByRole('tab', { name: 'All', exact: true });
        await expect(allTab).toBeVisible();

        const box = await row(page, 'Rent Advance').boundingBox();
        if (!box) throw new Error('row is not visible');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await expect(page.getByText('1 selected')).toBeVisible();
        await page.mouse.up();
        await expect(allTab).toBeVisible();
      });
    }

    if (!phone) {
      test('right-click a one-reason row: the menu offers Approve and Delete; Approve clears it with a toast', async ({ page }) => {
        await seedList();
        await open(page, '?review=needs_review');
        await row(page, 'Uber Ride').click({ button: 'right' });
        await expect(page.getByRole('menuitem', { name: 'Approve' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
        await page.getByRole('menuitem', { name: 'Approve' }).click();
        await expect(page.getByText('Approved', { exact: true })).toBeVisible();
        await expect(row(page, 'Uber Ride')).toHaveCount(0);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
      });

      test('right-click a clean row: no Approve; Delete asks first, then removes the row; Escape closes the menu', async ({ page }) => {
        await seedList();
        await open(page);
        await row(page, 'Rent Advance').click({ button: 'right' });
        await expect(page.getByRole('menuitem', { name: 'Approve' })).toHaveCount(0);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('menu')).toHaveCount(0);

        await row(page, 'Rent Advance').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Delete' }).click();
        const confirm = page.getByRole('dialog', { name: /^Delete Rent Advance/ });
        await expect(confirm).toBeVisible();
        await confirm.getByRole('button', { name: 'Delete transaction' }).click();
        await expect(row(page, 'Rent Advance')).toHaveCount(0);
        await expect(row(page, 'Swiggy Dinner')).toHaveCount(1);
      });

      test('Add transaction: Add account opens the account dialog on top, the new account is selected and Save works', async ({ page }) => {
        await seedList();
        await open(page);
        await page.getByRole('button', { name: 'Add', exact: true }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Add transaction' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('321');
        await dialog.getByRole('textbox', { name: 'Description' }).fill('Fresh Account Spend');

        await dialog.getByRole('combobox', { name: /^Account/ }).click();
        await page.getByRole('button', { name: 'Add account' }).click();
        const accountDialog = page.getByRole('dialog', { name: 'Add account' });
        await expect(accountDialog).toBeVisible();
        // The form underneath is aria-hidden while the account dialog is on top, but still on screen.
        await expect(page.getByRole('dialog', { name: 'Add transaction', includeHidden: true })).toBeVisible();

        // A wallet is the minimal account: a bank also needs a bank picked.
        await accountDialog.getByRole('radio', { name: 'Wallet / cash' }).click();
        await accountDialog.getByRole('textbox', { name: 'Account name' }).fill('Fresh Wallet');
        await accountDialog.getByRole('button', { name: 'Create account' }).click();
        await expect(accountDialog).not.toBeVisible({ timeout: 30_000 });

        await expect(dialog.getByRole('combobox', { name: /^Account/ })).toContainText('Fresh Wallet');
        await dialog.getByRole('button', { name: 'Save transaction' }).click();
        await expect(dialog).not.toBeVisible();
        await expect(row(page, 'Fresh Account Spend')).toHaveCount(1);
      });
    }
  });
}

test.describe('/ds Transactions Approve Undo is a full revert (@ui)', () => {
  test('approving a row of an unverified rule clears its sibling too; Undo brings both back with their reasons', async ({
    context,
    request,
    page,
  }) => {
    const user = await createUser(request, 'ui-ds-undo');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
    const api = makeApi(user.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
    await scriptCategorize(api, [
      { index: 0, merchantKey: 'OLA CABS', displayName: 'Ola Cabs', categoryNames: ['Travel'] },
      { index: 1, merchantKey: 'OLA CABS', displayName: 'Ola Cabs', categoryNames: ['Travel'] },
    ]);
    const account = await createBankAccount(api, { name: 'Undo Account' });
    const { job } = await uploadAndIngest(api, account.id, [{ filename: 'undo.pdf', buffer: await genBankPdf(undoSpec) }]);
    expect(job.status).toBe('SUCCEEDED');
    const flagged = async () =>
      (await searchAll(api)).filter((t) => t.reviewType === 'NEEDS_REVIEW' && t.reviewReasons?.includes('CATEGORY_UNVERIFIED'));
    expect(await flagged()).toHaveLength(2);

    await page.goto('/transactions');
    await expect(page.getByRole('row').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 45_000 });
    await expect(needsReviewChip(page)).toBeVisible();

    await page.getByRole('checkbox', { name: /^Select .*Ola/i }).first().click();
    await page.getByRole('button', { name: 'Approve 1' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Tick the reasons to clear' });
    await dialog.getByRole('button', { name: 'Approve 1' }).click();
    // The rule is verified, so the other Ola row is cleared as well.
    await expect(needsReviewChip(page)).toBeVisible();
    await expect.poll(async () => (await flagged()).length).toBe(0);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(needsReviewChip(page)).toBeVisible();
    await expect.poll(async () => (await flagged()).length).toBe(2);
  });
});
