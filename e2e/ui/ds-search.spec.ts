import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedHoldings } from '../fixtures/seed/holdings';
import { type SeededSearch, seedSearch } from '../fixtures/seed/search';
import { expect, test } from '../fixtures/test';

const WORD = 'Zephyr';

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
    async function openSearch(page: import('@playwright/test').Page) {
      await page.goto('/ds/accounts');
      const trigger = phone
        ? page.getByRole('button', { name: 'Search', exact: true })
        : page.locator('nav.w-container-xs').getByRole('button', { name: /Search/ });
      // A click before hydration does nothing; retry until the palette opens.
      await expect(async () => {
        await trigger.click();
        await expect(palette(page)).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 45_000 });
    }

    test('the entry point opens the palette, and the text field is focused', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await expect(page.getByRole('searchbox')).toBeFocused();
    });

    test('shows pages and actions from one character and sends no search under 3 characters', async ({ page }) => {
      test.slow();
      const searches: string[] = [];
      page.on('request', (r) => {
        if (r.url().includes('/api/v1/search')) searches.push(r.url());
      });
      await openSearch(page);

      await page.getByRole('searchbox').fill('tr');
      await expect(page.getByRole('option', { name: 'Transactions', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Trade', exact: true })).toBeVisible();
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
      await expect(dialog.getByRole('option', { name: `${WORD} Card · ••7741` })).toBeVisible({ timeout: 30_000 });
      expect(searches).toHaveLength(1);
      expect(searches[0]).toContain(`q=${WORD.toLowerCase()}`);
      for (const group of ['Accounts', 'Transactions', 'Lending', 'Loans', 'Reports', 'Dashboards', 'Ask']) {
        await expect(dialog.getByRole('group').filter({ hasText: group }).first()).toBeVisible();
      }
      await expect(dialog.getByRole('option', { name: `${seeded.person.name}` })).toBeVisible();
      await expect(dialog.getByRole('option', { name: `${seeded.loan.name} · SBI` })).toBeVisible();

      // 7 matches, the 5 newest show, then the row that opens them all.
      await expect(dialog.getByRole('option', { name: new RegExp(`^${WORD} purchase \\d`) })).toHaveCount(5);
      await expect(dialog.getByRole('option', { name: `${WORD} purchase 1 ·`, exact: false })).toBeVisible();
      await expect(dialog.getByRole('option', { name: `${WORD} purchase 6`, exact: false })).toHaveCount(0);
      await dialog.getByRole('option', { name: 'See all matching transactions' }).click();

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
        await palette(page).getByRole('option', { name: c.option, exact: true }).click({ timeout: 30_000 });
        await expect(page).toHaveURL(new RegExp(`${c.url}$`), { timeout: 45_000 });
        await expect(palette(page)).toHaveCount(0);
      }
    });

    test('the text is cleared after the palette closes', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await page.getByRole('searchbox').fill(WORD);
      if (phone) await palette(page).getByRole('button', { name: 'Cancel' }).click();
      else await page.keyboard.press('ControlOrMeta+k');
      await expect(palette(page)).toHaveCount(0);
      await page.keyboard.press('ControlOrMeta+k');
      await expect(page.getByRole('searchbox')).toHaveValue('');
    });

    test('a Quick add action opens its dialog without leaving the page', async ({ page }) => {
      test.slow();
      await openSearch(page);
      await palette(page).getByRole('option', { name: 'Transaction', exact: true }).click();
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
      .getByRole('option', { name: `${holdings.infy.name} · ${holdings.infy.symbol}` })
      .click({ timeout: 45_000 });
    await expect(page).toHaveURL(new RegExp(`/ds/investments/${holdings.infy.id}$`), { timeout: 45_000 });
  });
});
