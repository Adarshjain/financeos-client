import type { Page } from '@playwright/test';
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

