import { makeApi } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { generateIsin, generateYahooSymbol, resolveInstrument, uniqueSeedSuffix } from '../fixtures/seed/investments';
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

test.describe('Instruments list count and sort UI (@ui)', () => {
  test('heads the page with the count and sorts by name on the server, both ways', async ({ context, page, request }) => {
    const u = await createUser(request, 'ui-instruments-sort');
    await loginContext(context, u.cookie);
    const api = makeApi(u.cookie);
    const tag = `UISORT${uniqueSeedSuffix()}`;
    for (const name of [`Mike ${tag}`, `Zulu ${tag}`, `Alpha ${tag}`]) {
      await resolveInstrument(api, { type: 'stock', name, isin: generateIsin() });
    }

    await openInstruments(page);
    // The catalog is shared by every spec, so the unfiltered count is whatever the server says.
    const all = await api.GET('/api/v1/instruments', { params: { query: { size: 1 } } });
    expect(all.data!.totalElements).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole('heading', { level: 1, name: /^Instruments \([\d,]+\)$/ })).toBeVisible();

    await page.getByPlaceholder('Search by ticker, name, ISIN...').filter({ visible: true }).fill(tag);
    await expect(page.getByRole('heading', { level: 1, name: 'Instruments (3)' })).toBeVisible();

    const rowNames = page.getByRole('row').filter({ hasText: tag });
    await expect(rowNames).toHaveText([new RegExp(`Alpha ${tag}`), new RegExp(`Mike ${tag}`), new RegExp(`Zulu ${tag}`)]);

    await page.getByRole('button', { name: 'Name A–Z' }).filter({ visible: true }).click();
    await expect(page.getByRole('button', { name: 'Name Z–A' }).filter({ visible: true })).toBeVisible();
    await expect(rowNames).toHaveText([new RegExp(`Zulu ${tag}`), new RegExp(`Mike ${tag}`), new RegExp(`Alpha ${tag}`)]);
    await expect(page.getByRole('heading', { level: 1, name: 'Instruments (3)' })).toBeVisible();

    await page.getByRole('button', { name: 'Name Z–A' }).filter({ visible: true }).click();
    await expect(rowNames).toHaveText([new RegExp(`Alpha ${tag}`), new RegExp(`Mike ${tag}`), new RegExp(`Zulu ${tag}`)]);
  });
});
