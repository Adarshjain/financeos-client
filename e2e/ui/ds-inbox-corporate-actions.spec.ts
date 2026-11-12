import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { DETECT_EX_DATE, seedDetectablePurchases, waitForSuggestion } from '../fixtures/seed/corporateActionDetect';
import { expect, test } from '../fixtures/test';

const POINTER_KEY = 'page:/investments/corporate-actions';
const row = (page: Page, key: string) => page.locator(`[data-inbox-key="${key}"]`);
/** A review card on the Corporate actions page, found by its instrument name. */
const card = (page: Page, name: string) => page.locator('section').locator('> div').filter({ hasText: name });

test.describe('/ds Inbox points at detected corporate actions, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-inbox-ca');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('the Inbox has one row for the actions to review, with no buttons, and it opens the page', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const seed = await seedDetectablePurchases(api);
    await waitForSuggestion(api, 'needsReview', seed.demerge.id);
    await waitForSuggestion(api, 'needsReview', seed.miss.id);

    await page.goto('/inbox');
    const pointer = row(page, POINTER_KEY);
    await expect(pointer).toBeVisible({ timeout: 45_000 });
    await expect(pointer).toContainText('Corporate actions: 2 to review');
    await expect(pointer).toHaveAttribute('href', '/investments/corporate-actions');
    await expect(pointer.getByRole('button')).toHaveCount(0);
    // An automatic one gets no Inbox row.
    await expect(page.locator('[data-inbox-key^="ca_applied:"]')).toHaveCount(0);

    await pointer.click();
    await page.waitForURL('**/investments/corporate-actions');
    await expect(page.getByRole('heading', { name: /^Needs your review/ })).toBeVisible();
  });

  test('Undo on the page removes the applied action', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const seed = await seedDetectablePurchases(api);
    await waitForSuggestion(api, 'appliedAutomatically', seed.bonus.id);

    await page.goto('/investments/corporate-actions');
    await expect(page.getByRole('heading', { name: /^Applied automatically/ })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Bonus 1:1').first()).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('heading', { name: /^Applied automatically/ })).toHaveCount(0);
  });

  test('Review and apply opens the dialog on the detected kind and date; Not applicable removes the other card', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const seed = await seedDetectablePurchases(api);
    await waitForSuggestion(api, 'needsReview', seed.demerge.id);
    await waitForSuggestion(api, 'needsReview', seed.miss.id);

    await page.goto('/investments/corporate-actions');
    const demerge = card(page, seed.demerge.name);
    await expect(demerge).toBeVisible({ timeout: 45_000 });
    await demerge.getByRole('button', { name: 'Review and apply' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('combobox', { name: /^Action/ })).toContainText('Demerger');
    await expect(dialog.getByLabel('Ex-date')).toHaveValue('15/01/2025');
    expect(DETECT_EX_DATE).toBe('2025-01-15');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(demerge).toBeVisible();

    const miss = card(page, seed.miss.name);
    await miss.getByRole('button', { name: 'Not applicable' }).click();
    await expect(miss).toHaveCount(0);
  });
});
