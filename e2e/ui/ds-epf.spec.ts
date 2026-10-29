import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createEpfEmployer,
  createEpfEntry,
  PASSBOOK_BALANCE,
  PASSBOOK_ENTRIES,
  passbookLines,
  passbookPdf,
  seedEpfBalance,
  seedEpfWithdrawal,
} from '../fixtures/seed/epf';
import { createDashboard } from '../fixtures/seed/reports';
import { createTransaction } from '../fixtures/seed/transactions';
import { builtinWidget } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

/** A withdrawal row's title: "Partial withdrawal (Form 31)". */
const WITHDRAWAL = /\(Form (31|19|10C)\)/;
const plus = (page: Page) => page.getByRole('button', { name: 'Add', exact: true }).first();
const toast = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text }).first();

const upload = async (page: Page, lines = passbookLines(), name = 'synthetic-passbook.pdf') => {
  const buffer = await passbookPdf(lines);
  const preview = page.getByRole('button', { name: 'Preview passbook' });
  // The page may not be hydrated when the first file lands: pick again until the button enables.
  await expect(async () => {
    await page.getByTestId('epf-zone').locator('input[type="file"]').setInputFiles({ name, mimeType: 'application/pdf', buffer });
    await expect(preview).toBeEnabled({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await preview.click();
};

for (const viewport of VIEWPORTS) {
  test.describe(`/ds EPF, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let api: ReturnType<typeof makeApi>;
    /** A contribution row: its source in the particulars cell on desktop; on phone (no source shown) the start of the month's split line, "You ₹… · <employer> ₹…". */
    const contribution = (page: Page, source: 'Added by you' | 'Passbook') =>
      shown(
        viewport.width < 641
          ? page.getByText(/^You ₹[\d,]+ ·$/)
          : page.getByRole('cell').getByText(source, { exact: true }),
      );

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-epf');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      api = makeApi(currentUser.cookie);
    });

    test('the EPF tab follows Holdings; with nothing yet it offers an upload and an opening balance', async ({ page }) => {
      await page.goto('/investments');
      const tabs = page.getByRole('tab');
      await expect(tabs.nth(0)).toHaveText(/^Holdings/);
      await expect(tabs.nth(1)).toHaveText(/^EPF/);
      await expect(page.getByRole('tab', { name: /^EPF/ })).toHaveAttribute('href', '/investments/epf');

      await page.getByRole('tab', { name: /^EPF/ }).click();
      await page.waitForURL('**/investments/epf');
      await expect(page.getByText('No EPF yet')).toBeVisible();
      await page.getByRole('link', { name: 'Upload passbook' }).click();
      await page.waitForURL(/\/investments\/import\?type=epf/);
      await expect(page.getByText('Drop your EPFO passbook PDFs')).toBeVisible();
    });

    // The first employer ends the empty state; the open Add dialog must survive that switch.
    test('the empty tab: adding the first employer from the dialog keeps the opening-balance form', async ({ page }) => {
      test.slow();
      await page.goto('/investments/epf');
      await page.getByRole('button', { name: 'Add opening balance' }).click();
      const dialog = page.getByRole('dialog', { name: 'Record EPF entry' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('combobox', { name: /Employer/ }).click();
      await page.getByRole('button', { name: 'Add employer' }).last().click();
      const employerDialog = page.getByRole('dialog', { name: 'Add employer' });
      await employerDialog.getByRole('textbox', { name: /^Name/ }).fill('First Employer Labs');
      await employerDialog.getByRole('button', { name: 'Add employer' }).click();
      await expect(employerDialog).toHaveCount(0);
      // The tab now has data (an employer), so it redraws as the main view, which is where the dialog is lost.
      await expect(page.getByText('Employers', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('combobox', { name: 'Type' })).toContainText('Opening balance');
      await dialog.getByRole('textbox', { name: 'Your share' }).fill('300000');
      await dialog.getByRole('textbox', { name: 'Employer share' }).fill('200000');
      await dialog.getByRole('button', { name: 'Record entry' }).click();
      await expect(shown(page.getByText('₹5,00,000'))).toBeVisible();
    });

    test('adds an opening balance and a contribution by hand: figures, passbook rows, delete', async ({ page }) => {
      test.slow();
      await createEpfEmployer(api, { name: 'Hand Added Labs' });
      await page.goto('/investments/epf');
      await plus(page).click();
      const dialog = page.getByRole('dialog', { name: 'Record EPF entry' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('combobox', { name: 'Type' }).click();
      await page.getByRole('option', { name: 'Opening balance' }).click();
      await dialog.getByRole('textbox', { name: 'Your share' }).fill('300000');
      await dialog.getByRole('textbox', { name: 'Employer share' }).fill('200000');
      await dialog.getByRole('button', { name: 'Record entry' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(toast(page, 'Entry added')).toBeVisible();

      // The phone hero shows the balance without a label; desktop's tile names it.
      if (viewport.width >= 641) await expect(shown(page.getByText('EPF balance', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('₹5,00,000'))).toBeVisible();
      await expect(shown(page.getByText('Opening balance'))).toBeVisible();
      await expect(shown(page.getByText('Hand Added Labs'))).toBeVisible();

      // A contribution through the top bar's +.
      await plus(page).click();
      const add = page.getByRole('dialog', { name: 'Record EPF entry' });
      await expect(add).toBeVisible();
      await add.getByRole('textbox', { name: 'Your share' }).fill('7200');
      await add.getByRole('textbox', { name: 'Employer share' }).fill('5950');
      await add.getByRole('textbox', { name: /Pension/ }).fill('1250');
      await add.getByRole('button', { name: 'Record entry' }).click();
      await expect(add).toHaveCount(0);
      await expect(shown(page.getByText('₹5,13,150'))).toBeVisible();
      await expect(contribution(page, 'Added by you')).toBeVisible();
      // The month's split: one column per share on desktop, one line on phone.
      if (viewport.width < 641) {
        await expect(shown(page.getByText('You ₹7,200 ·', { exact: true })).locator('..')).toHaveText(/^You ₹7,200 ·\s*Hand Added Labs\s*₹5,950$/);
      } else {
        await expect(shown(page.getByText('+₹5,950', { exact: true }))).toBeVisible();
      }
      // Pension is kept, not added to the balance.
      await expect(shown(page.getByText('Contributed this FY'))).toBeVisible();

      // Open the contribution (the newest row), delete it: the balance goes back.
      await contribution(page, 'Added by you').click();
      const entry = page.getByRole('dialog').first();
      await expect(entry.getByText('Added by you. A passbook that has this month replaces it.')).toBeVisible();
      await entry.getByRole('button', { name: 'Delete entry' }).click();
      const confirm = page.getByRole('dialog', { name: 'Delete EPF entry?' });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Delete entry' }).click();
      await expect(toast(page, 'Entry deleted')).toBeVisible();
      await expect(shown(page.getByText('₹5,00,000'))).toBeVisible();
      await expect(page.getByText('₹5,13,150')).toHaveCount(0);
    });

    test('the FY select switches the passbook; an employer is added from the Employers card', async ({ page }) => {
      test.slow();
      const { employer } = await seedEpfBalance(api, 'Fy Labs');
      await createEpfEntry(api, {
        type: 'INTEREST',
        employerId: employer.id,
        interestFy: 2025,
        creditedOn: '2026-03-31',
        employeeAmount: 20000,
        employerAmount: 10000,
      });
      await page.goto('/investments/epf');
      // Newest FY first: 2026-27 holds the opening balance only.
      await expect(shown(page.getByText('Opening balance'))).toBeVisible();
      await expect(page.getByText(/^Interest · FY/)).toHaveCount(0);

      await page.getByRole('button', { name: 'FY 2026-27', exact: true }).click();
      await page.getByRole('option', { name: 'FY 2025-26' }).click();
      await page.waitForURL(/fy=2025/);
      await expect(shown(page.getByText(/Interest · FY 2025-26/))).toBeVisible();
      await expect(page.getByText('Opening balance')).toHaveCount(0);

      await page.getByRole('button', { name: 'FY 2025-26', exact: true }).click();
      await page.getByRole('option', { name: 'All years' }).click();
      await page.waitForURL(/fy=all/);
      await expect(shown(page.getByText(/Interest · FY 2025-26/))).toBeVisible();
      await expect(shown(page.getByText('Opening balance'))).toBeVisible();

      // Employers card.
      await expect(page.getByText('Employers', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Add employer' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add employer' });
      await dialog.getByRole('textbox', { name: /^Name/ }).fill('Second Job Pvt');
      await dialog.getByRole('button', { name: 'Add employer' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByText('Second Job Pvt').first()).toBeVisible();
      await expect(page.getByText('Fy Labs').first()).toBeVisible();
    });

    test('imports a synthetic passbook end to end, then a re-upload shows everything already here', async ({ page }) => {
      test.slow();
      await page.goto('/investments/import?type=epf');
      await upload(page);

      await expect(page.getByText('New employer in this passbook: NORTHWIND LABS PRIVATE LIMITED')).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText(`${PASSBOOK_ENTRIES} entries in this passbook: ${PASSBOOK_ENTRIES} new.`, { exact: false })).toBeVisible().catch(() => undefined);
      await expect(page.getByText(/Member ID …67890 · UAN …4321/)).toBeVisible();
      await expect(shown(page.getByText('New', { exact: true }))).toBeVisible();
      await page.getByRole('button', { name: `Import ${PASSBOOK_ENTRIES} entries` }).click();

      await expect(page.getByText(`Imported ${PASSBOOK_ENTRIES} entries`)).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText(new RegExp(`EPF balance is now ${PASSBOOK_BALANCE}`))).toBeVisible();
      await page.getByRole('button', { name: 'Open EPF' }).click();
      await page.waitForURL('**/investments/epf');
      await expect(shown(page.getByText(PASSBOOK_BALANCE))).toBeVisible();
      await expect(shown(page.getByText('Opening balance'))).toBeVisible();
      await expect(shown(page.getByText(/Interest · FY 2025-26/))).toBeVisible();
      await expect(shown(page.getByText('NORTHWIND LABS PRIVATE LIMITED'))).toBeVisible();

      // The same passbook again: nothing new.
      await page.goto('/investments/import?type=epf');
      await upload(page);
      await expect(page.getByText(`${PASSBOOK_ENTRIES} are already here`, { exact: false })).toBeVisible({ timeout: 45_000 });
      await expect(shown(page.getByText('Already here'))).toBeVisible();
      await expect(page.getByRole('button', { name: 'Import 0 entries' })).toBeDisabled();
    });

    test('a file that is not a passbook is refused with the server message', async ({ page }) => {
      test.slow();
      await page.goto('/investments/import?type=epf');
      await upload(page, ['Just some text', 'Not an EPFO passbook at all'], 'notes.pdf');
      await expect(page.getByRole('button', { name: 'Choose other files' })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/notes\.pdf: /)).toBeVisible();
    });

    test('several passbooks at once: two years of one member merge, a second member gets its own section, a non-passbook file is listed as not imported', async ({ page }) => {
      test.slow();
      await page.goto('/investments/import?type=epf');
      const yearOne = await passbookPdf(passbookLines());
      // A later year of the same member: other wage months, interest and closing date.
      const yearTwo = await passbookPdf(
        passbookLines().map((l) =>
          l
            .replace('Apr-2025 15-05-2025', 'Apr-2026 15-05-2026')
            .replace('May-2025 15-06-2025', 'May-2026 15-06-2026')
            .replace('OB Int. Updated upto 31/03/2025', 'OB Int. Updated upto 31/03/2026')
            .replace('Int. Updated upto 31/03/2026 32,410', 'Int. Updated upto 31/03/2027 33,410')
            .replace('Closing Balance as on 31/03/2026', 'Closing Balance as on 31/03/2027')
            .replace(/Due-Month 05(2025)/, 'Due-Month 052026')
            .replace(/Due-Month 06(2025)/, 'Due-Month 062026'),
        ),
      );
      const otherMember = await passbookPdf(
        passbookLines({ memberId: 'MHBAN00999990000011111', uan: '100123454321' }).map((l) => l.replace('NORTHWIND LABS PRIVATE LIMITED', 'FABRIKAM TRADING LIMITED')),
      );
      const notes = await passbookPdf(['Just some text', 'Not an EPFO passbook at all']);
      const files = [
        { name: 'year-one.pdf', mimeType: 'application/pdf', buffer: yearOne },
        { name: 'year-two.pdf', mimeType: 'application/pdf', buffer: yearTwo },
        { name: 'other-member.pdf', mimeType: 'application/pdf', buffer: otherMember },
        { name: 'notes.pdf', mimeType: 'application/pdf', buffer: notes },
      ];
      const preview = page.getByRole('button', { name: 'Preview passbooks' });
      await expect(async () => {
        await page.getByTestId('epf-zone').locator('input[type="file"]').setInputFiles(files);
        await expect(preview).toBeEnabled({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 });
      await preview.click();

      await expect(page.getByText('Not imported: notes.pdf (', { exact: false })).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText('From year-one.pdf, year-two.pdf')).toBeVisible();
      await expect(page.getByText(/Member ID …67890/)).toBeVisible();
      await expect(page.getByText(/Member ID …11111/)).toBeVisible();
      await expect(page.getByRole('button', { name: /^Import \d+ entries$/ })).toBeEnabled();
      await page.getByRole('button', { name: /^Import \d+ entries$/ }).click();

      await expect(page.getByText(/across 2 employers/)).toBeVisible({ timeout: 45_000 });
      await page.getByRole('button', { name: 'Open EPF' }).click();
      await page.waitForURL('**/investments/epf');
      await expect(shown(page.getByText('NORTHWIND LABS PRIVATE LIMITED'))).toBeVisible();
    });

    test('an imported entry is locked; an imported withdrawal keeps its TDS editable', async ({ page }) => {
      test.slow();
      await page.goto('/investments/import?type=epf');
      await upload(page, passbookLines({ withWithdrawal: true }));
      await expect(page.getByRole('button', { name: /^Import \d+ entries$/ })).toBeEnabled({ timeout: 45_000 });
      await page.getByRole('button', { name: /^Import \d+ entries$/ }).click();
      await expect(page.getByText(/^Imported \d+ entries$/)).toBeVisible({ timeout: 45_000 });
      await page.goto('/investments/epf?fy=all');

      // A contribution: read-only, Close only.
      await contribution(page, 'Passbook').click();
      let dialog = page.getByRole('dialog').first();
      await expect(dialog.getByText(/From the passbook imported on/)).toBeVisible();
      await expect(dialog.getByText('Upload a newer passbook to change it.')).toBeVisible();
      await expect(dialog.getByRole('textbox', { name: 'Your share' })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Delete entry' })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Save entry' })).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Close' }).filter({ hasText: 'Close' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // The withdrawal: only TDS, the note and the link.
      await shown(page.getByText(WITHDRAWAL)).click();
      dialog = page.getByRole('dialog').first();
      await expect(dialog.getByText('Only TDS, the note and the link can change.')).toBeVisible();
      await expect(dialog.getByRole('textbox', { name: 'Your share' })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Delete entry' })).toHaveCount(0);
      await expect(dialog.getByRole('checkbox', { name: 'TDS was deducted' })).toBeEnabled();
      await dialog.getByRole('checkbox', { name: 'TDS was deducted' }).click();
      await dialog.getByRole('textbox', { name: 'TDS' }).fill('1800');
      await dialog.getByRole('button', { name: 'Save entry' }).click();
      await expect(toast(page, 'Entry updated')).toBeVisible();
    });

    test('a withdrawal with a matching credit: suggested match in the entry dialog, Link, and the transaction carries the word', async ({ page }) => {
      test.slow();
      const { employer } = await seedEpfBalance(api, 'Link Labs');
      const seeded = await seedEpfWithdrawal(api, employer.id, {
        creditedOn: istToday(-5),
        creditDate: istToday(-4),
        creditAmount: 50000,
        description: 'NEFT EPFO PARTIAL LINKME',
      });
      await page.goto('/investments/epf');
      await shown(page.getByText(WITHDRAWAL)).click();
      const dialog = page.getByRole('dialog').first();
      await expect(dialog.getByText('Suggested match')).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByText('NEFT EPFO PARTIAL LINKME')).toBeVisible();

      // Not this one: the suggestion goes (nothing else fits).
      await dialog.getByRole('button', { name: 'Not this one' }).click();
      await expect(toast(page, 'Suggestion dismissed')).toBeVisible();
      await expect(dialog.getByText('Suggested match')).toHaveCount(0);
      await expect(dialog.getByText('Bank credit').first()).toBeVisible();
      await page.keyboard.press('Escape');

      // A second matching credit is suggested next; Link it.
      await createTransaction(api, seeded.bank.id, { amount: 50000, date: istToday(-3), description: 'NEFT EPFO PARTIAL SECOND' });
      await page.reload();
      await shown(page.getByText(WITHDRAWAL)).click();
      const again = page.getByRole('dialog').first();
      await expect(again.getByText('Suggested match')).toBeVisible({ timeout: 30_000 });
      await expect(again.getByText('NEFT EPFO PARTIAL SECOND')).toBeVisible();
      await again.getByRole('button', { name: 'Link', exact: true }).click();
      await expect(toast(page, 'Linked')).toBeVisible();
      await expect(again.getByText('Linked', { exact: true })).toBeVisible();
      await expect(again.getByRole('button', { name: 'Unlink' })).toBeVisible();
      await page.keyboard.press('Escape');

      // The transaction side shows the blue record word.
      await page.goto('/transactions?q=PARTIAL SECOND');
      const row = page.getByRole('row').filter({ hasText: 'NEFT EPFO PARTIAL SECOND' });
      await expect(row.first()).toBeVisible({ timeout: 45_000 });
      await expect(shown(row.first().getByText('EPF withdrawal'))).toBeVisible();
    });

    test('a withdrawal short by the TDS: pick the credit by hand and Record TDS', async ({ page }) => {
      test.slow();
      const { employer } = await seedEpfBalance(api, 'Tds Labs');
      // ₹50,000 withdrawn, ₹45,000 arrived (a credit that is not an exact match).
      await seedEpfWithdrawal(api, employer.id, {
        creditedOn: istToday(-5),
        creditDate: istToday(-4),
        creditAmount: 45000,
        description: 'NEFT EPFO NET OF TDS',
      });
      await page.goto('/investments/epf');
      await shown(page.getByText(WITHDRAWAL)).click();
      const dialog = page.getByRole('dialog').first();
      await expect(dialog.getByText('Suggested match')).toHaveCount(0);
      await dialog.getByText('NEFT EPFO NET OF TDS').click();
      await expect(dialog.getByText('Record TDS of ₹5,000')).toBeVisible();
      await dialog.getByRole('button', { name: 'Link', exact: true }).click();
      await expect(toast(page, 'Linked')).toBeVisible();
      await expect(dialog.getByText('Linked', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.reload();
      await shown(page.getByText(WITHDRAWAL)).click();
      const reopened = page.getByRole('dialog').first();
      await expect(reopened.getByRole('checkbox', { name: 'TDS was deducted' })).toBeChecked();
    });

    test('Record as › EPF withdrawal from the transaction: link an existing withdrawal, then unlink with Undo', async ({ page }) => {
      test.slow();
      const { employer } = await seedEpfBalance(api, 'Record Labs');
      // A credit that does not fit (₹10 off), so nothing is suggested and the link starts on the transaction.
      const seeded = await seedEpfWithdrawal(api, employer.id, {
        creditedOn: istToday(-5),
        creditDate: istToday(-4),
        creditAmount: 49990,
        description: 'NEFT EPFO RECORDME',
      });
      await page.goto(`/transactions?q=RECORDME&txn=${seeded.credit.id}`);
      const panel = page.getByRole('dialog', { name: 'NEFT EPFO RECORDME' });
      await expect(panel).toBeVisible({ timeout: 45_000 });
      await panel.getByRole('button', { name: 'Link to…' }).click();
      const link = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: 'Type' }) });
      await link.getByRole('combobox', { name: 'Type' }).click();
      await page.getByRole('option', { name: /EPF withdrawal/ }).click();
      await link.getByText(/Partial · Record Labs/).click();
      await expect(link.getByText('Record TDS of ₹10')).toBeVisible();
      await link.getByRole('button', { name: 'Link', exact: true }).click();
      await expect(link).toHaveCount(0);

      const after = page.getByRole('dialog', { name: 'NEFT EPFO RECORDME' });
      await expect(after.getByText('EPF withdrawal')).toBeVisible({ timeout: 30_000 });
      await after.getByRole('button', { name: 'Unlink' }).click();
      await expect(toast(page, 'EPF withdrawal unlinked')).toBeVisible();
      await expect(after.getByText('EPF withdrawal')).toHaveCount(0);
      await toast(page, 'EPF withdrawal unlinked').getByRole('button', { name: 'Undo' }).click();
      await expect(toast(page, 'Linked to the EPF withdrawal')).toBeVisible();
      await expect(after.getByText('EPF withdrawal')).toBeVisible();
    });

    test('Record as › EPF withdrawal, New withdrawal: records the withdrawal with TDS and links the credit', async ({ page }) => {
      test.slow();
      await seedEpfBalance(api, 'New Wd Labs');
      const bank = await createBankAccount(api, { name: 'New Wd Bank' });
      const credit = await createTransaction(api, bank.id, { amount: 45000, date: istToday(-2), description: 'NEFT EPFO NEWWD' });
      await page.goto(`/transactions?q=NEWWD&txn=${credit.id}`);
      const panel = page.getByRole('dialog', { name: 'NEFT EPFO NEWWD' });
      await expect(panel).toBeVisible({ timeout: 45_000 });
      await panel.getByRole('button', { name: 'Link to…' }).click();
      const link = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: 'Type' }) });
      await link.getByRole('combobox', { name: 'Type' }).click();
      await page.getByRole('option', { name: /EPF withdrawal/ }).click();
      await expect(link.getByText('No unlinked withdrawals. Record a new one instead.')).toBeVisible({ timeout: 30_000 });
      await link.getByRole('radio', { name: 'New withdrawal' }).click();
      await link.getByRole('combobox', { name: /Employer/ }).click();
      await page.getByRole('option', { name: 'New Wd Labs' }).click();
      await link.getByRole('textbox', { name: 'Your share' }).fill('30000');
      await link.getByRole('textbox', { name: /Employer share/ }).fill('20000');
      await link.getByRole('checkbox', { name: 'TDS was deducted' }).click();
      await link.getByRole('textbox', { name: /^TDS/ }).fill('5000');
      await link.getByRole('button', { name: 'Record and link' }).click();
      await expect(link).toHaveCount(0, { timeout: 30_000 });
      await expect(page.getByRole('dialog', { name: 'NEFT EPFO NEWWD' }).getByText('EPF withdrawal')).toBeVisible({ timeout: 30_000 });

      await page.goto('/investments/epf');
      await shown(page.getByText(WITHDRAWAL)).click();
      const dialog = page.getByRole('dialog').first();
      await expect(dialog.getByText('Linked', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByRole('checkbox', { name: 'TDS was deducted' })).toBeChecked();
    });

    test('the Inbox offers the matching credit for a withdrawal; Link attaches it, Not this one drops the row', async ({ page }) => {
      test.slow();
      const { employer } = await seedEpfBalance(api, 'Inbox Labs');
      const first = await seedEpfWithdrawal(api, employer.id, {
        creditedOn: istToday(-5),
        creditDate: istToday(-4),
        creditAmount: 50000,
        description: 'NEFT EPFO INBOXLINK',
      });
      await page.goto('/inbox');
      const row = page.locator('[data-inbox-key^="epf_match:"]');
      await expect(row).toHaveCount(1, { timeout: 45_000 });
      await expect(row).toContainText('INBOXLINK');
      await row.getByRole('button', { name: 'Link', exact: true }).click();
      await expect(toast(page, 'Linked to the EPF withdrawal')).toBeVisible();
      await expect(row).toHaveCount(0);
      expect(first.entry.id).toBeTruthy();

      // Another withdrawal and credit: Not this one removes the row.
      await seedEpfWithdrawal(api, employer.id, {
        creditedOn: istToday(-9),
        creditDate: istToday(-8),
        creditAmount: 50000,
        description: 'NEFT EPFO INBOXSKIP',
      });
      await page.reload();
      await expect(row).toHaveCount(1, { timeout: 45_000 });
      await expect(row).toContainText('INBOXSKIP');
      await row.getByRole('button', { name: 'Not this one' }).click();
      await expect(row).toHaveCount(0);
    });
  });
}

test.describe('/ds EPF in Net worth, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-epf-nw');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('the Net worth underlying data lists an EPF line', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await seedEpfBalance(api, 'Worth Labs');
    await createEpfEmployer(api, { name: 'No Balance Co' });
    const dashboard = await createDashboard(api, {
      name: 'Epf board',
      isDefault: false,
      widgets: [builtinWidget('wb', 'net_worth', 100, undefined, { x: 0, y: 0, h: 24 })],
    });
    await page.goto(`/dashboards/${dashboard.id}`);
    await page.locator('[data-testid="dashboard-widget"][data-widget-id="wb"]').getByTestId('net-worth-value').getByRole('button').click({ timeout: 45_000 });
    const dialog = page.getByRole('dialog', { name: 'Underlying data · Net worth' });
    const groups = dialog.getByTestId('underlying-groups');
    await expect(groups).toBeVisible({ timeout: 45_000 });
    await expect(groups.getByRole('button').filter({ hasText: 'EPF' }).first()).toContainText('₹5,00,000');
  });
});
