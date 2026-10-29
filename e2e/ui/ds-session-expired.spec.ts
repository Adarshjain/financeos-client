import { type CreatedUser, createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

test.describe('/ds session expiry and version (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-expired');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('an expired session asks for the password over the page; wrong password stays, right one carries on', async ({ page, context }) => {
    await page.goto(`${E2E_CLIENT_URL}/loans`);
    await expect(page.getByRole('button', { name: 'Add loan', exact: true }).first()).toBeVisible();

    // The session ends while the page is open.
    await context.clearCookies();
    await page.getByRole('button', { name: 'Add loan', exact: true }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Sign in again' });
    await expect(dialog).toBeVisible();
    expect(page.url()).toContain('/loans');
    await expect(dialog.getByLabel('Email')).toHaveValue(currentUser.email);
    await expect(dialog.getByLabel('Email')).toHaveAttribute('readonly', '');

    await dialog.getByLabel('Password', { exact: true }).fill('definitely-wrong');
    await dialog.getByRole('button', { name: 'Sign in' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Password', { exact: true }).fill(currentUser.password);
    await dialog.getByRole('button', { name: 'Sign in' }).click();
    await expect(dialog).toBeHidden();
    expect(page.url()).toContain('/loans');
    // The page carries on where it was: the Add loan dialog the click opened is still there.
    await expect(page.getByRole('dialog', { name: 'Add loan' })).toBeVisible();
  });

  test('navigating after the session ended lands on the Dinero login and returns to the page after sign-in', async ({ page, context }) => {
    await page.goto(`${E2E_CLIENT_URL}/inbox`);
    await expect(page.getByRole('link', { name: 'Loans & lendings' }).first()).toBeVisible();

    // The cookie is still sent but the server no longer accepts it.
    await context.addCookies([{ name: 'FINANCEOS_SESSION', value: 'expired-session', url: E2E_CLIENT_URL }]);
    await page.getByRole('link', { name: 'Loans & lendings' }).first().click();

    await page.waitForURL('**/login?from=*');
    expect(new URL(page.url()).searchParams.get('from')).toMatch(/^\/loans/);

    await page.getByLabel('Email').fill(currentUser.email);
    await page.getByLabel('Password', { exact: true }).fill(currentUser.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/loans**');
  });

  test('a page that loads its data its own way (Accounts) also goes to sign in and back after the session ended', async ({ page, context }) => {
    await page.goto(`${E2E_CLIENT_URL}/inbox`);
    await expect(page.getByRole('link', { name: 'Loans & lendings' }).first()).toBeVisible();

    await context.addCookies([{ name: 'FINANCEOS_SESSION', value: 'expired-session', url: E2E_CLIENT_URL }]);
    await page.getByRole('link', { name: 'Accounts', exact: true }).first().click();
    await page.waitForURL('**/login?from=*');
    expect(new URL(page.url()).searchParams.get('from')).toBe('/accounts');
  });

  test('the deployed build id is served uncached for the new-version check', async ({ request }) => {
    const res = await request.get(`${E2E_CLIENT_URL}/api/version`);
    expect(res.ok()).toBe(true);
    expect(res.headers()['cache-control']).toContain('no-store');
    expect(typeof (await res.json()).version).toBe('string');
  });
});
