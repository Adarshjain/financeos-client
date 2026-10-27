import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

/**
 * /offline is the review build of the offline page using the new design system.
 */
test.describe('/ds Offline page (@ui)', () => {
  test('renders the offline notice with design-system EmptyState and Try again button', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/offline`);
    await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
    await expect(
      page.getByText("Check your connection and try again.")
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
