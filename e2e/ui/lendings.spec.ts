import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { monthsAgo } from '../fixtures/seed/loans';
import { expect, test } from '../fixtures/test';

test.describe('Lendings UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-lendings');
    await loginContext(context, currentUser.cookie);
  });

  test('Lendings Ledger and Person Detail: create person and entry, edit entry, edit person, delete cascade', async ({
    page,
  }) => {
    await page.goto('/loans/lendings');
    await page.waitForLoadState('networkidle');

    // Page title
    await expect(page.getByRole('heading', { name: /Lendings Ledger/i })).toBeVisible();

    // 1. Add Lending with "+ Add New Person"
    await page.getByRole('button', { name: /Add Lending/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Ledger Entry' })).toBeVisible();

    // Select "+ Add New Person"
    const cpSelect = page.locator('#add-lending-form button[role="combobox"]').first();
    await cpSelect.click();
    await page.getByRole('option', { name: '+ Add New Person', exact: true }).click();

    // Fill new person name and entry details
    const cpName = `Kavita Rao ${Date.now()}`;
    await page.locator('#cpName').fill(cpName);
    await page.locator('#amount').fill('40000');
    await page.locator('#entryDate').fill(monthsAgo(1));

    // Submit entry
    await page.getByRole('button', { name: 'Save Entry' }).click();

    // Verify row appears in Lendings Ledger table
    await expect(page.getByRole('heading', { name: 'Lendings Ledger (1)' })).toBeVisible();
    await expect(page.locator(`text="${cpName}" >> visible=true`).first()).toBeVisible();
    await expect(page.locator('text="+₹40,000.00" >> visible=true').first()).toBeVisible();

    // 2. Open Person Detail
    await page.locator(`text="${cpName}" >> visible=true`).first().click();
    await page.waitForLoadState('networkidle');

    // Person action buttons (Edit Person, Delete Person, Add Entry) are visible in mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByRole('heading', { name: cpName })).toBeVisible();
    await expect(page.getByText(/Ledger History/i).first()).toBeVisible();

    // 3. Add second entry: Borrowed ₹15,000
    await page.getByRole('button', { name: /Add Entry/i }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: new RegExp(`Add Ledger Entry for ${cpName}`, 'i') })).toBeVisible();

    // Click "I received money (Borrowed)" radio
    await page.getByLabel('I received money (Borrowed)').check();
    await page.locator('#add-entry-form input[type="number"]').fill('15000');
    await page.locator('#add-entry-form input[type="date"]').first().fill(monthsAgo(1));

    await page.getByRole('button', { name: 'Add Entry' }).click();

    // Verify table updated to 2 entries and running balance reflects +₹25,000.00
    await expect(page.getByText(/Ledger History/i).first()).toBeVisible();
    await expect(page.getByText('+₹25,000.00').first()).toBeVisible();

    // 4. Edit Entry
    const editEntryBtn = page.locator('.block.md\\:hidden button:has(svg)').filter({ hasNotText: /Add|Delete|Person/i }).first();
    await editEntryBtn.click();
    await expect(page.getByRole('heading', { name: 'Edit Ledger Entry' })).toBeVisible();

    await page.locator('#edit-lending-form input[type="number"]').fill('20000');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // 5. Edit Person: rename
    await page.getByRole('button', { name: 'Edit Person', exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Edit Person Details' })).toBeVisible();

    const updatedCpName = `${cpName} (VIP)`;
    await page.locator('#edit-cp-form input').first().fill(updatedCpName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByRole('heading', { name: updatedCpName })).toBeVisible();

    // 6. Delete Person with confirm modal
    await page.getByRole('button', { name: 'Delete Person', exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Delete Counterparty' })).toBeVisible();
    await expect(page.getByText(/permanently deletes their entire ledger history \(2 entries\)/i)).toBeVisible();

    await page.getByRole('button', { name: 'Delete Person', exact: true }).last().click();

    // Redirected back to Lendings Ledger with 0 counterparties
    await expect(page.getByRole('heading', { name: 'Lendings Ledger (0)' })).toBeVisible();
  });
});
