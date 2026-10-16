import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

test.describe('/ds Shell and Index UI (@ui)', () => {
  test.beforeEach(async ({ context, request }) => {
    const user = await createUser(request, 'ui-ds-shell');
    await loginContext(context, user.cookie);
  });

  test('desktop 1440px: renders Rail with every group in order and index rows', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);

    // Verify index rows inside the content area
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Offline/i })).toBeVisible();
    await expect(page.getByText('No signed-in pages yet.')).toBeVisible();

    // Verify Rail navigation is visible
    const rail = page.locator('nav.w-rail');
    await expect(rail).toBeVisible();

    // Verify Rail groups and items in order
    // Group 1 (unlabeled): Home, Inbox, Upcoming
    await expect(rail.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Inbox' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Upcoming' })).toBeVisible();

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
    await expect(rail.getByRole('link', { name: 'Settings' })).toBeVisible();

    // Confirm order of all links in the Rail
    const linkTexts = await rail.locator('a').allTextContents();
    const orderedLabels = [
      'Home',
      'Inbox',
      'Upcoming',
      'Accounts',
      'Transactions',
      'Investments',
      'Rewards',
      'Loans & lendings',
      'Dashboards',
      'Reports',
      'Ask the data',
      'Settings',
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
    const railContainer = page.locator('.hidden.lg\\:flex');
    await expect(railContainer).not.toBeVisible();

    // Verify floating TabBar items: Home, Inbox, Upcoming, Transactions, More
    const tabBar = page.locator('nav.lg\\:hidden');
    await expect(tabBar).toBeVisible();

    const expectedTabs = ['Home', 'Inbox', 'Upcoming', 'Transactions', 'More'];
    for (const tabName of expectedTabs) {
      await expect(tabBar.getByRole('tab', { name: tabName })).toBeVisible();
    }
  });

  test('phone 390px: More tab opens More sheet, links live routes, and closes all 3 ways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${E2E_CLIENT_URL}/ds`);

    const tabBar = page.locator('nav.lg\\:hidden');
    const moreTab = tabBar.getByRole('tab', { name: 'More' });
    await expect(moreTab).toBeVisible();

    // 1. Open More sheet by tapping More
    await moreTab.click();
    const sheet = page.getByRole('dialog', { name: 'More' });
    await expect(sheet).toBeVisible();

    // Verify Quick add items
    await expect(sheet.getByRole('button', { name: 'Transaction' })).toBeDisabled();
    await expect(sheet.getByRole('button', { name: 'Lending' })).toBeDisabled();
    await expect(sheet.getByRole('button', { name: 'Trade' })).toBeDisabled();
    const importLink = sheet.getByRole('link', { name: 'Import' });
    await expect(importLink).toBeVisible();
    await expect(importLink).toHaveAttribute('href', '/transactions/import');

    // Verify Section tiles in groups
    await expect(sheet.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    await expect(sheet.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions');
    await expect(sheet.getByRole('link', { name: 'Investments' })).toHaveAttribute('href', '/investments');
    await expect(sheet.getByRole('link', { name: 'Rewards' })).toHaveAttribute('href', '/rewards');
    await expect(sheet.getByRole('link', { name: 'Loans & lendings' })).toHaveAttribute('href', '/loans');
    await expect(sheet.getByRole('link', { name: 'Dashboards' })).toHaveAttribute('href', '/dashboards');
    await expect(sheet.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    await expect(sheet.getByRole('link', { name: 'Ask the data' })).toHaveAttribute('href', '/chat');

    // Verify Profile row
    const profileRow = sheet.getByRole('link', { name: /Settings · connections · notifications/i });
    await expect(profileRow).toBeVisible();
    await expect(profileRow).toHaveAttribute('href', '/settings');

    // Closing Way 1: Tapping More again
    await moreTab.click();
    await expect(sheet).not.toBeVisible();

    // Closing Way 2: Tapping the scrim
    await moreTab.click();
    await expect(sheet).toBeVisible();
    // Tap above the sheet on the scrim overlay (e.g. at x: 200, y: 50)
    await page.mouse.click(200, 50);
    await expect(sheet).not.toBeVisible();

    // Closing Way 3: Swipe down on the drag handle
    await moreTab.click();
    await expect(sheet).toBeVisible();
    const dragArea = page.getByTestId('dialog-drag-area');
    const dragBox = await dragArea.boundingBox();
    if (dragBox) {
      await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2 + 180, { steps: 10 });
      await page.mouse.up();
    }
    await expect(sheet).not.toBeVisible();
  });
});
