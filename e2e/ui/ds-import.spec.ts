import { expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, scriptLlm, setLlmMode } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { BankSpec, genBankPdf, genCardPdf } from '../fixtures/gen/statements';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { uploadAndIngest, uploadStatements } from '../fixtures/seed/statements';
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

    test('Import page: upload a statement, it leads Recent imports, then its page shows a section per file', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      const account = await createBankAccount(api, { name: 'DS Import Bank', openingBalance: SPEC.opening });

      await page.goto('/transactions/import');
      await expect(page).toHaveURL(/\/transactions\/import/, { timeout: 60000 });
      await expect(page.getByRole('tab', { name: 'Import' })).toHaveCount(0);
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

      await expect(page).toHaveURL(/\/transactions\/import\/[0-9a-f-]+/);
      await expect(page.getByTestId('import-file')).toHaveCount(1);
      await expect(page.getByTestId('import-file')).toContainText('hdfc-apr-2026.pdf');
      await expect(page.getByText('Lines read').first()).toBeVisible();
      await expect(page.getByText(/^DS Import Bank · started/)).toBeVisible();

      await page.goBack();
      await expect(page.getByText('Recent imports', { exact: true })).toBeVisible();
    });

    test('Import tab: Activity link goes to the imports in Activity; an unknown import is not found', async ({ page }) => {
      await page.goto('/transactions/import');
      await page.getByRole('link', { name: 'Activity' }).click();
      await expect(page).toHaveURL(/\/data-sources\/sync\?type=STATEMENT_INGEST/, { timeout: 60000 });

      await page.goto('/transactions/import/00000000-0000-0000-0000-000000000000');
      await expect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30000 });
    });

    test('Import tab: the app bar + opens the file picker', async ({ page }) => {
      await page.goto('/transactions/import');
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Add statements' }).click();
      await chooser;
    });

    test('Import tab: Recent imports pages through the address, with no stray Job header', async ({ page }) => {
      // Six real imports (the page holds five), one file each; the newest leads page 1 and the oldest is alone on page 2.
      const api = makeApi(currentUser.cookie);
      const account = await createBankAccount(api, { name: 'DS Recent Bank', openingBalance: SPEC.opening });
      const pdf = await genBankPdf(SPEC);
      for (let n = 1; n <= 6; n++) {
        const { job } = await uploadAndIngest(api, account.id, [{ filename: `stmt-${n}.pdf`, buffer: pdf }]);
        expect(job.status).toBe('SUCCEEDED');
      }
      await page.goto('/transactions/import');
      await expect(page.getByText('stmt-6.pdf').locator('visible=true').first()).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole('columnheader', { name: 'Job' })).toHaveCount(0);

      await page.getByRole('button', { name: 'Page 2' }).first().click();
      await expect(page).toHaveURL(/\/transactions\/import\?page=2/);
      await expect(page.getByText('stmt-1.pdf').locator('visible=true').first()).toBeVisible({ timeout: 30000 });
    });

    test('Import tab: a running import found on load (reload, second tab) locks the form; a malformed import id is not found', async ({ page }) => {
      // A card statement missing its due date makes ingestion call the statement-details LLM task; a scripted
      // delayed answer holds the import RUNNING across both loads.
      const api = makeApi(currentUser.cookie);
      const account = await createCreditCard(api, { name: 'DS Running Card', last4: '9301' });
      // Scripts are scoped to this test's user; the card's last 4 digits survive the prompt masking, so they key the entry.
      await scriptLlm(api, 'statement-details', [{ json: {}, delayMs: 15000, promptContains: '9301' }]);
      const pdf = await genCardPdf({
        issuer: 'HDFC Bank',
        cardLast4: '9301',
        statementDate: istToday(-3),
        periodStart: istToday(-32),
        periodEnd: istToday(-3),
        previousBalance: 0,
        paymentsReceived: 0,
        financeCharges: 0,
        creditLimit: 100000,
        omitDueDate: true,
        rows: [{ date: istToday(-20), description: 'RUNNING HOLD TRADERS', debit: 4500 }],
      });
      const upload = await uploadStatements(api, account.id, [{ filename: 'running.pdf', buffer: pdf }]);
      expectStatus(upload, 202);
      await page.goto('/transactions/import');
      await expect(page.getByRole('button', { name: 'Choose files' })).toBeDisabled({ timeout: 30000 });
      await page.reload();
      await expect(page.getByRole('button', { name: 'Choose files' })).toBeDisabled({ timeout: 30000 });

      await page.goto('/transactions/import/abc');
      await expect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 30000 });
    });
  });
}
