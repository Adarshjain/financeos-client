import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';
import { openAccounts } from '../fixtures/ui';

test.describe('Accounts UI (@ui)', () => {
  test.beforeEach(async ({ context, request }) => {
    // Unique user per UI test for isolation
    const u = await createUser(request, 'ui-accounts');
    await loginContext(context, u.cookie);
  });

  test('create bank account and credit card, verify tiles not blank (@mobile)', async ({ page }) => {
    await openAccounts(page);

    // 1. Create a Bank Account via dialog
    await page.getByRole('button', { name: /Add Account|Get Started/i }).first().click();
    await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible();

    // Default type is Bank
    await page.getByLabel('Account Name').fill('HDFC Salary Account');
    await page.getByLabel('Opening Balance').fill('15000');
    await page.getByLabel('Last 4 Digits').fill('1234');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Tile renders with name and non-blank content (prevent asChild regression)
    const bankTile = page.locator('text=HDFC Salary Account').first();
    await expect(bankTile).toBeVisible();
    await expect(page.getByText('•••• 1234')).toBeVisible();

    // 2. Create a Credit Card via dialog
    await page.getByRole('button', { name: /Add Account/i }).first().click();
    await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible();

    // Select Credit Card type
    await page.getByRole('button', { name: 'Credit Card' }).click();
    await page.getByLabel('Account Name').fill('Infinia Visa');
    await page.getByLabel('Last 4 Digits').fill('9876');
    await page.getByLabel('Credit Limit').fill('500000');
    await page.getByLabel('Card Anniversary Date').fill('2024-04-01');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Verify Credit Card tile renders with name and is not blank
    const ccTile = page.locator('text=Infinia Visa').first();
    await expect(ccTile).toBeVisible();
    await expect(page.getByText('•••• 9876')).toBeVisible();
  });

  test('edit account name, cards dialog (add, replace, close), close and reopen account, delete empty account', async ({
    page,
  }) => {
    await openAccounts(page);

    // Create a Credit Card to use for testing cards dialog, editing, closing, reopening
    await page.getByRole('button', { name: /Add Account|Get Started/i }).first().click();
    await page.getByRole('button', { name: 'Credit Card' }).click();
    await page.getByLabel('Account Name').fill('Regalia Gold');
    await page.getByLabel('Last 4 Digits').fill('5555');
    await page.getByLabel('Credit Limit').fill('300000');
    await page.getByLabel('Card Anniversary Date').fill('2024-05-01');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Regalia Gold')).toBeVisible();

    // 1. Edit Account: click tile body to open edit dialog
    await page.getByText('Regalia Gold').click();
    await expect(page.getByLabel('Account Name')).toBeVisible();
    await page.getByLabel('Account Name').fill('Regalia Gold Premium');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Updated name reflects in tile
    await expect(page.getByText('Regalia Gold Premium')).toBeVisible();

    // 2. Cards Dialog: open cards dialog
    await page.getByRole('button', { name: 'Cards' }).click();
    await expect(page.getByText(/Regalia Gold Premium — Cardholders & Plastics/i)).toBeVisible();

    // Add an Add-on Cardholder
    await page.getByRole('button', { name: 'Add-on Cardholder' }).click();
    await page.getByLabel('Cardholder Person Name').fill('Sam Addon');
    await page.getByLabel('Last 4 Digits').fill('8888');
    await page.getByRole('button', { name: 'Create Add-on Cardholder' }).click();

    // Verify added cardholder appears in list
    await expect(page.getByText('Sam Addon')).toBeVisible();
    await expect(page.getByText('•••• 8888')).toBeVisible();

    // Replace card on Sam Addon's plastic
    await page.getByRole('button', { name: 'Replace' }).last().click();
    await expect(page.getByRole('button', { name: 'Confirm Replacement' })).toBeVisible();
    await page.getByLabel(/New Last 4 Digits/i).fill('8889');
    await page.getByRole('button', { name: 'Confirm Replacement' }).click();

    // Verify new card appears and old card is moved to historical
    await expect(page.getByText('•••• 8889')).toBeVisible();
    await expect(page.getByText(/Replaced \/ Closed Plastics/i)).toBeVisible();

    // Close the replaced card
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(page.getByRole('button', { name: 'Confirm Close Plastic' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Close Plastic' }).click();

    // Verify plastic closed
    await expect(page.getByText(/No active plastic card assigned/i)).toBeVisible();

    // Close cards dialog by pressing Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();

    // 3. Close Account: open edit dialog, close account
    await page.getByText('Regalia Gold Premium').click();
    await page.getByRole('button', { name: 'Close Account' }).click();
    await page.getByRole('button', { name: 'Confirm Close' }).click();

    // Closed account moves into collapsed closed section
    const closedSummary = page.locator('summary').filter({ hasText: /Closed \(\d+\)/ });
    await expect(closedSummary).toBeVisible();

    // Expand closed section and verify account is inside
    await closedSummary.click();
    await expect(page.getByText('Regalia Gold Premium')).toBeVisible();

    // 4. Reopen Account
    await page.getByText('Regalia Gold Premium').click();
    await page.getByRole('button', { name: 'Reopen Account' }).click();

    // Account moves back out of closed section
    await expect(page.getByText('Regalia Gold Premium')).toBeVisible();

    // 5. Delete empty account: create a fresh generic account to delete
    await page.getByRole('button', { name: /Add Account/i }).first().click();
    await page.getByRole('button', { name: 'Wallet/Cash' }).click();
    await page.getByLabel('Account Name').fill('Temp Petty Cash');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Temp Petty Cash')).toBeVisible();

    // Open edit dialog and delete it
    await page.getByText('Temp Petty Cash').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog').getByText('Are you sure you want to delete')).toBeVisible();
    await page.getByRole('button', { name: 'Delete Permanently' }).click();

    // Dialog closes and account is gone from the list
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Temp Petty Cash/i })).not.toBeVisible();
  });
});
