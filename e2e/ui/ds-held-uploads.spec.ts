import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { type BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { getAccountStatements } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

// Made-up statement: HDFC Bank, account ending 8899. The server reads bank + last 4 from the PDF and matches an account
// carrying both; any other account cannot take it automatically.
const SPEC: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '5566778899',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 25000.0,
  rows: [
    { date: '2026-04-05', description: 'ACME PAYROLL CREDIT', credit: 40000.0 },
    { date: '2026-04-12', description: 'LANTERN GROCERS PURCHASE', debit: 2200.0 },
  ],
};

/** Picks Detect automatically (the default), adds the file and runs the import; waits until the form is free again. */
async function uploadAuto(page: Page, filename: string, buffer: Buffer): Promise<void> {
  await page.goto('/transactions/import');
  await expect(page.getByRole('combobox', { name: 'Account' })).toContainText('Detect automatically', { timeout: 60000 });
  await page.locator('input[type=file]').setInputFiles({ name: filename, mimeType: 'application/pdf', buffer });
  await expect(page.getByText(filename)).toBeVisible();
  await page.getByRole('button', { name: 'Upload & process 1 file' }).click();
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeDisabled({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeEnabled({ timeout: 60000 });
}

test.describe('Import without picking an account (@ui)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    test.setTimeout(120000);
    user = await createUser(request, 'ui-held-uploads');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('a statement that matches an account lands in it and nothing is held', async ({ page }) => {
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Auto Match Bank', last4: '8899', bank: 'hdfc', openingBalance: SPEC.opening });

    await uploadAuto(page, 'auto-match.pdf', await genBankPdf(SPEC));

    await expect(page.getByTestId('held-uploads')).toHaveCount(0);
    await expect.poll(async () => (await getAccountStatements(api, account.id)).length, { timeout: 30000 }).toBe(1);
    await page.getByRole('link', { name: 'View' }).first().click();
    await expect(page.getByTestId('import-file')).toContainText('auto-match.pdf');
    await expect(page.getByTestId('import-file')).toContainText('Done');
  });

  test('a statement matching no account is held under Needs an account, with a notification; assigning imports it', async ({ page }) => {
    const api = makeApi(user.cookie);
    // Same bank, different last 4: no match.
    const other = await createBankAccount(api, { name: 'Elsewhere Bank', last4: '1111', bank: 'hdfc', openingBalance: SPEC.opening });

    await uploadAuto(page, 'held-statement.pdf', await genBankPdf(SPEC));

    const section = page.getByTestId('held-uploads');
    await expect(section).toContainText('Needs an account', { timeout: 30000 });
    const file = section.getByTestId('held-file');
    await expect(file).toHaveCount(1);
    await expect(file).toContainText('held-statement.pdf');
    await expect(file).toContainText('HDFC Bank');
    await expect(file).toContainText('••8899');
    await expect(file.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect((await getAccountStatements(api, other.id)).length).toBe(0);

    // The feed has the matching notification, which opens Import.
    const feed = await api.GET('/api/v1/notifications/feed', { params: { query: { page: 0, size: 10 } } });
    const kinds = (feed.data?.content ?? []).map((n) => n.kind);
    expect(kinds).toContain('upload_held');
    await page.goto('/notifications');
    const row = page.getByTestId('notification-row').filter({ hasText: 'A statement needs an account' });
    await expect(row).toHaveCount(1, { timeout: 45000 });
    await expect(async () => {
      await row.click();
      await expect(page).toHaveURL(/\/transactions\/import/, { timeout: 5000 });
    }).toPass({ timeout: 30000 });
    // Load the page itself: the row's soft navigation has rarely been seen to fall back to Notifications under load.
    await page.goto('/transactions/import');
    await expect(page.getByTestId('held-file')).toHaveCount(1, { timeout: 30000 });

    // Assign it to the other account.
    const held = page.getByTestId('held-file');
    await held.getByRole('combobox', { name: 'Account' }).click();
    await page.getByRole('option', { name: /Elsewhere Bank/ }).click();
    await held.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByTestId('held-uploads')).toHaveCount(0, { timeout: 30000 });
    await expect.poll(async () => (await getAccountStatements(api, other.id)).length, { timeout: 30000 }).toBe(1);

    // Its transactions are now in the account.
    await page.goto('/transactions');
    await expect(page.getByText('LANTERN GROCERS PURCHASE').locator('visible=true').first()).toBeVisible({ timeout: 45000 });
    const left = await api.GET('/api/v1/held-uploads');
    expect(left.data).toEqual([]);
  });

  test('Remove asks first, and removing drops the file from Needs an account without importing it', async ({ page }) => {
    const api = makeApi(user.cookie);
    const other = await createBankAccount(api, { name: 'Remove Target Bank', last4: '2222', bank: 'hdfc', openingBalance: SPEC.opening });

    await uploadAuto(page, 'remove-me.pdf', await genBankPdf(SPEC));
    const held = page.getByTestId('held-file');
    await expect(held).toHaveCount(1, { timeout: 30000 });

    await held.getByRole('button', { name: 'Remove' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove this file?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(held).toHaveCount(1);

    await held.getByRole('button', { name: 'Remove' }).click();
    await dialog.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByTestId('held-uploads')).toHaveCount(0, { timeout: 30000 });
    expect((await api.GET('/api/v1/held-uploads')).data).toEqual([]);
    expect((await getAccountStatements(api, other.id)).length).toBe(0);
  });

  test('Create account on a held file opens the account form prefilled from the statement and imports into the new account', async ({ page }) => {
    const api = makeApi(user.cookie);

    await uploadAuto(page, 'create-for-me.pdf', await genBankPdf(SPEC));
    const held = page.getByTestId('held-file');
    await expect(held).toHaveCount(1, { timeout: 30000 });

    await held.getByRole('button', { name: 'Create account' }).click();
    const dialog = page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await dialog.getByRole('radio', { name: 'Bank', exact: true }).click();
    await expect(dialog.getByLabel('Last 4 digits').first()).toHaveValue('8899');
    await dialog.getByLabel('Account name').fill('Created From Held');
    await dialog.getByRole('button', { name: 'Add account' }).click();

    await expect(page.getByTestId('held-uploads')).toHaveCount(0, { timeout: 45000 });
    const accounts = await api.GET('/api/v1/accounts');
    const created = (accounts.data as { id: string; name: string }[]).find((a) => a.name === 'Created From Held');
    expect(created, 'the account was created').toBeTruthy();
    await expect.poll(async () => (await getAccountStatements(api, created!.id)).length, { timeout: 30000 }).toBe(1);
  });
});
