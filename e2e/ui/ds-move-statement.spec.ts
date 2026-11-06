import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { type BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { getAccountStatements, getStatement, uploadAndIngest } from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

// Made-up statement: HDFC Bank, account ending 8899.
const SPEC: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '5566778899',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 25000.0,
  rows: [
    { date: '2026-04-05', description: 'ACME PAYROLL CREDIT', credit: 40000.0 },
    { date: '2026-04-12', description: 'LANTERN GROCERS PURCHASE', debit: 2200.0 },
  ],
};

/** Opens the statement on its account's Statements tab and picks Move to another account. */
async function openMoveDialog(page: Page, accountId: string, statementId: string) {
  await page.goto(`/accounts/${accountId}/statements?statement=${statementId}`);
  await page.getByRole('button', { name: 'More actions' }).locator('visible=true').first().click({ timeout: 60000 });
  await page.getByRole('menuitem', { name: 'Move to another account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Move to another account' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Move a statement to another account (@ui)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    test.setTimeout(120000);
    user = await createUser(request, 'ui-move-statement');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('moving a statement takes its transactions along and keeps the category the user set', async ({ page }) => {
    const api = makeApi(user.cookie);
    const source = await createBankAccount(api, { name: 'Move Source Bank', last4: '8899', bank: 'hdfc', openingBalance: SPEC.opening });
    const target = await createBankAccount(api, { name: 'Move Target Bank', last4: '1111', bank: 'hdfc', openingBalance: 0 });
    await uploadAndIngest(api, source.id, [{ filename: 'move-me.pdf', buffer: await genBankPdf(SPEC) }]);

    const statements = await getAccountStatements(api, source.id);
    expect(statements.length).toBe(1);
    const statementId = statements[0].id;

    const lines = (await getStatement(api, statementId)).lines;
    expect(lines.length).toBe(SPEC.rows.length);
    const grocerLine = lines.find((l) => /lantern grocers/i.test(l.description ?? ''));
    expect(grocerLine, 'the grocer row was imported').toBeTruthy();
    const before = { id: grocerLine!.transactionId };
    const set = await api.PUT('/api/v1/transactions/{id}/category', {
      params: { path: { id: before.id } },
      body: { categoryKey: 'gifts' },
    });
    expect(set.response.status).toBe(200);

    const dialog = await openMoveDialog(page, source.id, statementId);
    await expect(dialog.getByRole('button', { name: 'Move', exact: true })).toBeDisabled();
    await dialog.getByRole('combobox', { name: 'Account' }).click();
    await page.getByRole('option', { name: /Move Target Bank/ }).click();
    await dialog.getByRole('button', { name: 'Move', exact: true }).click();
    await expectToast(page, 'Moved to Move Target Bank');

    // The source no longer has it; the target does, with the transactions and the category edit.
    await expect.poll(async () => (await getAccountStatements(api, source.id)).length, { timeout: 30000 }).toBe(0);
    const onTarget = await getAccountStatements(api, target.id);
    expect(onTarget.map((s) => s.id)).toEqual([statementId]);
    const after = (await searchAll(api)).filter((t) => t.accountId === target.id);
    expect(after.length).toBe(SPEC.rows.length);
    const grocer = after.find((t) => t.id === before.id);
    expect(grocer, 'the same row, now on the target').toBeTruthy();
    expect(grocer?.category?.key).toBe('gifts');
    expect(grocer?.categorySource).toBe('USER');

    await page.goto(`/accounts/${target.id}/statements?statement=${statementId}`);
    await expect(page.getByText(/lantern grocers/i).locator('visible=true').first()).toBeVisible({ timeout: 45000 });
  });

  test('the picker lists only open accounts of the same type', async ({ page }) => {
    const api = makeApi(user.cookie);
    const source = await createBankAccount(api, { name: 'Picker Source Bank', last4: '8899', bank: 'hdfc', openingBalance: SPEC.opening });
    await createBankAccount(api, { name: 'Same Type Bank', last4: '2222', bank: 'hdfc' });
    await createCreditCard(api, { name: 'Other Type Card', last4: '3333' });
    await uploadAndIngest(api, source.id, [{ filename: 'picker.pdf', buffer: await genBankPdf(SPEC) }]);
    const statementId = (await getAccountStatements(api, source.id))[0].id;

    const dialog = await openMoveDialog(page, source.id, statementId);
    await dialog.getByRole('combobox', { name: 'Account' }).click();
    await expect(page.getByRole('option', { name: /Same Type Bank/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Other Type Card/ })).toHaveCount(0);
    await expect(page.getByRole('option', { name: /Picker Source Bank/ })).toHaveCount(0);
  });

  test('a target that already has the statement for that period refuses with a danger toast and nothing moves', async ({ page }) => {
    const api = makeApi(user.cookie);
    const source = await createBankAccount(api, { name: 'Dup Source Bank', last4: '8899', bank: 'hdfc', openingBalance: SPEC.opening });
    const target = await createBankAccount(api, { name: 'Dup Target Bank', last4: '1111', bank: 'hdfc', openingBalance: SPEC.opening });
    await uploadAndIngest(api, source.id, [{ filename: 'dup-a.pdf', buffer: await genBankPdf(SPEC) }]);
    // The same period with different rows, so a different file: the period alone makes it the same statement.
    const sameMonth = { ...SPEC, rows: [{ date: '2026-04-09', description: 'HARBOR PHARMACY PURCHASE', debit: 640.0 }] };
    await uploadAndIngest(api, target.id, [{ filename: 'dup-b.pdf', buffer: await genBankPdf(sameMonth) }]);
    expect((await getAccountStatements(api, target.id)).length).toBe(1);
    const statementId = (await getAccountStatements(api, source.id))[0].id;

    const dialog = await openMoveDialog(page, source.id, statementId);
    await dialog.getByRole('combobox', { name: 'Account' }).click();
    await page.getByRole('option', { name: /Dup Target Bank/ }).click();
    await dialog.getByRole('button', { name: 'Move', exact: true }).click();
    await expectToast(page, 'That account already has this statement.');
    await expect(dialog).toBeVisible();

    expect((await getAccountStatements(api, source.id)).length).toBe(1);
    expect((await getAccountStatements(api, target.id)).length).toBe(1);
  });
});

test.describe('Picking a statement brings its card into view (@ui)', () => {
  test('phone: tapping an older statement row shows its detail card in the viewport', async ({ context, request, page }) => {
    test.setTimeout(120000);
    const user = await createUser(request, 'ui-statement-scroll');
    await loginContext(context, user.cookie);
    // a short phone screen: the detail card below the list starts out of view
    await page.setViewportSize({ width: 390, height: 600 });
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Scroll Bank', last4: '8899', bank: 'hdfc', openingBalance: SPEC.opening });
    const may: BankSpec = {
      ...SPEC,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      opening: 62800.0,
      rows: [{ date: '2026-05-06', description: 'ACME PAYROLL CREDIT', credit: 40000.0 }],
    };
    await uploadAndIngest(api, account.id, [
      { filename: 'scroll-apr.pdf', buffer: await genBankPdf(SPEC) },
      { filename: 'scroll-may.pdf', buffer: await genBankPdf(may) },
    ]);
    const statements = await getAccountStatements(api, account.id);
    expect(statements.length).toBeGreaterThanOrEqual(2);

    await page.goto(`/accounts/${account.id}/statements`);
    const main = page.getByRole('main');
    const actions = page.getByRole('button', { name: 'More actions' }).locator('visible=true').first();
    const aprRow = main.getByRole('button').filter({ hasText: /Apr/ }).first();
    await aprRow.waitFor({ timeout: 60000 });
    // before the tap the card sits below the list, low on the screen or under it
    expect((await actions.boundingBox())?.y ?? 0).toBeGreaterThan(300);
    await aprRow.click();
    await page.waitForURL(/statement=/);
    // the card's header (its More actions button) lands in the upper half of the screen, under the top bar
    await expect(actions).toBeInViewport();
    await expect.poll(async () => (await actions.boundingBox())?.y ?? -1, { timeout: 5000 }).toBeLessThan(300);
  });
});
