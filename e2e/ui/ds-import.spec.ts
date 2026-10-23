import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { expect, test } from '../fixtures/test';

const SPEC: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '5566778899',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 25000.0,
  rows: [
    { date: '2026-04-05', description: 'SALARY CREDIT APR', credit: 40000.0 },
    { date: '2026-04-12', description: 'SUPERMARKET GROCERIES', debit: 2200.0 },
  ],
};

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Import, ${viewport.name} (${viewport.tag})`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      test.setTimeout(150000);
      currentUser = await createUser(request, 'ui-ds-import');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const api = makeApi(currentUser.cookie);
      await resetLlm(api);
      await setLlmMode(api, 'SCHEMA_DEFAULT');
    });

    test.afterEach(async () => {
      const api = makeApi(currentUser.cookie);
      await resetLlm(api);
      await setLlmMode(api, 'SCHEMA_DEFAULT');
    });

    test('Import tab: upload a statement, it leads Recent imports, then its page shows a section per file', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      const account = await createBankAccount(api, { name: 'DS Import Bank', openingBalance: SPEC.opening });

      await page.goto('/ds/transactions');
      await page.getByRole('tab', { name: 'Import' }).click();
      await expect(page).toHaveURL(/\/ds\/transactions\/import/, { timeout: 60000 });
      await expect(page.getByRole('tab', { name: 'Import' })).toHaveAttribute('data-state', 'active', { timeout: 30000 });
      await expect(page.getByText('Recent imports')).toBeVisible();
      await expect(page.getByText('Last 30 days')).toBeVisible();

      const upload = page.getByRole('button', { name: 'Upload & process' });
      await expect(upload).toBeDisabled();

      await page.getByRole('combobox', { name: 'Account' }).click();
      await page.getByRole('option', { name: new RegExp(account.name) }).click();
      await page.locator('input[type=file]').setInputFiles({
        name: 'hdfc-apr-2026.pdf',
        mimeType: 'application/pdf',
        buffer: await genBankPdf(SPEC),
      });
      await expect(page.getByText('hdfc-apr-2026.pdf')).toBeVisible();

      await page.getByRole('button', { name: 'Upload & process 1 file' }).click();
      // The form stays locked until the import finishes.
      await expect(page.getByRole('button', { name: /Uploading files|Processing statements|Upload & process/ })).toBeDisabled();

      // It is the top row of Recent imports, and its View opens the import's page.
      const view = page.getByRole('link', { name: 'View' }).first();
      await expect(view).toBeVisible({ timeout: 25000 });
      await expect(page.getByText(/^(Done|\d+ warnings?)$/).locator("visible=true").first()).toBeVisible({ timeout: 25000 });
      await expect(page.getByRole('button', { name: 'Choose files' })).toBeEnabled();
      await view.click();

      await expect(page).toHaveURL(/\/ds\/transactions\/import\/[0-9a-f-]+/);
      await expect(page.getByTestId('import-file')).toHaveCount(1);
      await expect(page.getByTestId('import-file')).toContainText('hdfc-apr-2026.pdf');
      await expect(page.getByText('Lines read').first()).toBeVisible();
      await expect(page.getByText(/^DS Import Bank · started/)).toBeVisible();

      await page.goBack();
      await expect(page.getByText('Recent imports')).toBeVisible();
    });

    test('Import tab: Activity link goes to the imports in Activity; an unknown import is not found', async ({ page }) => {
      await page.goto('/ds/transactions/import');
      await page.getByRole('link', { name: 'Activity' }).click();
      await expect(page).toHaveURL(/\/ds\/settings\/activity\?type=STATEMENT_INGEST/, { timeout: 60000 });

      await page.goto('/ds/transactions/import/00000000-0000-0000-0000-000000000000');
      await expect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30000 });
    });

    test('Import tab: a running import found on load (reload, second tab) locks the form; a malformed import id is not found', async ({ page }) => {
      const now = new Date().toISOString();
      const running = {
        id: '0a1b2c3d-4e5f-6789-abcd-ef0123456789', type: 'STATEMENT_INGEST', status: 'RUNNING', triggerSource: 'USER',
        cancelRequested: false, attempt: 1, createdAt: now, startedAt: now, progressNote: 'Reading statement',
      };
      // The browser's own jobs requests (polling) say an import is running, as after a reload or in a second tab.
      await page.route('**/api/v1/jobs?**', (route) =>
        route.fulfill({ json: { content: [running], totalElements: 1, totalPages: 1, last: true } }),
      );
      await page.goto('/ds/transactions/import');
      await expect(page.getByRole('button', { name: 'Choose files' })).toBeDisabled({ timeout: 30000 });
      await expect(page.getByText('Reading statement').locator('visible=true').first()).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Choose files' })).toBeDisabled({ timeout: 30000 });

      await page.unroute('**/api/v1/jobs?**');
      await page.goto('/ds/transactions/import/abc');
      await expect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30000 });
    });
  });
}
