import { makeApi } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import type { GoogleIdentity } from '../fixtures/google-stubs';
import { cleanupIdentity, registerIdentity } from '../fixtures/google-stubs';
import { createBankAccount } from '../fixtures/seed/accounts';
import { ssoLogin } from '../fixtures/seed/gmail';
import { createTransactions } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Account deletion UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });

  test('password user: wrong password is refused, correct password + DELETE removes the account', async ({ page, context, request }) => {
    test.slow();
    const user = await createUser(request, 'ui-delete');
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Doomed Bank', last4: '1234' });
    await createTransactions(api, account.id, 2);
    await loginContext(context, user.cookie);

    await page.goto('/settings');
    await expect(page.getByText('Danger Zone')).toBeVisible();
    await page.getByRole('button', { name: 'Delete Account' }).click();
    await expect(page.getByRole('heading', { name: 'Delete Account Permanently' })).toBeVisible();
    await expect(page.getByText(/1 account/)).toBeVisible();
    await expect(page.getByText(/2 transactions/)).toBeVisible();

    const submit = page.getByRole('button', { name: 'Permanently Delete Account' });
    await expect(submit).toBeDisabled();
    await page.getByLabel('Current Password').fill('wrong-password');
    await page.getByLabel('Type "DELETE" to confirm').fill('DELETE');
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText('That password is not correct.')).toBeVisible();

    await page.getByLabel('Current Password').fill(user.password);
    await page.getByRole('button', { name: 'Permanently Delete Account' }).click();
    await page.waitForURL(/\/login\?deleted=1/, { timeout: 30_000 });
    await expect(page.getByText('Your account has been deleted.')).toBeVisible();

    const me = await api.GET('/api/v1/auth/me');
    expect(me.response.status).toBe(401);
  });

  test('Google-only user confirms by typing the email instead of a password', async ({ page, context }) => {
    test.slow();
    let identity: GoogleIdentity | undefined;
    try {
      identity = await registerIdentity();
      const { cookie, api } = await ssoLogin(identity);
      await loginContext(context, cookie);

      await page.goto('/settings');
      await page.getByRole('button', { name: 'Delete Account' }).click();
      await expect(page.getByRole('heading', { name: 'Delete Account Permanently' })).toBeVisible();
      await expect(page.getByLabel('Current Password')).toHaveCount(0);
      await page.getByLabel('Confirm Email Address').fill(identity.email);
      await page.getByLabel('Type "DELETE" to confirm').fill('DELETE');
      await page.getByRole('button', { name: 'Permanently Delete Account' }).click();

      await page.waitForURL(/\/login\?deleted=1/, { timeout: 30_000 });
      await expect(page.getByText('Your account has been deleted.')).toBeVisible();
      expect((await api.GET('/api/v1/auth/me')).response.status).toBe(401);
    } finally {
      await cleanupIdentity(identity);
    }
  });
});
