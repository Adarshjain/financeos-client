import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_API_URL } from '../fixtures/config';
import { createBankAccount } from '../fixtures/seed/accounts';
import { expect, test } from '../fixtures/test';
import { clickUntilRequest, expectToast } from '../fixtures/ui';

interface LineView {
  id: string;
  sender: string;
  ending: string | null;
  state: 'OFF' | 'ON' | 'NOT_MINE';
  syncFrom: string | null;
}
interface LinesResponse {
  accounts: { accountId: string; lines: LineView[] }[];
  unassigned: LineView[];
  notMine: LineView[];
}

/** The SMS endpoints are not in the generated schema, so the spec talks to them with plain requests. */
async function sessionCall<T>(cookie: string, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${E2E_API_URL}${path}`, {
    method,
    headers: { Cookie: `FINANCEOS_SESSION=${cookie}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  expect(res.status, `${method} ${path}`).toBeLessThan(300);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Plays a phone: pairs with a code from the session API, then uploads a per-line summary with the device token. */
async function pairPhoneAndSummarise(cookie: string, lines: object[]): Promise<void> {
  const { code } = await sessionCall<{ code: string }>(cookie, 'POST', '/api/v1/sms/pairing-code');
  const pair = await fetch(`${E2E_API_URL}/api/v1/sms/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceName: 'Test phone' }),
  });
  expect(pair.status).toBe(200);
  const { token } = (await pair.json()) as { token: string };
  const summary = await fetch(`${E2E_API_URL}/api/v1/sms/device/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lines, skipped: { personal: 0, otp: 0, promo: 0, unknownSender: 0 } }),
  });
  expect(summary.status).toBe(200);
}

test.describe('SMS sync (@ui)', () => {
  const accountName = 'SMS sync wallet account';

  let user: CreatedUser;

  test.beforeEach(async ({ context, page, request }) => {
    user = await createUser(request, 'ui-sms-sync');
    const api = makeApi(user.cookie);
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
    // A bank account the first line matches by bank and ending, and a line of a bank the user has no account at.
    await createBankAccount(api, { name: accountName, bank: 'hdfc', last4: '4321' });
    await pairPhoneAndSummarise(user.cookie, [
      { sender: 'HDFCBK', ending: '4321', family: null, msgCount: 5, txnCount: 4, firstMsgAt: '2026-09-25T08:00:00Z', lastMsgAt: '2026-11-10T08:00:00Z' },
      { sender: 'AXISBK', ending: '9999', family: null, msgCount: 6, txnCount: 5, firstMsgAt: '2026-10-01T08:00:00Z', lastMsgAt: '2026-11-09T08:00:00Z' },
    ]);
  });

  test('lists the account with its line off, and turning it on asks for a start date', async ({ page }) => {
    await page.goto('/accounts/sms-sync');
    await expect(page.getByTestId('sms-phone').getByText('Test phone')).toBeVisible({ timeout: 15_000 });
    const row = page.getByTestId('sms-account-row').filter({ hasText: accountName });
    await expect(row).toContainText('HDFCBK ••4321');
    await expect(row).toContainText('5 messages, last on 10/11/2026');
    await expect(row).toContainText('Nothing else feeds this account');
    const toggle = row.getByRole('switch');
    await expect(toggle).not.toBeChecked();

    const dialog = page.getByRole('dialog');
    // A click before the page hydrates is dropped, so click again until the dialog opens.
    await expect(async () => {
      await toggle.click();
      await expect(dialog.getByText('Sync from')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    // Empty account: the default is the day of the first message.
    await expect(dialog.getByLabel('Sync from')).toHaveValue('25/09/2026');
    await dialog.getByLabel('Sync from').fill('01/10/2026');
    await dialog.getByLabel('Sync from').blur();
    await clickUntilRequest(page, dialog.getByRole('button', { name: 'Turn on' }), (request) => request.headers()['next-action'] !== undefined);

    await expect(row.getByRole('switch')).toBeChecked({ timeout: 15_000 });
    const lines = await sessionCall<LinesResponse>(user.cookie, 'GET', '/api/v1/sms/lines');
    const line = lines.accounts.flatMap((a) => a.lines).find((l) => l.sender === 'HDFCBK');
    expect(line).toMatchObject({ state: 'ON', syncFrom: '2026-10-01' });
  });

  test('Not mine hides a line and Undo brings it back', async ({ page }) => {
    await page.goto('/accounts/sms-sync');
    const row = page.getByTestId('sms-unassigned-row').filter({ hasText: 'AXISBK ••9999' });
    await expect(row).toBeVisible({ timeout: 15_000 });

    const notMine = page.getByRole('menuitem', { name: 'Not mine' });
    await expect(async () => {
      await row.getByRole('button', { name: 'More options' }).click();
      await expect(notMine).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await clickUntilRequest(page, notMine, (request) => request.headers()['next-action'] !== undefined);
    await expectToast(page, /Hidden/);
    await expect(row).toHaveCount(0);

    const hidden = page.getByTestId('sms-not-mine');
    await expect(hidden).toBeVisible();
    const hiddenRow = hidden.getByTestId('sms-not-mine-row').filter({ hasText: 'AXISBK ••9999' });
    await expect(async () => {
      await hidden.getByRole('button', { name: 'Show' }).click();
      await expect(hiddenRow).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await clickUntilRequest(page, hiddenRow.getByRole('button', { name: 'Undo' }), (request) => request.headers()['next-action'] !== undefined);
    await expect(page.getByTestId('sms-unassigned-row').filter({ hasText: 'AXISBK ••9999' })).toBeVisible({ timeout: 15_000 });
  });
});
