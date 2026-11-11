import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { DETECT_EX_DATE, seedDetectablePurchases, waitForInboxItem } from '../fixtures/seed/corporateActionDetect';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

const row = (page: Page, key: string) => page.locator(`[data-inbox-key="${key}"]`);

test.describe('/ds Inbox detected corporate actions, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-inbox-ca');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Undo removes the applied row', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const seed = await seedDetectablePurchases(api);
    const applied = await waitForInboxItem(api, 'corporate_action_applied', seed.bonus.id);

    await page.goto('/inbox');
    await expect(row(page, applied.key)).toBeVisible({ timeout: 45_000 });
    await expect(row(page, applied.key)).toContainText('Bonus 1:1 applied to');
    await row(page, applied.key).getByRole('button', { name: 'Undo' }).click();
    await expectToast(page, 'Removed');
    await expect(row(page, applied.key)).toHaveCount(0);
  });

  test('Review opens the dialog on the detected kind and date; Ignore removes the other row', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const seed = await seedDetectablePurchases(api);
    const demerge = await waitForInboxItem(api, 'corporate_action_review', seed.demerge.id);
    const miss = await waitForInboxItem(api, 'corporate_action_review', seed.miss.id);

    await page.goto('/inbox');
    await expect(row(page, demerge.key)).toBeVisible({ timeout: 45_000 });
    await row(page, demerge.key).getByRole('button', { name: 'Review' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('combobox', { name: /^Action/ })).toContainText('Demerger');
    await expect(dialog.getByLabel('Ex-date')).toHaveValue('15/01/2025');
    expect(DETECT_EX_DATE).toBe('2025-01-15');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row(page, demerge.key)).toBeVisible();

    await row(page, miss.key).getByRole('button', { name: 'Ignore' }).click();
    await expect(row(page, miss.key)).toHaveCount(0);
  });
});
