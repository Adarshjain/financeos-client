import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { scriptCategorize } from '../fixtures/llm';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

/** The ⋮ of the card titled `name`. */
const menuOf = (page: Page, name: string) =>
  page
    .getByText(name, { exact: true })
    .locator('xpath=ancestor::div[.//button[@aria-label="Rule actions"]][1]')
    .getByRole('button', { name: 'Rule actions' });

/** Transactions still waiting in review for an unverified category. */
const inReview = async (cookie: string) =>
  (await searchAll(makeApi(cookie))).filter((t) => t.reviewReasons?.includes('CATEGORY_UNVERIFIED')).length;

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
  ],
};

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds Rules, ${viewport.name} (${viewport.tag})`, () => {
    let user: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      user = await createUser(request, 'ui-ds-rules');
      await loginContext(context, user.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Three unverified rules the model made from one imported statement.
      const api = makeApi(user.cookie);
      await resetLlm(api);
      await setLlmMode(api, 'SCHEMA_DEFAULT');
      await scriptCategorize(api, [
        { index: 0, merchantKey: 'THIRD WAVE', displayName: 'Third Wave', categoryNames: ['Coffee'] },
        { index: 1, merchantKey: 'OLA CABS', displayName: 'Ola Cabs', categoryNames: ['Travel'] },
        { index: 2, merchantKey: 'ZEPTO', displayName: 'Zepto', categoryNames: ['Groceries'] },
      ]);
      const account = await createBankAccount(api, { name: 'Rules Account' });
      const { job } = await uploadAndIngest(api, account.id, [{ filename: 'rules.pdf', buffer: await genBankPdf(bankSpec) }]);
      expect(job.status).toBe('SUCCEEDED');
    });

    test('opens on Unverified with the counts; filters live in the address and survive a reload', async ({ page }) => {
      await page.goto('/ds/transactions/rules');
      await expect(page.getByRole('button', { name: 'Unverified · 3' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'All · 3' })).toBeVisible();
      for (const name of ['Third Wave', 'Ola Cabs', 'Zepto']) await expect(page.getByText(name, { exact: true })).toBeVisible();
      await expect(page.getByText(/last used|last active/i)).toHaveCount(0);

      await page.getByRole('button', { name: 'Verified · 0' }).click();
      await expect(page).toHaveURL(/status=verified/);
      await expect(page.getByText('No rules found')).toBeVisible();

      await page.getByRole('button', { name: 'All · 3' }).click();
      await page.getByPlaceholder('Search merchant keys or names…').fill('ola');
      await expect(page).toHaveURL(/q=ola/);
      await expect(page.getByText('Zepto', { exact: true })).toHaveCount(0);
      await page.reload();
      await expect(page.getByText('Ola Cabs', { exact: true })).toBeVisible();
      await expect(page.getByText('Zepto', { exact: true })).toHaveCount(0);
    });

    test('+ adds a rule (a category created inline); Edit loads its matches with the account and follows the pattern', async ({ page }) => {
      await page.goto('/ds/transactions/rules');
      await page.getByRole('button', { name: /^Add$/ }).first().click();
      const add = page.getByRole('dialog', { name: 'Add rule' });
      await expect(add).toBeVisible();
      await add.getByLabel('Pattern').fill('SWIGGY');
      await add.getByRole('combobox', { name: /Categories/ }).click();
      await page.getByPlaceholder(/Search/).last().fill('Eating out');
      await page.getByRole('button', { name: 'Eating out', exact: true }).click();
      await page.getByRole('button', { name: 'Done' }).click();
      await add.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Rule created')).toBeVisible();

      await menuOf(page, 'Third Wave').click();
      await page.getByRole('menuitem', { name: 'Edit rule' }).click();
      const edit = page.getByRole('dialog', { name: /Edit rule · Third Wave/ });
      await expect(edit.getByText('Matches now · 1')).toBeVisible();
      await expect(edit.getByText(/Rules Account/)).toBeVisible();
      await edit.getByLabel('Pattern').fill("OLA CABS RIDE");
      await expect(edit.getByText("OLA CABS RIDE", { exact: true })).toBeVisible();
      await edit.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Rule updated')).toBeVisible();
    });

    test('Find matches starts with nothing ticked and applies the rule; Delete confirms first', async ({ page }) => {
      await page.goto('/ds/transactions/rules');
      await menuOf(page, 'Ola Cabs').click();
      await page.getByRole('menuitem', { name: 'Find matches' }).click();
      const dialog = page.getByRole('dialog', { name: /Matching transactions/ });
      await expect(dialog.getByRole('checkbox', { name: /Select all 1 match/ })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Apply rule' })).toBeDisabled();
      await dialog.getByRole('checkbox', { name: /Select all 1 match/ }).click();
      await dialog.getByRole('button', { name: 'Apply rule (1)' }).click();
      await expect(page.getByText('Rule applied to 1 transaction')).toBeVisible({ timeout: 30_000 });

      await menuOf(page, 'Ola Cabs').click();
      await page.getByRole('menuitem', { name: 'Delete rule' }).click();
      await expect(page.getByText('Delete rule?')).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete rule' }).click();
      await expect(page.getByText('Rule deleted')).toBeVisible();
      await expect(menuOf(page, 'Ola Cabs')).toHaveCount(0);
    });

    test('Approve verifies one rule; selected rules approve together from the bar', async ({ page }) => {
      await page.goto('/ds/transactions/rules');
      const approveOne = page.getByRole('button', { name: 'Approve', exact: true }).first();
      await approveOne.click();
      await expect(page.getByText(/1 rule verified|Rule verified/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Unverified · 2' })).toBeVisible();

      if (phone) {
        // Long-press starts selection; a tap then toggles.
        const first = page.getByText('Ola Cabs', { exact: true });
        const box = (await first.boundingBox())!;
        await page.mouse.move(box.x + 5, box.y + 5);
        await page.mouse.down();
        await page.waitForTimeout(800);
        await page.mouse.up();
      } else {
        await page.getByLabel('Select Ola Cabs').click();
      }
      await expect(page.getByText('1 selected')).toBeVisible();
      await page.getByText('1 selected').locator('xpath=ancestor::div[.//button][1]').getByRole('button', { name: /Approve/ }).click();
      await expect(page.getByText(/1 rule verified/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Unverified · 1' })).toBeVisible();
    });

    test('Undo on the approve toast un-verifies the rule, single and bulk', async ({ page }) => {
      await page.goto('/ds/transactions/rules');
      expect(await inReview(user.cookie)).toBe(3);
      await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
      await expect(page.getByRole('button', { name: 'Unverified · 2' })).toBeVisible();
      await expect.poll(() => inReview(user.cookie)).toBe(2);
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.getByRole('button', { name: 'Unverified · 3' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Verified · 0' })).toBeVisible();
      // The transaction the approve cleared is back in review.
      await expect.poll(() => inReview(user.cookie)).toBe(3);

      if (!phone) {
        await page.getByLabel('Select Ola Cabs').click();
        await page.getByLabel('Select Zepto').click();
        await page.getByText('2 selected').locator('xpath=ancestor::div[.//button][1]').getByRole('button', { name: /Approve/ }).click();
        await expect(page.getByRole('button', { name: 'Unverified · 1' })).toBeVisible();
        await expect.poll(() => inReview(user.cookie)).toBe(1);
        await page.getByRole('button', { name: 'Undo' }).click();
        await expect(page.getByRole('button', { name: 'Unverified · 3' })).toBeVisible();
        await expect.poll(() => inReview(user.cookie)).toBe(3);
      }
    });

    test('deleting a ticked rule drops it from the selection; Approve still works for the rest', async ({ page }) => {
      test.skip(phone, 'On phone the ⋮ is replaced by the eye while rules are selected.');
      await page.goto('/ds/transactions/rules');
      await page.getByLabel('Select Ola Cabs').click();
      await page.getByLabel('Select Zepto').click();
      await expect(page.getByText('2 selected')).toBeVisible();
      await menuOf(page, 'Ola Cabs').click();
      await page.getByRole('menuitem', { name: 'Delete rule' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete rule' }).click();
      await expect(page.getByText('Rule deleted')).toBeVisible();
      await expect(page.getByText('1 selected')).toBeVisible();
      await page.getByText('1 selected').locator('xpath=ancestor::div[.//button][1]').getByRole('button', { name: /Approve/ }).click();
      await expect(page.getByText(/1 rule verified/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Unverified · 1' })).toBeVisible();
    });

    for (const theme of ['light', 'dark']) {
      test(`screens, ${theme}`, async ({ page }) => {
        page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().replace(/\n/g, ' ').slice(-700)));
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
        const tag = `${viewport.width}-${theme}`;
        await page.goto('/ds/transactions/rules');
        await expect(page.getByText('Zepto', { exact: true })).toBeVisible();
        // caret: 'initial' keeps Playwright from rewriting inline styles before React has hydrated (a false hydration warning).
        await page.screenshot({ path: test.info().outputPath(`list-${tag}.png`), caret: 'initial' });
        await menuOf(page, 'Third Wave').click();
        await page.getByRole('menuitem', { name: 'Edit rule' }).click();
        await expect(page.getByText('Matches now · 1')).toBeVisible();
        await page.screenshot({ path: test.info().outputPath(`edit-${tag}.png`) });
        await page.goto('/ds/transactions/rules');
        await menuOf(page, 'Third Wave').click();
        await page.getByRole('menuitem', { name: 'Find matches' }).click();
        await expect(page.getByRole('dialog').getByRole('checkbox').first()).toBeVisible();
        await page.screenshot({ path: test.info().outputPath(`matches-${tag}.png`) });
      });
    }
  });
}
