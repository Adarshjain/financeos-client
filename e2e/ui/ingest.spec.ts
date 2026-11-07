import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Statement Ingestion & Statements Archive UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });
  let currentUser: CreatedUser;

  const validBankSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '5566778899',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 25000.0,
    rows: [
      { date: '2026-04-05', description: 'SALARY CREDIT APR', credit: 40000.0 },
      { date: '2026-04-12', description: 'SUPERMARKET GROCERIES', debit: 2200.0 },
      { date: '2026-04-20', description: 'UTILITY BILL PAYMENT', debit: 1500.0 },
    ],
  };

  // Overlaps the April statement and repeats its utility bill row: the repeat attaches to the April row,
  // so only the two new lines are created and nothing is flagged as a duplicate.
  const duplicateBankSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '5566778899',
    periodStart: '2026-04-16',
    periodEnd: '2026-05-15',
    opening: 62800.0,
    rows: [
      { date: '2026-04-20', description: 'UTILITY BILL PAYMENT', debit: 1500.0 },
      { date: '2026-05-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
      { date: '2026-05-12', description: 'CAFE COFFEE DAY', debit: 320.0 },
    ],
  };

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-ingest');
    await loginContext(context, currentUser.cookie);
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async () => {
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test('/transactions/import: upload statement, progress polling, summary display, overlap attaches, and skipped re-upload', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, {
      name: 'UI Ingest Bank Account',
      openingBalance: validBankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(validBankSpec);

    await page.goto('/transactions/import');

    // 1. Verify the page and its components
    await expect(page.getByRole('tab', { name: 'Import' })).toHaveCount(0);
    await expect(page.getByText('Recent imports', { exact: true })).toBeVisible();

    const upload = async (filename: string, buffer: Buffer, files: number) => {
      // 2. Select the account
      await page.getByRole('combobox', { name: 'Account' }).click();
      await page.getByRole('option', { name: new RegExp(account.name, 'i') }).click();

      // 3. Attach the file to the hidden file input; the queue shows it
      await page.locator('input[type=file]').setInputFiles({ name: filename, mimeType: 'application/pdf', buffer });
      await expect(page.getByTestId('import-form').getByText(filename)).toBeVisible();

      // 4. Submit upload & process
      await page.getByRole('button', { name: `Upload & process ${files} file` }).click();
    };

    await upload('hdfc-apr-2026.pdf', pdfBuffer, 1);

    // The import leads Recent imports and finishes
    await expect(page.getByRole('link', { name: 'View' })).toHaveCount(1, { timeout: 25000 });
    await expect(page.getByRole('button', { name: 'Choose files' })).toBeEnabled({ timeout: 25000 });
    await page.getByRole('link', { name: 'View' }).first().click();

    // Its page shows the extraction summary: lines read and created for the file
    await expect(page).toHaveURL(/\/transactions\/import\/[0-9a-f-]+/);
    await expect(page.getByTestId('import-file')).toHaveCount(1);
    await expect(page.getByTestId('import-file')).toContainText('hdfc-apr-2026.pdf');
    await expect(page.getByText('Lines read').first()).toBeVisible();
    await expect(page.getByText('Created').first()).toBeVisible();

    // 5. Upload an overlapping statement -> the repeated line attaches to the existing row: 2 created, no duplicate
    await page.goto('/transactions/import');
    await upload('hdfc-may-2026.pdf', await genBankPdf(duplicateBankSpec), 1);
    await expect(page.getByRole('link', { name: 'View' })).toHaveCount(2, { timeout: 25000 });
    await expect(page.getByRole('button', { name: 'Choose files' })).toBeEnabled({ timeout: 25000 });
    await page.getByRole('link', { name: 'View' }).first().click();
    await expect(page).toHaveURL(/\/transactions\/import\/[0-9a-f-]+/);
    await expect(page.getByTestId('import-file')).toContainText(/Created\s*2/, { timeout: 15000 });
    await expect(page.getByText(/duplicates? found\./i)).toHaveCount(0);
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: account.id }]);
    expect(txns).toHaveLength(5);
    expect(txns.filter((t) => t.sourcedDescription === 'UTILITY BILL PAYMENT')).toHaveLength(1);

    // 6. Re-upload the identical statement -> the file is Skipped
    await page.goto('/transactions/import');
    await upload('hdfc-apr-2026.pdf', pdfBuffer, 1);
    await expect(page.getByRole('link', { name: 'View' })).toHaveCount(3, { timeout: 25000 });
    await expect(page.getByRole('button', { name: 'Choose files' })).toBeEnabled({ timeout: 25000 });
    await page.getByRole('link', { name: 'View' }).first().click();
    await expect(page).toHaveURL(/\/transactions\/import\/[0-9a-f-]+/);
    await expect(page.getByTestId('import-file')).toContainText('Skipped', { timeout: 15000 });
  });

  test('/transactions/import: client-side rejection for invalid file extension and oversized files with zero requests', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Rejection Bank' });

    await page.goto('/transactions/import');
    await expect(page.getByRole('tab', { name: 'Import' })).toHaveCount(0);

    let requestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/accounts')) {
        requestCount++;
      }
    });

    // 1. Invalid file extension (.txt). Retried: a file set before the page hydrated is silently dropped.
    await expect(async () => {
      await page.locator('input[type=file]').setInputFiles({
        name: 'statement.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('dummy statement content'),
      });
      await expect(page.getByText(/Invalid file format/i)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    expect(requestCount).toBe(0);

    // 2. Oversized file (26 MB > 25 MB limit)
    const largeBuffer = Buffer.alloc(26 * 1024 * 1024);
    await page.locator('input[type=file]').setInputFiles({
      name: 'huge-statement.pdf',
      mimeType: 'application/pdf',
      buffer: largeBuffer,
    });

    await expect(page.getByText(/Too large \(max 25MB per upload\)/i)).toBeVisible();
    expect(requestCount).toBe(0);
  });

  test('/accounts/[id]/statements: the archive lists the statement and its details show the linked transactions', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, {
      name: 'Archive Bank Account',
      openingBalance: validBankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(validBankSpec);

    // Ingest the statement first via API
    await uploadAndIngest(api, account.id, [{ filename: 'archive-stmt.pdf', buffer: pdfBuffer }]);

    // 1. Visit the account's Statements page (financial year of the statement)
    await page.goto(`/accounts/${account.id}/statements`);
    await expect(page.getByText('Statements', { exact: true }).first()).toBeVisible({ timeout: 45000 });

    // 2. The statement is listed; opening it shows its details
    await page.getByRole('button', { name: /Apr/ }).first().click();
    await expect(page.getByText('Checksum OK')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SALARY CREDIT APR' })).toBeVisible();
  });
});
