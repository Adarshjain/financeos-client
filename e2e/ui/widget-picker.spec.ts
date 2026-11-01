import type { Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createBrokerAccount } from '../fixtures/seed/accounts';
import { generateIsin, resolveInstrument, trade, uniqueSeedSuffix } from '../fixtures/seed/investments';
import { addLending, createLoan } from '../fixtures/seed/loans';
import { seedCardBill } from '../fixtures/seed/obligations';
import { BUILTIN_KEYS } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';

const dialog = (page: Page) => page.getByRole('dialog', { name: /Add widget/ });
/** A built-in's card, found by its label at the start of its radio's name. */
const card = (page: Page, label: string) => dialog(page).getByRole('radio', { name: new RegExp(`^${label}`) });
const builtinCards = (page: Page) => dialog(page).getByRole('radio');

async function openPicker(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Add widget$|^Add a widget$/ }).first().click();
  await expect(dialog(page)).toBeVisible();
  await expect(builtinCards(page).first()).toBeVisible({ timeout: 45_000 });
}

async function newDashboard(page: Page, name: string): Promise<void> {
  await page.goto('/dashboards/new');
  await page.getByLabel('Dashboard name').fill(name);
}

/** Picks a built-in and adds it as it stands. */
async function addBuiltin(page: Page, label: string): Promise<void> {
  await openPicker(page);
  await card(page, label).click();
  await dialog(page).getByRole('button', { name: 'Add to board' }).click();
  await expect(dialog(page)).toHaveCount(0);
}

/** One of everything a built-in can need: an account, a card, a holding, a loan and a lending. */
async function seedEverything(api: ApiClient): Promise<{ bankId: string }> {
  const bank = await createBankAccount(api, { name: 'Picker Bank', openingBalance: 25000 });
  await seedCardBill(api, { name: 'Picker Card', last4: '7701', dueInDays: 6 });
  const broker = await createBrokerAccount(api, { name: 'Picker Broker', cashBalance: 0 });
  const stock = await resolveInstrument(api, { type: 'stock', name: `Picker Stock ${uniqueSeedSuffix()}`, isin: generateIsin() });
  await trade(api, { brokerAccountId: broker.id, instrumentId: stock.id, type: 'buy', quantity: 2, price: 100, tradeDate: istToday(-20) });
  await createLoan(api, { name: 'Picker Loan', startDate: istToday(-40), firstEmiDate: istToday(-10) });
  await addLending(api, { newCounterpartyName: 'Picker Friend', direction: 'lent', amount: 1500, entryDate: istToday(-5) });
  return { bankId: bank.id };
}

test.describe('Add widget picker (@ui)', () => {
  let currentUser: CreatedUser;
  let api: ApiClient;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-widget-picker');
    api = makeApi(currentUser.cookie);
    await loginContext(context, currentUser.cookie);
  });

  test('@mobile search, descriptions, and unavailable cards disabled with the reason', async ({ page }) => {
    // An account but no card: account widgets are usable, card widgets are not.
    await createBankAccount(api, { name: 'Picker Only Bank', openingBalance: 1000 });
    await newDashboard(page, 'Picker board');
    await openPicker(page);

    // Built-in tab lists every built-in with its description.
    await expect(builtinCards(page)).toHaveCount(BUILTIN_KEYS.length);
    await expect(card(page, 'Emergency fund')).toContainText(
      'How many months your bank and cash balances would cover at your usual monthly outflow'
    );

    // Unavailable: disabled, says why, cannot be picked. Available ones can.
    await expect(card(page, 'Card utilisation')).toBeDisabled();
    await expect(card(page, 'Card utilisation')).toContainText('Add a credit card first');
    await expect(card(page, 'Tax harvesting')).toBeDisabled();
    await expect(card(page, 'Tax harvesting')).toContainText('Add an investment first');
    await expect(card(page, 'Loan payoff')).toContainText('Add a loan first');
    await expect(card(page, 'Lending balances')).toContainText('Record a lending first');
    await expect(card(page, 'Spending calendar')).toBeEnabled();
    await expect(card(page, 'Account')).toBeEnabled();
    await expect(card(page, 'Shortcuts')).toBeEnabled();
    await expect(card(page, 'Spending calendar')).not.toContainText('Add an account first');

    // Your reports: no built-ins, and the pointer to create one.
    await dialog(page).getByRole('tab', { name: /My reports/ }).click();
    await expect(builtinCards(page)).toHaveCount(0);
    await expect(dialog(page).getByText(/No saved reports yet/)).toBeVisible();

    // Search matches labels and descriptions.
    await dialog(page).getByRole('tab', { name: /Built-in/ }).click();
    const search = dialog(page).getByRole('searchbox', { name: 'Search widgets' }).or(dialog(page).getByPlaceholder('Search widgets'));
    await search.fill('calendar');
    await expect(builtinCards(page)).toHaveCount(1);
    await expect(card(page, 'Spending calendar')).toBeVisible();
    await search.fill('settle up');
    await expect(builtinCards(page)).toHaveCount(1);
    await expect(card(page, 'Lending balances')).toBeVisible();
    await search.fill('zzz no such widget');
    await expect(dialog(page).getByText('No widgets match')).toBeVisible();
    await search.fill('');
    await expect(builtinCards(page)).toHaveCount(BUILTIN_KEYS.length);
  });

  test('@mobile a built-in’s settings: bounded and defaulted from the catalog, Add to board waits for a valid value', async ({ page }) => {
    await createBankAccount(api, { name: 'Details Bank', openingBalance: 1000 });
    await newDashboard(page, 'Details board');
    await openPicker(page);
    const add = dialog(page).getByRole('button', { name: 'Add to board' });
    await expect(add).toBeDisabled();
    await card(page, 'Spending calendar').click();

    const d = dialog(page);
    // Its setting, bounded and defaulted from the catalog.
    const months = d.getByRole('spinbutton', { name: 'Months' });
    await expect(months).toHaveValue('6');
    await expect(d.getByText('Between 1 and 12.')).toBeVisible();
    await months.fill('13');
    await expect(add).toBeDisabled();
    await months.fill('4');
    await expect(add).toBeEnabled();

    // A built-in without settings has none to fill in.
    await card(page, 'Emergency fund').click();
    await expect(d.getByRole('spinbutton')).toHaveCount(0);
    await expect(add).toBeEnabled();
  });

  test('adds every component widget to a dashboard; each renders its own body after saving', async ({ page }) => {
    test.slow();
    test.setTimeout(180_000);
    const { bankId } = await seedEverything(api);
    await newDashboard(page, 'Every component');

    const components: Array<[string, string]> = [
      ['attention', 'Inbox'],
      ['bills_due', 'Bills due'],
      ['card_utilisation', 'Card utilisation'],
      ['portfolio_snapshot', 'Portfolio'],
      ['top_movers', 'Top movers'],
      ['tax_harvest', 'Tax harvesting'],
      ['loan_payoff', 'Loan payoff'],
      ['lending_balances', 'Lending balances'],
      ['emergency_fund', 'Emergency fund'],
      ['shortcuts', 'Shortcuts'],
    ];
    for (const [, label] of components) {
      await addBuiltin(page, label);
    }

    // The account tile needs its account before it can be added.
    await openPicker(page);
    await card(page, 'Account').click();
    const add = dialog(page).getByRole('button', { name: 'Add to board' });
    await expect(add).toBeDisabled();
    await dialog(page).getByRole('combobox', { name: /^Account/ }).click();
    await expect(page.getByRole('option', { name: 'All accounts' })).toHaveCount(0);
    await page.getByRole('option', { name: 'Picker Bank' }).click();
    await expect(add).toBeEnabled();
    await add.click();
    await expect(dialog(page)).toHaveCount(0);

    await expect(page.getByTestId('dashboard-widget')).toHaveCount(components.length + 1);
    await page.getByRole('button', { name: 'Add dashboard', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/(?!new)[0-9a-f-]+$/, { timeout: 30_000 });

    const bodies: Record<string, string> = {
      Inbox: 'inbox-widget',
      'Bills due': 'bills-due-widget',
      'Card utilisation': 'card-utilisation-widget',
      Portfolio: 'portfolio-snapshot-widget',
      'Tax harvesting': 'tax-harvest-widget',
      'Loan payoff': 'loan-payoff-widget',
      'Lending balances': 'lending-balances-widget',
      'Emergency fund': 'emergency-fund-widget',
      Shortcuts: 'shortcuts-widget',
      Account: 'account-tile-widget',
    };
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(components.length + 1, { timeout: 45_000 });
    for (const [title, testId] of Object.entries(bodies)) {
      const body = page.getByTestId(testId);
      await body.scrollIntoViewIfNeeded();
      await expect(body, title).toBeVisible({ timeout: 45_000 });
      await expect(body.getByRole('alert'), title).toHaveCount(0);
    }
    // Top movers has no body test id: its card is found by title, and it has loaded without an error.
    const movers = page.getByTestId('dashboard-widget').filter({ hasText: 'Top movers' });
    await expect(movers).toBeVisible();
    await expect(movers.getByRole('alert')).toHaveCount(0);
    // Loaded with the seeded data.
    await expect(page.getByTestId('lending-balances-widget')).toContainText('Picker Friend');
    await expect(page.getByTestId('loan-payoff-widget')).toContainText('Picker Loan');
    await expect(page.getByTestId('card-utilisation-widget')).toContainText('Picker Card');
    await expect(page.getByTestId('account-tile')).toContainText('Picker Bank');
    const tiles = page.getByTestId('shortcuts-widget');
    await expect(tiles.getByRole('button', { name: 'Add transaction' })).toBeVisible();
    await expect(tiles.getByRole('link')).toHaveText(['Needs review', 'Import', 'Upcoming']);

    const saved = (await api.GET('/api/v1/dashboards')).data!.find((d) => d.name === 'Every component')!;
    expect(saved.widgets.map((w) => w.builtinKey).sort()).toEqual([...components.map(([k]) => k), 'account_tile'].sort());
    expect(saved.widgets.find((w) => w.builtinKey === 'account_tile')!.params).toEqual({ accountId: bankId });
    // Quarter-width tiles start at a quarter; the rest at their minimum.
    const width = (key: string) => saved.widgets.find((w) => w.builtinKey === key)!.layout.w;
    expect(width('account_tile')).toBe(25);
    expect(width('shortcuts')).toBe(25);
    expect(width('card_utilisation')).toBe(50);
    expect(width('bills_due')).toBe(100);
  });

  test('resizing by the corner: quarter-capable tiles step quarter → half → full; a half- or full-minimum widget never goes narrower', async ({ page }) => {
    test.slow();
    await seedEverything(api);
    await newDashboard(page, 'Widths');
    await addBuiltin(page, 'Shortcuts');
    await addBuiltin(page, 'Card utilisation');
    await addBuiltin(page, 'Emergency fund');
    await addBuiltin(page, 'Bills due');

    const items = page.locator('[data-widget-grid-item]');
    await expect(items).toHaveCount(4);
    const gridWidth = async () => (await page.locator('[data-editing="true"]').boundingBox())!.width;
    const widths = () => items.evaluateAll((els) => els.map((el) => el.getAttribute('data-width')));
    expect(await widths()).toEqual(['quarter', 'half', 'half', 'full']);

    /** Drags item `i`'s corner so the item is `fraction` of the grid wide. */
    const resizeTo = async (i: number, fraction: number) => {
      const item = items.nth(i);
      await item.scrollIntoViewIfNeeded();
      const box = (await item.boundingBox())!;
      const handle = item.locator('[data-widget-grid-resize]');
      const h = (await handle.boundingBox())!;
      const at = { x: h.x + h.width / 2, y: h.y + h.height / 2 };
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(at.x + ((await gridWidth()) * fraction - box.width), at.y, { steps: 12 });
      await page.waitForTimeout(150);
      await page.mouse.up();
    };

    // Shortcuts: quarter → half → full → quarter.
    await resizeTo(0, 0.5);
    await expect(items.nth(0)).toHaveAttribute('data-width', 'half');
    await resizeTo(0, 1);
    await expect(items.nth(0)).toHaveAttribute('data-width', 'full');
    await resizeTo(0, 0.25);
    await expect(items.nth(0)).toHaveAttribute('data-width', 'quarter');

    // A half-minimum widget never offers a quarter, and a full-minimum one never gets narrower.
    await resizeTo(1, 0.25);
    await expect(items.nth(1)).toHaveAttribute('data-width', 'half');
    await resizeTo(1, 1);
    await expect(items.nth(1)).toHaveAttribute('data-width', 'full');
    await resizeTo(1, 0.5);
    await expect(items.nth(1)).toHaveAttribute('data-width', 'half');
    await resizeTo(3, 0.5);
    await expect(items.nth(3)).toHaveAttribute('data-width', 'full');

    // Shortcuts to half, then save: the widths persist.
    await resizeTo(0, 0.5);
    await expect(items.nth(0)).toHaveAttribute('data-width', 'half');
    await page.getByRole('button', { name: 'Add dashboard', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/(?!new)[0-9a-f-]+$/, { timeout: 30_000 });
    const saved = (await api.GET('/api/v1/dashboards')).data!.find((d) => d.name === 'Widths')!;
    const width = (key: string) => saved.widgets.find((w) => w.builtinKey === key)!.layout.w;
    expect(width('shortcuts')).toBe(50);
    expect(width('card_utilisation')).toBe(50);
    expect(width('emergency_fund')).toBe(50);
    expect(width('bills_due')).toBe(100);
  });
});
