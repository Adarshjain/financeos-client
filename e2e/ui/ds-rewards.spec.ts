import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import {
  createMilestone,
  createRewardCard,
  createRewardRule,
  fixedMonth,
  spend,
} from '../fixtures/seed/rewards';
import { expect, test } from '../fixtures/test';

/** A toast on screen (Dinero toasts under /ds are sonner toasts). */
const toast = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text }).first();

/** "2026-08-05" as the Dinero date fields show it. */
const ddmmyyyy = (iso: string) => iso.split('-').reverse().join('/');

/** True when `upper` is drawn above `lower` on the page. */
async function isAbove(page: Page, upper: string, lower: string): Promise<boolean> {
  const a = await page.getByText(upper, { exact: true }).first().boundingBox();
  const b = await page.getByText(lower, { exact: true }).first().boundingBox();
  if (!a || !b) throw new Error(`Cannot compare ${upper} / ${lower}`);
  return a.y < b.y;
}

/** The card's anniversary: the spend month's first day, a year back, so the spends are always in the current reward year. */
function anniversary(): string {
  const m = fixedMonth();
  return `${m.year - 1}-${String(m.month).padStart(2, '0')}-01`;
}

const spendDay = (day: string) => `${fixedMonth().from.slice(0, 7)}-${day}`;

test.describe('/ds Rewards, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-rewards');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Overview: total, cards sorted by earned, tap a card opens its rewards page', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: low } = await createRewardCard(api, { name: 'Ds Low Card', anniversaryDate: anniversary() });
    await createRewardRule(api, low.id, { name: 'Ds 2%', percentRate: 2 });
    await spend(api, low.id, { amount: 1500, date: spendDay('10') });
    const { account: high } = await createRewardCard(api, { name: 'Ds High Card', anniversaryDate: anniversary() });
    await createRewardRule(api, high.id, { name: 'Ds 5%', percentRate: 5 });
    await spend(api, high.id, { amount: 4000, date: spendDay('11') });

    await page.goto('/rewards');
    await expect(page).toHaveTitle('Rewards · FinanceOS');
    await expect(page.getByText('Earned this year')).toBeVisible({ timeout: 45_000 });
    // 2% of 1,500 + 5% of 4,000.
    await expect(page.getByText(/₹230/).first()).toBeVisible();
    await expect(page.getByText('Ds High Card', { exact: true })).toBeVisible();
    await expect(page.getByText('Ds Low Card', { exact: true })).toBeVisible();
    expect(await isAbove(page, 'Ds High Card', 'Ds Low Card')).toBe(true);
    await expect(page.getByText(/₹200/).first()).toBeVisible();
    await expect(page.getByText(/₹30/).first()).toBeVisible();

    // A table: the card's reward year has its own column.
    await expect(page.getByRole('columnheader', { name: 'Reward year' })).toBeVisible();
    await expect(page.getByText('Anniversary year', { exact: true }).first()).toBeVisible();

    await page.getByText('Ds High Card', { exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/rewards/cards/${high.id}`), { timeout: 45_000 });
    await expect(page.getByText('Eligible spend')).toBeVisible({ timeout: 45_000 });
  });

  test('card page: period select resets the page and Custom shows From/To; earning line opens its calculation dialog', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Period Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, { name: 'Ds Flat 2%', percentRate: 2 });
    await spend(api, card.id, { amount: 1500, date: spendDay('10'), description: 'Ds Grocery Line' });
    const month = fixedMonth();

    await page.goto(`/rewards/cards/${card.id}?page=2`);
    await expect(page.getByRole('main').getByText('Transactions', { exact: true }).first()).toBeVisible({ timeout: 45_000 });

    // A preset change drops ?page=.
    await page.getByRole('combobox', { name: 'Period' }).click();
    await page.getByRole('option', { name: 'Last 3 months' }).click();
    await expect(page).toHaveURL(/period=LAST_3_MONTHS/);
    await expect(page).not.toHaveURL(/page=/);

    // Custom starts from the dates on screen and shows two date fields.
    await page.getByRole('combobox', { name: 'Period' }).click();
    await page.getByRole('option', { name: 'Custom range' }).click();
    await expect(page).toHaveURL(/period=CUSTOM/);
    await expect(page.getByRole('textbox', { name: 'From' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'To' })).toBeVisible();
    await page.getByRole('textbox', { name: 'From' }).fill(ddmmyyyy(month.from));
    await expect(page).toHaveURL(new RegExp(`from=${month.from}`));
    await page.getByRole('textbox', { name: 'To' }).fill(ddmmyyyy(month.to));
    await expect(page).toHaveURL(new RegExp(`to=${month.to}`));

    // The line is in range; tapping it opens its calculation.
    await page.getByText('Ds Grocery Line').first().click();
    const dialog = page.getByRole('dialog', { name: 'Reward calculation' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Amount charged')).toBeVisible();
    await expect(dialog.getByText('Ds Flat 2%').first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await expect(dialog).toHaveCount(0);
  });

  test('card page: completed milestone, cap bar and "earned nothing" note', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Cap Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, {
      name: 'Ds Capped 10%',
      percentRate: 10,
      periodCap: 20,
      capWindow: 'CALENDAR_MONTH',
    });
    // A rule no spend can match: it earns nothing.
    await createRewardRule(api, card.id, { name: 'Ds Never Matches', percentRate: 5, mccs: ['9999'] });
    await createMilestone(api, card.id, {
      name: 'Ds Done Milestone',
      threshold: 100,
      payoutValue: 250,
      windowType: 'ANNIVERSARY_YEAR',
    });
    await spend(api, card.id, { amount: 500, date: spendDay('10'), description: 'Ds Cap Spend' });

    await page.goto(`/rewards/cards/${card.id}`);
    await expect(page.getByText('Rules on this account')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Completed · 1')).toBeVisible();
    await expect(page.getByText(/₹250 received/)).toBeVisible();
    await expect(page.getByText(/₹250 paid/)).toHaveCount(0);
    await expect(page.getByText('Ds Done Milestone')).toBeVisible();
    // 10% of 500 is 50, capped at 20.
    await expect(page.getByText(/of ₹20/).first()).toBeVisible();
    await expect(page.getByRole('progressbar').first()).toBeVisible();
    await expect(page.getByText('Ds Never Matches earned nothing this period')).toBeVisible();
  });

  test('card page: Transactions pages at 10 and a rule chip in its header filters the lines', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Filter Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, { name: 'Ds Filter Base', percentRate: 2 });
    // A rule no spend can match: choosing it leaves the list empty.
    await createRewardRule(api, card.id, { name: 'Ds Filter Idle', percentRate: 5, mccs: ['9999'] });
    await spend(api, card.id, { amount: 1500, date: spendDay('10'), description: 'Ds Filter Line' });

    await page.goto(`/rewards/cards/${card.id}`);
    await expect(page.getByRole('main').getByText('Transactions', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Ds Filter Line').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rows per page' }).first()).toContainText('10');

    await page.getByRole('button', { name: 'All rules' }).click();
    await page.getByRole('option', { name: 'Ds Filter Idle' }).click();
    await expect(page).toHaveURL(/rule=/);
    await expect(page.getByText('No earning lines')).toBeVisible();
    await expect(page.getByText('Ds Filter Line')).toHaveCount(0);

    await page.getByRole('button', { name: 'Ds Filter Idle' }).first().click();
    await page.getByRole('option', { name: 'Ds Filter Base' }).click();
    await expect(page.getByText('Ds Filter Line').first()).toBeVisible();
  });

  test('card page: a rule row opens Edit rule in place; a rename shows in the list', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Rename Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, { name: 'Ds Rename Rule', percentRate: 2 });
    await spend(api, card.id, { amount: 1500, date: spendDay('10'), description: 'Ds Rename Line' });

    await page.goto(`/rewards/cards/${card.id}`);
    await expect(page.getByText('Rules on this account')).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: /^Ds Rename Rule/ }).click();
    const edit = page.getByRole('dialog', { name: /Edit rule/ });
    await expect(edit).toBeVisible();
    // In place: still on the card page.
    await expect(page).toHaveURL(new RegExp(`/rewards/cards/${card.id}`));
    await edit.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Renamed Rule');
    await edit.getByRole('button', { name: 'Save & recompute' }).click();
    await expect(toast(page, 'Rule updated')).toBeVisible();
    await expect(edit).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Ds Renamed Rule/ })).toBeVisible();
    await expect(page.getByText('Ds Rename Rule', { exact: true })).toHaveCount(0);
  });

  test('card page: fallback banners for a card without statements and for an account without an anniversary', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Cycle Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, {
      name: 'Ds Cycle Rule',
      percentRate: 5,
      periodCap: 100,
      capWindow: 'STATEMENT_CYCLE',
    });
    await spend(api, card.id, { amount: 500, date: spendDay('12') });
    const bank = await createBankAccount(api, { name: 'Ds No Anniversary Account' });
    await createRewardRule(api, bank.id, {
      name: 'Ds Anniversary Rule',
      percentRate: 5,
      periodCap: 100,
      capWindow: 'ANNIVERSARY_YEAR',
    });
    await spend(api, bank.id, { amount: 500, date: spendDay('12') });

    await page.goto(`/rewards/cards/${card.id}`);
    await expect(page.getByText(/Some statement-cycle caps fell back to calendar months/)).toBeVisible({ timeout: 45_000 });

    await page.goto(`/rewards/cards/${bank.id}`);
    await expect(page.getByText(/Some anniversary-year windows fell back to calendar years/)).toBeVisible({ timeout: 45_000 });
  });

  test('rules: card switch, + opens Add rule, create, edit, clone, End & clone, delete with toasts', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: cardA } = await createRewardCard(api, { name: 'Ds Rules Card A', anniversaryDate: anniversary() });
    const { account: cardB } = await createRewardCard(api, { name: 'Ds Rules Card B', anniversaryDate: anniversary() });
    await createRewardRule(api, cardB.id, { name: 'Ds B Rule', percentRate: 1 });
    // Started well before today, so End & clone is allowed.
    await createRewardRule(api, cardA.id, { name: 'Ds Ending Rule', percentRate: 1, activeFrom: '2025-01-01' });

    await page.goto(`/rewards/rules?account=${cardA.id}`);
    await expect(page.getByText('Ds Ending Rule', { exact: true })).toBeVisible({ timeout: 45_000 });

    // Card switch changes the rules shown.
    await page.getByRole('combobox', { name: 'Account', exact: true }).click();
    await page.getByRole('option', { name: 'Ds Rules Card B' }).click();
    await expect(page).toHaveURL(new RegExp(`account=${cardB.id}`));
    await expect(page.getByText('Ds B Rule', { exact: true })).toBeVisible();
    await expect(page.getByText('Ds Ending Rule', { exact: true })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Account', exact: true }).click();
    await page.getByRole('option', { name: 'Ds Rules Card A' }).click();
    await expect(page.getByText('Ds Ending Rule', { exact: true })).toBeVisible();

    // The app bar + opens a new rule.
    await page.getByRole('button', { name: 'Add rule', exact: true }).first().click();
    const create = page.getByRole('dialog', { name: /Add rule/ });
    await expect(create).toBeVisible();
    await create.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Created Rule');
    await create.getByLabel('Rate %').fill('2');
    await create.getByRole('button', { name: 'Save & recompute' }).click();
    await expect(toast(page, 'Rule created')).toBeVisible();
    await expect(create).toHaveCount(0);
    await expect(page.getByText('Ds Created Rule', { exact: true })).toBeVisible();

    // Pressing a row opens a menu: exactly Edit, Clone, End & clone, Delete; Escape closes it.
    await page.getByText('Ds Created Rule', { exact: true }).click();
    await expect(page.getByRole('menuitem')).toHaveText(['Edit', 'Clone', 'End & clone', 'Delete']);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem')).toHaveCount(0);

    // Edit from the row menu.
    await page.getByText('Ds Created Rule', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    const edit = page.getByRole('dialog', { name: /Edit rule/ });
    await expect(edit).toBeVisible();
    await edit.getByLabel('Rate %').fill('3');
    await edit.getByRole('button', { name: 'Save & recompute' }).click();
    await expect(toast(page, 'Rule updated')).toBeVisible();
    await expect(edit).toHaveCount(0);

    // Clone from the row menu opens a prefilled Add rule; save it under a new name.
    await page.getByText('Ds Created Rule', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Clone', exact: true }).click();
    const clone = page.getByRole('dialog', { name: /Add rule/ });
    await expect(clone).toBeVisible();
    await expect(clone.getByLabel('Rate %')).toHaveValue('3');
    await clone.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Cloned Rule');
    await clone.getByRole('button', { name: 'Save & recompute' }).click();
    await expect(toast(page, 'Rule created')).toBeVisible();
    await expect(page.getByText('Ds Cloned Rule', { exact: true })).toBeVisible();

    // End & clone ends the rule today and opens its successor.
    await page.getByText('Ds Ending Rule', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'End & clone', exact: true }).click();
    await expect(toast(page, /"Ds Ending Rule" ended/)).toBeVisible();
    const successor = page.getByRole('dialog', { name: /Add rule/ });
    await expect(successor).toBeVisible();
    await successor.getByRole('button', { name: 'Cancel' }).click();
    await expect(successor).toHaveCount(0);

    // Delete asks first.
    await page.getByText('Ds Cloned Rule', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: /Delete rule "Ds Cloned Rule"/ });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete rule' }).click();
    await expect(toast(page, 'Rule deleted')).toBeVisible();
    await expect(page.getByText('Ds Cloned Rule', { exact: true })).toHaveCount(0);
  });

  test('rules: Reorder dialog moves and saves, and the order survives a reload', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Reorder Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, { name: 'Ds First Rule', percentRate: 1, priority: 20 });
    await createRewardRule(api, card.id, { name: 'Ds Second Rule', percentRate: 2, priority: 10 });

    await page.goto(`/rewards/rules?account=${card.id}`);
    await expect(page.getByText('Ds First Rule', { exact: true })).toBeVisible({ timeout: 45_000 });
    const before = await isAbove(page, 'Ds First Rule', 'Ds Second Rule');
    const [top, bottom] = before ? ['Ds First Rule', 'Ds Second Rule'] : ['Ds Second Rule', 'Ds First Rule'];

    await page.getByRole('button', { name: 'Reorder', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Reorder rules' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: `Move up ${bottom}` }).click();
    await dialog.getByRole('button', { name: 'Save order' }).click();
    await expect(toast(page, 'Rule order saved')).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expect.poll(() => isAbove(page, bottom, top)).toBe(true);

    await page.reload();
    await expect(page.getByText(top, { exact: true })).toBeVisible({ timeout: 45_000 });
    expect(await isAbove(page, bottom, top)).toBe(true);
  });

  test('rules: Test a transaction shows the winning rule; card settings edit the point value', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Settings Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, { name: 'Ds Test Rule', percentRate: 5 });

    await page.goto(`/rewards/rules?account=${card.id}`);
    await expect(page.getByText('Ds Test Rule', { exact: true })).toBeVisible({ timeout: 45_000 });

    await page.getByRole('button', { name: 'Test', exact: true }).click();
    const test1 = page.getByRole('dialog', { name: 'Test a transaction' });
    await expect(test1).toBeVisible();
    await test1.getByRole('textbox', { name: /^Amount/ }).fill('1000');
    await test1.getByRole('button', { name: 'Run test' }).click();
    await expect(test1.getByText('Rule breakdown')).toBeVisible({ timeout: 30_000 });
    await expect(test1.getByText('Ds Test Rule').first()).toBeVisible();
    await test1.getByRole('button', { name: 'Close' }).last().click();
    await expect(test1).toHaveCount(0);

    // A cash card has no point value; switching it to reward points shows the field.
    await expect(page.getByText('Point value', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const settings = page.getByRole('dialog', { name: 'Card settings' });
    await expect(settings).toBeVisible();
    await expect(settings.getByLabel(/^Point value/)).toHaveCount(0);
    await settings.getByRole('combobox', { name: /^Rewards paid as/ }).click();
    await page.getByRole('option', { name: 'Reward points' }).click();
    await settings.getByLabel(/^Point value/).fill('0.5');
    await settings.getByRole('button', { name: 'Save settings' }).click();
    await expect(toast(page, 'Card settings saved')).toBeVisible();
    await expect(page.getByText('₹0.5/pt', { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText('₹0.5/pt', { exact: true })).toBeVisible({ timeout: 45_000 });
  });

  test('rules: caps and milestones (incl. a one-time offer) create, edit and delete', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Caps Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, { name: 'Ds Base Rule', percentRate: 1 });
    await page.goto(`/rewards/rules?account=${card.id}`);
    await expect(page.getByText('Ds Base Rule', { exact: true })).toBeVisible({ timeout: 45_000 });

    // Cap: create, edit, delete.
    await page.getByRole('button', { name: 'Add cap' }).click();
    const newCap = page.getByRole('dialog', { name: 'Add cap' });
    await newCap.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Dining Pool');
    await newCap.getByRole('textbox', { name: /^Cap \(/ }).fill('1000');
    await newCap.getByRole('button', { name: 'Add cap' }).click();
    await expect(toast(page, 'Cap created')).toBeVisible();
    await expect(page.getByText('Ds Dining Pool', { exact: true })).toBeVisible();

    await page.getByText('Ds Dining Pool', { exact: true }).click();
    const editCap = page.getByRole('dialog', { name: /Edit cap/ });
    await editCap.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Dining Pool 2');
    await editCap.getByRole('button', { name: 'Save cap' }).click();
    await expect(toast(page, 'Cap updated')).toBeVisible();
    await expect(page.getByText('Ds Dining Pool 2', { exact: true })).toBeVisible();

    await page.getByText('Ds Dining Pool 2', { exact: true }).click();
    await page.getByRole('dialog', { name: /Edit cap/ }).getByRole('button', { name: 'Delete cap' }).click();
    const confirmCap = page.getByRole('dialog', { name: /Delete cap "/ });
    await expect(confirmCap).toBeVisible();
    await confirmCap.getByRole('button', { name: 'Delete cap' }).click();
    await expect(toast(page, 'Cap deleted')).toBeVisible();
    await expect(page.getByText('Ds Dining Pool 2', { exact: true })).toHaveCount(0);

    // Milestone: a monthly one is created, edited, deleted.
    await page.getByRole('button', { name: 'Add milestone' }).click();
    const newMs = page.getByRole('dialog', { name: 'Add milestone' });
    await newMs.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Quarterly 50k');
    await newMs.getByRole('textbox', { name: /^Threshold/ }).fill('50000');
    await newMs.getByRole('textbox', { name: /^Payout value/ }).fill('2000');
    await newMs.getByRole('button', { name: 'Add milestone' }).click();
    await expect(toast(page, 'Milestone created')).toBeVisible();
    await expect(page.getByText('Ds Quarterly 50k', { exact: true })).toBeVisible();

    await page.getByText('Ds Quarterly 50k', { exact: true }).click();
    const editMs = page.getByRole('dialog', { name: /Edit milestone/ });
    await editMs.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Quarterly 60k');
    await editMs.getByRole('textbox', { name: /^Threshold/ }).fill('60000');
    await editMs.getByRole('button', { name: 'Save milestone' }).click();
    await expect(toast(page, 'Milestone updated')).toBeVisible();
    await expect(page.getByText('Ds Quarterly 60k', { exact: true })).toBeVisible();

    // A one-time welcome offer needs its start and deadline.
    await page.getByRole('button', { name: 'Add milestone' }).click();
    const offer = page.getByRole('dialog', { name: 'Add milestone' });
    await offer.getByRole('textbox', { name: 'Name', exact: true }).fill('Ds Welcome Offer');
    await offer.getByRole('combobox', { name: 'Window' }).click();
    await page.getByRole('option', { name: 'One-time (welcome offer)' }).click();
    await expect(offer.getByText(/The offer period IS the one-time window/)).toBeVisible();
    await offer.getByLabel('Offer start').fill(ddmmyyyy(istToday(-10)));
    await offer.getByLabel('Offer deadline').fill(ddmmyyyy(istToday(60)));
    await offer.getByRole('textbox', { name: /^Threshold/ }).fill('5000');
    await offer.getByRole('textbox', { name: /^Payout value/ }).fill('500');
    await offer.getByRole('button', { name: 'Add milestone' }).click();
    await expect(toast(page, 'Milestone created')).toBeVisible();
    await expect(page.getByText('Ds Welcome Offer', { exact: true })).toBeVisible();

    // Delete both through their dialogs.
    for (const name of ['Ds Welcome Offer', 'Ds Quarterly 60k']) {
      await page.getByText(name, { exact: true }).click();
      await page.getByRole('dialog', { name: /Edit milestone/ }).getByRole('button', { name: 'Delete milestone' }).click();
      const confirm = page.getByRole('dialog', { name: /Delete milestone "/ });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Delete milestone' }).click();
      await expect(toast(page, 'Milestone deleted')).toBeVisible();
      await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    }
  });

  test('Which card?: ranks cards by amount and category, Best badge, breakdown dialog, bare card and assumed point value notes', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const dining = await createCategory(api, 'Ds Dining');
    const { account: best } = await createRewardCard(api, { name: 'Ds Dining Card', anniversaryDate: anniversary() });
    await createRewardRule(api, best.id, { name: 'Ds 5% Dining', percentRate: 5, categoryIds: [dining.id] });
    const { account: flat } = await createRewardCard(api, { name: 'Ds Flat Card', anniversaryDate: anniversary() });
    await createRewardRule(api, flat.id, { name: 'Ds 2% Flat', percentRate: 2 });
    const { account: points } = await createRewardCard(api, { name: 'Ds Points Card', anniversaryDate: anniversary() });
    await createRewardRule(api, points.id, {
      name: 'Ds Points Slab',
      accrualType: 'SLAB',
      rewardType: 'POINTS',
      slabSize: 100,
      pointsPerSlab: 1,
      percentRate: undefined,
    });
    await createRewardCard(api, { name: 'Ds Bare Card', anniversaryDate: anniversary() });

    await page.goto('/rewards/which-card');
    await expect(page.getByText('Enter the spend details above')).toBeVisible({ timeout: 45_000 });

    // More options reveals the extra fields.
    await page.getByRole('button', { name: 'More options' }).click();
    await expect(page.getByRole('textbox', { name: /^Merchant/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^MCC/ })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Cards to compare/ })).toBeVisible();
    await expect(page.getByText('EMI transaction')).toBeVisible();
    await expect(page.getByText('International', { exact: true })).toBeVisible();

    await page.getByRole('textbox', { name: /^Amount/ }).fill('1000');
    await page.getByRole('combobox', { name: 'What' }).click();
    await page.getByRole('option', { name: 'Ds Dining' }).click();
    await page.getByRole('button', { name: 'Rank cards' }).click();

    await expect(page.getByText(/Ranked for ₹1,000 ds dining/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('4 cards evaluated')).toBeVisible();
    await expect(page.getByText('Best', { exact: true })).toBeVisible();
    // 5% of 1,000 beats 2%.
    expect(await isAbove(page, 'Ds Dining Card', 'Ds Flat Card')).toBe(true);
    await expect(page.getByText(/₹50/).first()).toBeVisible();
    await expect(page.getByText('No reward rules configured')).toBeVisible();
    await expect(page.getByText(/Assumed ₹0\.25\/pt/)).toBeVisible();
    await expect(page.getByText('Assumptions')).toBeVisible();

    // A tap on a result opens its breakdown.
    await page.getByText('Ds Dining Card', { exact: true }).click();
    const dialog = page.getByRole('dialog', { name: /Ds Dining Card/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Rule breakdown')).toBeVisible();
    await expect(dialog.getByText(/Ds 5% Dining/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('/ds Rewards, phone 390px (@ui @mobile)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-rewards-m');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('rules stack, a row tap opens the row menu with Clone, and dialogs open as sheets; a Which card? result opens its breakdown', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const { account: card } = await createRewardCard(api, { name: 'Ds Phone Card', anniversaryDate: anniversary() });
    await createRewardRule(api, card.id, { name: 'Ds Phone Rule', percentRate: 2, activeFrom: '2025-01-01' });
    await createRewardRule(api, card.id, { name: 'Ds Phone Rule 2', percentRate: 1, activeFrom: '2025-01-01' });

    await page.goto(`/rewards/rules?account=${card.id}`);
    await expect(page.getByText('Ds Phone Rule', { exact: true })).toBeVisible({ timeout: 45_000 });
    // No ⋮ menu or table header on phone, and no links on the rows: a tap opens the row menu.
    await expect(page.getByRole('button', { name: 'Actions for Ds Phone Rule' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(2); // Card settings and its Anniversary link only
    await expect(page.getByRole('button', { name: 'Clone', exact: true })).toHaveCount(0);

    await page.getByText('Ds Phone Rule', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Clone', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: /Add rule/ });
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    // A phone sheet is as wide as the screen and sits against its bottom edge.
    expect(box!.width).toBeGreaterThan(370);
    expect(box!.y + box!.height).toBeGreaterThan(800);
    await expect(sheet.getByRole('button', { name: 'Save & recompute' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toHaveCount(0);

    await page.goto('/rewards/which-card');
    await expect(page.getByText('Enter the spend details above')).toBeVisible({ timeout: 45_000 });
    await page.getByRole('textbox', { name: /^Amount/ }).fill('1000');
    await page.getByRole('button', { name: 'Rank cards' }).click();
    await expect(page.getByText('Best', { exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByText('Ds Phone Card', { exact: true }).click();
    const breakdown = page.getByRole('dialog', { name: /Ds Phone Card/ });
    await expect(breakdown).toBeVisible();
    await expect(breakdown.getByText('Rule breakdown')).toBeVisible();
  });
});
