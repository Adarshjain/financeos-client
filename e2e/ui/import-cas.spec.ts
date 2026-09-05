import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { type CasSpec, genCasPdf } from '../fixtures/gen/broker-files';
import { createBroker } from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { openInvestments, openTradebook } from '../fixtures/ui';

test.describe('Import Wizard CAS UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-import-cas');
    await loginContext(context, currentUser.cookie);
  });

  test('Import wizard with Mutual Funds CAS PDF: preview, commit, and holding verification', async ({
    page,
  }) => {
    test.slow();
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);
    const mfIsin = 'INF100E2E001'; // Wiremock stubbed AMFI fund

    const casSpec: CasSpec = {
      investor: 'UI Test Investor',
      amc: 'HDFC',
      folios: [
        {
          folio: '12345678/0',
          schemeName: 'E2E Bluechip Growth Fund',
          isin: mfIsin,
          txns: [
            {
              date: '01-Aug-2026',
              description: 'Purchase',
              amount: 5000.0,
              units: 40.5,
              nav: 123.4567,
              balance: 40.5,
            },
          ],
        },
      ],
      password: 'CAS_PASSWORD_123',
    };

    const pdfBuffer = await genCasPdf(casSpec);

    // 1. Open Tradebook page and launch Import Wizard
    await openTradebook(page);
    await page.getByRole('button', { name: /Bulk Import \/ Reconcile|Import Statement/i }).click();

    await expect(page.getByRole('heading', { name: 'Investment Bulk Import' })).toBeVisible();

    // 2. Step 1: Select Broker / Import Type -> "Mutual Funds CAS (CAMS / KFintech PDF)"
    const modeSelect = page.locator('#import-step1-form').getByRole('combobox').first();
    await modeSelect.click();
    await page.getByRole('option', { name: /Mutual Funds CAS/i }).click();

    // Select Target Broker Account
    const brokerSelect = page.locator('#import-step1-form').getByRole('combobox').nth(1);
    await brokerSelect.click();
    await page.getByRole('option', { name: new RegExp(broker.name, 'i') }).click();

    // Enter CAS PDF password
    await page.getByPlaceholder(/Enter CAS PDF password/i).fill('CAS_PASSWORD_123');

    // Upload CAS PDF file
    const fileInput = page.locator('input#cas-file-input');
    await fileInput.setInputFiles({
      name: 'cams-cas-statement.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });

    // Submit Step 1: "Preview Reconciliation"
    await page.getByRole('button', { name: 'Preview Reconciliation' }).click();

    // 3. Step 2: Review & Submit
    const importTradesBtn = page.getByRole('button', { name: /Import Trades \(\d+\)/i });
    await expect(importTradesBtn).toBeVisible({ timeout: 15000 });
    await importTradesBtn.click();

    // 4. Step 3: Result
    await expect(page.getByText('Broker Import Reconciliation Complete!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Committed')).toBeVisible();

    // Click "Done & View Portfolio"
    await page.getByRole('button', { name: 'Done & View Portfolio' }).click();

    // 5. Verify holding appears on /investments
    await openInvestments(page);
    await expect(page.getByText(/E2E Bluechip Growth Fund|E2E Bluechip/i).first()).toBeVisible({ timeout: 10000 });
  });
});
