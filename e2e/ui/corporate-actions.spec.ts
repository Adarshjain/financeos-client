import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import {
  createBroker,
  generateIsin,
  generateYahooSymbol,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast, openCorporateActions } from '../fixtures/ui';

test.describe('Corporate Actions UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-corporate-actions');
    await loginContext(context, currentUser.cookie);
  });

  test('Add split via dialog, edit ratio, verify demerger fields, delete action', async ({
    page,
  }) => {
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);
    const sym = generateYahooSymbol('UICA');
    const isin = generateIsin();

    const inst = await resolveInstrument(userApi, {
      type: 'stock',
      name: `UI CA Test Stock ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-01-01',
    });

    await openCorporateActions(page);

    // 1. Open dialog via "Record First Action" or "Record Action"
    const recordBtn = page.getByRole('button', { name: /Record (First )?Action/i }).first();
    await recordBtn.click();

    await expect(page.getByRole('heading', { name: 'Corporate Actions' })).toBeVisible();

    // Select parent instrument via typeahead if required
    const parentTypeahead = page.getByPlaceholder(/Search instrument by name or symbol/i).first();
    if (await parentTypeahead.isVisible()) {
      await parentTypeahead.fill(sym);
      await page.getByText(inst.name).first().click();
    }

    // Select Action Type "Stock Split"
    const actionTypeSelect = page.locator('#corporate-action-form').getByRole('combobox').first();
    await actionTypeSelect.click();
    await page.getByRole('option', { name: 'Stock Split' }).click();

    // Fill Ratio: 1 -> 2
    const ratioFromInput = page.locator('input[name="ratioFrom"]');
    await ratioFromInput.fill('1');
    const ratioToInput = page.locator('input[name="ratioTo"]');
    await ratioToInput.fill('2');

    // Fill Ex-Date
    const exDateInput = page.locator('input[name="exDate"]');
    await exDateInput.fill('2026-06-01');

    // Save Corporate Action
    await page.getByRole('button', { name: 'Save Corporate Action' }).click();
    await expectToast(page, /Recorded split/i);

    // 2. Verify row in the table
    await expect(page.getByText('1 → 2').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Stock Split').filter({ visible: true }).first()).toBeVisible();

    // 3. Edit to change ratio to 1 -> 5
    const editBtn = page.getByTitle('Edit Corporate Action').filter({ visible: true }).first();
    await editBtn.click();

    await expect(page.getByText('Edit Corporate Action')).toBeVisible();
    await ratioToInput.fill('5');
    await page.getByRole('button', { name: 'Update Corporate Action' }).click();
    await expectToast(page, /Updated split/i);

    await expect(page.getByText('1 → 5').filter({ visible: true }).first()).toBeVisible();

    // 4. Verify Demerger form shows cost-allocation field
    const addAnotherBtn = page.getByRole('button', { name: /Record Action/i }).filter({ visible: true }).first();
    if (await addAnotherBtn.isVisible()) {
      await addAnotherBtn.click();
      const typeSelect = page.locator('#corporate-action-form').getByRole('combobox').first();
      await typeSelect.click();
      await page.getByRole('option', { name: /Demerger/i }).click();

      await expect(page.locator('input[name="costAllocationPct"]')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).first().click();
    }

    // 5. Delete the action
    page.once('dialog', (dialog) => dialog.accept());
    const deleteBtn = page.getByTitle('Delete Corporate Action').filter({ visible: true }).first();
    await deleteBtn.click();
    await expectToast(page, /Corporate action deleted/i);

    // Verify row removed
    await expect(page.getByText('1 → 5').filter({ visible: true })).not.toBeVisible();
  });

});
