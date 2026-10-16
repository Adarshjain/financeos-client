import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

/**
 * /ds/offline is the review build of the offline page using the new design system.
 */
test.describe('/ds Offline page (@ui)', () => {
  test('renders the offline notice with design-system EmptyState and Try again button', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/ds/offline`);
    await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
    await expect(
      page.getByText("Your money is exactly where you left it. We just can't reach the internet right now, so there's nothing fresh to show.")
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
