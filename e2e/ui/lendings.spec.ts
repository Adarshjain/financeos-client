import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { addLending, createCounterparty, monthsAgo } from '../fixtures/seed/loans';
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

    // 1. Add Lending for a new person via the picker's "Add" row
    await page.getByRole('button', { name: /Add Lending/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Ledger Entry' })).toBeVisible();

    const cpName = `Kavita Rao ${Date.now()}`;
    await page.locator('#cpSelect').click();
    await page.getByPlaceholder('Type a name...').fill(cpName);
    await page.getByRole('option', { name: new RegExp(`Add .*${cpName}`) }).click();
    await expect(page.getByText('Will be added when you save')).toBeVisible();

    // Fill entry details
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

    // The mobile action bar slides off-screen (opacity 0, still "visible" to Playwright) once the
    // page scrolls down, and clicking it then retries forever. Scrolling up brings it back.
    const showActionBar = () => page.evaluate(() => window.scrollTo(0, 0));

    await expect(page.getByRole('heading', { name: cpName })).toBeVisible();
    await expect(page.getByText(/Ledger History/i).first()).toBeVisible();

    // 3. Add second entry: Borrowed ₹15,000
    await page.getByRole('button', { name: /Add Entry/i }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: new RegExp(`Add Ledger Entry for ${cpName}`, 'i') })).toBeVisible();

    await page.getByLabel('I borrowed money').check();
    await page.locator('#add-entry-form input[type="number"]').fill('15000');
    await page.locator('#add-entry-form input[data-slot="date-input"]').first().fill(monthsAgo(1));

    await page.getByRole('button', { name: 'Add Entry' }).click();

    // Verify table updated to 2 entries and running balance reflects +₹25,000.00
    await expect(page.getByText(/Ledger History/i).first()).toBeVisible();
    await expect(page.getByText('+₹25,000.00').first()).toBeVisible();

    // 3b. Settle up: they owe ₹25,000, one click pre-fills "They paid me back" for exactly that
    await showActionBar();
    await page.getByRole('button', { name: 'Settle up', exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: new RegExp(`Add Ledger Entry for ${cpName}`, 'i') })).toBeVisible();
    await expect(page.getByLabel('They paid me back')).toBeChecked();
    await expect(page.locator('#add-entry-form input[type="number"]')).toHaveValue('25000');
    await page.getByRole('button', { name: 'Add Entry' }).click();

    // The repayment is neutral in the ledger and lands in "Repaid to you", not "Total Borrowed"
    await expect(page.getByText('They repaid').first()).toBeVisible();
    await expect(page.getByText('Repaid to you')).toBeVisible();
    await expect(page.getByText('₹0.00').first()).toBeVisible(); // net chip: zero carries no sign
    await expect(page.getByRole('button', { name: 'Settle up', exact: true })).toHaveCount(0);

    // 4. Edit Entry
    const editEntryBtn = page.locator('.block.md\\:hidden button:has(svg)').filter({ hasNotText: /Add|Delete|Person/i }).first();
    await editEntryBtn.click();
    await expect(page.getByRole('heading', { name: 'Edit Ledger Entry' })).toBeVisible();

    await page.locator('#edit-lending-form input[type="number"]').fill('20000');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // 5. Edit Person: rename
    await showActionBar();
    await page.getByRole('button', { name: 'Edit Person', exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Edit Person Details' })).toBeVisible();

    const updatedCpName = `${cpName} (VIP)`;
    await page.locator('#edit-cp-form input').first().fill(updatedCpName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByRole('heading', { name: updatedCpName })).toBeVisible();

    // 6. Delete Person with confirm modal
    await showActionBar();
    await page.getByRole('button', { name: 'Delete Person', exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Delete Counterparty' })).toBeVisible();
    await expect(page.getByText(/permanently deletes their entire ledger history \(3 entries\)/i)).toBeVisible();

    await page.getByRole('button', { name: 'Delete Person', exact: true }).last().click();

    // Redirected back to Lendings Ledger with 0 counterparties
    await expect(page.getByRole('heading', { name: 'Lendings Ledger (0)' })).toBeVisible();
  });

  test('Lendings Ledger: summary cards (lent / borrowed / net) update after Save Entry without a reload', async ({
    page,
  }) => {
    await page.goto('/loans/lendings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Lendings Ledger/i })).toBeVisible();

    // "Total Borrowed" / "Net Position" are also row labels in the counterparties
    // list, so scope to the summary card (the grid holding "Total Lent Out").
    const summaryCard = page.locator('p:text-is("Total Lent Out")').locator('xpath=../..');
    const lentOut = summaryCard.locator('p:text-is("Total Lent Out") + p');
    const borrowed = summaryCard.locator('p:text-is("Total Borrowed") + p');
    const net = summaryCard.locator('p:text-is("Net Position") + p');
    await expect(lentOut).toHaveText('₹0.00');
    await expect(borrowed).toHaveText('₹0.00');
    await expect(net).toHaveText('+₹0.00');

    // Lend ₹12,500 to a new person from the page's own Add Lending dialog
    await page.getByRole('button', { name: /Add Lending/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Ledger Entry' })).toBeVisible();
    const meera = `Meera Iyer ${Date.now()}`;
    await page.locator('#cpSelect').click();
    await page.getByPlaceholder('Type a name...').fill(meera);
    await page.getByRole('option', { name: new RegExp(`Add .*${meera}`) }).click();
    await expect(page.getByText('Will be added when you save')).toBeVisible();
    await page.locator('#amount').fill('12500');
    await page.locator('#entryDate').fill(monthsAgo(1));
    await page.getByRole('button', { name: 'Save Entry' }).click();

    // No page.reload() on purpose: the cards must refresh from the mutation alone.
    await expect(page.getByRole('heading', { name: 'Lendings Ledger (1)' })).toBeVisible();
    await expect(lentOut).toHaveText('₹12,500.00');
    await expect(borrowed).toHaveText('₹0.00');
    await expect(net).toHaveText('+₹12,500.00');
  });

  test('Person Detail: actions reachable at the desktop viewport; export a subset of the ledger as text and copy it', async ({
    page,
    context,
  }) => {
    const api = makeApi(currentUser.cookie);
    const cp = await createCounterparty(api, { name: 'Rahul Export' });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 5000, entryDate: monthsAgo(3), notes: 'Dinner split' });
    await addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 2000, entryDate: monthsAgo(2) });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 1000, entryDate: monthsAgo(1) });

    await page.goto(`/loans/lendings/${cp.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Rahul Export' })).toBeVisible();

    // Playwright's default viewport (1280 wide) is above the lg breakpoint: the mobile bar is hidden,
    // so every action must come from the desktop card — no setViewportSize() here on purpose.
    for (const name of ['Add Entry', 'Settle up', 'Export', 'Edit Person', 'Delete Person']) {
      await expect(page.getByRole('button', { name, exact: true }).filter({ visible: true }).first()).toBeVisible();
    }

    await page.getByRole('button', { name: 'Export', exact: true }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Export ledger' })).toBeVisible();
    await expect(dialog.getByLabel('Their name')).toHaveValue('Rahul Export');

    // E2E users sign up with email + password, so there is no display name: the user is "I / me".
    const preview = dialog.getByTestId('ledger-export-preview');
    await expect(preview).toContainText('Lending ledger with Rahul Export');
    await expect(preview).toContainText('Opening balance: ₹0.00 (settled)');
    await expect(preview).toContainText('I lent Rahul Export · ₹5,000.00');
    await expect(preview).toContainText('Rahul Export lent me · ₹2,000.00');
    await expect(preview).toContainText('Closing balance: Rahul Export owes me ₹4,000.00');

    // Untick the first entry: its line goes, the opening balance becomes the balance before it.
    await dialog.getByRole('checkbox', { name: /Lent ₹5,000\.00/ }).click();
    await expect(dialog.getByTestId('export-selected-count')).toHaveText('2 selected');
    await expect(preview).not.toContainText('I lent Rahul Export · ₹5,000.00');
    await expect(preview).toContainText('Opening balance: Rahul Export owes me ₹5,000.00');
    await expect(preview).toContainText('Closing balance: Rahul Export owes me ₹4,000.00');
    const text = (await preview.textContent()) ?? '';
    expect(text).not.toMatch(/\d+ of \d+/);

    // Copy puts exactly the preview on the clipboard.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.getByText('Ledger copied')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(text);
  });
});
