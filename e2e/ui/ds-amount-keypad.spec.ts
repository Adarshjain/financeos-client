import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { expect, test } from '../fixtures/test';

async function openAddTransaction(page: Page) {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add', exact: true }).first().click();
  const form = page.getByRole('dialog', { name: 'Add transaction' });
  await expect(form).toBeVisible({ timeout: 45_000 });
  // Hidden from the a11y tree while the keypad sheet is open over it.
  return page.getByRole('dialog', { name: 'Add transaction', includeHidden: true });
}

const key = (page: Page, k: string) => page.locator(`[data-keypad-key="${k}"]`);

test.describe('/ds amount keypad, phone 390px (@ui @mobile)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    user = await createUser(request, 'ui-ds-keypad');
    await loginContext(context, user.cookie);
    await createBankAccount(makeApi(user.cookie), { name: 'Main Bank' });
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('tap opens the keypad sheet, 120+80 shows = ₹200 and Apply fills 200', async ({ page }) => {
    const form = await openAddTransaction(page);
    const amount = form.locator('input[aria-label="Amount"]');
    await amount.click();
    const keypad = page.getByRole('dialog', { name: 'Amount' });
    await expect(keypad).toBeVisible();
    await expect(amount).not.toBeFocused();

    for (const k of ['1', '2', '0', '+', '8', '0']) await key(page, k).click();
    await expect(page.getByTestId('amount-keypad-display')).toHaveText('₹120+80');
    await expect(page.getByTestId('amount-keypad-result')).toHaveText('= ₹200');
    await keypad.getByRole('button', { name: 'Apply' }).click();

    await expect(keypad).toHaveCount(0);
    await expect(form).toBeVisible();
    await expect(amount).toHaveValue('200');
    await expect(amount).not.toBeFocused();
  });

  test('tapping the backdrop closes the sheet and leaves the field unchanged', async ({ page }) => {
    const form = await openAddTransaction(page);
    const amount = form.locator('input[aria-label="Amount"]');
    await amount.fill('45');
    await amount.click();
    const keypad = page.getByRole('dialog', { name: 'Amount' });
    await expect(page.getByTestId('amount-keypad-display')).toHaveText('₹45');
    await key(page, '9').click();
    await page.mouse.click(195, 40);
    await expect(keypad).toHaveCount(0);
    await expect(form).toBeVisible();
    await expect(amount).toHaveValue('45');
  });

  test('swiping the sheet down closes it and leaves the field unchanged', async ({ page }) => {
    const form = await openAddTransaction(page);
    const amount = form.locator('input[aria-label="Amount"]');
    await amount.click();
    const keypad = page.getByRole('dialog', { name: 'Amount' });
    await key(page, '7').click();
    const handle = keypad.getByTestId('dialog-drag-area');
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 8 });
    await page.mouse.move(box.x + box.width / 2, box.y + 420, { steps: 8 });
    await page.mouse.up();
    await expect(keypad).toHaveCount(0);
    await expect(amount).toHaveValue('');
  });

  test('Apply is disabled for an invalid expression', async ({ page }) => {
    const form = await openAddTransaction(page);
    await form.locator('input[aria-label="Amount"]').click();
    const keypad = page.getByRole('dialog', { name: 'Amount' });
    await key(page, '5').click();
    await key(page, '+').click();
    await expect(keypad.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  test('a negative result applies as a debit of the positive amount', async ({ page }) => {
    const form = await openAddTransaction(page);
    await form.getByRole('radio', { name: 'Credit' }).click();
    const amount = form.locator('input[aria-label="Amount"]');
    await amount.click();
    const keypad = page.getByRole('dialog', { name: 'Amount' });
    for (const k of ['1', '0', '0', '-', '3', '0', '0']) await key(page, k).click();
    await expect(keypad.getByTestId('amount-keypad-result')).toHaveText('= −₹200');
    await keypad.getByRole('button', { name: 'Apply' }).click();
    await expect(keypad).toHaveCount(0);
    await expect(amount).toHaveValue('200');
    await expect(form.getByRole('radio', { name: 'Debit' })).toBeChecked();
  });
});

test.describe('/ds amount keypad, desktop 1440px (@ui)', () => {
  test('the amount field stays a normal input: typing and calculator expressions work, no sheet', async ({
    context,
    request,
    page,
  }) => {
    const user = await createUser(request, 'ui-ds-keypad-desk');
    await loginContext(context, user.cookie);
    await createBankAccount(makeApi(user.cookie), { name: 'Main Bank' });
    await page.setViewportSize({ width: 1440, height: 900 });

    const form = await openAddTransaction(page);
    const amount = form.locator('input[aria-label="Amount"]');
    await amount.click();
    await expect(amount).toBeFocused();
    await expect(page.getByRole('dialog', { name: 'Amount' })).toHaveCount(0);
    await amount.pressSequentially('120+80');
    await expect(amount).toHaveValue('120+80');
    await amount.blur();
    await expect(amount).toHaveValue('200');
  });
});
