import { makeApi } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { generateIsin, resolveInstrument, uniqueSeedSuffix } from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Instruments UI (@ui)', () => {
  test.beforeEach(async ({ context, request }) => {
    const u = await createUser(request, 'ui-instruments');
    await loginContext(context, u.cookie);
  });

  test('search catalog and pick instrument', async ({ page }) => {
    await page.goto('/investments/instruments');

    // Search the catalog and pick RELIANCE. Manual creation is covered in ds-investments-instruments.spec.ts.
    await page.getByRole('button', { name: 'Add instrument', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add instrument' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('radio', { name: 'Catalog' }).click();
    await dialog.getByPlaceholder(/Search by name or symbol/).fill('REL');

    const relianceRow = dialog.getByRole('button', { name: /Reliance Industries Limited/i });
    await expect(relianceRow).toBeVisible();
    await relianceRow.click();

    await expectToast(page, /Reliance Industries.* added/i);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(/RELIANCE/i).filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe('Instruments list sort UI (@ui)', () => {
  test('sorts by name on the server, both ways', async ({ context, page, request }) => {
    const u = await createUser(request, 'ui-instruments-sort');
    await loginContext(context, u.cookie);
    const api = makeApi(u.cookie);
    const tag = `UISORT${uniqueSeedSuffix()}`;
    for (const name of [`Mike ${tag}`, `Zulu ${tag}`, `Alpha ${tag}`]) {
      await resolveInstrument(api, { type: 'stock', name, isin: generateIsin() });
    }

    await page.goto(`/investments/instruments?q=${tag}`);
    // Dinero lists carry no count line (deliberate removal); the server answers the search with the three.
    const rowNames = page.getByRole('button').filter({ hasText: tag }).filter({ visible: true });
    await expect(rowNames).toHaveText([new RegExp(`Alpha ${tag}`), new RegExp(`Mike ${tag}`), new RegExp(`Zulu ${tag}`)]);

    await page.getByRole('button', { name: /Name A–Z/ }).click();
    await page.getByRole('option', { name: 'Name Z–A' }).click();
    await page.waitForURL(/sort=desc/);
    await expect(rowNames).toHaveText([new RegExp(`Zulu ${tag}`), new RegExp(`Mike ${tag}`), new RegExp(`Alpha ${tag}`)]);

    await page.getByRole('button', { name: /Name Z–A/ }).click();
    await page.getByRole('option', { name: 'Name A–Z' }).click();
    await expect(rowNames).toHaveText([new RegExp(`Alpha ${tag}`), new RegExp(`Mike ${tag}`), new RegExp(`Zulu ${tag}`)]);
  });
});
