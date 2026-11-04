import { type ApiClient, makeApi, waitForJob } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { getAccountStatements, uploadStatements } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

const PASSWORD = 'made-up-pass-4242';

/** A made-up HDFC statement locked with PASSWORD; `tag` changes the content so each file is its own statement. */
function lockedPdf(tag: string, periodStart: string, periodEnd: string): Promise<Buffer> {
  return genBankPdf({
    bank: 'HDFC Bank',
    accountLast10: '5566770042',
    periodStart,
    periodEnd,
    opening: 10000,
    rows: [{ date: periodStart, description: `${tag} VENDOR PURCHASE`, debit: 321 }],
    password: PASSWORD,
  });
}

async function uploadLocked(api: ApiClient, accountId: string, filename: string, buffer: Buffer): Promise<string> {
  const res = await uploadStatements(api, accountId, [{ filename, buffer }]);
  expectStatus(res, 202);
  const jobId = (res.data as { jobId: string }).jobId;
  await waitForJob(api, jobId);
  return jobId;
}

test.describe('Import: a locked statement asks for its password (@ui)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    test.setTimeout(120000);
    user = await createUser(request, 'ui-import-password');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('the import page asks for the password; the right one finishes the file without a re-upload and is saved to the account', async ({ page }) => {
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Locked Bank', last4: '0042', bank: 'hdfc', openingBalance: 10000 });
    const jobId = await uploadLocked(api, account.id, 'locked-apr.pdf', await lockedPdf('FIRSTLOCK', '2026-04-01', '2026-04-30'));

    await page.goto(`/transactions/import/${jobId}`);
    const file = page.getByTestId('import-file');
    await expect(file).toContainText('locked-apr.pdf', { timeout: 60000 });
    await expect(file).toContainText('Failed');
    await expect(file.getByLabel('Statement password')).toBeVisible();
    await expect(file.getByRole('button', { name: 'Try again' })).toBeDisabled();
    expect((await getAccountStatements(api, account.id)).length).toBe(0);

    await file.getByLabel('Statement password').fill(PASSWORD);
    await file.getByRole('button', { name: 'Try again' }).click();

    // A new import of the same stored file opens on its own; it finishes without uploading the file again.
    await expect(page).toHaveURL(/\/transactions\/import\/[0-9a-f-]+/);
    await expect(page).not.toHaveURL(new RegExp(jobId));
    await expect(page.getByTestId('import-file')).toContainText('Done', { timeout: 60000 });
    await expect(page.getByTestId('import-file')).toContainText('locked-apr.pdf');
    await expect.poll(async () => (await getAccountStatements(api, account.id)).length, { timeout: 30000 }).toBe(1);

    // "Save to this account" was on: a second locked statement now imports with no password asked.
    const secondJob = await uploadLocked(api, account.id, 'locked-may.pdf', await lockedPdf('SECONDLOCK', '2026-05-01', '2026-05-31'));
    await page.goto(`/transactions/import/${secondJob}`);
    await expect(page.getByTestId('import-file')).toContainText('Done', { timeout: 60000 });
    await expect(page.getByLabel('Statement password')).toHaveCount(0);
  });

  test('a wrong password shows an error, starts no import and is not saved', async ({ page }) => {
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Wrong Pass Bank', last4: '0042', bank: 'hdfc', openingBalance: 10000 });
    const jobId = await uploadLocked(api, account.id, 'locked-wrong.pdf', await lockedPdf('WRONGLOCK', '2026-04-01', '2026-04-30'));

    await page.goto(`/transactions/import/${jobId}`);
    const file = page.getByTestId('import-file');
    await expect(file.getByLabel('Statement password')).toBeVisible({ timeout: 60000 });
    await file.getByLabel('Statement password').fill('not-the-password');
    await file.getByRole('button', { name: 'Try again' }).click();

    await expect(file.getByText("That password didn't work.")).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(new RegExp(jobId));
    expect((await getAccountStatements(api, account.id)).length).toBe(0);

    // Not saved: another locked file still asks for its password.
    const next = await uploadLocked(api, account.id, 'locked-wrong-2.pdf', await lockedPdf('WRONGLOCKTWO', '2026-05-01', '2026-05-31'));
    await page.goto(`/transactions/import/${next}`);
    await expect(page.getByTestId('import-file').getByLabel('Statement password')).toBeVisible({ timeout: 60000 });

    // Typing again clears the error.
    await page.goto(`/transactions/import/${jobId}`);
    await file.getByLabel('Statement password').fill('still-wrong');
    await file.getByRole('button', { name: 'Try again' }).click();
    await expect(file.getByText("That password didn't work.")).toBeVisible({ timeout: 30000 });
    await file.getByLabel('Statement password').fill('x');
    await expect(file.getByText("That password didn't work.")).toHaveCount(0);
  });

  test('with Save to this account off, the file imports but the next locked file asks again', async ({ page }) => {
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'No Save Bank', last4: '0042', bank: 'hdfc', openingBalance: 10000 });
    const jobId = await uploadLocked(api, account.id, 'locked-nosave.pdf', await lockedPdf('NOSAVELOCK', '2026-04-01', '2026-04-30'));

    await page.goto(`/transactions/import/${jobId}`);
    const file = page.getByTestId('import-file');
    await expect(file.getByLabel('Statement password')).toBeVisible({ timeout: 60000 });
    await file.getByLabel('Statement password').fill(PASSWORD);
    await file.getByRole('checkbox', { name: 'Save to this account' }).click();
    await file.getByRole('button', { name: 'Try again' }).click();
    await expect(page).not.toHaveURL(new RegExp(jobId));
    await expect(page.getByTestId('import-file')).toContainText('Done', { timeout: 60000 });

    const next = await uploadLocked(api, account.id, 'locked-nosave-2.pdf', await lockedPdf('NOSAVELOCKTWO', '2026-05-01', '2026-05-31'));
    await page.goto(`/transactions/import/${next}`);
    await expect(page.getByTestId('import-file').getByLabel('Statement password')).toBeVisible({ timeout: 60000 });
  });
});
