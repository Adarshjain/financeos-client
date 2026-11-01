import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBroker } from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('F&O Trades UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-fno');
    await loginContext(context, currentUser.cookie);
  });

  test('Record an F&O trade from the Dinero dialog (contract, Future type and P&L)', async ({
    page,
  }) => {
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    await page.goto('/investments/fno');

    // 1. Record a trade: the top-bar + is a menu whose first row is the add.
    await page.getByRole('button', { name: 'Add F&O trade', exact: true }).first().click();
    await page.getByRole('menuitem', { name: 'Record F&O trade' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record F&O trade' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox', { name: /^Broker account/ }).click();
    await page.getByRole('option', { name: new RegExp(broker.name, 'i') }).first().click();
    await dialog.getByRole('radio', { name: 'Futures' }).click();
    await dialog.getByLabel('Trading symbol').fill('NIFTY24AUGFUT');
    await dialog.getByLabel(/^Qty/).fill('50');
    await dialog.getByLabel('Total charges').fill('100');
    await dialog.getByLabel('Buy value').fill('100000');
    await dialog.getByLabel('Sell value').fill('105000');
    await dialog.getByRole('button', { name: 'Record trade' }).click();
    await expectToast(page, 'F&O trade recorded');
    await expect(dialog).toHaveCount(0);

    // 2. The trade is listed with its Future type and P&L (105000 - 100000 - 100 = 4900). Filters, sorting, edit and
    // delete are covered in ds-investments-fno.spec.ts.
    await expect(page.getByText(/^NIFTY/).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Future', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/4,900/).filter({ visible: true }).first()).toBeVisible();
  });

});
