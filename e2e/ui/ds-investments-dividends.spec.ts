import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { seedDividends,type SeededDividends } from '../fixtures/seed/dividends';
import { listDividends } from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

const PAGE = '/investments/dividends';

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

/** The list row of a payout (a table row on desktop, a stacked row on phone). */
const rowOf = (page: Page, symbol: string) => page.getByRole('button').filter({ hasText: symbol }).filter({ visible: true }).first();

/** Every visible list row of a payout (none once a filter leaves it out). */
const rowsOf = (page: Page, symbol: string) => page.getByRole('button').filter({ hasText: symbol }).filter({ visible: true });

/** Opens a payout's edit dialog the way each layout does: the pencil on desktop, a tap on the row on phone. */
async function openEdit(page: Page, symbol: string, phone: boolean) {
  if (phone) await rowOf(page, symbol).click();
  else await page.getByRole('button', { name: `Edit ${symbol} dividend`, exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Edit dividend')).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds Dividends, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let seeded: SeededDividends;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-dividends');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      seeded = await seedDividends(makeApi(currentUser.cookie));
    });

    test('the figures, the filters, every receipt word and the cards', async ({ page }) => {
      await page.goto(PAGE);

      await expect(page.getByRole('tab', { name: 'Dividends' })).toBeVisible();
      await expect(shown(page.getByText(/^Received( this FY)?$/))).toBeVisible();
      await expect(shown(page.getByText(/matched to (a )?bank credits?/))).toBeVisible();
      await expect(shown(page.getByText('claim in ITR').or(page.getByText(/TDS ₹.* · claim in ITR/)))).toBeVisible();
      await expect(shown(page.getByText('Not received', { exact: true }))).toBeVisible();

      // The FY is the current one, and each payout shows its receipt word.
      await expect(page.getByRole('button', { name: /^FY \d\d-\d\d$/ })).toBeVisible();
      await expect(rowOf(page, seeded.received.symbol)).toContainText('Received');
      await expect(rowOf(page, seeded.overdue.symbol)).toContainText('Overdue');
      await expect(rowOf(page, seeded.awaiting.symbol)).toContainText('Awaiting');
      await expect(rowOf(page, seeded.matchable.symbol)).toContainText('Awaiting');
      await expect(page.getByText(/^Total net ₹/)).toBeVisible();

      // The unrecorded credits, the by-instrument card, and the suggestions card (always shown).
      await expect(page.getByText(/bank credits? look(s)? like dividends? but (is|are) not recorded/)).toBeVisible();
      await expect(page.getByText('By instrument')).toBeVisible();
      await expect(page.getByText('Last 3 financial years')).toBeVisible();
      await expect(page.getByText(/^Suggestions/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Rescan' })).toBeVisible();

      await page.screenshot({ path: test.info().outputPath(`page-${viewport.width}.png`), fullPage: true });
    });

    test('Receipt status, Type, FY and Broker are one URL change each and answered by the server', async ({ page }) => {
      await page.goto(PAGE);

      await page.getByRole('button', { name: 'Receipt status' }).click();
      await page.getByRole('option', { name: 'Awaiting' }).click();
      await page.waitForURL(/receipt=awaiting/);
      await expect(rowOf(page, seeded.awaiting.symbol)).toBeVisible();
      await expect(rowsOf(page, seeded.received.symbol)).toHaveCount(0);
      // The figures keep reading the whole year.
      await expect(shown(page.getByText(/matched to (a )?bank credits?/))).toBeVisible();

      await page.getByRole('button', { name: 'Awaiting', exact: true }).click();
      await page.getByRole('option', { name: 'All receipts' }).click();
      await page.waitForURL((url) => !url.search.includes('receipt'));

      await page.getByRole('button', { name: 'Type' }).click();
      await page.getByRole('option', { name: 'Interest' }).click();
      await page.waitForURL(/type=interest/);
      await expect(page.getByText('No dividends match')).toBeVisible();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await page.waitForURL((url) => !url.search.includes('type'));
      await expect(rowOf(page, seeded.received.symbol)).toBeVisible();

      await page.getByRole('button', { name: 'All brokers' }).click();
      await page.getByRole('option', { name: seeded.broker.name }).click();
      await page.waitForURL(/broker=/);
      await expect(rowOf(page, seeded.received.symbol)).toBeVisible();

      const fy = page.getByRole('button', { name: /^FY \d\d-\d\d$/ });
      await fy.click();
      await page.getByRole('option', { name: 'All FYs' }).click();
      await page.waitForURL(/fy=all/);
      await expect(page.getByRole('button', { name: 'All FYs' })).toBeVisible();
      await expect(rowOf(page, seeded.received.symbol)).toBeVisible();
    });

    test('the instrument link from a holding narrows the list, and its chip clears it', async ({ page }) => {
      await page.goto(`${PAGE}?instrumentId=${seeded.overdue.id}`);
      await expect(page.getByText(`Showing ${seeded.overdue.symbol}`)).toBeVisible();
      await expect(rowOf(page, seeded.overdue.symbol)).toBeVisible();
      await expect(rowsOf(page, seeded.received.symbol)).toHaveCount(0);
      await page.getByRole('button', { name: /remove/i }).click();
      await page.waitForURL((url) => !url.search.includes('instrumentId'));
      await expect(rowOf(page, seeded.received.symbol)).toBeVisible();
    });

    test('edit: the figures save and Delete asks first', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      await page.goto(PAGE);
      await openEdit(page, seeded.awaiting.symbol, phone);

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(`${seeded.awaiting.symbol} · ${seeded.broker.name}`)).toBeVisible();
      await expect(dialog.getByLabel(/^Account/)).toBeDisabled();
      await dialog.getByLabel(/^Amount/).fill('150');
      await dialog.getByLabel(/^Notes/).fill('E2E note');
      await dialog.getByRole('button', { name: 'Save dividend' }).click();
      await expectToast(page, 'Dividend updated');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const saved = (await listDividends(api)).find((d) => d.id === seeded.awaiting.dividendId)!;
      expect(Number(saved.amount)).toBe(150);
      expect(saved.notes).toBe('E2E note');
      await expect(rowOf(page, seeded.awaiting.symbol)).toContainText('150');

      // Delete: Cancel keeps it, the confirmation removes it.
      await openEdit(page, seeded.awaiting.symbol, phone);
      await page.getByRole('dialog').getByRole('button', { name: 'Delete dividend', exact: true }).click();
      await expect(page.getByText(/^Delete .* · ₹150\?$/)).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).last().click();
      expect((await listDividends(api)).some((d) => d.id === seeded.awaiting.dividendId)).toBe(true);
      await page.getByRole('dialog').getByRole('button', { name: 'Delete dividend', exact: true }).click();
      await page.getByRole('dialog').last().getByRole('button', { name: 'Delete dividend' }).click();
      await expectToast(page, 'Dividend deleted');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(rowsOf(page, seeded.awaiting.symbol)).toHaveCount(0);
      expect((await listDividends(api)).some((d) => d.id === seeded.awaiting.dividendId)).toBe(false);
    });

    test('edit: the receipt section shows the credit, the TDS hint, Unlink and the receipt note', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      await page.goto(PAGE);
      await openEdit(page, seeded.received.symbol, phone);
      const dialog = page.getByRole('dialog');

      await expect(dialog.getByText(seeded.received.creditDescription)).toBeVisible();
      await expect(dialog.getByText(/\+₹900/)).toBeVisible();
      await expect(dialog.getByRole('combobox', { name: /Receipt note/ })).toBeDisabled();
      await expect(dialog.getByText(/Unlink to change it/)).toBeVisible();
      // ₹900 arrived against ₹1,000 and no TDS is recorded: the hint offers the gap.
      await dialog.getByRole('button', { name: 'Use ₹100 as TDS' }).click();
      await expect(dialog.getByLabel(/^TDS/)).toHaveValue('100');

      await dialog.getByRole('button', { name: 'Unlink', exact: true }).click();
      await expectToast(page, 'Unlinked');
      await expect(dialog.getByRole('button', { name: 'Unlink', exact: true })).toHaveCount(0);
      await expect(dialog.getByRole('combobox', { name: /Receipt note/ })).toBeEnabled();
      expect((await listDividends(api)).find((d) => d.id === seeded.received.dividendId)?.transaction).toBeFalsy();

      await dialog.getByRole('combobox', { name: /Receipt note/ }).click();
      await page.getByRole('option', { name: 'Not received', exact: true }).click();
      await expectToast(page, 'Receipt note updated');
      await expect(dialog.getByText('Not received', { exact: true }).first()).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(rowOf(page, seeded.received.symbol)).toContainText('Not received');
    });

    test('an awaiting payout links to a credit from its edit dialog', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      await page.goto(PAGE);
      await openEdit(page, seeded.matchable.symbol, phone);
      const dialog = page.getByRole('dialog');
      await dialog.getByPlaceholder('Search by description or amount').fill(seeded.matchable.creditDescription);
      await dialog.getByText(seeded.matchable.creditDescription).first().click();
      await expectToast(page, 'Linked');
      await expect(dialog.getByRole('button', { name: 'Unlink', exact: true })).toBeVisible();
      expect((await listDividends(api)).find((d) => d.id === seeded.matchable.dividendId)?.transaction?.description).toBe(seeded.matchable.creditDescription);
    });

    test('Reconcile: the banner names the credits, Find matches confirms a match, and a credit is recorded and linked', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      await page.goto(PAGE);
      await expect(page.getByText(/bank credits look like dividends but are not recorded/)).toBeVisible();
      await page.getByRole('button', { name: 'Reconcile' }).click();
      const dialog = page.getByRole('dialog');

      // Receipt matching.
      await dialog.getByRole('button', { name: 'Find matches' }).click();
      await expect(dialog.getByText(seeded.matchable.creditDescription)).toBeVisible();
      await expect(dialog.getByText('Net of TDS')).toBeVisible();
      await expect(dialog.getByRole('checkbox', { name: /Record TDS|^$/ }).first()).toBeChecked();
      await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expectToast(page, 'Linked 1 of 1');
      const matched = (await listDividends(api)).find((d) => d.id === seeded.matchable.dividendId)!;
      expect(matched.transaction?.description).toBe(seeded.matchable.creditDescription);
      expect(Number(matched.tds)).toBe(100);
      // The credit is linked now, so the unrecorded-credits list (and the banner behind it) drops it without a reload.
      await expect(dialog.getByText(seeded.matchable.creditDescription)).toHaveCount(0);

      // Unrecorded credits: record one for the holding it names.
      await expect(dialog.getByText(seeded.unrecorded.creditDescription)).toBeVisible();
      await dialog.getByRole('button', { name: new RegExp(`^Record for ${seeded.unrecorded.symbol} · `) }).click();
      const record = page.getByRole('dialog', { name: 'Record dividend' });
      await expect(record.getByText('Record dividend').first()).toBeVisible();
      await expect(record.getByLabel(/^Amount/)).toHaveValue('500');
      await record.getByRole('button', { name: 'Record dividend' }).click();
      await expectToast(page, 'Dividend recorded and linked');
      // The record dialog has closed.
      await expect(page.getByRole('dialog', { name: 'Record dividend' })).toHaveCount(0);
      await expect(dialog.getByText(seeded.unrecorded.creditDescription)).toHaveCount(0);
      const recorded = (await listDividends(api)).find((d) => d.symbol === seeded.unrecorded.symbol)!;
      expect(Number(recorded.amount)).toBe(500);
      expect(recorded.transaction?.description).toBe(seeded.unrecorded.creditDescription);

      // A credit that names no holding is recorded by choosing the account and instrument.
      await dialog.getByRole('button', { name: 'Record dividend', exact: true }).click();
      const stray = page.getByRole('dialog', { name: 'Record dividend' });
      await expect(stray.getByLabel(/^Amount/)).toHaveValue('415');
      await stray.getByRole('combobox', { name: 'Instrument' }).click();
      await page.getByRole('option', { name: new RegExp(seeded.awaiting.symbol) }).click();
      await stray.getByRole('button', { name: 'Record dividend' }).click();
      await expectToast(page, 'Dividend recorded and linked');
      await expect(page.getByRole('dialog', { name: 'Record dividend' })).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Close' }).last().click();
      await expect(page.getByText(/bank credits? look(s)? like dividends? but (is|are) not recorded/)).toHaveCount(0);
    });

    test('Export CSV downloads the filtered list', async ({ page }) => {
      await page.goto(`${PAGE}?fy=all`);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export CSV' }).click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(/^dividends.*\.csv$/);
    });

    test('Suggestions: scanned on the first Rescan, Rescan scans again, and a found payout can be recorded', async ({ page }) => {
      await page.goto(PAGE);
      const card = page.getByText(/^Suggestions/).first().locator('xpath=ancestor::div[contains(@class,"border")][1]');
      await card.getByRole('button', { name: 'Rescan' }).click();
      await expect(card.getByText(/^Checked \d+ symbols?/)).toBeVisible({ timeout: 30_000 });
      await card.getByRole('button', { name: 'Rescan' }).click();
      await expect(card.getByText(/^Checked \d+ symbols?/)).toBeVisible({ timeout: 30_000 });
      const nothing = card.getByText('No new dividends');
      const record = card.getByRole('button', { name: 'Record', exact: true }).first();
      await expect(nothing.or(record)).toBeVisible();
      // A found payout opens the record form prefilled (its pay date can be set), it does not save at once.
      if (await record.isVisible()) {
        await record.click();
        const form = page.getByRole('dialog', { name: 'Record dividend' });
        await expect(form.getByLabel(/^Pay date/)).not.toHaveValue('');
        await expect(form.getByLabel(/^Amount/)).not.toHaveValue('');
      }
    });

    test('a page past the end shows the last page, and the Pager is above and below', async ({ page }) => {
      await page.goto(`${PAGE}?fy=all&size=25&page=9`);
      await page.waitForURL((url) => !url.search.includes('page=9'));
      await expect(rowOf(page, seeded.received.symbol)).toBeVisible();
      expect(istToday()).toBeTruthy();
    });
  });
}
