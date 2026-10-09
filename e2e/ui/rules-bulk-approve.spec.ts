import type { Locator } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { scriptCategorize } from '../fixtures/llm';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

/**
 * Tick a checkbox, retrying while it stays unchecked: the rules list is server-rendered, so a click
 * that lands before hydration is dropped. Only clicks when unchecked, so a retry never untoggles it.
 */
async function check(box: Locator): Promise<void> {
  await expect(async () => {
    if ((await box.getAttribute('data-state')) !== 'checked') await box.click();
    await expect(box).toHaveAttribute('data-state', 'checked', { timeout: 2000 });
  }).toPass({ timeout: 15000 });
}

const bankSpec: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '5566778899',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 20000,
  rows: [
    { date: '2026-04-03', description: 'THIRD WAVE COFFEE', debit: 380 },
    { date: '2026-04-09', description: 'OLA CABS RIDE', debit: 260 },
    { date: '2026-04-15', description: 'ZEPTO ORDER', debit: 940 },
  ],
};

test.describe('Rules bulk approve UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-rules-bulk');
    await loginContext(context, currentUser.cookie);

    // Three LLM-created (unverified) rules from one categorized statement.
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
    await scriptCategorize(api, [
      { index: 0, merchantKey: 'THIRD WAVE', displayName: 'Third Wave', categoryNames: ['Coffee'] },
      { index: 1, merchantKey: 'OLA CABS', displayName: 'Ola Cabs', categoryNames: ['Travel'] },
      { index: 2, merchantKey: 'ZEPTO', displayName: 'Zepto', categoryNames: ['Groceries'] },
    ]);
    const account = await createBankAccount(api, { name: 'Bulk Approve Account' });
    const { job } = await uploadAndIngest(api, account.id, [
      { filename: 'bulk-approve.pdf', buffer: await genBankPdf(bankSpec) },
    ]);
    expect(job.status).toBe('SUCCEEDED');
  });

  test('select some unverified rules and approve them together @mobile', async ({ page }) => {
    await page.goto('/rules');

    // Default tab is Unverified.
    for (const name of ['Third Wave', 'Ola Cabs', 'Zepto']) {
      await expect(page.getByRole('checkbox', { name: `Select ${name}` })).toBeVisible();
    }

    await check(page.getByRole('checkbox', { name: 'Select Third Wave' }));
    await check(page.getByRole('checkbox', { name: 'Select Zepto' }));
    await expect(page.getByText('2 selected')).toBeVisible();

    const selectionBar = page.getByText('2 selected').locator('..');
    await selectionBar.getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByText('2 rules verified — matching transactions cleared from review')).toBeVisible();
    await expect(page.getByText(/\d+ selected/)).not.toBeVisible();

    // Approved rules leave the Unverified tab; the unselected one stays.
    await expect(page.getByRole('checkbox', { name: 'Select Third Wave' })).not.toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Select Zepto' })).not.toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Select Ola Cabs' })).toBeVisible();

    // On phones the tabs live in the collapsed Filters action bar.
    if (test.info().project.name === 'ui-mobile') {
      await page.getByRole('button', { name: 'Expand action bar' }).click();
    }
    await page.getByRole('button', { name: 'Verified', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Third Wave' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zepto' })).toBeVisible();
  });

  test('select all on the page approves every unverified rule', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.getByRole('checkbox', { name: 'Select Zepto' })).toBeVisible();

    await check(page.getByRole('checkbox', { name: 'Select All Unverified on Page' }));
    await expect(page.getByText('3 selected')).toBeVisible();

    await page.getByText('3 selected').locator('..').getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByText('3 rules verified — matching transactions cleared from review')).toBeVisible();
    await expect(page.getByText('No categorization rules found')).toBeVisible();
  });
});
