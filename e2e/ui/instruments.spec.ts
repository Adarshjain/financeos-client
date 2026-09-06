import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { generateIsin, generateYahooSymbol, uniqueSeedSuffix } from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast, openInstruments } from '../fixtures/ui';

test.describe('Instruments UI (@ui)', () => {
  test.beforeEach(async ({ context, request }) => {
    const u = await createUser(request, 'ui-instruments');
    await loginContext(context, u.cookie);
  });

  test('search catalog and pick instrument, manual instrument creation', async ({ page }) => {
    await openInstruments(page);

    // 1. Search catalog & pick RELIANCE
    await page.getByRole('button', { name: /Add Instrument/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Instrument' })).toBeVisible();

    const searchInput = page.getByPlaceholder(/Search by name or symbol/i);
    await searchInput.fill('REL');

    const relianceRow = page.getByRole('button', { name: /Reliance Industries Limited/i });
    await expect(relianceRow).toBeVisible();
    await relianceRow.click();

    await expectToast(page, /Added Reliance Industries/i);
    await expect(page.getByRole('heading', { name: /Instruments/i })).toBeVisible();
    await expect(page.getByText(/RELIANCE/i).filter({ visible: true }).first()).toBeVisible();

    // 2. Manual instrument creation (advanced)
    await page.getByRole('button', { name: /Add Instrument/i }).click();
    await page.getByRole('button', { name: /Enter manually \(advanced\)/i }).click();

    const manualName = `Manual Stock ${uniqueSeedSuffix()}`;
    const manualSymbol = generateYahooSymbol('MAN');
    const manualIsin = generateIsin();

    await page.getByLabel('Instrument Name').fill(manualName);
    await page.getByLabel('Symbol / Ticker').fill(manualSymbol);
    await page.getByLabel(/ISIN/i).fill(manualIsin);

    await page.getByRole('button', { name: 'Create Instrument' }).click();
    await expectToast(page, new RegExp(`Created instrument ${manualName}`, 'i'));

    await expect(page.getByText(manualName).and(page.locator(':visible')).first()).toBeVisible();
  });
});
