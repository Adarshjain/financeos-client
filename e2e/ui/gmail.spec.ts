import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm } from '../fixtures/control';
import type { GoogleIdentity } from '../fixtures/google-stubs';
import { cleanupIdentity, registerIdentity, registerMailbox } from '../fixtures/google-stubs';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  alertMail,
  attentionItems,
  BANK_SENDER,
  extractedTxn,
  extractionFor,
  isoDaysAgo,
  listConnections,
  scriptExtractions,
  waitForGmailJobsIdle,
} from '../fixtures/seed/gmail';
import { searchAll } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

/**
 * /settings/gmail end to end in a real browser: Add Account through the WireMock consent screen and
 * the server callback, sender allowlist dialog, manual sync, the Needs Attention card with Retry,
 * disconnect, and the account form's Gmail cleanup confirmation. One serial journey per user.
 */
test.describe('Gmail settings UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });

  let user: CreatedUser;
  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let bankAccountId: string;

  const parkedMail = alertMail({ last4: '9999', amount: 640, merchant: 'UBER', date: isoDaysAgo(3) });

  test.beforeAll(async ({ request }) => {
    user = await createUser(request, 'ui-gmail');
    api = makeApi(user.cookie);
    // Browser-minted codes for the server's Gmail callback (port 6969) resolve to this identity.
    identity = await registerIdentity({ browserGmail: true });
    // Seeded before connecting: once a connection exists, account/sender changes enqueue syncs.
    const account = await createBankAccount(api, { name: 'UI Gmail Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    bankAccountId = account.id;
    await registerMailbox(identity, [parkedMail]);
    await scriptExtractions(api, [
      extractionFor(parkedMail, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) }),
    ]);
  });

  test.beforeEach(async ({ context }) => {
    await loginContext(context, user.cookie);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
  });

  test('Add Account runs the consent round trip and lands back with Successfully Connected', async ({ page }) => {
    test.slow();
    await page.goto('/settings/gmail');
    await expect(page.getByRole('heading', { name: 'Gmail Integration' })).toBeVisible();
    await expect(page.getByText('No connected Gmail accounts found.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect your first account' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Account' }).click();
    // → WireMock consent (302) → server /api/v1/gmail/oauth/callback (302) → back here with a banner.
    await page.waitForURL(/\/settings\/gmail\?gmail=success/, { timeout: 30_000 });
    await expect(page.getByText('Successfully Connected')).toBeVisible();
    await expect(page.getByText(identity.email).first()).toBeVisible();
    await expect(page.getByText('Primary')).toBeVisible();
    await expect(page.getByText(/Connected:/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manually Sync Now' })).toBeVisible();

    const connections = await listConnections(api);
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({ email: identity.email, isConnected: true, isPrimary: true });
  });

  test('Add Sender dialog creates an Active sender', async ({ page }) => {
    await page.goto('/settings/gmail');
    await expect(page.getByText('No allowed senders configured yet')).toBeVisible();

    await page.getByRole('button', { name: 'Add Sender' }).click();
    await expect(page.getByRole('heading', { name: 'Add Allowed Sender' })).toBeVisible();
    await page.getByLabel('Sender Name (Optional)').fill('E2E Bank Alerts');
    await page.getByLabel('Sender Email Address').fill(BANK_SENDER);
    await expect(page.getByLabel('Enable Ingestion for this Sender')).toBeChecked();
    await page.getByRole('button', { name: 'Save Sender' }).click();

    await expectToast(page, 'Sender added');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('E2E Bank Alerts')).toBeVisible();
    await expect(page.getByText(BANK_SENDER)).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    // Adding a sender enqueues a sync of its own; let it drain before the manual one.
    await waitForGmailJobsIdle(api);
  });

  test('Manually Sync Now runs a job, the parked alert appears under Needs Attention, Retry re-queues it', async ({ page }) => {
    test.slow();
    await page.goto('/settings/gmail');
    await page.getByRole('button', { name: 'Manually Sync Now' }).click();
    await expectToast(page, 'Gmail sync started in background.');
    await expectToast(page, 'Sync completed!');
    await expect(page.getByText('Recent sync jobs')).toBeVisible();
    await expect(page.getByText('SUCCEEDED', { exact: true }).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('Needs Attention (1)')).toBeVisible();
    await expect(page.getByText('Unresolved', { exact: true })).toBeVisible();
    await expect(page.getByText(/No account matching ••9999/)).toBeVisible();

    // The card the alert names now exists — but is not opted in yet.
    await createBankAccount(api, { name: 'UI Late Account', last4: '9999' });
    await waitForGmailJobsIdle(api);

    // Retry re-extracts the mail, and so does the opt-in re-activation in the next test.
    const uberAnswer = extractionFor(parkedMail, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) });
    await scriptExtractions(api, [uberAnswer, uberAnswer]);

    await page.getByRole('button', { name: 'Retry' }).click();
    await expectToast(page, 'Item queued for retry!');
    await waitForGmailJobsIdle(api);
    await page.reload();
    await expect(page.getByText('Needs Attention (1)')).toBeVisible();
    await expect(page.getByText('Not Opted In', { exact: true })).toBeVisible();
    await expect(page.getByText(/Waiting for account ending ••9999/)).toBeVisible();
    expect((await attentionItems(api))[0].status).toBe('ACCOUNT_NOT_OPTED_IN');
  });

  test('opting the account in clears Needs Attention; the sender can be edited to Disabled', async ({ page }) => {
    test.slow();
    const late = (await api.GET('/api/v1/accounts')).data?.find((a) => a.name === 'UI Late Account');
    expect(late).toBeDefined();
    await api.PUT('/api/v1/accounts/{id}', {
      params: { path: { id: late!.id } },
      body: { type: 'bank_account', name: 'UI Late Account', last4: '9999', ingestFromDate: isoDaysAgo(60) },
    });
    await waitForGmailJobsIdle(api);

    await page.goto('/settings/gmail');
    await expect(page.getByRole('heading', { name: 'Gmail Integration' })).toBeVisible();
    await expect(page.getByText(/Needs Attention/)).not.toBeVisible();
    const imported = await searchAll(api, [{ field: 'accountId', operator: 'is', value: late!.id }]);
    expect(imported).toHaveLength(1);
    expect(imported[0].sourcedDescription).toBe('UBER');

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Edit Allowed Sender' })).toBeVisible();
    await expect(page.getByLabel('Sender Email Address')).toHaveValue(BANK_SENDER);
    await page.getByLabel('Enable Ingestion for this Sender').uncheck();
    await page.getByRole('button', { name: 'Save Sender' }).click();
    await expectToast(page, 'Sender updated');
    await expect(page.getByText('Disabled', { exact: true })).toBeVisible();
  });

  test('moving the ingest date later asks to clean up imported alerts and deletes them', async ({ page }) => {
    test.slow();
    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
    await page.getByText('UI Late Account').click();
    await expect(page.getByLabel('Account Name')).toBeVisible();

    // The UBER alert is dated 3 days ago; a watermark of yesterday makes it stale.
    await page.locator('#ingestFromDate').fill(isoDaysAgo(1));
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Confirm Transaction Cleanup')).toBeVisible();
    await expect(page.getByText(/Delete .*1.* Gmail-imported transactions before/)).toBeVisible();
    await page.getByRole('button', { name: 'Delete & Save' }).click();
    await expect(page.getByText('Confirm Transaction Cleanup')).not.toBeVisible();

    const late = (await api.GET('/api/v1/accounts')).data?.find((a) => a.name === 'UI Late Account');
    await expect
      .poll(async () => (await searchAll(api, [{ field: 'accountId', operator: 'is', value: late!.id }])).length)
      .toBe(0);
    expect(late?.ingestFromDate).toBe(isoDaysAgo(1));
  });

  test('disconnecting via the trash icon needs the native confirm and marks the row disconnected', async ({ page }) => {
    await page.goto('/settings/gmail');
    const row = page.locator('div').filter({ hasText: identity.email }).filter({ has: page.locator('svg.lucide-trash-2') }).last();
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to disconnect this Gmail account?');
      dialog.accept();
    });
    await row.getByRole('button').click();
    await expectToast(page, 'Gmail account disconnected');

    await expect.poll(async () => (await listConnections(api))[0]?.isConnected).toBe(false);
    // Soft delete: the row is still listed.
    await page.reload();
    await expect(page.getByText(identity.email).first()).toBeVisible();

    // Bank account 1234 was never touched by this journey.
    expect(await searchAll(api, [{ field: 'accountId', operator: 'is', value: bankAccountId }])).toHaveLength(0);
  });
});
