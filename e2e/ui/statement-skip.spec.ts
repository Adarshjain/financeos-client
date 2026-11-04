import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createCreditCard } from '../fixtures/seed/accounts';
import { ingestCardStatement } from '../fixtures/seed/obligations';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

/** A card whose last statement ended 38 days ago: one monthly cycle is past its grace period, the next is not yet over. */
async function seedCardMissingOneStatement(currentUser: CreatedUser, name: string, last4: string) {
  const api = makeApi(currentUser.cookie);
  const card = await createCreditCard(api, { name, last4 });
  await ingestCardStatement(api, card.id, last4, 38);
  return card;
}

const SKIP = 'No statement this period';

test.describe('No statement this period (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-statement-skip');
    await loginContext(context, currentUser.cookie);
  });

  const undoFromToast = async (page: Page) => {
    await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Undo' }).first().click();
  };

  test('Inbox: mark the cycle, the row goes; Undo brings it back', async ({ page }) => {
    test.slow();
    await seedCardMissingOneStatement(currentUser, 'Skip Inbox Card', '8101');
    await page.goto('/inbox');
    const row = page.getByTestId('inbox-row').filter({ hasText: 'Skip Inbox Card' });
    await expect(row).toContainText('statement missing');
    await expect(row.getByRole('link', { name: 'Upload' })).toBeVisible();

    await row.getByRole('button', { name: SKIP }).click();
    await expectToast(page, SKIP);
    await expect(row).toHaveCount(0);

    await undoFromToast(page);
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: SKIP })).toBeVisible();
  });

  test('Upcoming: mark the cycle, the overdue row moves on to the next cycle; Undo brings it back', async ({ page }) => {
    test.slow();
    await seedCardMissingOneStatement(currentUser, 'Skip Upcoming Card', '8102');
    await page.goto('/upcoming');
    await expect(page.getByText('Skip Upcoming Card statement expected')).toBeVisible();
    await expect(page.getByRole('button', { name: SKIP })).toBeVisible();

    await page.getByRole('button', { name: SKIP }).click();
    await expectToast(page, SKIP);
    // The skipped cycle counts as covered: the row moves to the next cycle, which is not over yet, so no skip button.
    await expect(page.getByRole('button', { name: SKIP })).toHaveCount(0);

    await undoFromToast(page);
    await expect(page.getByRole('button', { name: SKIP })).toBeVisible();
  });

  test('Statements tab: Statement missing row, mark it, a No statement row shows; its Undo brings the warning back', async ({ page }) => {
    test.slow();
    const card = await seedCardMissingOneStatement(currentUser, 'Skip Tab Card', '8103');
    // A second card still missing its statement: its Inbox row proves the list loaded before asserting absence.
    await seedCardMissingOneStatement(currentUser, 'Skip Tab Other', '8104');
    await page.goto(`/accounts/${card.id}/statements`);
    const missing = page.getByTestId('statement-missing-row');
    const skipped = page.getByTestId('statement-skipped-row');
    await expect(missing).toContainText('Statement missing');
    await expect(missing.getByRole('link', { name: 'Upload' })).toHaveAttribute('href', `/transactions/import?account=${card.id}`);
    await expect(skipped).toHaveCount(0);

    await missing.getByRole('button', { name: SKIP }).click();
    await expect(missing).toHaveCount(0);
    await expect(skipped).toHaveCount(1);
    await expect(skipped).toContainText('No statement');

    // Covered everywhere: the Inbox no longer has the row either.
    await page.goto('/inbox');
    await expect(page.getByTestId('inbox-row').filter({ hasText: 'Skip Tab Other' })).toContainText('statement missing');
    await expect(page.getByTestId('inbox-row').filter({ hasText: 'Skip Tab Card' })).toHaveCount(0);

    await page.goto(`/accounts/${card.id}/statements`);
    await skipped.getByRole('button', { name: 'Undo' }).click();
    await expect(skipped).toHaveCount(0);
    await expect(missing).toContainText('Statement missing');
  });
});
