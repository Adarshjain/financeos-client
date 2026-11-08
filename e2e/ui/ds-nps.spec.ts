import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createNpsAccount, equityScheme, seedNpsBankDebit } from '../fixtures/seed/nps';
import { createDashboard } from '../fixtures/seed/reports';
import { builtinWidget } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();
/** The Entries card: a table on desktop, a list on the phone (the schemes card is separate). */
const entriesTable = (page: Page) => page.getByTestId('nps-entries');
const toast = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text }).first();
// The Protean statement the server's own tests read; its password is the owner's date of birth.
const STATEMENT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/nps/nps-protean-wide-contribution.pdf');
const STATEMENT_PASSWORD = 'ravi1406';
// The value of ₹1,00,000 in units at four places can land a rupee short.
const ONE_LAKH = /₹(1,00,000|99,999)/;

for (const viewport of VIEWPORTS) {
  test.describe(`/ds NPS, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let api: ReturnType<typeof makeApi>;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-nps');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      api = makeApi(currentUser.cookie);
    });

    test('NPS is a card on the Investments landing; with nothing yet it offers an upload and Add by hand', async ({ page }) => {
      await page.goto('/investments');
      await expect(page.getByRole('link', { name: 'Upload statement' }).first()).toHaveAttribute('href', /\/investments\/import\?type=nps/);
      await page.goto('/investments/nps');
      // A drill-in of the landing: no tab strip.
      await expect(page.getByRole('main').getByRole('tab')).toHaveCount(0);
      await expect(page.getByText('Track your NPS')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Upload statement' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add by hand' })).toBeVisible();
    });

    test('adds an account with an opening balance: the hero and the schemes show it', async ({ page }) => {
      test.slow();
      await page.goto('/investments/nps');
      await page.getByRole('button', { name: 'Add by hand' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add NPS account' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('textbox', { name: 'PRAN' }).fill('110022334821');
      await dialog.getByRole('textbox', { name: 'E %' }).fill('100');
      await dialog.getByRole('textbox', { name: 'C %' }).fill('0');
      await dialog.getByRole('textbox', { name: 'G %' }).fill('0');
      await dialog.getByRole('textbox', { name: 'A %' }).fill('0');
      await dialog.getByRole('textbox', { name: /Balance today/ }).fill('100000');
      await dialog.getByRole('button', { name: 'Add account' }).click();
      await expect(dialog).toHaveCount(0, { timeout: 30_000 });
      await expect(toast(page, 'Account added')).toBeVisible();
      await expect(shown(page.getByText('NPS value', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText(ONE_LAKH))).toBeVisible();
      await expect(page.getByText('Schemes', { exact: true })).toBeVisible();
      await expect(shown(page.getByText('Equity'))).toBeVisible();
      // The server estimated the units from the allocation: the banner and the word say so. No employer money, so no Employer in the hero.
      await expect(shown(page.getByText(/Some units are estimated/))).toBeVisible();
      await expect(shown(entriesTable(page).getByText('Estimated'))).toBeVisible();
      await expect(page.getByText(/Employer ₹/)).toHaveCount(0);
    });

    test('records a contribution and opens the scheme sheet', async ({ page }) => {
      test.slow();
      await createNpsAccount(api, await equityScheme(api));
      await page.goto('/investments/nps');
      await expect(shown(page.getByText('NPS value', { exact: true }))).toBeVisible();

      await page.getByRole('button', { name: 'Record entry' }).click();
      const dialog = page.getByRole('dialog', { name: 'Record NPS entry' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('textbox', { name: 'Amount' }).fill('5000');
      await dialog.getByRole('button', { name: 'Save entry' }).click();
      await expect(dialog).toHaveCount(0, { timeout: 30_000 });
      await expect(toast(page, 'Entry added')).toBeVisible();
      await expect(shown(page.getByText('Contribution · You'))).toBeVisible();
      // The ledger starts on the current FY.
      await expect(shown(page.getByRole('button', { name: /^FY \d\d-\d\d$/ }))).toBeVisible();
      await expect(shown(entriesTable(page).getByText('Estimated'))).toBeVisible();

      // A scheme row opens its sheet.
      await shown(page.getByText('Equity').first()).click();
      const sheet = page.getByRole('dialog', { name: /Equity · Tier I/ });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByText('Entries in this scheme')).toBeVisible();
      await sheet.getByRole('button', { name: 'Close', exact: true }).last().click();
      await expect(sheet).toHaveCount(0);
    });

    test('the Inbox offers to record an NPS-looking debit; Record links it on the NPS tab and the transaction', async ({ page }) => {
      test.slow();
      await createNpsAccount(api, await equityScheme(api));
      const { debit } = await seedNpsBankDebit(api, istToday(-20));
      await page.goto('/inbox');
      const row = page.locator('[data-inbox-key^="nps_record:"]');
      await expect(row).toHaveCount(1, { timeout: 45_000 });
      await expect(row).toContainText('NPS TRUST');
      await row.getByRole('button', { name: 'Record', exact: true }).click();
      await expect(toast(page, 'Recorded as an NPS contribution')).toBeVisible();
      await expect(row).toHaveCount(0);

      await page.goto('/investments/nps');
      await expect(shown(page.getByText('Contribution · You'))).toBeVisible({ timeout: 45_000 });
      // Desktop shows it in the Source column, phone on the context line under the title.
      await expect(shown(entriesTable(page).getByRole('link', { name: 'Linked', exact: true }))).toBeVisible();

      await page.goto(`/transactions?txn=${debit.id}`);
      const panel = page.getByRole('dialog').first();
      await expect(panel.getByRole('link', { name: /NPS/ }).first()).toBeVisible({ timeout: 45_000 });
    });

    test('imports a locked statement: password needed, unlock, review, import, entries on the tab', async ({ page }) => {
      test.slow();
      await page.goto('/investments/import?type=nps');
      await expect(page.getByText('Drop your NPS statements')).toBeVisible();
      const preview = page.getByRole('button', { name: 'Preview statement' });
      // The page may not be hydrated when the first file lands: pick again until the button enables.
      await expect(async () => {
        await page.getByTestId('nps-zone').locator('input[type="file"]').setInputFiles({ name: 'protean-sot.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(STATEMENT) });
        await expect(preview).toBeEnabled({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 });
      await preview.click();

      // The seeded user has no date of birth, so nothing opens it until the password is typed.
      await expect(page.getByText('Needs password')).toBeVisible({ timeout: 45_000 });
      await page.getByLabel('Password for protean-sot.pdf').fill(STATEMENT_PASSWORD);
      await page.getByRole('button', { name: 'Unlock' }).click();

      await expect(page.getByText('New entries', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText('Account', { exact: true }).first()).toBeVisible();
      // A new account whose sector the statement does not say needs one pick.
      const sector = page.getByRole('combobox', { name: 'Sector' });
      if (await sector.isVisible()) {
        await sector.click();
        await page.getByRole('option', { name: 'All citizen' }).click();
      }
      await page.getByRole('button', { name: /^Import \d+ entries$/ }).click();
      await expect(page.getByText(/entries? added/)).toBeVisible({ timeout: 45_000 });

      await page.getByRole('link', { name: 'Open NPS' }).click();
      await page.waitForURL('**/investments/nps');
      await expect(shown(page.getByText('NPS value', { exact: true }))).toBeVisible({ timeout: 45_000 });
      await expect(shown(page.getByText('Contribution · You'))).toBeVisible({ timeout: 45_000 });
      await expect(shown(entriesTable(page).getByText('Statement'))).toBeVisible();
    });
  });
}

test.describe('/ds NPS in Net worth, desktop 1440px (@ui)', () => {
  test('the Net worth underlying data lists an NPS line', async ({ context, request, page }) => {
    test.slow();
    const user = await createUser(request, 'ui-ds-nps-nw');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
    const api = makeApi(user.cookie);
    const scheme = await equityScheme(api);
    await createNpsAccount(api, scheme);
    const entry = await api.POST('/api/v1/nps/entries', {
      body: { accountId: (await api.GET('/api/v1/nps/summary')).data!.accounts[0].id, type: 'CONTRIBUTION', tier: 'I', postedDate: new Date().toISOString().slice(0, 10), amount: 100000 },
    });
    expect(entry.response.status).toBeLessThan(300);
    const dashboard = await createDashboard(api, {
      name: 'Nps board',
      isDefault: false,
      widgets: [builtinWidget('wb', 'net_worth', 100, undefined, { x: 0, y: 0, h: 24 })],
    });
    await page.goto(`/dashboards/${dashboard.id}`);
    await page.locator('[data-testid="dashboard-widget"][data-widget-id="wb"]').getByTestId('net-worth-value').getByRole('button').click({ timeout: 45_000 });
    const dialog = page.getByRole('dialog', { name: 'Underlying data · Net worth' });
    const groups = dialog.getByTestId('underlying-groups');
    await expect(groups).toBeVisible({ timeout: 45_000 });
    await expect(groups.getByRole('button').filter({ hasText: 'NPS' }).first()).toBeVisible();
  });
});
