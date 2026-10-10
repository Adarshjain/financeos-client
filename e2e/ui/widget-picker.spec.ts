import type { Locator, Page } from '@playwright/test';

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

const CATEGORY_LABELS = ['All', 'Overview', 'Cards & rewards', 'Spending', 'Investments', 'Loans & lending', 'Shortcuts', 'Your reports'];

const dialog = (page: Page) => page.getByRole('dialog');
const card = (page: Page, key: string) => dialog(page).getByTestId(`builtin-card-${key}`);
const builtinCards = (page: Page) => dialog(page).locator('[data-testid^="builtin-card-"]');

async function openPicker(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add widget', exact: true }).click();
  await expect(dialog(page).getByRole('heading', { name: 'Add a widget' })).toBeVisible();
}

/** A widget card in edit mode, found by its title input's placeholder (the built-in's label). */
function editCard(page: Page, label: string): Locator {
  return page.getByTestId('dashboard-widget').filter({ has: page.getByPlaceholder(label, { exact: true }) });
}

/** A widget card in view mode, found by its title heading. */
function viewCard(page: Page, title: string): Locator {
  return page.getByTestId('dashboard-widget').filter({ has: page.getByRole('heading', { name: title, level: 3, exact: true }) });
}

async function newDashboard(page: Page, name: string): Promise<void> {
  await page.goto('/dashboards/new');
  await page.getByPlaceholder('Dashboard name').fill(name);
}

/** Picks a built-in and confirms its details step as it stands. */
async function addBuiltin(page: Page, key: string, label: string): Promise<void> {
  await openPicker(page);
  await card(page, key).click();
  await expect(dialog(page).getByRole('heading', { name: label })).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Add widget' }).click();
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

  test('@mobile categories, search, descriptions, no width or "Added" badges, and unavailable cards disabled with the reason', async ({ page }) => {
    // An account but no card: account widgets are usable, card widgets are not.
    await createBankAccount(api, { name: 'Picker Only Bank', openingBalance: 1000 });
    await newDashboard(page, 'Picker board');
    await openPicker(page);

    const nav = dialog(page).getByRole('navigation', { name: 'Widget categories' });
    await expect(nav.getByRole('button')).toHaveText(CATEGORY_LABELS);
    await expect(nav.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    // All: every built-in, each with its full description; reports below under their own heading.
    await expect(builtinCards(page)).toHaveCount(BUILTIN_KEYS.length);
    await expect(dialog(page).getByRole('heading', { name: 'Built-in', exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('heading', { name: 'Your reports', exact: true })).toBeVisible();
    await expect(card(page, 'emergency_fund')).toContainText('Emergency fund');
    await expect(card(page, 'emergency_fund')).toContainText(
      'How many months your bank and cash balances would cover at your usual monthly outflow'
    );
    await expect(dialog(page).getByText(/Added ×|×\s?\d/)).toHaveCount(0);
    await expect(dialog(page).getByText(/^(Half|Full|Quarter)( width)?$/)).toHaveCount(0);

    // Unavailable: dimmed, says why, cannot be picked. Available ones can.
    await expect(card(page, 'card_utilisation')).toBeDisabled();
    await expect(card(page, 'card_utilisation')).toContainText('Add a credit card first');
    await expect(card(page, 'tax_harvest')).toBeDisabled();
    await expect(card(page, 'tax_harvest')).toContainText('Add an investment first');
    await expect(card(page, 'loan_payoff')).toContainText('Add a loan first');
    await expect(card(page, 'lending_balances')).toContainText('Record a lending first');
    await expect(card(page, 'spend_heatmap')).toBeEnabled();
    await expect(card(page, 'account_tile')).toBeEnabled();
    await expect(card(page, 'shortcuts')).toBeEnabled();
    await expect(card(page, 'spend_heatmap')).not.toContainText('Add an account first');

    // A category narrows the built-ins and hides reports.
    await nav.getByRole('button', { name: 'Investments' }).click();
    await expect(nav.getByRole('button', { name: 'Investments' })).toHaveAttribute('aria-pressed', 'true');
    await expect(builtinCards(page)).toHaveCount(4);
    for (const key of ['portfolio_snapshot', 'top_movers', 'allocation', 'tax_harvest']) {
      await expect(card(page, key)).toBeVisible();
    }
    await expect(dialog(page).getByText('No saved reports yet.', { exact: false })).toHaveCount(0);
    await nav.getByRole('button', { name: 'Cards & rewards' }).click();
    await expect(builtinCards(page)).toHaveCount(5);
    await nav.getByRole('button', { name: 'Shortcuts' }).click();
    await expect(builtinCards(page)).toHaveCount(1);
    await expect(card(page, 'shortcuts')).toBeVisible();

    // Your reports: no built-ins, and the pointer to create one.
    await nav.getByRole('button', { name: 'Your reports' }).click();
    await expect(builtinCards(page)).toHaveCount(0);
    await expect(dialog(page).getByText(/No saved reports yet/)).toBeVisible();

    // Search matches labels and descriptions, within the chosen category.
    await nav.getByRole('button', { name: 'All' }).click();
    const search = dialog(page).getByRole('searchbox', { name: 'Search widgets' });
    await search.fill('calendar');
    await expect(builtinCards(page)).toHaveCount(1);
    await expect(card(page, 'spend_heatmap')).toBeVisible();
    await search.fill('settle up');
    await expect(builtinCards(page)).toHaveCount(1);
    await expect(card(page, 'lending_balances')).toBeVisible();
    await search.fill('zzz no such widget');
    await expect(dialog(page).getByText('No widgets match.')).toBeVisible();
    await search.fill('');
    await expect(builtinCards(page)).toHaveCount(BUILTIN_KEYS.length);
  });

  test('@mobile the details step: description, needs line, "Preview · sample data" above the frame, settings, Back', async ({ page }) => {
    await createBankAccount(api, { name: 'Details Bank', openingBalance: 1000 });
    await newDashboard(page, 'Details board');
    await openPicker(page);
    await card(page, 'spend_heatmap').click();

    const d = dialog(page);
    await expect(d.getByRole('heading', { name: 'Spending calendar' })).toBeVisible();
    await expect(d.getByText('Daily spending as a calendar, darker on heavier days.', { exact: false })).toBeVisible();
    await expect(d.getByText('Needs an account', { exact: true })).toBeVisible();

    // The caption sits outside, above, the preview's frame.
    const caption = d.getByText('Preview · sample data', { exact: true });
    const frame = d.getByTestId('widget-preview-frame');
    await expect(caption).toBeVisible();
    await expect(frame).toBeVisible();
    await expect(frame.getByText('Preview · sample data')).toHaveCount(0);
    const c = (await caption.boundingBox())!;
    const f = (await frame.boundingBox())!;
    expect(c.y + c.height).toBeLessThanOrEqual(f.y + 1);

    // Its setting, bounded and defaulted from the catalog.
    const months = d.getByLabel('Months');
    await expect(months).toHaveValue('6');
    await expect(d.getByText('Between 1 and 12.')).toBeVisible();
    await months.fill('13');
    await expect(d.getByText('At most 12')).toBeVisible();
    await expect(d.getByRole('button', { name: 'Add widget' })).toBeDisabled();
    await months.fill('4');
    await expect(d.getByRole('button', { name: 'Add widget' })).toBeEnabled();

    // Back returns to the list without adding anything.
    await d.getByRole('button', { name: 'Back' }).click();
    await expect(d.getByRole('heading', { name: 'Add a widget' })).toBeVisible();

    // A built-in without settings still previews before it is added.
    await card(page, 'emergency_fund').click();
    await expect(d.getByRole('heading', { name: 'Emergency fund' })).toBeVisible();
    await expect(d.getByText('Preview · sample data', { exact: true })).toBeVisible();
    await expect(d.getByRole('spinbutton')).toHaveCount(0);
    await expect(d.getByRole('button', { name: 'Add widget' })).toBeEnabled();
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
    for (const [key, label] of components) {
      await addBuiltin(page, key, label);
    }

    // The account tile needs its account before it can be added.
    await openPicker(page);
    await card(page, 'account_tile').click();
    const add = dialog(page).getByRole('button', { name: 'Add widget' });
    await expect(add).toBeDisabled();
    await dialog(page).getByLabel('Account', { exact: true }).click();
    await expect(page.getByRole('option', { name: 'All accounts' })).toHaveCount(0);
    await page.getByRole('option', { name: 'Picker Bank' }).click();
    await expect(add).toBeEnabled();
    await add.click();
    await expect(dialog(page)).toHaveCount(0);

    await expect(page.getByLabel('Widget title')).toHaveCount(components.length + 1);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/dashboards\/[a-f0-9-]+$/);
    await expect(page.getByRole('heading', { name: 'Every component', level: 1 })).toBeVisible();

    const bodies: Record<string, string> = {
      Inbox: 'inbox-widget',
      'Bills due': 'bills-due-widget',
      'Card utilisation': 'card-utilisation-widget',
      Portfolio: 'portfolio-snapshot-widget',
      'Top movers': 'top-movers-widget',
      'Tax harvesting': 'tax-harvest-widget',
      'Loan payoff': 'loan-payoff-widget',
      'Lending balances': 'lending-balances-widget',
      'Emergency fund': 'emergency-fund-widget',
      Shortcuts: 'shortcuts-widget',
      Account: 'account-tile-widget',
    };
    for (const [title, testId] of Object.entries(bodies)) {
      const w = viewCard(page, title);
      await expect(w.getByTestId(testId), title).toBeVisible();
      await expect(w.getByRole('alert'), title).toHaveCount(0);
    }
    // Loaded with the seeded data.
    await expect(viewCard(page, 'Lending balances')).toContainText('Picker Friend');
    await expect(viewCard(page, 'Loan payoff')).toContainText('Picker Loan');
    await expect(viewCard(page, 'Card utilisation').getByTestId('utilisation-row')).toContainText('Picker Card');
    await expect(viewCard(page, 'Account').getByTestId('account-tile')).toContainText('Picker Bank');
    await expect(viewCard(page, 'Shortcuts').getByRole('list', { name: 'Shortcuts' }).getByRole('listitem')).toHaveCount(4);

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

  test('the width toggle cycles quarter → half → full only for quarter-capable tiles; others toggle half ↔ full', async ({ page }) => {
    test.slow();
    await seedEverything(api);
    await newDashboard(page, 'Widths');
    await addBuiltin(page, 'shortcuts', 'Shortcuts');
    await addBuiltin(page, 'card_utilisation', 'Card utilisation');
    await addBuiltin(page, 'emergency_fund', 'Emergency fund');

    const shortcuts = editCard(page, 'Shortcuts');
    await expect(shortcuts.getByTitle('Expand to half width')).toBeVisible();
    await shortcuts.getByTitle('Expand to half width').click();
    await expect(shortcuts.getByTitle('Expand to full width')).toBeVisible();
    await shortcuts.getByTitle('Expand to full width').click();
    await expect(shortcuts.getByTitle('Collapse to quarter width')).toBeVisible();
    await shortcuts.getByTitle('Collapse to quarter width').click();
    await expect(shortcuts.getByTitle('Expand to half width')).toBeVisible();

    // A half-minimum widget never offers a quarter.
    for (const label of ['Card utilisation', 'Emergency fund']) {
      const w = editCard(page, label);
      await expect(w.getByTitle('Expand to full width')).toBeVisible();
      await w.getByTitle('Expand to full width').click();
      await expect(w.getByTitle('Collapse to half width')).toBeVisible();
      await expect(w.getByTitle(/quarter/)).toHaveCount(0);
    }
    await editCard(page, 'Emergency fund').getByTitle('Collapse to half width').click();

    // Shortcuts to half, then save: the widths persist.
    await shortcuts.getByTitle('Expand to half width').click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/dashboards\/[a-f0-9-]+$/);
    const saved = (await api.GET('/api/v1/dashboards')).data!.find((d) => d.name === 'Widths')!;
    const width = (key: string) => saved.widgets.find((w) => w.builtinKey === key)!.layout.w;
    expect(width('shortcuts')).toBe(50);
    expect(width('card_utilisation')).toBe(100);
    expect(width('emergency_fund')).toBe(50);

    // The account tile cycles the same way in an existing dashboard's editor.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await openPicker(page);
    await card(page, 'account_tile').click();
    await dialog(page).getByLabel('Account', { exact: true }).click();
    await page.getByRole('option', { name: 'Picker Bank' }).click();
    await dialog(page).getByRole('button', { name: 'Add widget' }).click();
    const tile = editCard(page, 'Account');
    await expect(tile.getByTitle('Expand to half width')).toBeVisible();
    await tile.getByTitle('Expand to half width').click();
    await tile.getByTitle('Expand to full width').click();
    await expect(tile.getByTitle('Collapse to quarter width')).toBeVisible();
  });
});
