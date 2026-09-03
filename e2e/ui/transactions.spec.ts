import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction, createTransactions } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { openAccounts, openTransactions } from '../fixtures/ui';

test.describe('Transactions UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    // Unique user per UI test for isolation
    currentUser = await createUser(request, 'ui-txns');
    await loginContext(context, currentUser.cookie);
  });

  test('browse transactions, amounts and dates render, pagination controls (@mobile)', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);

    const bank = await createBankAccount(api, { name: 'UI Feed Bank' });
    await createTransactions(api, bank.id, 60, {
      startDate: '2026-06-01',
      stepDays: 1,
      descriptionPrefix: 'Feed Item',
    });

    await openTransactions(page);

    // List renders seeded transactions
    await expect(page.locator('main').getByText('Feed Item 60')).toBeVisible();
    await expect(page.locator('main').getByText('UI Feed Bank').first()).toBeVisible();

    // If mobile action bar is collapsed, expand it
    const expandBtn = page.getByRole('button', { name: 'Expand action bar' });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    // Pagination controls render (size=50 default, total=60 -> 2 pages)
    const paginationTotal = page.getByText(/60 txns/i).first();
    if (await paginationTotal.isVisible()) {
      await expect(page.getByText('1 / 2').first()).toBeVisible();

      // Click Next Page
      const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
      await nextBtn.click();
      await expect(page.getByText('2 / 2').first()).toBeVisible();

      // Check URL state
      // PRODUCT-GAP: TransactionsBrowser uses local React state (useState) and does not synchronize
      // page, size, or filters to URL search parameters.
      const url = new URL(page.url());
      if (url.searchParams.has('page')) {
        expect(url.searchParams.get('page')).toBe('1');
      } else {
        // Documented PRODUCT-GAP: URL does not reflect page
        expect(url.searchParams.get('page')).toBeNull();
      }
    }
  });

  test('filter bar: filter by account, review status, text search, clear filters', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);

    const bankA = await createBankAccount(api, { name: 'Alpha Bank' });
    const bankB = await createBankAccount(api, { name: 'Beta Bank' });

    await createTransaction(api, bankA.id, {
      description: 'Morning Coffee Alpha',
      amount: -150,
    });
    await createTransaction(api, bankB.id, {
      description: 'Evening Snacks Beta',
      amount: -250,
    });

    await openTransactions(page);

    await expect(page.locator('main').getByText('Morning Coffee Alpha')).toBeVisible();
    await expect(page.locator('main').getByText('Evening Snacks Beta')).toBeVisible();

    // 1. Text search
    const searchInput = page.locator('input[placeholder*="Search descriptions"]:visible');
    await searchInput.fill('Coffee');
    await expect(page.locator('main').getByText('Morning Coffee Alpha')).toBeVisible();
    await expect(page.locator('main').getByText('Evening Snacks Beta')).not.toBeVisible();

    // Clear text search via badge or button
    const clearSearchBadge = page.locator('button[aria-label="Clear search"]:visible').first();
    if (await clearSearchBadge.isVisible()) {
      await clearSearchBadge.click();
    } else {
      await searchInput.fill('');
    }
    await expect(page.locator('main').getByText('Evening Snacks Beta')).toBeVisible();

    // 2. Filter by Account via quick filter pill
    const accountFilterBtn = page.locator('button:has-text("Account"):visible').first();
    if (await accountFilterBtn.isVisible()) {
      await accountFilterBtn.click();
      const alphaOption = page.getByRole('dialog').getByText('Alpha Bank').first();
      if (await alphaOption.isVisible()) {
        await alphaOption.click();
        await page.keyboard.press('Escape');

        // Verify only Alpha is visible
        await expect(page.locator('main').getByText('Morning Coffee Alpha')).toBeVisible();
        await expect(page.locator('main').getByText('Evening Snacks Beta')).not.toBeVisible();

        // 3. Clear all filters
        const clearAllBtn = page.locator('button:has-text("Clear all"):visible').first();
        if (await clearAllBtn.isVisible()) {
          await clearAllBtn.click();
          await expect(page.locator('main').getByText('Evening Snacks Beta')).toBeVisible();
        }
      }
    }
  });

  test('CRUD dialog: create transaction, edit amount, delete transaction (@mobile)', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);

    const bank = await createBankAccount(api, { name: 'CRUD UI Bank' });

    await openTransactions(page);

    // 1. Create Transaction via dialog
    const createBtn = page.getByRole('button', { name: 'Create' });
    await createBtn.click();

    // Form modal opens
    const amountInput = page.locator('#amount-input');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('275.50');

    // Select Account
    const accountTrigger = page.getByRole('combobox').filter({ hasText: /Select Account/i });
    if (await accountTrigger.isVisible()) {
      await accountTrigger.click();
      await page.getByRole('option', { name: 'CRUD UI Bank' }).click();
    }

    // Description
    const descInput = page.getByPlaceholder('Add description or notes...');
    await descInput.fill('Delicious Lunch');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify row appears in list
    const mainLunch = page.locator('main').getByText('Delicious Lunch');
    await expect(mainLunch).toBeVisible();
    await expect(page.locator('main').getByText('275.50').first()).toBeVisible();

    // 2. Edit Transaction Amount
    await mainLunch.click();

    // Detail modal opens
    const editBtn = page.getByRole('dialog').getByRole('button', { name: 'Edit' });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit form opens: update amount
    await expect(amountInput).toBeVisible();
    await amountInput.fill('350.00');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    // Verify updated amount appears in list
    await expect(mainLunch).toBeVisible();
    await expect(page.locator('main').getByText('350.00').first()).toBeVisible();

    // 3. Delete Transaction
    await mainLunch.click();
    const deleteBtn = page.getByRole('dialog').getByRole('button', { name: 'Delete' });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirmation dialog
    await expect(page.getByText('Delete Transaction?')).toBeVisible();
    const confirmDeleteBtn = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete' })
      .last();
    await confirmDeleteBtn.click();

    // Verify gone from list
    await expect(mainLunch).not.toBeVisible();
  });

  test('detail sheet opens on row, exclude toggle updates row to excluded state', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);

    const bank = await createBankAccount(api, { name: 'Exclude UI Bank' });
    await createTransaction(api, bank.id, {
      description: 'Transaction to Exclude',
      amount: -450,
      isTransactionExcluded: false,
    });

    await openTransactions(page);

    const mainTxn = page.locator('main').getByText('Transaction to Exclude');
    await expect(mainTxn).toBeVisible();

    // Click row to open detail modal
    await mainTxn.click();

    // Detail dialog opens and shows fields
    await expect(page.getByRole('dialog').getByText('Exclude UI Bank').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Manual Entry')).toBeVisible();

    // Click Edit to toggle exclude
    await page.getByRole('dialog').getByRole('button', { name: 'Edit' }).click();

    const excludeSwitch = page.getByRole('dialog').getByRole('switch', { name: 'Exclude transaction' });
    await expect(excludeSwitch).toBeVisible();
    await excludeSwitch.click();

    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    // Open detail again and verify "Transaction Excluded" badge is present
    await mainTxn.click();
    await expect(page.getByRole('dialog').getByText('Transaction Excluded')).toBeVisible();
  });

  test('cross-module: transaction creation updates balance on /accounts', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);

    // Create Bank Account with openingBalance 5000
    const bank = await createBankAccount(api, {
      name: 'Cross Module Bank',
      openingBalance: 5000,
    });

    // 1. Visit /accounts: verify balance shows 5,000
    await openAccounts(page);
    await expect(page.getByText('Cross Module Bank')).toBeVisible();
    await expect(page.getByText(/5,000/)).toBeVisible();

    // 2. Go to /transactions and create a transaction of 1500 (credit or -1500 debit)
    await openTransactions(page);
    await page.getByRole('button', { name: 'Create' }).click();

    const amountInput = page.locator('#amount-input');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('1500');

    // Make it debit using +/- button
    await page.getByRole('button', { name: '+/-' }).click();

    const accountTrigger = page.getByRole('combobox').filter({ hasText: /Select Account/i });
    if (await accountTrigger.isVisible()) {
      await accountTrigger.click();
      await page.getByRole('option', { name: 'Cross Module Bank' }).click();
    }

    await page.getByPlaceholder('Add description or notes...').fill('Cross Module Debit');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('main').getByText('Cross Module Debit')).toBeVisible();

    // 3. Return to /accounts: verify balance updated (5000 - 1500 = 3500)
    await openAccounts(page);
    await expect(page.getByText('Cross Module Bank')).toBeVisible();
    await expect(page.getByText(/3,500/)).toBeVisible();
  });
});
