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
 * /settings/connections (Gmail) end to end in a real browser: Add mailbox through the WireMock consent screen and
 * the server callback, sender allowlist dialog, manual sync, the Needs attention card with Retry,
 * disconnect, and the account form's Gmail cleanup confirmation. One serial journey per user.
 */
/** dd/mm/yyyy, what the Dinero date fields take, for an ISO date. */
function typedDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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

  test('Add mailbox runs the consent round trip and lands back with Gmail connected', async ({ page }) => {
    test.slow();
    await page.goto('/settings/connections');
    await expect(page.getByText('No Gmail accounts yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect your first account' })).toBeVisible();

    await page.getByRole('button', { name: 'Add mailbox' }).click();
    // → WireMock consent (302) → server /api/v1/gmail/oauth/callback (302) → /settings/gmail, which the app
    // redirects to the Dinero Connections page, back here with a banner.
    await page.waitForURL(/\/settings\/connections/, { timeout: 30_000 });
    await expect(page.getByText('Gmail connected', { exact: true })).toBeVisible();
    await expect(page.getByText(identity.email).first()).toBeVisible();
    // Dinero shows the Primary badge only with several mailboxes; the primary flag is asserted through the API below.
    await expect(page.getByText('Healthy', { exact: true })).toBeVisible();
    await expect(page.getByText(/Connected /).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sync now' })).toBeVisible();

    const connections = await listConnections(api);
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({ email: identity.email, isConnected: true, isPrimary: true });
  });

  test('Add sender dialog creates an On sender', async ({ page }) => {
    await page.goto('/settings/connections');
    await expect(page.getByText('No allowed senders yet')).toBeVisible();

    await page.getByRole('button', { name: 'Add sender', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add allowed sender' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/^Sender name/).fill('E2E Bank Alerts');
    await dialog.getByLabel('Sender email address').fill(BANK_SENDER);
    // The dialog's only switch is "Enable ingestion for this sender".
    await expect(dialog.getByRole('switch')).toBeChecked();
    await dialog.getByRole('button', { name: 'Add sender', exact: true }).click();

    await expectToast(page, 'Sender added');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('E2E Bank Alerts').first()).toBeVisible();
    await expect(page.getByText(BANK_SENDER).first()).toBeVisible();
    await expect(page.getByText('On', { exact: true }).first()).toBeVisible();
    // Adding a sender enqueues a sync of its own; let it drain before the manual one.
    await waitForGmailJobsIdle(api);
  });

  test('Manually Sync Now runs a job, the parked alert appears under Needs Attention, Retry re-queues it', async ({ page }) => {
    test.slow();
    await page.goto('/settings/connections');
    await page.getByRole('button', { name: 'Sync now' }).click();
    await expectToast(page, 'Gmail sync started');
    await expectToast(page, 'Gmail sync completed');
    await expect(page.getByText('Recent sync jobs', { exact: true })).toBeVisible();
    await expect(page.getByText(/succeeded/i).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('Needs attention · 2')).toBeVisible();
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
    const assignDialog = page.getByRole('dialog', { name: 'Assign account identifier' });
    await expect(assignDialog).toBeVisible();
    await assignDialog.getByRole('combobox', { name: 'Target account' }).click();
    await page.getByRole('option', { name: /UI Gmail Bank/ }).click();
    await assignDialog.getByRole('button', { name: 'Assign & remember' }).click();
    await expectToast(page, 'Re-processing 1 parked emails');
    await waitForGmailJobsIdle(api);
    await page.reload();
    await expect(page.getByText('Needs attention · 1')).toBeVisible();
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
    await expectToast(page, 'Item queued for retry');
    await waitForGmailJobsIdle(api);
    await page.reload();
    await expect(page.getByText('Needs attention · 1')).toBeVisible();
    await expect(page.getByText('Gmail import off', { exact: true })).toBeVisible();
    await expect(page.getByText('Matched UI Late Account, but Gmail import is not turned on for it.')).toBeVisible();
    expect((await attentionItems(api))[0].status).toBe('ACCOUNT_NOT_OPTED_IN');

    // Archive tucks the item away behind its own collapsed section; Unarchive brings it back.
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await expectToast(page, 'Item archived');
    await expect(page.getByText('Needs attention', { exact: true })).toBeVisible();
    await expect(page.getByText('Nothing needs attention right now.')).toBeVisible();
    await page.getByRole('button', { name: 'Archived · 1' }).click();
    await expect(page.getByText('Matched UI Late Account, but Gmail import is not turned on for it.')).toBeVisible();
    await page.getByRole('button', { name: 'Unarchive' }).click();
    await expectToast(page, 'Item moved back to Needs attention');
    await expect(page.getByText('Needs attention · 1')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Archived/ })).not.toBeVisible();
    expect((await attentionItems(api)).map((i) => i.archivedAt)).toEqual([null]);
  });

  test('opting the account in clears Needs Attention; the sender can be edited to Off', async ({ page }) => {
    test.slow();
    const late = (await api.GET('/api/v1/accounts')).data?.find((a) => a.name === 'UI Late Account');
    expect(late).toBeDefined();
    await api.PUT('/api/v1/accounts/{id}', {
      params: { path: { id: late!.id } },
      body: { type: 'bank_account', name: 'UI Late Account', last4: '9999', ingestFromDate: isoDaysAgo(60) },
    });
    await waitForGmailJobsIdle(api);

    await page.goto('/settings/connections');
    await expect(page.getByText('Allowed senders', { exact: true })).toBeVisible();
    await expect(page.getByText('Nothing needs attention right now.')).toBeVisible();
    await expect(page.getByText(/Needs attention ·/)).not.toBeVisible();
    const imported = await searchAll(api, [{ field: 'accountId', operator: 'is', value: late!.id }]);
    expect(imported).toHaveLength(1);
    expect(imported[0].sourcedDescription).toBe('UBER');

    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Edit allowed sender' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Sender email address')).toHaveValue(BANK_SENDER);
    const ingestion = dialog.getByRole('switch');
    await expect(ingestion).toBeChecked();
    await ingestion.click();
    await expect(ingestion).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Save sender' }).click();
    await expectToast(page, 'Sender updated');
    await expect(page.getByText('Off', { exact: true }).first()).toBeVisible();
  });

  test('moving the ingest date later asks to clean up imported alerts and deletes them', async ({ page }) => {
    test.slow();
    const late = (await api.GET('/api/v1/accounts')).data?.find((a) => a.name === 'UI Late Account');
    expect(late).toBeDefined();
    // The account page's Edit button opens the edit dialog.
    await page.goto(`/accounts/${late!.id}`);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const edit = page.getByRole('dialog', { name: 'Edit account' });
    await expect(edit).toBeVisible();

    // The seeded account has no bank and the form needs one to save.
    await edit.getByRole('combobox', { name: 'Bank' }).click();
    await page.getByRole('option').first().click();

    // The UBER alert is dated 3 days ago; a watermark of yesterday makes it stale.
    await edit.getByLabel('Import emails from').fill(typedDate(isoDaysAgo(1)));
    await edit.getByRole('button', { name: 'Save account' }).click();

    const cleanup = page.getByRole('dialog', { name: 'Delete earlier Gmail transactions?' });
    await expect(cleanup).toBeVisible();
    await expect(cleanup.getByText(/Delete .*1.* Gmail-imported transactions before/)).toBeVisible();
    await cleanup.getByRole('button', { name: 'Delete & save' }).click();
    await expect(cleanup).not.toBeVisible();

    await expect
      .poll(async () => (await searchAll(api, [{ field: 'accountId', operator: 'is', value: late!.id }])).length)
      .toBe(0);
    const saved = (await api.GET('/api/v1/accounts')).data?.find((a) => a.name === 'UI Late Account');
    // Narrow the union: ingestFromDate exists only on bank/credit-card responses (the codegen'd
    // broker/generic shapes no longer carry it).
    expect(saved && 'ingestFromDate' in saved ? saved.ingestFromDate : undefined).toBe(isoDaysAgo(1));
  });

  test('disconnecting asks for confirmation and marks the mailbox disconnected', async ({ page }) => {
    await page.goto('/settings/connections');
    await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: `Disconnect ${identity.email}?` });
    await expect(confirm.getByText('Are you sure you want to disconnect this Gmail account?')).toBeVisible();
    await confirm.getByRole('button', { name: 'Disconnect', exact: true }).click();
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
