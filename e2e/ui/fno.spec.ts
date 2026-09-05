import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBroker, createFnoTrade } from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast, openFno } from '../fixtures/ui';

test.describe('F&O Trades UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-fno');
    await loginContext(context, currentUser.cookie);
  });

  test('Add F&O trade via dialog (symbol FUT badge & P&L), filters, sorting, edit and delete', async ({
    page,
  }) => {
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    await openFno(page);

    // 1. Add trade via dialog
    await page.getByRole('button', { name: /Add FnO Trade/i }).click();
    await expect(page.getByRole('heading', { name: 'Add FnO Trade' })).toBeVisible();

    // Select broker account if not auto-selected
    const brokerSelect = page.locator('#fno-trade-form').getByRole('combobox').first();
    await brokerSelect.click();
    await page.getByRole('option', { name: new RegExp(broker.name, 'i') }).click();

    // Enter Trading Symbol
    await page.getByPlaceholder('NIFTY24AUGFUT / NIFTY24250CE').fill('NIFTY24AUGFUT');

    // Quantity, Total Charges, Buy Value, Sell Value
    await page.getByPlaceholder('50', { exact: true }).fill('50');
    await page.getByPlaceholder('0.00').first().fill('100'); // Total Charges
    await page.getByPlaceholder('0.00').nth(1).fill('100000'); // Buy Value
    await page.getByPlaceholder('0.00').nth(2).fill('105000'); // Sell Value

    await page.getByRole('button', { name: 'Record FnO Trade' }).click();
    await expectToast(page, /FnO trade recorded/i);

    // 2. Verify trade appears in table with FUT badge and P&L cell
    await expect(page.getByText('NIFTY24AUGFUT').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('FUT').filter({ visible: true }).first()).toBeVisible();
    // P&L: 105000 - 100000 - 100 = 4900
    await expect(page.getByText(/4,900/).filter({ visible: true }).first()).toBeVisible();

    // 3. Add an Option trade via API to test filters and sorting
    await createFnoTrade(userApi, {
      brokerAccountId: broker.id,
      tradingSymbol: 'BANKNIFTY24AUG48000CE',
      contractType: 'option',
      optionType: 'CE',
      strikePrice: 48000,
      quantity: 15,
      buyValue: 3000,
      sellValue: 1500,
      totalCharges: 50,
    });

    await page.reload();
    await expect(page.getByText('BANKNIFTY24AUG48000CE').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('CE').filter({ visible: true }).first()).toBeVisible();

    // 4. Search filter
    const searchInput = page.getByPlaceholder(/Search symbol/i).filter({ visible: true }).first();
    await searchInput.fill('BANKNIFTY');
    await expect(page.getByText('BANKNIFTY24AUG48000CE').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('NIFTY24AUGFUT')).not.toBeVisible();
    await searchInput.clear();

    // 5. Contract type filter: select "Futures" -> only FUT visible
    const contractTypeFilter = page.getByRole('combobox').filter({ visible: true }).first();
    await contractTypeFilter.click();
    await page.getByRole('option', { name: /Futures/i }).click();
    await expect(page.getByText('NIFTY24AUGFUT').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('BANKNIFTY24AUG48000CE')).not.toBeVisible();

    // Clear filter
    await page.getByRole('button', { name: /Clear/i }).filter({ visible: true }).first().click();
    await expect(page.getByText('BANKNIFTY24AUG48000CE').filter({ visible: true }).first()).toBeVisible();

    // 6. Edit trade
    const editBtn = page.getByRole('button', { name: 'Edit' }).filter({ visible: true }).first();
    await editBtn.click();
    await expect(page.getByRole('heading', { name: 'Edit FnO Trade' })).toBeVisible();

    const sellValueInput = page.getByPlaceholder('0.00').nth(2);
    await sellValueInput.fill('110000');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expectToast(page, /FnO trade updated/i);

    // 7. Delete trade
    const deleteBtn = page.getByRole('button').filter({ has: page.locator('svg.lucide-trash-2') }).filter({ visible: true }).first();
    await deleteBtn.click();
    await expect(page.getByRole('heading', { name: 'Delete FnO Trade Record' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete Trade' }).click();
    await expectToast(page, /Deleted trade/i);
  });

  test('Mobile card view of F&O trades (@mobile)', async ({ page }) => {
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    await createFnoTrade(userApi, {
      brokerAccountId: broker.id,
      tradingSymbol: 'NIFTY24AUGFUT',
      quantity: 50,
      buyValue: 100000,
      sellValue: 105000,
      totalCharges: 100,
    });

    await openFno(page);
    await expect(page.getByText('NIFTY24AUGFUT').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/4,900/).filter({ visible: true }).first()).toBeVisible();
  });
});
