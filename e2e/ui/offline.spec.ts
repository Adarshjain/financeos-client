import { expect, test } from '../fixtures/test';

/**
 * /offline is the document the service worker serves when a navigation fails without a network.
 * It is a plain public page, so the route is exercised directly here; the service-worker fallback
 * itself is browser behaviour outside the app's control.
 */
test.describe('Offline page (@ui)', () => {
  test('renders the offline notice without a session', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
    await expect(page.getByText(/FinanceOS needs a connection/)).toBeVisible();
  });

  test('renders on a phone too @mobile', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
  });
});
