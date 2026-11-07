import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

const SPEC: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '5566778811',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 25000.0,
  rows: [
    { date: '2026-04-05', description: 'SALARY CREDIT APR', credit: 40000.0 },
    { date: '2026-04-12', description: 'SUPERMARKET GROCERIES', debit: 2200.0 },
  ],
};

test.describe('Data sources: Imports (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    test.setTimeout(150000);
    currentUser = await createUser(request, 'ui-data-sources-imports');
    await loginContext(context, currentUser.cookie);
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test('an uploaded statement is a row that links to the account statements; the kind filter narrows the list', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'DS Imports Bank', openingBalance: SPEC.opening });
    await uploadAndIngest(api, account.id, [{ filename: 'hdfc-apr-2026.pdf', buffer: await genBankPdf(SPEC) }]);

    await page.goto('/data-sources/imports');
    await expect(page.getByRole('banner')).toContainText('Imports', { timeout: 30000 });
    const row = page.getByRole('main').getByRole('link', { name: /DS Imports Bank statement/ });
    await expect(row).toBeVisible({ timeout: 30000 });
    await expect(row).toContainText('hdfc-apr-2026.pdf');
    await expect(row).toHaveAttribute('href', `/accounts/${account.id}/statements`);

    await page.goto('/data-sources/imports?kind=epf_passbook');
    await expect(page.getByText('No imports match')).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL(/\/data-sources\/imports$/);
    await expect(page.getByRole('main').getByRole('link', { name: /DS Imports Bank statement/ })).toBeVisible();
  });

  test('a user with no imports sees the empty state with Import a file', async ({ page }) => {
    await page.goto('/data-sources/imports');
    await expect(page.getByText('No imports yet')).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: 'Import a file' }).click();
    await expect(page).toHaveURL(/\/import$/);
    await expect(page.getByRole('link', { name: /Bank or card statement/ })).toHaveAttribute('href', '/transactions/import');
  });
});
