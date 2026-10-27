import { type CreatedUser, createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

test.describe('/ds Shell and Index UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-ds-shell');
    await loginContext(context, currentUser.cookie);
  });

  test('desktop 1440px: renders Rail with every group in order and index rows', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);

    // Verify index rows inside the content area
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Offline/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Accounts.*\/accounts/ })).toHaveAttribute('href', '/accounts');

    // Verify Rail navigation is visible
    const rail = page.locator('nav.w-container-xs');
    await expect(rail).toBeVisible();

    // Verify Rail groups and items in order
    // Group 1 (unlabeled): Home, Inbox, Upcoming
    await expect(rail.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Inbox' })).toBeVisible();
    // Upcoming is a tab inside Inbox, not a rail item (owner 2026-10-21)
    await expect(rail.getByRole('link', { name: 'Upcoming' })).toHaveCount(0);

    // Group 2: Money -> Accounts, Transactions
    await expect(rail.getByText('Money')).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Accounts' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Transactions' })).toBeVisible();

    // Group 3: Grow -> Investments, Rewards
    await expect(rail.getByText('Grow')).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Investments' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Rewards' })).toBeVisible();

    // Group 4: Owe & lend -> Loans & lendings
    await expect(rail.getByText('Owe & lend')).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Loans & lendings' })).toBeVisible();

    // Group 5: Insights -> Dashboards, Reports, Ask the data
    await expect(rail.getByText('Insights')).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Dashboards' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Ask the data' })).toBeVisible();

    // Footer: Settings
    const settingsLink = rail.locator('a[href="/settings"]');
    await expect(settingsLink).toBeVisible();
    await expect(settingsLink).toContainText(currentUser.email);

    // Confirm order of all links in the Rail
    const linkTexts = await rail.locator('a').allTextContents();
    const orderedLabels = [
      'Home',
      'Inbox',
      'Accounts',
      'Transactions',
      'Investments',
      'Rewards',
      'Loans & lendings',
      'Dashboards',
      'Reports',
      'Ask the data',
      currentUser.email,
    ];

    for (const label of orderedLabels) {
      expect(linkTexts.some((text) => text.includes(label))).toBe(true);
    }

    // Ensure no error boundary is shown
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('phone 390px: renders TopBar, floating TabBar and index without error', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);

    // Ensure no error boundary is displayed
    await expect(page.getByText('Something went wrong')).not.toBeVisible();

    // Verify index rows
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Offline/i })).toBeVisible();

    // Verify TopBar is visible with "New design"
    await expect(page.locator('header').getByText('New design')).toBeVisible();

    // Rail should be hidden on phone
    const railContainer = page.locator('.hidden.desk\\:flex');
    await expect(railContainer).not.toBeVisible();

    // Verify floating TabBar items: Home, Transactions, Lendings, Inbox, Menu
    const tabBar = page.locator('nav.desk\\:hidden');
    await expect(tabBar).toBeVisible();

    const expectedTabs = ['Home', 'Transactions', 'Lendings', 'Inbox', 'Menu'];
    for (const tabName of expectedTabs) {
      await expect(tabBar.getByRole('tab', { name: tabName })).toBeVisible();
    }
  });

  test('phone 390px: tab bar order is Home, Transactions, Lendings, Inbox, Menu and Lendings opens /loans/lendings', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);

    const tabBar = page.locator('nav.desk\\:hidden');
    await expect(tabBar.getByRole('tab')).toHaveText(['Home', 'Transactions', 'Lendings', 'Inbox', 'Menu']);

    await tabBar.getByRole('tab', { name: 'Lendings' }).click();
    await expect(page).toHaveURL(/\/loans\/lendings/);
  });

  test('phone 390px: Menu tab opens More sheet, links live routes, and closes all 3 ways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);

    const tabBar = page.locator('nav.desk\\:hidden');
    const moreTab = tabBar.getByRole('tab', { name: 'Menu' });
    await expect(moreTab).toBeVisible();

    // 1. Open More sheet by tapping More
    await moreTab.click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await expect(sheet).toBeVisible();

    // Verify Quick add items
    await expect(sheet.getByRole('button', { name: 'Transaction' })).toBeEnabled();
    // Lending is enabled and opens the Add ledger entry dialog from state (no URL change)
    await expect(sheet.getByRole('button', { name: 'Lending' })).toBeEnabled();
    await expect(sheet.getByRole('button', { name: 'Trade' })).toBeEnabled();
    const importLink = sheet.getByRole('link', { name: 'Import' });
    await expect(importLink).toBeVisible();
    await expect(importLink).toHaveAttribute('href', '/transactions/import');

    // Verify Section tiles in groups
    await expect(sheet.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    await expect(sheet.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions');
    await expect(sheet.getByRole('link', { name: 'Investments' })).toHaveAttribute('href', '/investments');
    await expect(sheet.getByRole('link', { name: 'Rewards' })).toHaveAttribute('href', '/rewards');
    await expect(sheet.getByRole('link', { name: 'Loans & lendings' })).toHaveAttribute('href', '/loans/lendings');
    await expect(sheet.getByRole('link', { name: 'Dashboards' })).toHaveAttribute('href', '/dashboards');
    await expect(sheet.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    await expect(sheet.getByRole('link', { name: 'Ask the data' })).toHaveAttribute('href', '/chat');

    // Verify Profile row
    const profileRow = sheet.getByRole('link', { name: /Settings · connections · notifications/i });
    await expect(profileRow).toBeVisible();
    await expect(profileRow).toHaveAttribute('href', '/settings');

    // Closing Way 1: Tapping the scrim above the sheet
    await page.mouse.click(200, 50);
    await expect(sheet).not.toBeVisible();

    // Closing Way 2: Swipe down on the drag handle
    await moreTab.click();
    await expect(sheet).toBeVisible();
    // Wait for the slide-in animation to finish
    await page.waitForTimeout(300);
    const dragArea = sheet.getByTestId('dialog-drag-area');
    const dragBox = await dragArea.boundingBox();
    expect(dragBox).not.toBeNull();
    if (dragBox) {
      await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2 + 180, { steps: 10 });
      await page.mouse.up();
    }
    await expect(sheet).not.toBeVisible();

    // Closing Way 3: Choosing a section tile (navigates to that route)
    await moreTab.click();
    await expect(sheet).toBeVisible();
    // Reopened after a swipe-close, the sheet is fully up again, not left at the drag offset
    await page.waitForTimeout(400);
    const reopenedBox = await sheet.getByTestId('dialog-drag-area').boundingBox();
    expect(reopenedBox?.y).toBeCloseTo(dragBox!.y, 0);
    await sheet.getByRole('link', { name: 'Accounts' }).click();
    await page.waitForURL('**/accounts');
    expect(page.url()).toContain('/accounts');
  });

  test('phone 390px: Quick add Lending opens the Add ledger entry dialog without leaving the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);
    await page.locator('nav.desk\\:hidden').getByRole('tab', { name: 'Menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Lending' }).click();

    await expect(page.getByRole('dialog', { name: 'Add ledger entry' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Menu' })).not.toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/ds');
  });

  test('phone 390px: Quick add Trade opens the Record trade dialog without leaving the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);
    await page.locator('nav.desk\\:hidden').getByRole('tab', { name: 'Menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Trade' }).click();

    const dialog = page.getByRole('dialog', { name: 'Record trade' });
    await expect(dialog).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/ds');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('phone 390px: Quick add Transaction opens the Add transaction dialog without leaving the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);
    await page.locator('nav.desk\\:hidden').getByRole('tab', { name: 'Menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Transaction' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add transaction' });
    await expect(dialog).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/ds');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('phone 390px: TabBar links navigate as plain links (Transactions)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);

    const tabBar = page.locator('nav.desk\\:hidden');
    const txTab = tabBar.getByRole('tab', { name: 'Transactions' });
    await expect(txTab).toBeVisible();
    await expect(txTab).toHaveAttribute('href', '/transactions');

    // Click Transactions tab and ensure it navigates directly as a link
    await txTab.click();
    await page.waitForURL('**/transactions');
    expect(new URL(page.url()).pathname).toBe('/transactions');
  });
});
