import type { Page } from '@playwright/test';

import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';

const dialogOf = (page: Page, name: string) => page.getByRole('dialog', { name });

async function pickSharedLimit(page: Page, dialog: ReturnType<typeof dialogOf>, option: string | RegExp) {
  await dialog.getByRole('combobox', { name: 'Shared limit' }).click();
  await page.getByRole('option', { name: option }).click();
}

/** Opens Add credit card and fills the card's identity; the limit is left to the caller. */
async function startCard(page: Page, name: string, last4: string) {
  await page.getByRole('button', { name: 'Add account', exact: true }).first().click();
  const dialog = dialogOf(page, 'Add account');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: 'Credit card' }).click();
  await dialog.getByRole('textbox', { name: /^Account name/ }).fill(name);
  await dialog.getByRole('combobox', { name: /^Bank/ }).click();
  await page.getByRole('option', { name: 'HDFC Bank' }).click();
  await dialog.getByRole('textbox', { name: /^Last 4 digits/ }).fill(last4);
  await dialog.getByRole('textbox', { name: /^Card anniversary/ }).fill('01042024');
  return dialog;
}

test.describe('Shared credit limit UI (@ui)', () => {
  test.beforeEach(async ({ context, request }) => {
    const u = await createUser(request, 'ui-shared-limit');
    await loginContext(context, u.cookie);
  });

  test('two cards share one limit created inline, the total counts it once, and a card can leave it (@mobile)', async ({ page }) => {
    await page.goto('/accounts');

    // 1. First card creates the shared limit inline; it needs no limit of its own.
    const first = await startCard(page, 'HDFC Regalia', '2222');
    await pickSharedLimit(page, first, 'New shared limit…');
    await expect(first.getByRole('textbox', { name: /^Credit limit/ })).toHaveCount(0);
    await first.getByRole('textbox', { name: /^Shared limit name/ }).fill('HDFC shared');
    await first.getByRole('textbox', { name: /^Shared limit amount/ }).fill('500000');
    await first.getByRole('button', { name: 'Add account' }).click();
    await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);

    // 2. Second card joins it from the picker, prefilled with the pool's name and amount.
    await page.goto('/accounts');
    const second = await startCard(page, 'HDFC Millennia', '3333');
    await pickSharedLimit(page, second, /HDFC shared/);
    await expect(second.getByRole('textbox', { name: /^Shared limit name/ })).toHaveValue('HDFC shared');
    await expect(second.getByRole('textbox', { name: /^Shared limit amount/ })).toHaveValue(/5,00,000|500000/);
    await second.getByRole('button', { name: 'Add account' }).click();
    await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);

    // 3. Both rows show the shared limit; the section total counts it once.
    await page.goto('/accounts');
    await expect(page.getByText('Shared limit · HDFC shared ₹5L').locator('visible=true')).toHaveCount(2);
    await expect(page.getByText(/₹5,00,000 limit, 2 cards/).locator('visible=true').first()).toBeVisible();

    // 4. One card leaves the pool and gets its own limit back.
    await page.getByRole('button', { name: /HDFC Millennia/ }).click();
    await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const edit = dialogOf(page, 'Edit account');
    await expect(edit.getByRole('combobox', { name: 'Shared limit' })).toContainText('HDFC shared');
    await pickSharedLimit(page, edit, 'None, this card has its own limit');
    await edit.getByRole('textbox', { name: /^Credit limit/ }).fill('100000');
    await edit.getByRole('button', { name: 'Save account' }).click();
    await expect(edit).toHaveCount(0);

    await page.goto('/accounts');
    await expect(page.getByText('Shared limit · HDFC shared ₹5L').locator('visible=true')).toHaveCount(1);
    await expect(page.getByText(/₹6,00,000 limit, 2 cards/).locator('visible=true').first()).toBeVisible();
  });
});
