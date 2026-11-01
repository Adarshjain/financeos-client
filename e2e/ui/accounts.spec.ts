import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createCreditCard } from '../fixtures/seed/accounts';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

/** A list row: the row is one button named by its cells. */
const accountRow = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(name) });
const dialogOf = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name });

/** Picks a bank in the account form's searchable Bank select. */
async function pickBank(page: Page, dialog: ReturnType<typeof dialogOf>, bank: string) {
  await dialog.getByRole('combobox', { name: /^Bank/ }).click();
  await page.getByRole('option', { name: bank }).click();
}

test.describe('Accounts UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    // Unique user per UI test for isolation
    currentUser = await createUser(request, 'ui-accounts');
    await loginContext(context, currentUser.cookie);
  });

  test('create bank account and credit card, verify rows not blank (@mobile)', async ({ page }) => {
    await page.goto('/accounts');

    // 1. Create a Bank Account via the empty state's Add account
    await page.getByRole('button', { name: 'Add account', exact: true }).first().click();
    const bankDialog = dialogOf(page, 'Add account');
    await expect(bankDialog).toBeVisible();

    // Default type is Bank: bank accounts can be fed by Gmail, so the watermark field is offered
    await expect(bankDialog.getByRole('textbox', { name: /^Import emails from/ })).toBeVisible();
    await bankDialog.getByRole('textbox', { name: /^Account name/ }).fill('HDFC Salary Account');
    await pickBank(page, bankDialog, 'HDFC Bank');
    await bankDialog.getByRole('textbox', { name: /^Opening balance/ }).fill('15000');
    await bankDialog.getByRole('textbox', { name: /^Last 4 digits/ }).fill('1234');
    await bankDialog.getByRole('button', { name: 'Add account' }).click();

    // Creating opens the new account's page
    await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('banner').getByText('HDFC Salary Account', { exact: true })).toBeVisible();

    // The list row renders with name and last 4 (prevent asChild regression)
    await page.goto('/accounts');
    const bankRow = accountRow(page, 'HDFC Salary Account');
    await expect(bankRow).toBeVisible();
    await expect(bankRow.getByText('••1234')).toBeVisible();

    // 2. Create a Credit Card from the Credit cards section
    await page.getByRole('button', { name: 'Add credit card' }).click();
    const cardDialog = dialogOf(page, 'Add account');
    await expect(cardDialog).toBeVisible();
    await expect(cardDialog.getByRole('radio', { name: 'Credit card' })).toBeChecked();
    await cardDialog.getByRole('textbox', { name: /^Account name/ }).fill('Infinia Visa');
    await pickBank(page, cardDialog, 'HDFC Bank');
    await cardDialog.getByRole('textbox', { name: /^Last 4 digits/ }).fill('9876');
    await cardDialog.getByRole('textbox', { name: /^Card anniversary/ }).fill('01042024');
    await cardDialog.getByRole('textbox', { name: /^Credit limit/ }).fill('500000');
    await cardDialog.getByRole('button', { name: 'Add account' }).click();

    await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('banner').getByText('Infinia Visa', { exact: true })).toBeVisible();

    await page.goto('/accounts');
    const cardRow = accountRow(page, 'Infinia Visa');
    await expect(cardRow).toBeVisible();
    await expect(cardRow.getByText('••9876')).toBeVisible();
  });

  test('edit account name and identifiers, cards (add, replace, close), close and reopen account, delete empty account', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const card = await createCreditCard(api, {
      name: 'Regalia Gold',
      last4: '5555',
      creditLimit: 300000,
      anniversaryDate: '2024-05-01',
      bank: 'hdfc',
    });

    // 1. Edit account: from the account page
    await page.goto(`/accounts/${card.id}`);
    await expect(page.getByRole('banner').getByText('Regalia Gold', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const edit = dialogOf(page, 'Edit account');
    await expect(edit).toBeVisible();
    await edit.getByRole('textbox', { name: /^Account name/ }).fill('Regalia Gold Premium');

    // 1b. Email identifier aliases live in the edit dialog: add one, remove it (both apply on save)
    const identifiers = edit.getByRole('combobox', { name: /^Account identifiers/ });
    await identifiers.click();
    await page.keyboard.type(' 55 12 ');
    await page.keyboard.press('Enter');
    await expect(edit.getByText('5512', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await identifiers.click();
    await page.getByRole('option', { name: '5512' }).click();
    await page.keyboard.press('Escape');
    await expect(edit.getByText('5512', { exact: true })).not.toBeVisible();

    await edit.getByRole('button', { name: 'Save account' }).click();
    await expectToast(page, 'Account updated');
    await expect(edit).not.toBeVisible();

    // Updated name reflects in the list
    await page.goto('/accounts');
    await expect(accountRow(page, 'Regalia Gold Premium')).toBeVisible();

    // 2. Cards tab: add an add-on cardholder, replace its card, close the replaced card
    await page.goto(`/accounts/${card.id}/cards`);
    await page.getByRole('button', { name: 'Add add-on cardholder' }).click();
    const addHolder = dialogOf(page, 'Add add-on cardholder');
    await addHolder.getByRole('textbox', { name: /^Name/ }).fill('Sam Addon');
    await addHolder.getByRole('textbox', { name: /^Opened on/ }).fill('01052024');
    await addHolder.getByRole('textbox', { name: /^Last 4 digits/ }).fill('8888');
    await addHolder.getByRole('button', { name: 'Add cardholder' }).click();
    await expect(addHolder).not.toBeVisible();

    const sam = page.locator('main').getByText('Sam Addon').first();
    await expect(sam).toBeVisible();
    await expect(page.getByText('••8888').first()).toBeVisible();

    // Replace card on Sam Addon's plastic
    await page.getByRole('button', { name: 'Replace' }).last().click();
    const replace = dialogOf(page, /Replace card/);
    await replace.getByRole('textbox', { name: /^New last 4 digits/ }).fill('8889');
    await replace.getByRole('button', { name: /Replace card|Confirm/ }).last().click();
    await expect(replace).not.toBeVisible();

    // New card appears and the old one stays as history
    await expect(page.getByText('••8889').first()).toBeVisible();
    await expect(page.getByText('Replaced', { exact: true }).first()).toBeVisible();

    // Close the new plastic
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
    const closeCard = dialogOf(page, /Close card/);
    await closeCard.getByRole('button', { name: 'Close card' }).click();
    await expect(closeCard).not.toBeVisible();
    // Sam has no active plastic left: both his cards read as history and only the primary keeps Replace / Close
    await expect(page.getByText('Replaced', { exact: true })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Replace', exact: true })).toHaveCount(1);

    // 3. Close account: from the edit dialog
    await page.goto(`/accounts/${card.id}`);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const closing = dialogOf(page, 'Edit account');
    await closing.getByRole('button', { name: /Close (account|card)/ }).click();
    await expectToast(page, 'Account closed');
    await expect(closing).not.toBeVisible();

    // Closed account moves behind the section's closed line
    await page.goto('/accounts');
    await expect(accountRow(page, 'Regalia Gold Premium')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show' }).first().click();
    await expect(accountRow(page, 'Regalia Gold Premium')).toBeVisible();

    // 4. Reopen account
    await page.goto(`/accounts/${card.id}`);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const reopening = dialogOf(page, 'Edit account');
    await reopening.getByRole('button', { name: /Reopen/ }).click();
    await expectToast(page, 'Account reopened');
    await expect(reopening).not.toBeVisible();

    // Account is back in the open rows
    await page.goto('/accounts');
    await expect(accountRow(page, 'Regalia Gold Premium')).toBeVisible();

    // 5. Delete empty account: create a fresh wallet to delete
    await page.getByRole('button', { name: 'Add wallet' }).click();
    const wallet = dialogOf(page, 'Add account');
    await expect(wallet.getByRole('radio', { name: 'Wallet / cash' })).toBeChecked();
    // Wallet / cash accounts are manual: no Gmail watermark field
    await expect(wallet.getByRole('textbox', { name: /^Import emails from/ })).toHaveCount(0);
    await wallet.getByRole('textbox', { name: /^Account name/ }).fill('Temp Petty Cash');
    await wallet.getByRole('button', { name: 'Add account' }).click();
    await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('banner').getByText('Temp Petty Cash', { exact: true })).toBeVisible();

    // A wallet page has no Statements or Cards tab
    await expect(page.getByRole('tab', { name: 'Statements' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Cards' })).toHaveCount(0);

    // Open edit dialog and delete it; deleting there returns to the list
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const del = dialogOf(page, 'Edit account');
    await del.getByRole('button', { name: 'Delete account' }).click();
    const confirm = dialogOf(page, 'Delete Temp Petty Cash?');
    await expect(confirm.getByText(/can't be undone/)).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page).toHaveURL(/\/accounts$/);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(accountRow(page, 'Temp Petty Cash')).toHaveCount(0);
  });
});
