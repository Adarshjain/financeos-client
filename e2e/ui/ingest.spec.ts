import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
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

  const duplicateBankSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '5566778899',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    opening: 61300.0,
    rows: [
      { date: '2026-05-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
      { date: '2026-05-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
      { date: '2026-05-18', description: 'CAFE COFFEE DAY', debit: 320.0 },
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

  test('/settings/ingest: upload statement, progress polling, summary display, duplicate detection, and skipped re-upload', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, {
      name: 'UI Ingest Bank Account',
      openingBalance: validBankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(validBankSpec);

    await page.goto('/settings/ingest');

    // 1. Verify Page Heading and Components
    await expect(
      page.getByRole('heading', { name: 'Statement Ingestion', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Recent statement ingestion jobs' })
    ).toBeVisible();

    // 2. Select Account
    await page.getByLabel('Select Financial Account').click();
    await page.getByRole('option', { name: new RegExp(account.name, 'i') }).click();

    // 3. Attach file to hidden file input
    await page.locator('#file-upload').setInputFiles({
      name: 'hdfc-apr-2026.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });

    // File queue shows the added file
    await expect(page.getByText('hdfc-apr-2026.pdf')).toBeVisible();

    // 4. Submit upload & process
    const submitBtn = page.getByRole('button', {
      name: /Upload & Process Statements/i,
    });
    await submitBtn.click();

    // Ingest summary expands inline once completed
    await expect(
      page.getByText('Statement Extraction Summary')
    ).toBeVisible({ timeout: 25000 });

    // Verify Files / Created tiles
    await expect(page.getByText('Files', { exact: true })).toBeVisible();
    await expect(page.getByText('Created', { exact: true })).toBeVisible();

    // 5. Upload duplicate statement -> verify "Duplicates Detected" alert
    const dupPdfBuffer = await genBankPdf(duplicateBankSpec);

    await page.getByLabel('Select Financial Account').click();
    await page.getByRole('option', { name: new RegExp(account.name, 'i') }).click();

    await page.locator('#file-upload').setInputFiles({
      name: 'hdfc-may-2026.pdf',
      mimeType: 'application/pdf',
      buffer: dupPdfBuffer,
    });

    await page.getByRole('button', {
      name: /Upload & Process Statements/i,
    }).click();

    // Wait for the new job card to appear and complete
    const jobCards = page.locator('.space-y-2 > div.border');
    await expect(jobCards).toHaveCount(2, { timeout: 25000 });
    const newestCard = jobCards.first();
    await expect(newestCard.getByText('SUCCEEDED')).toBeVisible({ timeout: 25000 });

    const expandBtn1 = newestCard.locator('button[title="Expand details"]');
    if (await expandBtn1.isVisible()) {
      await expandBtn1.click();
    }

    await expect(
      newestCard.getByText('Duplicates Detected')
    ).toBeVisible({ timeout: 15000 });

    // 6. Re-upload identical statement -> verify SKIPPED status in file details
    await page.getByLabel('Select Financial Account').click();
    await page.getByRole('option', { name: new RegExp(account.name, 'i') }).click();

    await page.locator('#file-upload').setInputFiles({
      name: 'hdfc-apr-2026.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });

    await page.getByRole('button', {
      name: /Upload & Process Statements/i,
    }).click();

    // Wait for third job card to appear and complete
    await expect(jobCards).toHaveCount(3, { timeout: 25000 });
    const skippedCard = jobCards.first();
    await expect(skippedCard.getByText('SUCCEEDED')).toBeVisible({ timeout: 25000 });

    const expandBtn2 = skippedCard.locator('button[title="Expand details"]');
    if (await expandBtn2.isVisible()) {
      await expandBtn2.click();
    }

    // Click to expand File Details if present
    const fileDetailsBtn = skippedCard.getByRole('button', { name: /File Details/i });
    if (await fileDetailsBtn.isVisible()) {
      await fileDetailsBtn.click();
    }
    await expect(skippedCard.getByRole('cell', { name: 'SKIPPED' })).toBeVisible({ timeout: 15000 });
  });

  test('/settings/ingest: client-side rejection for invalid file extension and oversized files with zero requests', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    await createBankAccount(api, { name: 'Rejection Bank' });

    await page.goto('/settings/ingest');
    await expect(
      page.getByRole('heading', { name: 'Statement Ingestion', exact: true })
    ).toBeVisible();

    let requestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/accounts')) {
        requestCount++;
      }
    });

    // 1. Invalid file extension (.txt)
    await page.locator('#file-upload').setInputFiles({
      name: 'statement.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('dummy statement content'),
    });

    await expect(
      page.getByText(/Invalid file format/i)
    ).toBeVisible();
    expect(requestCount).toBe(0);

    // 2. Oversized file (26 MB > 25 MB limit)
    const largeBuffer = Buffer.alloc(26 * 1024 * 1024);
    await page.locator('#file-upload').setInputFiles({
      name: 'huge-statement.pdf',
      mimeType: 'application/pdf',
      buffer: largeBuffer,
    });

    await expect(
      page.getByText(/Too large \(max 25MB per upload\)/i)
    ).toBeVisible();
    expect(requestCount).toBe(0);
  });

  test('/accounts -> Statements Archive -> Statement Details drilldown', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, {
      name: 'Archive Bank Account',
      openingBalance: validBankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(validBankSpec);

    // Ingest the statement first via API
    await uploadAndIngest(api, account.id, [
      { filename: 'archive-stmt.pdf', buffer: pdfBuffer },
    ]);

    // 1. Visit /accounts
    await page.goto('/accounts');
    await expect(page.getByText('Archive Bank Account')).toBeVisible();

    // 2. Click "Statements" button on the account card
    const card = page.getByText('Archive Bank Account').locator('xpath=ancestor::div[contains(@class, "group")]');
    await card.getByRole('button', { name: 'Statements' }).first().click();

    // 3. Statements Archive dialog is visible
    const archiveDialog = page.getByRole('dialog');
    await expect(archiveDialog).toBeVisible();
    await expect(archiveDialog.getByText('Statements Archive')).toBeVisible();

    // 4. Click "View details" to open Statement Details drilldown
    await archiveDialog.getByRole('button', { name: /View details/i }).first().click();

    // 5. Statement Details modal appears
    await expect(page.getByText('Statement Details', { exact: true })).toBeVisible();
    await expect(page.getByText('Linked Transactions')).toBeVisible();
    await expect(page.getByText('Checksum Status')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SALARY CREDIT APR' })).toBeVisible();
  });
});
