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

  test('Person: a borrowed entry, Settle up in full without a transaction, and renaming the person', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const cpName = `Kavita Rao ${Date.now()}`;
    const cp = await createCounterparty(api, { name: cpName });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 40000, entryDate: monthsAgo(1) });

    await page.goto(`/lending/${cp.id}`);
    await expect(page.getByText(cpName).first()).toBeVisible();
    await expect(page.getByText('Opening ₹0 · lent ₹40,000 · received ₹0 · closing ₹40,000')).toBeVisible();

    // 1. Add a second entry: borrowed ₹15,000
    await page.getByRole('button', { name: 'Add entry', exact: true }).first().click();
    const entry = page.getByRole('dialog', { name: 'Record ledger entry' });
    await expect(entry).toBeVisible();
    await entry.getByRole('combobox', { name: /^Entry type/ }).click();
    await page.getByRole('option', { name: 'I borrowed money', exact: true }).click();
    await entry.getByRole('textbox', { name: /^Amount/ }).fill('15000');
    await entry.getByRole('button', { name: 'Record entry' }).click();
    await expect(entry).not.toBeVisible();
    await expect(page.getByText('Opening ₹0 · lent ₹40,000 · received ₹15,000 · closing ₹25,000')).toBeVisible();

    // 2. Settle up: they owe ₹25,000, one tap records exactly that as "Received"
    await page.getByRole('button', { name: 'Settle up', exact: true }).click();
    const settle = page.getByRole('dialog', { name: /^Settle up with Kavita/ });
    await expect(settle).toBeVisible();
    await expect(settle.getByText('Balance ₹25,000 in your favour')).toBeVisible();
    await expect(settle.getByRole('combobox', { name: /^Entry type/ })).toContainText('Received');
    await expect(settle.getByRole('textbox', { name: /^Amount/ })).toHaveValue('25000');
    await settle.getByRole('button', { name: 'Record settlement' }).click();
    await expect(settle).not.toBeVisible();

    // The repayment is neutral in the ledger and the balance reads settled.
    await expect(page.getByText('Settled', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Opening ₹0 · lent ₹40,000 · received ₹40,000 · closing ₹0')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settle up', exact: true })).toHaveCount(0);

    // 3. Edit person: rename
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit person' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit person details' });
    await expect(edit).toBeVisible();
    const updatedCpName = `${cpName} (VIP)`;
    await edit.getByRole('textbox', { name: /^Name/ }).fill(updatedCpName);
    await edit.getByRole('button', { name: 'Save person' }).click();
    await expect(edit).not.toBeVisible();
    await expect(page.getByText(updatedCpName).first()).toBeVisible();
  });

  test('Lendings: the hero totals refresh after saving an entry, without a reload', async ({ page }) => {
    await page.goto('/lending');
    await expect(page.getByText('Owed to you (net)')).toBeVisible();
    await expect(page.getByText('₹0', { exact: true })).toHaveCount(2); // the net and You owe

    // Lend ₹12,500 to a new person from the page's own Add lending dialog
    await page.getByRole('button', { name: 'Add lending', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Record ledger entry' });
    await expect(dialog).toBeVisible();
    const meera = `Meera Iyer ${Date.now()}`;
    await dialog.getByRole('combobox', { name: /^Person/ }).click();
    await page.getByPlaceholder('Type a name').fill(meera);
    await page.getByRole('button', { name: `Add "${meera}"` }).click();
    await dialog.getByRole('textbox', { name: /^Amount/ }).fill('12500');
    await dialog.getByRole('button', { name: 'Record entry' }).click();
    await expect(dialog).not.toBeVisible();

    // No page.reload() on purpose: the hero must refresh from the mutation alone.
    await expect(page.getByText(meera).first()).toBeVisible();
    await expect(page.getByText('₹12,500').first()).toBeVisible();
    await expect(page.getByText('You owe')).toBeVisible();
    await expect(page.getByText('₹0', { exact: true })).toBeVisible();
  });

  test('Person Detail: actions are reachable; export a subset of the ledger as text and copy it', async ({
    page,
    context,
  }) => {
    const api = makeApi(currentUser.cookie);
    const cp = await createCounterparty(api, { name: 'Rahul Export' });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 5000, entryDate: monthsAgo(3), notes: 'Dinner split' });
    await addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 2000, entryDate: monthsAgo(2) });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 1000, entryDate: monthsAgo(1) });

    await page.goto(`/lending/${cp.id}`);
    await expect(page.getByText('Rahul Export').first()).toBeVisible();

    // Add entry and Settle up sit on the page; Edit person, Export ledger and Delete in its menu.
    await expect(page.getByRole('button', { name: 'Add entry', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settle up', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'More actions' }).click();
    for (const name of ['Edit person', 'Export ledger', 'Delete']) {
      await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
    }
    await page.getByRole('menuitem', { name: 'Export ledger', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Export ledger' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: /^Their name/ })).toHaveValue('Rahul Export');

    // E2E users sign up with email + password, so there is no display name: the user is "I / me".
    const preview = dialog.getByTestId('ledger-export-preview');
    await expect(preview).toHaveValue(/Lending ledger with Rahul Export/);
    await expect(preview).toHaveValue(/Opening balance: ₹0\.00 \(settled\)/);
    await expect(preview).toHaveValue(/I lent Rahul Export · ₹5,000\.00/);
    await expect(preview).toHaveValue(/Rahul Export lent me · ₹2,000\.00/);
    await expect(preview).toHaveValue(/Closing balance: Rahul Export owes me ₹4,000\.00/);

    // Untick the first entry: its line goes, the opening balance becomes the balance before it.
    await dialog.getByRole('checkbox', { name: /Lent/ }).first().click();
    await expect(dialog.getByTestId('export-selected-count')).toHaveText('2 selected');
    await expect(preview).not.toHaveValue(/I lent Rahul Export · ₹5,000\.00/);
    await expect(preview).toHaveValue(/Opening balance: Rahul Export owes me ₹5,000\.00/);
    await expect(preview).toHaveValue(/Closing balance: Rahul Export owes me ₹4,000\.00/);
    const text = await preview.inputValue();
    expect(text).not.toMatch(/\d+ of \d+/);

    // Copy puts exactly the preview on the clipboard.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.getByText('Ledger copied')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(text);
  });
});
