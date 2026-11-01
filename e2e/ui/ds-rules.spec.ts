import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createRule } from '../fixtures/seed/categories';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

/** The ⋮ of the card titled `name`. */
const menuOf = (page: Page, name: string) =>
  page
    .getByText(name, { exact: true })
    .locator('xpath=ancestor::div[.//button[@aria-label="Rule actions"]][1]')
    .getByRole('button', { name: 'Rule actions' });

// Rules match the bank's own text, so the rows come from an imported statement (a typed description never matches).
const bankSpec: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '5566778899',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 20000,
  rows: [
    { date: '2026-04-03', description: 'THIRD WAVE COFFEE', debit: 380 },
    { date: '2026-04-09', description: 'OLA CABS RIDE', debit: 260 },
    { date: '2026-04-15', description: 'ZEPTO ORDER', debit: 940 },
    { date: '2026-04-20', description: 'PLINTH WORKS TRADERS', debit: 150 },
  ],
};

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Rules on the Tags tab, ${viewport.name} (${viewport.tag})`, () => {
    let user: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      user = await createUser(request, 'ui-ds-rules');
      await loginContext(context, user.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Three rules over one imported statement, one matching row each (a fourth row has no rule).
      const api = makeApi(user.cookie);
      const account = await createBankAccount(api, { name: 'Rules Account' });
      const { job } = await uploadAndIngest(api, account.id, [{ filename: 'rules.pdf', buffer: await genBankPdf(bankSpec) }]);
      expect(job.status).toBe('SUCCEEDED');
      await createRule(api, { merchantKey: 'THIRD WAVE', displayName: 'Third Wave', categoryKey: 'food', subcategoryKey: 'food.cafes' });
      await createRule(api, { merchantKey: 'OLA CABS', displayName: 'Ola Cabs', categoryKey: 'transport', subcategoryKey: 'transport.cabs' });
      await createRule(api, { merchantKey: 'ZEPTO', displayName: 'Zepto', categoryKey: 'groceries' });
    });

    test('lists the rules with their category; there is no verification, no usage text; filters live in the address and survive a reload', async ({ page }) => {
      await page.goto('/transactions/rules');
      for (const name of ['Third Wave', 'Ola Cabs', 'Zepto']) await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Food · Cafés').first()).toBeVisible();
      await expect(page.getByText('Groceries').first()).toBeVisible();
      // Verification is gone: no Unverified/Verified filter, no Approve on a rule, no "last used".
      await expect(page.getByRole('button', { name: /^(Unverified|Verified|All)$/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
      await expect(page.getByText(/last used|last active/i)).toHaveCount(0);

      // Category filter: one of the fixed categories.
      await page.getByRole('button', { name: 'Category', exact: true }).click();
      await page.getByPlaceholder('Search categories').fill('groceries');
      await page.getByRole('option', { name: 'Groceries' }).click();
      await expect(page).toHaveURL(/category=groceries/);
      await expect(page.getByText('Third Wave', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Zepto', { exact: true }).first()).toBeVisible();

      await page.getByRole('button', { name: 'Reset filter', exact: true }).first().click();
      await expect(page).not.toHaveURL(/category=/);
      // The search writes the address after a short pause; retry the typing in case the page was not hydrated yet.
      await expect(async () => {
        await page.getByPlaceholder('Search').last().fill('');
        await page.getByPlaceholder('Search').last().fill('ola');
        await expect(page).toHaveURL(/q=ola/, { timeout: 3_000 });
      }).toPass({ timeout: 20_000 });
      await expect(page.getByText('Zepto', { exact: true })).toHaveCount(0);
      await page.reload();
      await expect(page.getByText('Ola Cabs', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Zepto', { exact: true })).toHaveCount(0);

      // A search that matches nothing is a miss, not a first-use state.
      await page.getByPlaceholder('Search').last().fill('nothing like this');
      await expect(page.getByText('No rules match')).toBeVisible();
      await expect(page.getByText('No rules yet')).toHaveCount(0);
    });

    test('New rule: the form has a pattern, a match, one category (the picker) and no merchant key; a category is required; Add rule saves it', async ({ page }) => {
      await page.goto('/transactions/rules');
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();
      await page.getByRole('menuitem', { name: 'New rule' }).click();
      const add = page.getByRole('dialog', { name: 'Add rule' });
      await expect(add).toBeVisible();
      await expect(add.getByLabel(/merchant key/i)).toHaveCount(0);
      await add.getByLabel('Pattern').fill('SWIGGY');
      // No category yet: the form says so and nothing is saved.
      await add.getByRole('button', { name: 'Add rule' }).click();
      await expect(add.getByText('Pick a category.')).toBeVisible();

      await add.getByRole('combobox', { name: /Category/ }).click();
      const picker = page.getByRole('dialog', { name: 'Category' });
      await picker.getByRole('button', { name: 'Food', exact: true }).click();
      await picker.getByText('Delivery', { exact: true }).click();
      await expect(picker).not.toBeVisible();
      await expect(add.getByText('Food · Delivery')).toBeVisible();
      await add.getByRole('button', { name: 'Add rule' }).click();
      await expect(page.getByText('Rule created')).toBeVisible();
      await expect(page.getByText('Food · Delivery').first()).toBeVisible();

      const rules = ((await makeApi(user.cookie).GET('/api/v1/rules')).data as { content: Array<{ merchantKey: string; category: { key: string }; subcategory?: { key: string } }> }).content;
      expect(rules.find((r) => r.merchantKey === 'SWIGGY')).toMatchObject({ category: { key: 'food' }, subcategory: { key: 'food.delivery' } });
    });

    test('"Also update past matches" runs the rule over transactions already there', async ({ page }) => {
      const api = makeApi(user.cookie);
      const past = (await searchAll(api)).find((t) => (t.sourcedDescription ?? '').includes('PLINTH WORKS'))!;
      expect(past.category ?? null).toBeNull();

      await page.goto('/transactions/rules');
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();
      await page.getByRole('menuitem', { name: 'New rule' }).click();
      const add = page.getByRole('dialog', { name: 'Add rule' });
      await add.getByLabel('Pattern').fill('PLINTH WORKS');
      await expect(add.getByText('Matches 1 past transaction')).toBeVisible();
      await add.getByRole('combobox', { name: /Category/ }).click();
      await page.getByRole('dialog', { name: 'Category' }).getByRole('button', { name: 'Gifts', exact: true }).click();
      await add.getByText('Also update past matches').click();
      await add.getByRole('button', { name: 'Add rule' }).click();
      await expect(page.getByText('Rule created')).toBeVisible();
      await expect(page.getByText('Updating past matches')).toBeVisible();
      await expect
        .poll(async () => (await searchAll(api)).find((t) => t.id === past.id)?.category?.key, { timeout: 30_000 })
        .toBe('gifts');
    });

    test('Edit loads the matches with their account and follows the pattern', async ({ page }) => {
      await page.goto('/transactions/rules');
      await menuOf(page, 'Third Wave').click();
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      const edit = page.getByRole('dialog', { name: /Edit rule · Third Wave/ });
      await expect(edit.getByText('Matches 1 past transaction')).toBeVisible();
      await edit.getByRole('button', { name: 'See them' }).click();
      await expect(edit.getByText('Matches now · 1')).toBeVisible();
      await expect(edit.getByText(/Rules Account/)).toBeVisible();
      await edit.getByLabel('Pattern').fill('OLA CABS RIDE');
      await expect(edit.getByText('OLA CABS RIDE', { exact: true })).toBeVisible();
      await expect(edit.getByText('Matches 1 past transaction')).toBeVisible();
      await edit.getByRole('button', { name: 'Save rule' }).click();
      await expect(page.getByText('Rule updated')).toBeVisible();
    });

    test('Find matches starts with nothing ticked and applies the rule; Delete confirms first', async ({ page }) => {
      await page.goto('/transactions/rules');
      await menuOf(page, 'Ola Cabs').click();
      await page.getByRole('menuitem', { name: 'Find matches' }).click();
      const dialog = page.getByRole('dialog', { name: /Matching transactions/ });
      await expect(dialog.getByRole('checkbox', { name: /Select all 1 match/ })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Apply rule' })).toBeDisabled();
      await dialog.getByRole('checkbox', { name: /Select all 1 match/ }).click();
      await dialog.getByRole('button', { name: 'Apply rule (1)' }).click();
      await expect(page.getByText('Rule applied to 1 transaction')).toBeVisible({ timeout: 30_000 });

      await menuOf(page, 'Ola Cabs').click();
      await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
      await expect(page.getByText('Delete rule?')).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByText('Rule deleted')).toBeVisible();
      await expect(menuOf(page, 'Ola Cabs')).toHaveCount(0);
    });

    for (const theme of ['light', 'dark']) {
      test(`screens, ${theme}`, async ({ page }) => {
        page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().replace(/\n/g, ' ').slice(-700)));
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
        const tag = `${viewport.width}-${theme}`;
        await page.goto('/transactions/rules');
        await expect(page.getByText('Zepto', { exact: true }).first()).toBeVisible();
        // caret: 'initial' keeps Playwright from rewriting inline styles before React has hydrated (a false hydration warning).
        await page.screenshot({ path: test.info().outputPath(`list-${tag}.png`), caret: 'initial' });
        await menuOf(page, 'Third Wave').click();
        await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
        await expect(page.getByText('Matches 1 past transaction')).toBeVisible();
        await page.screenshot({ path: test.info().outputPath(`edit-${tag}.png`) });
        await page.goto('/transactions/rules');
        await menuOf(page, 'Third Wave').click();
        await page.getByRole('menuitem', { name: 'Find matches' }).click();
        await expect(page.getByRole('dialog').getByRole('checkbox').first()).toBeVisible();
        await page.screenshot({ path: test.info().outputPath(`matches-${tag}.png`) });
      });
    }
  });
}
