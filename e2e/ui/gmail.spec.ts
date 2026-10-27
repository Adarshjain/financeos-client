import type { Page } from '@playwright/test';

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
import { expectToast, openAccountEditor } from '../fixtures/ui';

/**
 * /settings/gmail end to end in a real browser: Add Account through the WireMock consent screen and
 * the server callback, sender allowlist dialog, manual sync, the Needs Attention card with Retry,
 * disconnect, and the account form's Gmail cleanup confirmation. One serial journey per user.
 */
/** Expands the Needs Attention card, which is collapsed by default. */
async function openAttention(page: Page) {
  const header = page.getByRole('button', { name: /^Needs Attention/ });
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'true');
}

test.describe('Gmail settings UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });

  let user: CreatedUser;
  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let bankAccountId: string;

  const parkedMail = alertMail({ last4: '9999', amount: 640, merchant: 'UBER', date: isoDaysAgo(3) });
  // Alerts keyed by a customer ID match nothing until the user assigns them to an account.
  const customerIdMail = alertMail({ last4: '7741', amount: 210, merchant: 'CUSTOMER ID ALERT', date: isoDaysAgo(2) });

  test.beforeAll(async ({ request }) => {
    user = await createUser(request, 'ui-gmail');
    api = makeApi(user.cookie);
    // Browser-minted codes for the server's Gmail callback (port 6969) resolve to this identity.
    identity = await registerIdentity({ browserGmail: true });
    // Seeded before connecting: once a connection exists, account/sender changes enqueue syncs.
    const account = await createBankAccount(api, { name: 'UI Gmail Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    bankAccountId = account.id;
    await registerMailbox(identity, [parkedMail, customerIdMail]);
    const customerIdAnswer = extractionFor(customerIdMail, {
      json: extractedTxn({ amount: 210, date: isoDaysAgo(2), last4: '7741', merchant: 'CUSTOMER ID ALERT' }),
    });
    await scriptExtractions(api, [
      extractionFor(parkedMail, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) }),
      // Once for the first sync, once for the re-extraction after Assign & Remember re-activates it.
      customerIdAnswer,
      customerIdAnswer,
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
    await page.goto('/legacy/settings/gmail');
    await expect(page.getByRole('heading', { name: 'Gmail Integration' })).toBeVisible();
    await expect(page.getByText('No connected Gmail accounts found.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect your first account' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Account' }).click();
    // → WireMock consent (302) → server /api/v1/gmail/oauth/callback (302) → /settings/gmail, which the app
    // redirects to the Dinero Connections page, back here with a banner.
    await page.waitForURL(/\/settings\/connections/, { timeout: 30_000 });
    await expect(page.getByText('Successfully connected')).toBeVisible();
    await expect(page.getByText(identity.email).first()).toBeVisible();
    // Dinero shows the Primary badge only with several mailboxes; the primary flag is asserted through the API below.
    await expect(page.getByText('Healthy', { exact: true })).toBeVisible();
    await expect(page.getByText(/Connected /)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sync now' })).toBeVisible();

    const connections = await listConnections(api);
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({ email: identity.email, isConnected: true, isPrimary: true });
  });

  test('Add Sender dialog creates an Active sender', async ({ page }) => {
    await page.goto('/legacy/settings/gmail');
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
    await page.goto('/legacy/settings/gmail');
    await page.getByRole('button', { name: 'Manually Sync Now' }).click();
    await expectToast(page, 'Gmail sync started in background.');
    await expectToast(page, 'Sync completed!');
    await expect(page.getByRole('heading', { name: 'Recent sync jobs' })).toBeVisible();
    await expect(page.getByText('SUCCEEDED', { exact: true }).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('Needs Attention (2)')).toBeVisible();
    // The card is collapsed by default.
    await expect(page.getByTestId('attention-item')).toHaveCount(0);
    await openAttention(page);
    await expect(page.getByText('No matching account', { exact: true })).toHaveCount(2);
    await expect(page.getByText(/account or card ending ••9999/)).toBeVisible();
    await expect(page.getByText(/account or card ending ••7741/)).toBeVisible();

    // Details show the raw ledger fields behind the plain-words summary.
    const uberRow = page.getByTestId('attention-item').filter({ hasText: /ending ••9999/ });
    await uberRow.getByRole('button', { name: 'Details' }).click();
    await expect(uberRow.getByText(BANK_SENDER).first()).toBeVisible();
    await expect(uberRow.getByRole('link', { name: 'Open in Gmail' })).toHaveAttribute('href', /^https:\/\/mail\.google\.com\/mail\/\?authuser=/);

    // Assign & Remember: the customer-ID alert is mapped to the bank account and re-processed.
    const customerIdRow = page.getByTestId('attention-item').filter({ hasText: /ending ••7741/ });
    await customerIdRow.getByRole('button', { name: 'Assign' }).click();
    await expect(page.getByRole('heading', { name: 'Assign Account Identifier' })).toBeVisible();
    await page.locator('#target-account').click();
    await page.getByRole('option', { name: 'UI Gmail Bank' }).click();
    await page.getByRole('button', { name: 'Assign & Remember' }).click();
    await expectToast(page, 'Re-processing 1 parked emails');
    await waitForGmailJobsIdle(api);
    await page.reload();
    await expect(page.getByText('Needs Attention (1)')).toBeVisible();
    await openAttention(page);
    await expect(page.getByText(/ending ••7741/)).not.toBeVisible();
    const aliased = await searchAll(api, [{ field: 'accountId', operator: 'is', value: bankAccountId }]);
    expect(aliased.map((t) => t.sourcedDescription)).toEqual(['CUSTOMER ID ALERT']);

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
    await openAttention(page);
    await expect(page.getByText('Gmail import off', { exact: true })).toBeVisible();
    await expect(page.getByText('Matched UI Late Account, but Gmail import is not turned on for it.')).toBeVisible();
    expect((await attentionItems(api))[0].status).toBe('ACCOUNT_NOT_OPTED_IN');

    // Archive tucks the item away behind its own collapsed section; Unarchive brings it back.
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await expectToast(page, 'Item archived');
    await expect(page.getByText('Needs Attention (0)')).toBeVisible();
    await expect(page.getByText('Nothing needs attention right now.')).toBeVisible();
    await page.getByRole('button', { name: 'Archived (1)' }).click();
    await expect(page.getByText('Matched UI Late Account, but Gmail import is not turned on for it.')).toBeVisible();
    await page.getByRole('button', { name: 'Unarchive' }).click();
    await expectToast(page, 'Item moved back to Needs Attention');
    await expect(page.getByText('Needs Attention (1)')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Archived/ })).not.toBeVisible();
    expect((await attentionItems(api)).map((i) => i.archivedAt)).toEqual([null]);
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

    await page.goto('/legacy/settings/gmail');
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
    await page.goto('/legacy/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
    // The tile body opens the account page; the edit dialog sits behind its Edit button.
    await openAccountEditor(page, 'UI Late Account');

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
    // Narrow the union: ingestFromDate exists only on bank/credit-card responses (the codegen'd
    // broker/generic shapes no longer carry it).
    expect(late && 'ingestFromDate' in late ? late.ingestFromDate : undefined).toBe(isoDaysAgo(1));
  });

  test('disconnecting via the trash icon needs the native confirm and marks the row disconnected', async ({ page }) => {
    await page.goto('/legacy/settings/gmail');
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to disconnect this Gmail account?');
      dialog.accept();
    });
    await page.getByRole('button', { name: `Disconnect ${identity.email}` }).click();
    await expectToast(page, 'Gmail account disconnected');

    await expect.poll(async () => (await listConnections(api))[0]?.isConnected).toBe(false);
    // Soft delete: the row is still listed.
    await page.reload();
    await expect(page.getByText(identity.email).first()).toBeVisible();

    // Bank account 1234 only ever received the alert assigned to it via the alias.
    expect(await searchAll(api, [{ field: 'accountId', operator: 'is', value: bankAccountId }])).toHaveLength(1);
    const identifiers = await api.GET('/api/v1/accounts/{id}/identifiers', { params: { path: { id: bankAccountId } } });
    expect(identifiers.data?.map((i) => i.value)).toEqual(['7741']);
  });
});
