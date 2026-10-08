import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { E2E_CLIENT_URL } from './config';

/**
 * Navigate to the Accounts page and ensure it has finished loading.
 */
export async function openAccounts(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/accounts`);
  await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
}

/**
 * Navigate to the Transactions page and ensure it has finished loading.
 */
export async function openTransactions(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/transactions`);
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
}

/**
 * Click a control whose handler sends an API request, re-clicking until that request goes out.
 * Server-rendered pages show their buttons before React hydrates, and a click that lands in that
 * window is silently dropped. Re-clicking is safe because a dropped click sent nothing.
 */
export async function clickUntilRequest(page: Page, target: Locator, url: RegExp): Promise<void> {
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

export async function openInvestments(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/investments`);
  await expect(page.getByRole('heading', { name: /Portfolio Holdings/i, level: 1 })).toBeVisible();
}

export async function openInstruments(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/investments/instruments`);
  await expect(page.getByRole('heading', { name: /Instruments/i, level: 1 })).toBeVisible();
}

export async function openTradebook(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/investments/tradebook`);
  await expect(page.getByRole('heading', { name: /Tradebook & Actions/i, level: 1 })).toBeVisible();
}

export async function openDividends(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/investments/dividends`);
  await expect(page.getByRole('heading', { name: /Dividend Income & Payouts/i, level: 1 })).toBeVisible();
}

export async function openCorporateActions(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/investments/corporate-actions`);
  await expect(page.getByRole('heading', { name: /Corporate Actions/i, level: 1 })).toBeVisible();
}

export async function openFno(page: Page): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/investments/fno`);
  await expect(page.getByRole('heading', { name: /Futures & Options/i, level: 1 })).toBeVisible();
}


/**
 * Open an account's edit dialog from its tile on /accounts. The tile body now links to the account
 * page; the pencil is a sibling button right after that link. Retried because the dialog trigger is
 * server-rendered and a click before hydration is dropped.
 */
export async function openAccountEditor(page: Page, name: string | RegExp): Promise<void> {
  const trigger = page.getByRole('link', { name }).first().locator('xpath=following-sibling::button[1]');
  await expect(async () => {
    await trigger.click();
    await expect(page.getByLabel('Account Name')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
}
