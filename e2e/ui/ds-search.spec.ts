import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedHoldings } from '../fixtures/seed/holdings';
import { ingestCardStatement } from '../fixtures/seed/nav';
import { type SeededSearch, seedSearch } from '../fixtures/seed/search';
import { expect, test } from '../fixtures/test';

const WORD = 'Zephyr';

/** A row whose whole text is `text`. Rows are found by their text: Highlight's marks split the name the browser reads. */
const exactly = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900, tag: '@ui' },
  { name: 'phone 390px', width: 390, height: 844, tag: '@ui @mobile' },
];

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds app-wide search, ${viewport.name} (${viewport.tag})`, () => {
    let currentUser: CreatedUser;
    let seeded: SeededSearch;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-search');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      seeded = await seedSearch(makeApi(currentUser.cookie), WORD);
    });

    const palette = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Search' });

    /** The way in on this width: the phone's top-bar button, the desktop Rail's Search field. */
    async function openSearch(page: import('@playwright/test').Page, path = '/ds/accounts') {
      await page.goto(path);
      const trigger = phone
        ? page.getByRole('button', { name: 'Search', exact: true })
        : page.locator('nav.w-container-xs').getByRole('button', { name: /Search/ });
      // A click before hydration does nothing; retry until the palette opens.
      await expect(async () => {
        await trigger.click();
        await expect(palette(page)).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 45_000 });
    }

    test('the entry point opens the palette, the text field is focused and nothing shows before any text', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await expect(page.getByRole('searchbox')).toBeFocused();
      await expect(palette(page).getByRole('option')).toHaveCount(0);
    });

    test('shows pages and actions from one character and sends no search under 3 characters', async ({ page }) => {
      test.slow();
      const searches: string[] = [];
      page.on('request', (r) => {
        if (r.url().includes('/api/v1/search')) searches.push(r.url());
      });
      await openSearch(page);

      await page.getByRole('searchbox').fill('tr');
      await expect(page.getByRole('option').filter({ hasText: exactly('Transactions') })).toBeVisible();
      await expect(page.getByRole('option').filter({ hasText: exactly('Trade') })).toBeVisible();
      await page.waitForTimeout(700);
      expect(searches).toHaveLength(0);
    });

    test('3 characters search every group, capped at 5 transactions plus See all, which opens Transactions with the text', async ({ page }) => {
      test.slow();
      const searches: string[] = [];
      page.on('request', (r) => {
        if (r.url().includes('/api/v1/search')) searches.push(r.url());
      });
      await openSearch(page);

      await page.getByRole('searchbox').fill(WORD.toLowerCase());
      const dialog = palette(page);
      await expect(dialog.getByRole('option').filter({ hasText: `${WORD} Card · ••7741` })).toBeVisible({ timeout: 30_000 });
      expect(searches).toHaveLength(1);
      expect(searches[0]).toContain(`q=${WORD.toLowerCase()}`);
      for (const group of ['Accounts', 'Transactions', 'Lending', 'Loans', 'Reports', 'Dashboards', 'Ask']) {
        await expect(dialog.getByRole('group').filter({ hasText: group }).first()).toBeVisible();
      }
      await expect(dialog.getByRole('option').filter({ hasText: `${seeded.person.name}` })).toBeVisible();
      await expect(dialog.getByRole('option').filter({ hasText: `${seeded.loan.name} · SBI` })).toBeVisible();

      // 7 matches, the 5 newest show, then the row that opens them all.
      await expect(dialog.getByRole('option').filter({ hasText: new RegExp(`^${WORD} purchase \\d`) })).toHaveCount(5);
      await expect(dialog.getByRole('option').filter({ hasText: `${WORD} purchase 1 ·` })).toBeVisible();
      await expect(dialog.getByRole('option').filter({ hasText: `${WORD} purchase 6` })).toHaveCount(0);
      await dialog.getByRole('option').filter({ hasText: 'See all matching transactions' }).click();

      await expect(page).toHaveURL(new RegExp(`/ds/transactions\\?q=${WORD.toLowerCase()}`));
      await expect(palette(page)).toHaveCount(0);
      await expect(page.getByText(`${WORD} purchase 6`).first()).toBeVisible({ timeout: 30_000 });
    });

    test('picking an account, a loan and a report opens its page', async ({ page }) => {
      test.slow();
      const cases = [
        { option: `${WORD} Card · ••7741`, url: `/ds/accounts/${seeded.card.id}` },
        { option: `${seeded.loan.name} · SBI`, url: `/ds/loans/${seeded.loan.id}` },
        { option: seeded.report.name, url: `/ds/reports/${seeded.report.id}` },
      ];
      for (const c of cases) {
        await openSearch(page);
        await page.getByRole('searchbox').fill(WORD);
        await palette(page).getByRole('option').filter({ hasText: exactly(c.option) }).click({ timeout: 30_000 });
        await expect(page).toHaveURL(new RegExp(`${c.url}$`), { timeout: 45_000 });
        await expect(palette(page)).toHaveCount(0);
      }
    });

    test('picking a transaction opens its detail on the Transactions page', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await page.getByRole('searchbox').fill(WORD);
      await palette(page).getByRole('option').filter({ hasText: `${WORD} purchase 1 ·` }).click({ timeout: 30_000 });
      await expect(page).toHaveURL(/\/ds\/transactions\?txn=[0-9a-f-]{36}/, { timeout: 45_000 });
      await expect(page.getByRole('dialog', { name: `${WORD} purchase 1` })).toBeVisible({ timeout: 30_000 });
    });

    test('picking a transaction while already on Transactions opens its detail there', async ({ page }) => {
      test.slow();
      await openSearch(page, '/ds/transactions');
      await page.getByRole('searchbox').fill(WORD);
      await palette(page).getByRole('option').filter({ hasText: `${WORD} purchase 2 ·` }).click({ timeout: 30_000 });
      await expect(page).toHaveURL(/\/ds\/transactions\?txn=/, { timeout: 45_000 });
      await expect(page.getByRole('dialog', { name: `${WORD} purchase 2` })).toBeVisible({ timeout: 30_000 });
    });

    test('a matched account offers Add transaction on it, with that account picked', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await page.getByRole('searchbox').fill(`${WORD} Savings`);
      const dialog = palette(page);
      await expect(dialog.getByRole('option').filter({ hasText: `Add transaction on ${WORD} Savings` })).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByRole('option').filter({ hasText: `Upload a ${WORD} Savings statement` })).toBeVisible();
      await dialog.getByRole('option').filter({ hasText: `Add transaction on ${WORD} Savings` }).click();
      const add = page.getByRole('dialog', { name: 'Add transaction' });
      await expect(add).toBeVisible();
      await expect(add.getByRole('combobox', { name: /^Account/ })).toContainText(`${WORD} Savings`);
    });

    test('a card with an unpaid bill shows what it owes and offers Mark bill paid, which disappears once paid', async ({ page }) => {
      test.slow();
      await ingestCardStatement(makeApi(currentUser.cookie), seeded.card.id, '7741');
      await openSearch(page);
      await page.getByRole('searchbox').fill(`${WORD} Card`);
      const dialog = palette(page);
      const markPaid = dialog.getByRole('option').filter({ hasText: `Mark ${WORD} Card bill paid` });
      await expect(markPaid).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByRole('option').filter({ hasText: new RegExp(`^${WORD} Card · ••7741`) })).toContainText('You owe ₹6,000');

      await markPaid.click();
      const mark = page.getByRole('dialog', { name: 'Mark bill as paid' });
      await expect(mark).toBeVisible();
      await mark.getByRole('button', { name: 'Mark paid' }).click();
      await expect(mark).toHaveCount(0);

      await page.keyboard.press('ControlOrMeta+k');
      await page.getByRole('searchbox').fill(`${WORD} Card`);
      await expect(palette(page).getByRole('option').filter({ hasText: `Add transaction on ${WORD} Card` })).toBeVisible({ timeout: 30_000 });
      await expect(palette(page).getByRole('option').filter({ hasText: `Mark ${WORD} Card bill paid` })).toHaveCount(0);
    });

    test('1 or 2 characters show the nudge, 3 remove it', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await page.getByRole('searchbox').fill('ze');
      await expect(palette(page).getByText('Type 3 or more characters to search accounts, transactions and more')).toBeVisible();
      await page.getByRole('searchbox').fill('zep');
      await expect(palette(page).getByText(/Type 3 or more characters/)).toHaveCount(0);
    });

    test('the clear button empties the text and shows nothing; there is no Cancel', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await expect(palette(page).getByRole('button', { name: 'Cancel' })).toHaveCount(0);
      await page.getByRole('searchbox').fill('tr');
      await expect(palette(page).getByRole('option').first()).toBeVisible();
      await palette(page).getByRole('button', { name: 'Clear' }).click();
      await expect(page.getByRole('searchbox')).toHaveValue('');
      await expect(page.getByRole('searchbox')).toBeFocused();
      await expect(palette(page).getByRole('option')).toHaveCount(0);
      await expect(palette(page)).toBeVisible();
    });

    test('the text is cleared after the palette closes', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await page.getByRole('searchbox').fill(WORD);
      await page.keyboard.press(phone ? 'Escape' : 'ControlOrMeta+k');
      await expect(palette(page)).toHaveCount(0);
      await page.keyboard.press('ControlOrMeta+k');
      await expect(page.getByRole('searchbox')).toHaveValue('');
    });

    test('a Quick add action opens its dialog without leaving the page', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await page.getByRole('searchbox').fill('tr');
      await palette(page).getByRole('option').filter({ hasText: exactly('Transaction') }).click();
      await expect(palette(page)).toHaveCount(0);
      await expect(page).toHaveURL(/\/ds\/accounts$/);
      await expect(page.getByRole('dialog').first()).toBeVisible();
    });

    if (!phone) {
      test('⌘K / Ctrl+K opens and closes the palette from any page', async ({ page }) => {
        test.slow();
        await page.goto('/ds/accounts');
        await page.locator('nav.w-container-xs').waitFor();
        await page.keyboard.press('ControlOrMeta+k');
        await expect(palette(page)).toBeVisible({ timeout: 45_000 });
        await page.keyboard.press('ControlOrMeta+k');
        await expect(palette(page)).toHaveCount(0);
      });
    }
  });
}

test.describe('/ds app-wide search, holdings (@ui)', () => {
  test('a holding is found by name and opens its page', async ({ context, request, page }) => {
    test.slow();
    const user = await createUser(request, 'ui-ds-search-holdings');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
    const holdings = await seedHoldings(makeApi(user.cookie));

    await page.goto('/ds/accounts');
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('searchbox').fill('INFYX');
    await page
      .getByRole('dialog', { name: 'Search' })
      .getByRole('option').filter({ hasText: `${holdings.infy.name} · ${holdings.infy.symbol}` })
      .click({ timeout: 45_000 });
    await expect(page).toHaveURL(new RegExp(`/ds/investments/${holdings.infy.id}$`), { timeout: 45_000 });
  });
});
