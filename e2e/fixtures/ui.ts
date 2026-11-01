import type { Locator, Page, Request } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Click a control whose handler sends an API request, re-clicking until that request goes out.
 * Server-rendered pages show their buttons before React hydrates, and a click that lands in that
 * window is silently dropped. Re-clicking is safe because a dropped click sent nothing.
 */
export async function clickUntilRequest(
  page: Page,
  target: Locator,
  url: RegExp | ((request: Request) => boolean),
): Promise<void> {
  await expect(async () => {
    await Promise.all([page.waitForRequest(url, { timeout: 2000 }), target.click()]);
  }).toPass({ timeout: 15000 });
}

/**
 * Assert that a toast with the given text appears in the UI.
 */
export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  const toastLocator = page.locator('[data-sonner-toast], [role="status"], [role="alert"]').filter({ hasText: text });
  await expect(toastLocator.first()).toBeVisible({ timeout: 10000 });
}
