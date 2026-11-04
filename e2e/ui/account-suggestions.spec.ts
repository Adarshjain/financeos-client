import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { type AccountDetectSeedEntity, clearAccountDetect, seedAccountDetect } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { cleanupIdentity, type GoogleIdentity, registerIdentity } from '../fixtures/google-stubs';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { connectGmail } from '../fixtures/seed/gmail';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

/** A card HDFC mails mention often and recently: a Found row. */
const card = (over: Partial<AccountDetectSeedEntity> = {}): AccountDetectSeedEntity => ({
  bank: 'hdfc',
  last4: '4321',
  kind: 'CREDIT_CARD',
  existsConf: 'HIGH',
  kindConf: 'HIGH',
  first: '2025-01-10',
  last: istToday(),
  evidenceMails: 6,
  ...over,
});

const foundBand = (page: Page, n: number) => page.getByText(`Found in your email · ${n}`);

test.describe('Account suggestions (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-account-suggestions');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test.afterEach(async () => {
    await clearAccountDetect(makeApi(currentUser.cookie));
  });

  test('a Found card shows under Credit cards with its band', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Suggest anchor', last4: '1111' });
    await seedAccountDetect(api, { entities: [card()] });

    await page.goto('/accounts');
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('••4321').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Not mine' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add', exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('suggestions-note')).toContainText('we can miss an account or get a detail wrong');
    await page.getByTestId('suggestions-note').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('suggestions-note')).toHaveCount(0);
    await page.reload();
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('suggestions-note')).toHaveCount(0);
  });

  test('an entity that matches an existing account stays hidden', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Existing HDFC', last4: '1111', bank: 'hdfc' });
    await seedAccountDetect(api, {
      entities: [card(), { ...card({ last4: '1111' }), kind: 'ACCOUNT' }],
    });

    await page.goto('/accounts');
    // Only the card is new: the account the user already has is not suggested again.
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('••1111')).toHaveCount(1);
  });

  test('Not mine hides a row, Undo brings it back, and a re-seed keeps it hidden', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Suggest anchor', last4: '1111' });
    await seedAccountDetect(api, { entities: [card()] });

    await page.goto('/accounts');
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    const notMine = page.getByRole('button', { name: 'Not mine' });
    await expect(async () => {
      await notMine.click();
      await expectToast(page, /Hidden .* ••4321/);
    }).toPass({ timeout: 15_000 });
    // Undo first: the toast does not wait for the slow row-gone checks.
    await page
      .locator('[data-sonner-toast]')
      .getByRole('button', { name: 'Undo' })
      .click();
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });

    await notMine.click();
    await expect(foundBand(page, 1)).toHaveCount(0);
    await seedAccountDetect(api, { entities: [card()] });
    await page.reload();
    await expect(page.getByText('Bank accounts')).toBeVisible();
    await expect(page.getByText('••4321')).toHaveCount(0);
    await expect(page.getByTestId('suggestions-note')).toHaveCount(0);
  });

  test('a low-confidence entity waits in a collapsed Maybe yours band until Show', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Suggest anchor', last4: '1111' });
    await seedAccountDetect(api, { entities: [card({ existsConf: 'LOW', kindConf: 'LOW' })] });

    await page.goto('/accounts');
    await expect(page.getByText('Maybe yours · 1')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('••4321')).toHaveCount(0);

    await page.getByRole('button', { name: 'Show' }).click();
    await expect(page.getByText('••4321').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide' })).toBeVisible();
  });

  test('Add on a card row opens Add account with Credit card chosen', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Suggest anchor', last4: '1111' });
    await seedAccountDetect(api, { entities: [card()] });

    await page.goto('/accounts');
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    const dialog = page.getByRole('dialog', { name: 'Add account' });
    // A click before hydration is dropped: click again until the dialog opens.
    await expect(async () => {
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();
      await expect(dialog).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await expect(dialog.getByRole('radio', { name: 'Credit card' })).toHaveAttribute('aria-checked', 'true');
  });

  /** Presses Add on the first suggestion row until the Add account dialog is up (a click before hydration is dropped). */
  async function openAddDialog(page: Page) {
    const dialog = page.getByRole('dialog', { name: 'Add account' });
    await expect(async () => {
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();
      await expect(dialog).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    return dialog;
  }

  test('Add on a found card opens a prefilled dialog, and creating it removes the row', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Suggest anchor', last4: '1111' });
    await seedAccountDetect(api, { entities: [card({ variant: 'Regalia', variantConf: 'HIGH' })] });

    await page.goto('/accounts');
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    const dialog = await openAddDialog(page);
    await expect(dialog.getByText('Filled in from your email. Check it, then create.')).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: /^Account name/ })).toHaveValue('HDFC Bank Regalia');
    await expect(dialog.getByRole('combobox', { name: /^Bank/ })).toContainText('HDFC Bank');
    await expect(dialog.getByRole('textbox', { name: /^Last 4 digits/ })).toHaveValue('4321');
    await expect(dialog.getByText('From your email', { exact: true })).toHaveCount(3);

    await dialog.getByRole('textbox', { name: /^Card anniversary/ }).fill('01042024');
    await dialog.getByRole('textbox', { name: /^Credit limit/ }).fill('500000');
    await dialog.getByRole('button', { name: 'Add account' }).click();

    // The page stays on the list, the row is gone and the card is an account now.
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(foundBand(page, 1)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText('HDFC Bank Regalia').first()).toBeVisible();
    await expect(page.getByText('••4321').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Not mine' })).toHaveCount(0);
  });

  test('a card with an add-on child prefills the add-on number and blocks Create until a relationship is picked', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Suggest anchor', last4: '1111' });
    await seedAccountDetect(api, {
      entities: [
        card({ variant: 'Regalia', variantConf: 'HIGH' }),
        card({ last4: '0082', lifecycle: 'ADD_ON', lifecycleConf: 'HIGH', linkedTo: 'hdfc:4321', evidenceMails: 4 }),
      ],
    });

    await page.goto('/accounts');
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    const dialog = await openAddDialog(page);
    await expect(dialog.getByText('Add-on card', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: /^Last 4 digits/ }).nth(1)).toHaveValue('0082');
    await expect(dialog.getByRole('combobox', { name: /^Holder is your/ })).toContainText('Pick one');

    await dialog.getByRole('textbox', { name: /^Card anniversary/ }).fill('01042024');
    await dialog.getByRole('textbox', { name: /^Credit limit/ }).fill('500000');
    await dialog.getByRole('button', { name: 'Add account' }).click();
    await expect(dialog.getByText('Pick who the holder is.')).toBeVisible();
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox', { name: /^Holder is your/ }).click();
    await page.getByRole('option', { name: 'Spouse' }).click();
    await dialog.getByRole('button', { name: 'Add account' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(foundBand(page, 1)).toHaveCount(0, { timeout: 15_000 });
  });

  test('Part of another account files a card as an older number on a card the user has', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const mine = await createCreditCard(api, { name: 'My HDFC card', last4: '1111', issuer: 'HDFC', bank: 'hdfc' });
    await seedAccountDetect(api, { entities: [card()] });

    await page.goto('/accounts');
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    const dialog = page.getByRole('dialog', { name: /Where does ••4321 belong\?/ });
    // A click before hydration is dropped: click again until the dialog opens.
    await expect(async () => {
      await page.getByRole('button', { name: 'Part of another account' }).first().click();
      await expect(dialog).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();

    await dialog.getByRole('combobox', { name: /^Account/ }).click();
    await page.getByRole('option', { name: 'My HDFC card' }).click();
    await dialog.getByRole('combobox', { name: /^It's/ }).click();
    await page.getByRole('option', { name: /An older number of this card/ }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expectToast(page, /Saved ••4321 on My HDFC card/);
    await expect(foundBand(page, 1)).toHaveCount(0, { timeout: 15_000 });

    await page.goto(`/accounts/${mine.id}/cards`);
    await expect(page.getByText('••4321').first()).toBeVisible();
  });

  test.describe('while the first scan runs', () => {
    let identity: GoogleIdentity;

    test.beforeEach(async () => {
      // The progress card needs a connected mailbox.
      identity = await registerIdentity();
      await connectGmail(makeApi(currentUser.cookie), identity);
    });

    test.afterEach(async () => {
      await cleanupIdentity(identity);
    });

    test('Accounts and Home show the Finding your accounts card', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      await seedAccountDetect(api, {
        entities: [],
        scan: { status: 'RUNNING', mailsSeen: 4020, mailsTotal: 10600, firstScanDone: false },
      });

      await page.goto('/accounts');
      await expect(page.getByText('Finding your accounts')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Read 4,020 of 10,600 emails', { exact: false })).toBeVisible();
      await expect(page.getByText('Accounts we find in your email show up here.')).toBeVisible();
      await expect(page.getByText('Cards we find in your email show up here.')).toBeVisible();

      await page.goto('/dashboard');
      await expect(page.getByText('Finding your accounts')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Read 4,020 of 10,600 emails', { exact: false })).toBeVisible();
    });
  });

  test('the row actions fit at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Suggest anchor', last4: '1111' });
    await seedAccountDetect(api, { entities: [card()] });

    await page.goto('/accounts');
    await expect(foundBand(page, 1)).toBeVisible({ timeout: 15_000 });
    const notMine = page.getByRole('button', { name: 'Not mine' });
    const add = page.getByRole('button', { name: 'Add', exact: true });
    await expect(notMine).toBeVisible();
    await expect(add.last()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await expect(async () => {
      await notMine.click();
      await expectToast(page, /Hidden .* ••4321/);
    }).toPass({ timeout: 15_000 });
    await expect(foundBand(page, 1)).toHaveCount(0);
  });
});
