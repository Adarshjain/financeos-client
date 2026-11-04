import { makeApi } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

const BIRTH_WARNING = /Without it we can't open statements your bank locks with it\./;

test.describe('Hello and profile (@ui)', () => {
  test('a new user is sent to Hello once: warning, consent, Connect Gmail, Skip, then never again', async ({
    context,
    page,
    request,
  }) => {
    const user = await createUser(request, 'ui-hello', { helloDone: false });
    await loginContext(context, user.cookie);

    // The app gate sends a user without a finished Hello to /welcome.
    await page.goto('/dashboard');
    await page.waitForURL('**/welcome');
    await expect(page.getByRole('heading', { name: "Hi there. Let's find all your money." })).toBeVisible();
    await expect(page.getByText('1 of 2')).toBeVisible();

    await page.getByLabel('Your name, as your bank prints it').fill('Asha Rao');
    await page.getByRole('checkbox').click();

    // First press with the birth date empty warns and offers Continue anyway.
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText(BIRTH_WARNING)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue anyway' })).toBeVisible();

    // Filling it takes the warning away and the button reads Continue again.
    await page.getByLabel('Date of birth').fill('05/04/1990');
    await expect(page.getByText(BIRTH_WARNING)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();

    // Consent is always required.
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('Agree to the Terms and Privacy policy to continue.')).toBeVisible();
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // No Gmail yet: screen 2, then Skip goes Home.
    await expect(page.getByRole('heading', { name: 'Connect the Gmail your bank writes to' })).toBeVisible();
    await expect(page.getByText('2 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.waitForURL('**/dashboard');

    // Hello is done for good.
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/welcome');
    await expect(page).toHaveURL(/\/dashboard/);

    const me = await makeApi(user.cookie).GET('/api/v1/auth/me');
    expect(me.data).toMatchObject({ displayName: 'Asha Rao', birthDate: '1990-04-05', helloDone: true });
  });

  test('Continue anyway proceeds with an empty birth date', async ({ context, page, request }) => {
    const user = await createUser(request, 'ui-hello-empty', { helloDone: false });
    await loginContext(context, user.cookie);

    await page.goto('/welcome');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continue anyway' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue anyway' }).click();
    await expect(page.getByText('2 of 2')).toBeVisible();

    const me = await makeApi(user.cookie).GET('/api/v1/auth/me');
    expect(me.data).toMatchObject({ helloDone: true });
    expect(me.data?.birthDate ?? null).toBeNull();
  });

  test('Settings → Profile → Edit saves the name and birth date', async ({ context, page, request }) => {
    const user = await createUser(request, 'ui-profile-edit');
    await loginContext(context, user.cookie);

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit profile' });
    await dialog.getByLabel('Your name, as your bank prints it').fill('Asha R Rao');
    await dialog.getByLabel('Date of birth').fill('06/05/1991');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Profile saved');

    await expect(page.getByText('Asha R Rao').first()).toBeVisible();
    await expect(page.getByText('06/05/1991')).toBeVisible();
    const me = await makeApi(user.cookie).GET('/api/v1/auth/me');
    expect(me.data).toMatchObject({ displayName: 'Asha R Rao', birthDate: '1991-05-06', birthDateSource: 'TYPED' });
  });
});
