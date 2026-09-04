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
  const toastLocator = page.locator('[data-sonner-toast]').filter({ hasText: text });
  await expect(toastLocator).toBeVisible({ timeout: 5000 });
}

/**
 * Log in through the UI form.
 */
export async function loginViaUi(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto(`${E2E_CLIENT_URL}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
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
