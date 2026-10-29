import { makeApi } from '../fixtures/api';
import { type CreatedUser, createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { scriptLlm } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { genCardPdf } from '../fixtures/gen/statements';
import { createCreditCard } from '../fixtures/seed/accounts';
import { getInbox } from '../fixtures/seed/nav';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Statement details on the card statements page (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-statement-details');
    await loginContext(context, currentUser.cookie);
  });

  test('a statement missing its due date is flagged, opened from the inbox, and filled in', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const card = await createCreditCard(api, { name: 'Details Card', last4: '9201' });
    const periodEnd = istToday(-3);
    const pdf = await genCardPdf({
      issuer: 'HDFC Bank',
      cardLast4: '9201',
      statementDate: periodEnd,
      periodStart: istToday(-32),
      periodEnd,
      previousBalance: 0,
      paymentsReceived: 0,
      financeCharges: 0,
      creditLimit: 100000,
      omitDueDate: true,
      rows: [
        { date: istToday(-20), description: 'AMAZON ONLINE SHOPPING', debit: 4500 },
        { date: periodEnd, description: 'RESTAURANT DINING', debit: 1500 },
      ],
    });
    await scriptLlm(api, 'statement-details', [{ json: {} }]);
    await uploadAndIngest(api, card.id, [{ filename: 'details-9201.pdf', buffer: pdf }]);

    // Reach the page the way the inbox does.
    const item = (await getInbox(api)).items.find((i) => i.kind === 'statement_details_missing');
    expect(item, 'the inbox flags the gap').toBeTruthy();
    await page.goto(`${E2E_CLIENT_URL}${item!.href}`);

    const main = page.locator('main');
    await expect(main.getByText('Details missing').first()).toBeVisible();
    const banner = main.getByText(/Missing from this statement: .*due date/);
    await expect(banner).toBeVisible();
    await expect(main.getByRole('button', { name: 'Re-upload to retry' })).toBeVisible();
    const fillIn = main.getByRole('button', { name: 'Fill in' });
    await expect(fillIn).toBeVisible();

    // The More menu offers Edit details.
    await main.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit details' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Fill in opens the dialog; a minimum above the total is refused.
    await expect(async () => {
      await fillIn.click();
      await expect(page.getByRole('dialog', { name: 'Edit details' })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    const dialog = page.getByRole('dialog', { name: 'Edit details' });
    await dialog.getByLabel('Total due').fill('1000');
    await dialog.getByLabel('Minimum due').fill('2000');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.getByText('Enter a minimum due that is not above the total due.')).toBeVisible();

    // Correct it and give the due date (dd/mm/yyyy).
    await dialog.getByLabel('Minimum due').fill('300');
    const [y, m, d] = istToday(10).split('-');
    await dialog.getByLabel('Due date').fill(`${d}/${m}/${y}`);
    await dialog.getByLabel('Due date').press('Tab');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Statement details saved');
    await expect(dialog).toBeHidden();
    await expect(main.getByText(/Missing from this statement/)).toHaveCount(0);
    await expect(main.getByText('Details missing')).toHaveCount(0);
  });
});
