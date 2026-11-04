import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('/ds auto-linking (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-auto-link');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('a matching debit and credit on two accounts link themselves; the detail says so', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const from = await createBankAccount(api, { name: 'Auto From', last4: '1111' });
    const to = await createBankAccount(api, { name: 'Auto To', last4: '2222' });
    const out = await createTransaction(api, from.id, { amount: -7300, description: 'Auto link out' });
    await createTransaction(api, to.id, { amount: 7300, description: 'Auto link in' });

    // The link is made asynchronously after the create.
    await expect
      .poll(async () => {
        const res = await api.GET('/api/v1/transaction-links', { params: { query: { transactionId: out.id } } });
        return (res.data ?? []).length;
      }, { timeout: 45_000 })
      .toBeGreaterThan(0);

    await page.goto('/transactions');
    await page.getByText('Auto link out').first().click();
    await expect(page.getByText('Linked automatically')).toBeVisible({ timeout: 15_000 });
  });

  test('one debit and two equal credits are a suggestion: details panel Link, toast, section gone', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const from = await createBankAccount(api, { name: 'Suggest From', last4: '3333' });
    const toA = await createBankAccount(api, { name: 'Suggest To A', last4: '4444' });
    const toB = await createBankAccount(api, { name: 'Suggest To B', last4: '5555' });
    await createTransaction(api, toA.id, { amount: 9100, description: 'Suggest in A' });
    await createTransaction(api, toB.id, { amount: 9100, description: 'Suggest in B' });
    const out = await createTransaction(api, from.id, { amount: -9100, description: 'Suggest out' });

    await expect
      .poll(async () => {
        const res = await api.GET('/api/v1/link-suggestions');
        return (res.data ?? []).filter((x) => x.kind === 'TRANSFER').length;
      }, { timeout: 45_000 })
      .toBeGreaterThan(0);

    // Link suggestions no longer sit in the Inbox: the debit's details panel offers them.
    await page.goto(`/transactions?txn=${out.id}`);
    const dialog = page.getByRole('dialog', { name: 'Suggest out' });
    await expect(dialog).toBeVisible({ timeout: 45_000 });
    await expect(dialog.getByText('Suggested link')).toBeVisible({ timeout: 45_000 });
    await expect(dialog.getByRole('button', { name: 'Not this' })).toBeVisible();

    // A click before hydration is dropped: click again until the link is made.
    await expect(async () => {
      await dialog.getByRole('button', { name: 'Link', exact: true }).first().click({ timeout: 2000 });
      await expectToast(page, 'Linked');
    }).toPass({ timeout: 15_000 });
    await expect(dialog.getByText('Suggested link')).toHaveCount(0);
  });
});
