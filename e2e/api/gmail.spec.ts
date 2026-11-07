import { randomUUID } from 'node:crypto';

import { expectStatus, makeApi, waitForJob } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { llmCalls, resetLlm, setLlmMode } from '../fixtures/control';
import { genBankPdf } from '../fixtures/gen/statements';
import type { GoogleIdentity, Mailbox } from '../fixtures/google-stubs';
import {
  addMapping,
  cleanupIdentity,
  listQueries,
  messagesListCount,
  registerIdentity,
  registerMailbox,
  removeMappings,
  unmatchedCount,
} from '../fixtures/google-stubs';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  alertMail,
  archivedAttentionItems,
  attentionItems,
  BANK_SENDER,
  connectGmail,
  createSender,
  daysAgo,
  extractedTxn,
  extractionFor,
  GMAIL_REDIRECT_URI,
  gmailCallback,
  GOOGLE_AUTH_URL,
  isoDaysAgo,
  issuedGmailState,
  listConnections,
  otpMail,
  runSync,
  scriptExtractions,
  SETTINGS_GMAIL_URL,
  statementMail,
  waitForGmailJobsIdle,
} from '../fixtures/seed/gmail';
import { getInbox, inboxRow } from '../fixtures/seed/nav';
import { getAccountStatements } from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expectForeign, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/**
 * Gmail ingestion end to end against the WireMock-played Google (fixtures/google-stubs.ts). Each
 * describe owns a fresh user, identity and mailbox; scripted `email-extract` answers are keyed by
 * subject because one discovery pass drains its messages in an order the test cannot control.
 *
 * Ordering note: creating an account or sender enqueues a GMAIL_SYNC job of its own once a
 * connection exists (AFTER_COMMIT events), so accounts and senders are seeded *before* connecting,
 * and every state assertion after a later change waits for the user's jobs to go idle.
 */

test.describe('Gmail connect, senders and empty sync', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  const extras: GoogleIdentity[] = [];

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-connect');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
  });

  test.afterAll(async () => {
    await cleanupIdentity(identity);
    for (const extra of extras) await cleanupIdentity(extra);
  });

  test('oauth start returns a consent URL scoped to gmail.readonly and the birthday with the server callback', async () => {
    const res = await api.GET('/api/v1/gmail/oauth/start');
    expectStatus(res, 200);
    const url = new URL(res.data!.authorizationUrl);
    expect(res.data!.authorizationUrl.startsWith(`${GOOGLE_AUTH_URL}?`)).toBe(true);
    expect(url.searchParams.get('client_id')).toBe('e2e-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(GMAIL_REDIRECT_URI);
    expect(url.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/user.birthday.read',
    );
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.has('approval_prompt')).toBe(false);
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  test('callback stores the connection and redirects to settings with the mailbox address', async () => {
    const location = await gmailCallback(api, { code: identity.codes[0] });
    expect(location).toBe(`${SETTINGS_GMAIL_URL}?gmail=success&email=${encodeURIComponent(identity.email)}`);

    const connections = await listConnections(api);
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({ email: identity.email, isPrimary: true, isConnected: true });
    expect(connections[0].connectedAt).toBeTruthy();

    // Reconnecting the same mailbox updates the row instead of adding a second one.
    await gmailCallback(api, { code: identity.codes[1] });
    expect(await listConnections(api)).toHaveLength(1);
  });

  test('callback failures redirect back with gmail=error', async () => {
    const denied = await gmailCallback(api, { error: 'access_denied' });
    expect(denied).toBe(`${SETTINGS_GMAIL_URL}?gmail=error&message=access_denied`);

    const noCode = await gmailCallback(api, {});
    expect(noCode).toBe(`${SETTINGS_GMAIL_URL}?gmail=error&message=missing_code`);

    const broken = await registerIdentity({ tokenStatus: 401 });
    extras.push(broken);
    const failed = await gmailCallback(api, { code: broken.codes[0] });
    expect(failed.startsWith(`${SETTINGS_GMAIL_URL}?gmail=error&message=`)).toBe(true);

    // A grant without a refresh token cannot be used for background sync and is rejected.
    const noRefresh = await registerIdentity({ withoutRefreshToken: true });
    extras.push(noRefresh);
    const rejected = await gmailCallback(api, { code: noRefresh.codes[0] });
    expect(rejected).toContain('gmail=error&message=');
    expect(decodeURIComponent(rejected.replace(/\+/g, ' '))).toContain('No refresh token received from Google');
    expect(await listConnections(api)).toHaveLength(1);
  });

  test('callback only accepts a state issued to this user: another user\'s, a forged and a missing state connect nothing', async ({ request }) => {
    // An attacker starts Gmail connect for their own mailbox and sends the callback link to this user.
    const { api: attackerApi } = await secondUser(request, 'gmail-state-attacker');
    const attackerMailbox = await registerIdentity();
    extras.push(attackerMailbox);
    const attackersState = await issuedGmailState(attackerApi);
    const before = await listConnections(api);

    for (const state of [attackersState, 'forged.1.nonce.signature', '']) {
      const location = await gmailCallback(api, { code: attackerMailbox.codes[0], state });
      expect(location, `state "${state}"`).toBe(`${SETTINGS_GMAIL_URL}?gmail=error&message=invalid_state`);
    }

    expect(await listConnections(api)).toEqual(before);
    expect(await listConnections(attackerApi)).toHaveLength(0);
  });

  test('senders CRUD', async () => {
    const created = await createSender(api, { name: undefined });
    expect(created.senderAddress).toBe(BANK_SENDER);
    expect(created.name ?? null).toBeNull();
    expect(created.enabled).toBe(true);

    const blank = await api.POST('/api/v1/gmail/senders', { body: { senderAddress: '   ' } });
    expectStatus(blank, 400);

    // A sender is an email address or a domain; anything else is rejected.
    const malformed = await api.POST('/api/v1/gmail/senders', { body: { senderAddress: 'not an email' } });
    expectStatus(malformed, 400);

    const updated = await api.PUT('/api/v1/gmail/senders/{id}', {
      params: { path: { id: created.id } },
      body: { senderAddress: BANK_SENDER.toUpperCase(), name: 'Renamed Bank', enabled: false },
    });
    expectStatus(updated, 200);
    expect(updated.data).toMatchObject({ id: created.id, senderAddress: BANK_SENDER, name: 'Renamed Bank', enabled: false });

    const list = await api.GET('/api/v1/gmail/senders');
    expectStatus(list, 200);
    // Connecting also gave the user the NPS document senders; the user's own sender is one of them.
    expect(list.data?.map((s) => s.id)).toContain(created.id);

    const del = await api.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id: created.id } } });
    expectStatus(del, 204);
    const after = await api.GET('/api/v1/gmail/senders');
    expect(after.data?.map((s) => s.id)).not.toContain(created.id);

    const missing = await api.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id: randomUUID() } } });
    expect([400, 404]).toContain(missing.response.status);
  });

  test('a sync with no enabled senders succeeds with an all-zero summary and never calls Gmail', async () => {
    await waitForGmailJobsIdle(api);
    // Connecting added the NPS document senders; remove every sender, as a user would, so none is enabled.
    const senders = await api.GET('/api/v1/gmail/senders');
    expectStatus(senders, 200);
    for (const sender of senders.data ?? []) {
      expectStatus(await api.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id: sender.id } } }), 204);
    }
    expect((await api.GET('/api/v1/gmail/senders')).data?.filter((x) => x.enabled)).toHaveLength(0);
    const before = await messagesListCount(identity);

    const { job, summary } = await runSync(api);
    expect(job.status).toBe('SUCCEEDED');
    expect(summary).toMatchObject({
      discovered: 0,
      processed: 0,
      created: 0,
      reconciled: 0,
      skipped: 0,
      parked: 0,
      failedRetryable: 0,
      failedPermanent: 0,
      backlogRemaining: 0,
      listed: 0,
      senders: [],
      statusCounts: {},
      messages: [],
      messagesTruncated: 0,
    });
    expect(await messagesListCount(identity)).toBe(before);
  });
});

test.describe('Gmail sync journey', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let mailbox: Mailbox;
  let accountId: string;
  let lateAccountId: string;
  let unresolvedLedgerId: string;
  let unmatchedBefore = 0;

  const swiggy = alertMail({ last4: '1234', amount: 1250.5, merchant: 'SWIGGY', date: isoDaysAgo(5), sentAt: daysAgo(5) });
  const otp = otpMail({ sentAt: daysAgo(4) });
  const uber = alertMail({ last4: '9999', amount: 640, merchant: 'UBER', date: isoDaysAgo(3), sentAt: daysAgo(3) });
  const oldCafe = alertMail({ last4: '1234', amount: 300, merchant: 'OLD CAFE', date: isoDaysAgo(90), sentAt: daysAgo(2) });

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-sync');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    unmatchedBefore = await unmatchedCount();

    // Seed before connecting so no event-driven sync races the scripted one.
    const account = await createBankAccount(api, {
      name: 'E2E Gmail Bank',
      last4: '1234',
      openingBalance: 50000,
      ingestFromDate: isoDaysAgo(60),
    });
    accountId = account.id;
    await createSender(api);
    // Connecting scans the bank and NPS document senders at once, before the journey's mailbox exists: an
    // empty mailbox answers those list calls (an unstubbed call counts as unmatched), then is replaced.
    const connectMailbox = await registerMailbox(identity, []);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await removeMappings(connectMailbox.mappingIds);

    const statementPdf = await genBankPdf({
      bank: 'HDFC Bank',
      accountLast10: '5566771234',
      periodStart: isoDaysAgo(40),
      periodEnd: isoDaysAgo(10),
      opening: 50000,
      rows: [
        { date: isoDaysAgo(30), description: 'SALARY CREDIT', credit: 40000 },
        { date: isoDaysAgo(20), description: 'GROCERY MART', debit: 2200 },
      ],
    });
    const statement = statementMail({ pdf: statementPdf, sentAt: daysAgo(1) });
    mailbox = await registerMailbox(identity, [swiggy, otp, uber, oldCafe, statement]);

    await scriptExtractions(api, [
      extractionFor(swiggy, { json: extractedTxn({ amount: 1250.5, date: isoDaysAgo(5), last4: '1234', merchant: 'SWIGGY' }) }),
      extractionFor(otp, { json: { isTransaction: false } }),
      extractionFor(uber, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) }),
      extractionFor(oldCafe, { json: extractedTxn({ amount: 300, date: isoDaysAgo(90), last4: '1234', merchant: 'OLD CAFE' }) }),
    ]);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
    // The journal is shared with every other worker, so assert on the delta this describe caused.
    expect(await unmatchedCount(), 'WireMock saw requests no stub matched').toBe(unmatchedBefore);
  });

  test('first sync: alert created, OTP skipped, unknown card parked, pre-watermark skipped, statement reconciled', async () => {
    test.slow();
    const { job, summary } = await runSync(api);
    expect(job.status, JSON.stringify(job)).toBe('SUCCEEDED');
    expect(summary).toMatchObject({
      discovered: 5,
      processed: 5,
      created: 1,
      reconciled: 1,
      skipped: 2,
      parked: 1,
      failedRetryable: 0,
      failedPermanent: 0,
      backlogRemaining: 0,
      listed: 5,
      statusCounts: {
        CREATED: 1,
        RECONCILED: 1,
        SKIPPED_NOT_TRANSACTION: 1,
        SKIPPED_BEFORE_WATERMARK: 1,
        UNRESOLVED_ACCOUNT: 1,
      },
      messagesTruncated: 0,
    });
    // Every processed email is listed, problems first.
    expect(summary.messages).toHaveLength(5);
    expect(summary.messages[0].status).toBe('UNRESOLVED_ACCOUNT');

    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const alert = txns.find((t) => t.source === 'gmail_transaction_alert');
    expect(alert, 'the SWIGGY alert should be a transaction').toBeDefined();
    // Amounts are signed in the API: debits negative, credits positive.
    expect(alert).toMatchObject({
      amount: -1250.5,
      date: isoDaysAgo(5),
      reviewType: 'AUTO_REVIEWED',
      sourcedDescription: 'SWIGGY',
    });
    expect(alert?.reviewReasons ?? []).toEqual([]);

    const fromStatement = txns.filter((t) => t.source === 'gmail_statement');
    expect(fromStatement.map((t) => [t.sourcedDescription, t.amount]).sort()).toEqual([
      ['GROCERY MART', -2200],
      ['SALARY CREDIT', 40000],
    ]);
    expect(txns).toHaveLength(3);

    const statements = await getAccountStatements(api, accountId);
    expect(statements).toHaveLength(1);
    expect(statements[0].source).toBe('gmail');
    expect(statements[0].transactionCount).toBe(2);

    const attention = await attentionItems(api);
    expect(attention).toHaveLength(1);
    expect(attention[0]).toMatchObject({
      status: 'UNRESOLVED_ACCOUNT',
      extractedLast4: '9999',
      gmailMessageId: uber.id,
      senderAddress: BANK_SENDER,
      subject: uber.subject,
    });
    expect(attention[0].error).toContain('9999');
    unresolvedLedgerId = attention[0].id;
  });

  test('second sync discovers nothing new and lists with an after: cursor near the previous run', async () => {
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 0, processed: 0, created: 0, reconciled: 0, skipped: 0, parked: 0 });

    const queries = await listQueries(identity);
    expect(queries.length).toBeGreaterThanOrEqual(2);
    const last = queries[queries.length - 1];
    const match = last.match(/^from:\(([^)]+)\) after:(\d+)$/);
    expect(match, `unexpected list query ${last}`).not.toBeNull();
    expect(match![1].split(' OR ')).toContain(BANK_SENDER);
    const afterEpoch = Number(match![2]);
    const nowEpoch = Math.floor(Date.now() / 1000);
    // 15-minute overlap behind the previous listing, allowing for the run so far.
    expect(afterEpoch).toBeGreaterThan(nowEpoch - 15 * 60 - 10 * 60);
    expect(afterEpoch).toBeLessThan(nowEpoch);
  });

  test('archive hides a parked item from the list and the Inbox; unarchive restores it; a retry drops the archive', async ({ request }) => {
    test.slow();
    const archive = (ledgerId: string, client = api) =>
      client.POST('/api/v1/gmail/attention/{ledgerId}/archive', { params: { path: { ledgerId } } });
    const unarchive = (ledgerId: string, client = api) =>
      client.POST('/api/v1/gmail/attention/{ledgerId}/unarchive', { params: { path: { ledgerId } } });
    const inboxCount = async () => inboxRow(await getInbox(api), 'gmail-attention')?.count ?? 0;

    const [active] = await attentionItems(api);
    expect(active).toMatchObject({ id: unresolvedLedgerId, archivedAt: null, connectionEmail: identity.email, accountId: null, accountName: null });
    expect(await inboxCount()).toBe(1);

    expectStatus(await archive(unresolvedLedgerId), 204);
    expect(await attentionItems(api)).toHaveLength(0);
    const [archived] = await archivedAttentionItems(api);
    expect(archived.id).toBe(unresolvedLedgerId);
    expect(archived.archivedAt).toBeTruthy();
    expect(await inboxCount()).toBe(0);

    // Archiving twice keeps the first timestamp.
    expectStatus(await archive(unresolvedLedgerId), 204);
    expect((await archivedAttentionItems(api))[0].archivedAt).toBe(archived.archivedAt);

    expectStatus(await archive(randomUUID()), 404);
    expectStatus(await unarchive(randomUUID()), 404);
    const { api: apiB } = await secondUser(request, 'gmail-archive-b');
    expect([400, 404]).toContain((await unarchive(unresolvedLedgerId, apiB)).response.status);
    expect([400, 404]).toContain((await archive(unresolvedLedgerId, apiB)).response.status);
    expect(await archivedAttentionItems(apiB)).toHaveLength(0);

    expectStatus(await unarchive(unresolvedLedgerId), 204);
    expect((await attentionItems(api)).map((i) => i.id)).toEqual([unresolvedLedgerId]);
    expect(await archivedAttentionItems(api)).toHaveLength(0);
    expect(await inboxCount()).toBe(1);

    // A retry of an archived item that parks again shows it again.
    expectStatus(await archive(unresolvedLedgerId), 204);
    await scriptExtractions(api, [
      extractionFor(uber, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) }),
    ]);
    const retry = await api.POST('/api/v1/gmail/attention/{ledgerId}/retry', {
      params: { path: { ledgerId: unresolvedLedgerId } },
    });
    expectStatus(retry, 202);
    expect((await waitForJob(api, retry.data!.jobId)).status).toBe('SUCCEEDED');
    const [reparked] = await attentionItems(api);
    expect(reparked).toMatchObject({ id: unresolvedLedgerId, status: 'UNRESOLVED_ACCOUNT', archivedAt: null });
    expect(await archivedAttentionItems(api)).toHaveLength(0);
  });

  test('parked alert: retry surfaces not-opted-in, opting the account in re-activates and imports it', async () => {
    test.slow();
    // The card the alert names now exists — but without an ingest date, so it stays parked.
    const late = await createBankAccount(api, { name: 'E2E Late Account', last4: '9999' });
    lateAccountId = late.id;
    await waitForGmailJobsIdle(api);
    // The alert's number now matches the new (not opted in) account: its mail is counted in the grouped
    // "import off" row for that account and no longer listed one by one.
    const importOffGroups = async () => (await api.GET('/api/v1/gmail/attention/groups')).data!.importOff;
    expect(await attentionItems(api)).toHaveLength(0);
    expect(await importOffGroups()).toEqual([expect.objectContaining({ accountId: late.id, accountName: 'E2E Late Account', count: 1 })]);

    // A retry re-extracts the mail, and so does the re-activation below: script both answers now
    // (keyed entries wait in the queue until a matching prompt arrives).
    const uberAnswer = extractionFor(uber, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) });
    await scriptExtractions(api, [uberAnswer, uberAnswer]);

    const retry = await api.POST('/api/v1/gmail/attention/{ledgerId}/retry', {
      params: { path: { ledgerId: unresolvedLedgerId } },
    });
    expectStatus(retry, 202);
    const job = await waitForJob(api, retry.data!.jobId);
    expect(job.status).toBe('SUCCEEDED');
    expect(job.result).toMatchObject({ discovered: 0, processed: 1, parked: 1 });

    // Import-off mail is archived on arrival: the per-email list stays empty and the grouped row counts it.
    expect(await attentionItems(api)).toHaveLength(0);
    expect(await importOffGroups()).toEqual([expect.objectContaining({ accountId: late.id, count: 1 })]);
    const parked = await archivedAttentionItems(api);
    expect(parked).toHaveLength(1);
    expect(parked[0]).toMatchObject({ id: unresolvedLedgerId, status: 'ACCOUNT_NOT_OPTED_IN', extractedLast4: '9999' });
    expect(parked[0].error).toContain('not opted in');

    const unknown = await api.POST('/api/v1/gmail/attention/{ledgerId}/retry', {
      params: { path: { ledgerId: randomUUID() } },
    });
    expectStatus(unknown, 404);

    // Opting in fires AccountIngestChangedEvent: the row is re-activated and a sync is enqueued.
    const optIn = await api.PUT('/api/v1/accounts/{id}', {
      params: { path: { id: late.id } },
      body: { type: 'bank_account', name: 'E2E Late Account', last4: '9999', ingestFromDate: isoDaysAgo(60) },
    });
    expectStatus(optIn, 200);
    await waitForGmailJobsIdle(api);

    expect(await attentionItems(api)).toHaveLength(0);
    expect(await importOffGroups()).toEqual([]);
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: late.id }]);
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ amount: -640, sourcedDescription: 'UBER', source: 'gmail_transaction_alert', reviewType: 'AUTO_REVIEWED' });

    // A row that has been imported is no longer retryable.
    const done = await api.POST('/api/v1/gmail/attention/{ledgerId}/retry', {
      params: { path: { ledgerId: unresolvedLedgerId } },
    });
    expectStatus(done, 400);
    expect((done.error as { message?: string })?.message).toContain('not in a retryable attention status');
  });

  test('rescan lowers the backfill floor and lists a bounded window; future dates are rejected', async () => {
    test.slow();
    // The 365-day cap is gone: only a future date is rejected.
    const future = await api.POST('/api/v1/gmail/rescan', { body: { fromDate: isoDaysAgo(-3) } });
    expectStatus(future, 400);
    expect((future.error as { message?: string })?.message).toContain('Rescan date cannot be in the future');

    // The account's ingestFromDate (60 days ago) already ratcheted the backfill floor there and the
    // first sync covered that window, so a rescan must reach further back to produce a new listing.
    const listsBefore = (await listQueries(identity)).length;
    const rescan = await api.POST('/api/v1/gmail/rescan', { body: { fromDate: isoDaysAgo(120) } });
    expectStatus(rescan, 202);
    const job = await waitForJob(api, rescan.data!.jobId);
    expect(job.status).toBe('SUCCEEDED');
    expect(job.result).toMatchObject({ discovered: 0 });

    const queries = (await listQueries(identity)).slice(listsBefore);
    const backfill = queries.find((q) => q.includes(' before:'));
    expect(backfill, `no backfill listing among ${JSON.stringify(queries)}`).toBeDefined();
    const m = backfill!.match(/^from:\(([^)]+)\) after:(\d+) before:(\d+)$/);
    expect(m).not.toBeNull();
    const floorEpoch = Number(m![2]);
    const beforeEpoch = Number(m![3]);
    const floorTarget = Math.floor(daysAgo(120).getTime() / 1000);
    expect(Math.abs(floorEpoch - floorTarget)).toBeLessThan(2 * 86400);
    expect(beforeEpoch).toBeGreaterThan(floorEpoch);
    expect(beforeEpoch).toBeLessThan(Math.floor(Date.now() / 1000));
  });

  test('cleanup removes unreconciled alerts before a date and the ledger keeps them from coming back', async () => {
    test.slow();
    const before = isoDaysAgo(4);
    const preview = await api.GET('/api/v1/accounts/{id}/gmail-cleanup-preview', {
      params: { path: { id: accountId }, query: { before } },
    });
    expectStatus(preview, 200);
    expect(preview.data).toEqual({ count: 1, before });

    const cleanup = await api.POST('/api/v1/accounts/{id}/gmail-cleanup', {
      params: { path: { id: accountId }, query: { before } },
    });
    expectStatus(cleanup, 200);
    expect(cleanup.data).toEqual({ deletedCount: 1 });

    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    expect(txns.filter((t) => t.source === 'gmail_transaction_alert')).toHaveLength(0);
    expect(txns.filter((t) => t.source === 'gmail_statement')).toHaveLength(2);

    const again = await api.GET('/api/v1/accounts/{id}/gmail-cleanup-preview', {
      params: { path: { id: accountId }, query: { before } },
    });
    expect(again.data?.count).toBe(0);

    // The message is CLEANED_UP in the ledger: the next sync neither re-discovers nor re-imports it.
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 0, created: 0 });
    const after = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    expect(after.filter((t) => t.source === 'gmail_transaction_alert')).toHaveLength(0);
  });

  // The imported statement covers day 40..10 ago on this bank account: a bank alert is tagged when its date is on or
  // before period end - 1 and the statement does not list it; later days stay untagged (the next statement may still carry it).
  test('an alert inside a covered period that the statement lacks is created and tagged Not on statement', async () => {
    test.slow();
    const covered = alertMail({ last4: '1234', amount: 777, merchant: 'COVERED CAFE', date: isoDaysAgo(20), sentAt: daysAgo(20) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, covered]);
    await scriptExtractions(api, [
      extractionFor(covered, { json: extractedTxn({ amount: 777, date: isoDaysAgo(20), last4: '1234', merchant: 'COVERED CAFE' }) }),
    ]);
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 1, processed: 1, created: 1, skipped: 0 });
    const row = summary.messages.find((m) => m.gmailMessageId === covered.id);
    expect(row?.status).toBe('CREATED');
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const cafe = txns.filter((t) => t.sourcedDescription === 'COVERED CAFE');
    expect(cafe).toHaveLength(1);
    expect(cafe[0].reviewReasons).toContain('NOT_ON_STATEMENT');
    expect(cafe[0].notOnStatement?.periodEnd).toBe(isoDaysAgo(10));
  });

  test('an alert in the last days of a covered period is created untagged', async () => {
    test.slow();
    // Period end is day 10; a bank alert dated on the end day is inside the last day, so it stays Pending.
    const late = alertMail({ last4: '1234', amount: 123, merchant: 'LAST DAY CAFE', date: isoDaysAgo(10), sentAt: daysAgo(10) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, late]);
    await scriptExtractions(api, [
      extractionFor(late, { json: extractedTxn({ amount: 123, date: isoDaysAgo(10), last4: '1234', merchant: 'LAST DAY CAFE' }) }),
    ]);
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 1, processed: 1, created: 1 });
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const row = txns.filter((t) => t.sourcedDescription === 'LAST DAY CAFE');
    expect(row).toHaveLength(1);
    expect(row[0].reviewReasons).not.toContain('NOT_ON_STATEMENT');
  });

  test('an alert that matches a statement line attaches to it instead of creating a transaction', async () => {
    test.slow();
    // The statement lists GROCERY MART 2200 on day 20.
    const grocery = alertMail({ last4: '1234', amount: 2200, merchant: 'GROCERY MART', date: isoDaysAgo(20), sentAt: daysAgo(20) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, grocery]);
    await scriptExtractions(api, [
      extractionFor(grocery, { json: extractedTxn({ amount: 2200, date: isoDaysAgo(20), last4: '1234', merchant: 'GROCERY MART' }) }),
    ]);
    const before = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 1, processed: 1, created: 0, skipped: 1 });
    const row = summary.messages.find((m) => m.gmailMessageId === grocery.id);
    expect(row?.status).toBe('SKIPPED_DUPLICATE');
    const attached = (row?.transactions ?? []) as Array<{ id: string }>;
    expect(attached).toHaveLength(1);
    expect(attached[0].id).toBeTruthy();
    const after = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    expect(after).toHaveLength(before.length);
    expect(after.some((t) => t.id === attached[0].id)).toBe(true);
  });

  test('a USD alert creates a transaction with no rupee amount until its statement arrives', async () => {
    test.slow();
    const usd = alertMail({ last4: '1234', amount: 20, merchant: 'OVERSEAS SAAS', date: isoDaysAgo(2), sentAt: daysAgo(2) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, usd]);
    await scriptExtractions(api, [
      extractionFor(usd, {
        json: { ...extractedTxn({ amount: 20, date: isoDaysAgo(2), last4: '1234', merchant: 'OVERSEAS SAAS' }), currency: 'USD' },
      }),
    ]);
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 1, processed: 1, created: 1 });
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const foreign = txns.filter((t) => t.sourcedDescription === 'OVERSEAS SAAS');
    expect(foreign).toHaveLength(1);
    expect(foreign[0].amount ?? null).toBeNull();
    expect(foreign[0].originalCurrency).toBe('USD');
    expect(Math.abs(foreign[0].originalAmount ?? 0)).toBe(20);
  });

  test('a later statement reconciles an earlier alert instead of duplicating it', async () => {
    test.slow();
    const amazon = alertMail({ last4: '1234', amount: 999, merchant: 'AMAZON', date: isoDaysAgo(7), sentAt: daysAgo(7) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, amazon]);
    await scriptExtractions(api, [
      extractionFor(amazon, { json: extractedTxn({ amount: 999, date: isoDaysAgo(7), last4: '1234', merchant: 'AMAZON' }) }),
    ]);
    const first = await runSync(api);
    expect(first.summary).toMatchObject({ discovered: 1, processed: 1, created: 1 });

    const pdf = await genBankPdf({
      bank: 'HDFC Bank',
      accountLast10: '5566771234',
      periodStart: isoDaysAgo(9),
      periodEnd: isoDaysAgo(3),
      opening: 87800,
      rows: [
        { date: isoDaysAgo(7), description: 'AMAZON', debit: 999 },
        { date: isoDaysAgo(6), description: 'FUEL STATION', debit: 500 },
      ],
    });
    const statement2 = statementMail({ pdf, sentAt: daysAgo(0) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, statement2]);
    const second = await runSync(api);
    expect(second.summary).toMatchObject({ discovered: 1, processed: 1, reconciled: 1, created: 0 });

    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const amazonTxns = txns.filter((t) => t.sourcedDescription === 'AMAZON');
    // One transaction, not two: the statement line was linked to the alert instead of materialised.
    expect(amazonTxns).toHaveLength(1);
    expect(amazonTxns[0].source).toBe('gmail_transaction_alert');
    // Reconciliation clears UNRECONCILED; the row only flips to AUTO_REVIEWED once no other reason
    // (e.g. CATEGORY_UNVERIFIED from the categoriser) is left on it.
    expect(amazonTxns[0].reviewReasons).not.toContain('UNRECONCILED');
    if (amazonTxns[0].reviewReasons.length === 0) {
      expect(amazonTxns[0].reviewType).toBe('AUTO_REVIEWED');
    } else {
      expect(amazonTxns[0].reviewType).toBe('NEEDS_REVIEW');
    }
    expect(txns.find((t) => t.sourcedDescription === 'FUEL STATION')?.source).toBe('gmail_statement');
    expect(await getAccountStatements(api, accountId)).toHaveLength(2);
  });

  test('disconnect is a soft delete: the row stays listed as disconnected and sync/rescan refuse', async () => {
    const [connection] = await listConnections(api);
    const del = await api.DELETE('/api/v1/gmail/connections/{id}', { params: { path: { id: connection.id } } });
    expectStatus(del, 204);

    const after = await listConnections(api);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ id: connection.id, isConnected: false, isPrimary: true });

    const sync = await api.POST('/api/v1/gmail/sync');
    expectStatus(sync, 400);
    const rescan = await api.POST('/api/v1/gmail/rescan', { body: { fromDate: isoDaysAgo(30) } });
    expectStatus(rescan, 400);
    expect((rescan.error as { message?: string })?.message).toContain('No connected Gmail connection');

    // The late account's alert survives the disconnect.
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: lateAccountId }]);
    expect(txns).toHaveLength(1);
  });
});

test.describe('Gmail extraction failure paths', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;

  const unscripted = alertMail({ last4: '1234', amount: 11, merchant: 'UNSCRIPTED', date: isoDaysAgo(2) });
  const noKeys = alertMail({ last4: '1234', amount: 22, merchant: 'NOKEYS', date: isoDaysAgo(2) });
  const noDate = alertMail({ last4: '1234', amount: 33, merchant: 'NODATE', date: isoDaysAgo(2) });

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-fail');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    await createBankAccount(api, { name: 'E2E Fail Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    await createSender(api);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await registerMailbox(identity, [unscripted, noKeys, noDate]);
    await setLlmMode(api, 'STRICT');
    await scriptExtractions(api, [
      extractionFor(noKeys, { error: { kind: 'NO_KEYS', message: 'No API keys configured for this user' } }),
      extractionFor(noDate, {
        json: { isTransaction: true, amount: 33, currency: 'INR', direction: 'DEBIT', description: 'NODATE', accountLast4: '1234', confidence: 0.5 },
      }),
    ]);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
    await cleanupIdentity(identity);
  });

  test('every failure is FAILED_RETRYABLE with attempt 1 and a next retry, visible only with includeRetryable', async () => {
    test.slow();
    const { job, summary } = await runSync(api);
    expect(job.status).toBe('SUCCEEDED');
    expect(summary).toMatchObject({ discovered: 3, processed: 3, created: 0, failedRetryable: 3, failedPermanent: 0 });

    expect(await attentionItems(api, false)).toHaveLength(0);
    const retryable = await attentionItems(api, true);
    expect(retryable).toHaveLength(3);
    for (const item of retryable) {
      expect(item.status).toBe('FAILED_RETRYABLE');
      expect(item.attemptCount).toBe(1);
      expect(item.nextRetryAt).toBeTruthy();
    }
    const byMessage = new Map(retryable.map((i) => [i.gmailMessageId, i]));
    expect(byMessage.get(unscripted.id)?.error).toContain('No scripted LLM response');
    expect(byMessage.get(noKeys.id)?.error).toBe('needs attention: add an API key in Settings');
    expect(byMessage.get(noDate.id)?.error).toContain('Missing required transaction field: date');

    // Backoff: nothing is due yet, so a second sync processes nothing but reports the backlog.
    const again = await runSync(api);
    expect(again.summary).toMatchObject({ discovered: 0, processed: 0, backlogRemaining: 3 });
  });
});

test.describe('Gmail alert date later than the email', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;

  // Sent at 12:00 UTC (17:30 IST), so the IST sent day equals isoDaysAgo(n).
  const misread = alertMail({ last4: '7106', amount: 209.7, merchant: 'MISREAD DATE', date: isoDaysAgo(6), sentAt: daysAgo(6) });
  const sameDay = alertMail({ last4: '7106', amount: 408, merchant: 'SAME DAY', date: isoDaysAgo(6), sentAt: daysAgo(6) });
  const earlier = alertMail({ last4: '7106', amount: 55, merchant: 'EARLIER DAY', date: isoDaysAgo(8), sentAt: daysAgo(6) });

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-date-cap');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    await createBankAccount(api, { name: 'E2E Date Cap Bank', last4: '7106', ingestFromDate: isoDaysAgo(60) });
    await createSender(api);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await registerMailbox(identity, [misread, sameDay, earlier]);
    await scriptExtractions(api, [
      // The model reads a date five days after the email was sent.
      extractionFor(misread, { json: extractedTxn({ amount: 209.7, date: isoDaysAgo(1), last4: '7106', merchant: 'MISREAD DATE' }) }),
      extractionFor(sameDay, { json: extractedTxn({ amount: 408, date: isoDaysAgo(6), last4: '7106', merchant: 'SAME DAY' }) }),
      extractionFor(earlier, { json: extractedTxn({ amount: 55, date: isoDaysAgo(8), last4: '7106', merchant: 'EARLIER DAY' }) }),
    ]);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
  });

  test('a date after the sent day is capped to it and flagged; same-day and earlier dates are kept', async () => {
    test.slow();
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ created: 3 });

    const byMerchant = new Map((await searchAll(api)).map((t) => [t.sourcedDescription, t]));

    const capped = byMerchant.get('MISREAD DATE')!;
    expect(capped.date).toBe(isoDaysAgo(6));
    // Pending alerts are auto-reviewed with no reasons; the date is still capped to the send day.
    expect(capped.reviewType).toBe('AUTO_REVIEWED');
    expect(capped.reviewReasons ?? []).not.toContain('DATE_CORRECTED');
    expect(capped.reviewReasons ?? []).not.toContain('UNRECONCILED');

    for (const [merchant, date] of [['SAME DAY', isoDaysAgo(6)], ['EARLIER DAY', isoDaysAgo(8)]] as const) {
      const kept = byMerchant.get(merchant)!;
      expect(kept.date, merchant).toBe(date);
      expect(kept.reviewReasons, merchant).not.toContain('DATE_CORRECTED');
    }
  });

  test('the extraction prompt tells the model the day the email was sent', async () => {
    const prompt = (await llmCalls(api, 'email-extract')).find((c) => c.prompt.includes(`Subject: ${misread.subject}`))?.prompt;
    expect(prompt).toContain(`Email sent on: ${isoDaysAgo(6)} `);
  });

  test('changing the date of a capped alert yourself keeps it flag-free and auto-reviewed', async () => {
    const capped = (await searchAll(api)).find((t) => t.sourcedDescription === 'MISREAD DATE')!;
    const res = await api.PUT('/api/v1/transactions/{id}', {
      params: { path: { id: capped.id } },
      body: { date: isoDaysAgo(7), amount: -209.7, description: capped.description ?? 'MISREAD DATE' },
    });
    expectStatus(res, 200);
    expect(res.data!.date).toBe(isoDaysAgo(7));
    expect(res.data!.reviewReasons ?? []).toEqual([]);
    expect(res.data!.reviewType).toBe('AUTO_REVIEWED');
  });
});

test.describe('Gmail account identifier aliases', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let mailbox: Mailbox;
  let accountId: string;
  let ledgerId: string;

  // Banks often alert by customer ID, whose digits match no account or card the user has.
  const customerIdMail = alertMail({ last4: '7741', amount: 210, merchant: 'CUSTOMER ID ALERT', date: isoDaysAgo(2) });

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-alias');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    const account = await createBankAccount(api, { name: 'Alias Target Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    accountId = account.id;
    await createSender(api);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    mailbox = await registerMailbox(identity, [customerIdMail]);
    // Initial extraction + the re-extraction after the assign re-activates the row.
    const answer = extractionFor(customerIdMail, {
      json: extractedTxn({ amount: 210, date: isoDaysAgo(2), last4: '7741', merchant: 'CUSTOMER ID ALERT' }),
    });
    await scriptExtractions(api, [answer, answer]);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
  });

  test('assign-and-remember creates the alias, re-activates the parked row and imports it', async () => {
    test.slow();
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 1, processed: 1, parked: 1, created: 0 });
    const [parked] = await attentionItems(api);
    expect(parked).toMatchObject({ status: 'UNRESOLVED_ACCOUNT', extractedLast4: '7741' });
    ledgerId = parked.id;

    const assign = await api.POST('/api/v1/gmail/attention/{ledgerId}/assign', {
      params: { path: { ledgerId } },
      body: { accountId, kind: 'CUSTOMER_ID' },
    });
    expectStatus(assign, 200);
    expect(assign.data?.reactivatedCount).toBe(1);
    expect(assign.data?.jobIds).toHaveLength(1);
    const job = await waitForJob(api, assign.data!.jobIds[0]);
    expect(job.status).toBe('SUCCEEDED');
    expect(job.result).toMatchObject({ processed: 1, created: 1 });

    expect(await attentionItems(api)).toHaveLength(0);
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ amount: -210, sourcedDescription: 'CUSTOMER ID ALERT', source: 'gmail_transaction_alert' });

    const identifiers = await api.GET('/api/v1/accounts/{id}/identifiers', { params: { path: { id: accountId } } });
    expectStatus(identifiers, 200);
    expect(identifiers.data).toHaveLength(1);
    expect(identifiers.data?.[0]).toMatchObject({ id: assign.data?.identifierId, value: '7741', kind: 'CUSTOMER_ID' });
  });

  test('the next alert with the same customer ID resolves through the alias without parking', async () => {
    test.slow();
    const again = alertMail({ last4: '7741', amount: 75, merchant: 'CUSTOMER ID AGAIN', date: isoDaysAgo(1) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, again]);
    await scriptExtractions(api, [
      extractionFor(again, { json: extractedTxn({ amount: 75, date: isoDaysAgo(1), last4: '7741', merchant: 'CUSTOMER ID AGAIN' }) }),
    ]);

    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 1, processed: 1, created: 1, parked: 0 });
    expect(await attentionItems(api)).toHaveLength(0);
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    expect(txns.map((t) => t.sourcedDescription).sort()).toEqual(['CUSTOMER ID AGAIN', 'CUSTOMER ID ALERT']);
  });

  test('assign refuses rows that are not parked as unresolved and unknown rows', async () => {
    const done = await api.POST('/api/v1/gmail/attention/{ledgerId}/assign', {
      params: { path: { ledgerId } },
      body: { accountId },
    });
    expectStatus(done, 400);
    expect((done.error as { message?: string })?.message).toContain('Only UNRESOLVED_ACCOUNT items can be assigned');

    const unknown = await api.POST('/api/v1/gmail/attention/{ledgerId}/assign', {
      params: { path: { ledgerId: randomUUID() } },
      body: { accountId },
    });
    expectStatus(unknown, 404);
  });
});

test.describe('Gmail attention groups', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let accountId: string;

  // Two alerts name ••5550 and one names ••5551; no account carries either number.
  const first = alertMail({ last4: '5550', amount: 120, merchant: 'GROUP ONE', date: isoDaysAgo(4) });
  const second = alertMail({ last4: '5550', amount: 80, merchant: 'GROUP TWO', date: isoDaysAgo(3) });
  const other = alertMail({ last4: '5551', amount: 45, merchant: 'GROUP OTHER', date: isoDaysAgo(2) });
  const answerFor = (m: ReturnType<typeof alertMail>, amount: number, last4: string, merchant: string, daysAgo: number) =>
    extractionFor(m, { json: extractedTxn({ amount, date: isoDaysAgo(daysAgo), last4, merchant }) });

  const groups = async () => (await api.GET('/api/v1/gmail/attention/groups')).data!;

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-groups');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    const account = await createBankAccount(api, { name: 'Group Target Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    accountId = account.id;
    await createSender(api);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await registerMailbox(identity, [first, second, other]);
    // Once for the first sync, once for the re-extraction after the number is assigned.
    const one = answerFor(first, 120, '5550', 'GROUP ONE', 4);
    const two = answerFor(second, 80, '5550', 'GROUP TWO', 3);
    const three = answerFor(other, 45, '5551', 'GROUP OTHER', 2);
    await scriptExtractions(api, [one, two, three, one, two, three]);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
  });

  test('unresolved mail with a number is one group per number, and is not listed one by one', async () => {
    test.slow();
    const { summary } = await runSync(api);
    expect(summary).toMatchObject({ discovered: 3, processed: 3, parked: 3, created: 0 });

    const g = await groups();
    expect(g.unknownNumbers.map((n) => [n.last4, n.count]).sort()).toEqual([['5550', 2], ['5551', 1]]);
    expect(g.unknownNumbers.every((n) => n.kinds.includes('ALERT'))).toBe(true);
    expect(g.importOff).toEqual([]);
    expect(g.ignored).toEqual([]);

    const ungrouped = await api.GET('/api/v1/gmail/attention/ungrouped', { params: { query: { page: 0, size: 20, includeRetryable: false } } });
    expectStatus(ungrouped, 200);
    expect(ungrouped.data?.content).toHaveLength(0);
  });

  test('ignore moves the number to archived and ignored; stop ignoring brings it back', async () => {
    const ignore = await api.POST('/api/v1/gmail/attention/numbers/ignore', { body: { last4: '5551' } });
    expectStatus(ignore, 200);
    expect(ignore.data?.count).toBe(1);
    const afterIgnore = await groups();
    expect(afterIgnore.unknownNumbers.map((n) => n.last4)).toEqual(['5550']);
    expect(afterIgnore.ignored).toEqual([expect.objectContaining({ id: ignore.data!.id, last4: '5551', count: 1 })]);

    const archived = await api.GET('/api/v1/gmail/attention/ungrouped', { params: { query: { page: 0, size: 20, includeRetryable: false, archived: true } } });
    expect(archived.data?.content.map((i) => i.extractedLast4)).toEqual(['5551']);

    const stop = await api.DELETE('/api/v1/gmail/attention/numbers/ignored/{id}', { params: { path: { id: ignore.data!.id } } });
    expectStatus(stop, 200);
    expect(stop.data?.count).toBe(1);
    const restored = await groups();
    expect(restored.ignored).toEqual([]);
    expect(restored.unknownNumbers.map((n) => n.last4).sort()).toEqual(['5550', '5551']);
  });

  test('assigning a number settles all of its mail into the account and clears the group', async () => {
    test.slow();
    const assign = await api.POST('/api/v1/gmail/attention/numbers/assign', { body: { last4: '5550', accountId } });
    expectStatus(assign, 200);
    expect(assign.data?.reactivatedCount).toBe(2);
    for (const jobId of assign.data!.jobIds) expect((await waitForJob(api, jobId)).status).toBe('SUCCEEDED');
    await waitForGmailJobsIdle(api);

    const after = await groups();
    expect(after.unknownNumbers.map((n) => n.last4)).toEqual(['5551']);
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    expect(txns.map((t) => t.sourcedDescription).sort()).toEqual(['GROUP ONE', 'GROUP TWO']);
  });

  test('foreign accounts and unknown ignored ids are refused, never a 500', async ({ request }) => {
    const { api: apiB } = await secondUser(request, 'gmail-groups-b');
    const accountB = await createBankAccount(apiB, { name: 'Group B Bank', last4: '4321' });
    const foreign = await api.POST('/api/v1/gmail/attention/numbers/assign', { body: { last4: '5551', accountId: accountB.id } });
    expect([400, 404]).toContain(foreign.response.status);
    const unknown = await api.DELETE('/api/v1/gmail/attention/numbers/ignored/{id}', { params: { path: { id: randomUUID() } } });
    expect([400, 404]).toContain(unknown.response.status);
    expect((await (await apiB.GET('/api/v1/gmail/attention/groups')).data)!.unknownNumbers).toEqual([]);
  });
});

test.describe('Gmail attention ungrouped bulk actions and counts', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;

  // One alert names an unknown number (a group); one names no number at all (stays an individual email).
  const numbered = alertMail({ last4: '5560', amount: 120, merchant: 'BULK GROUPED', date: isoDaysAgo(4) });
  const loose = alertMail({ last4: '', amount: 80, merchant: 'BULK LOOSE', date: isoDaysAgo(3) });

  const groups = async () => (await api.GET('/api/v1/gmail/attention/groups')).data!;
  const inboxCount = async () => inboxRow(await getInbox(api), 'gmail-attention')?.count ?? 0;
  const summaryOf = async (ungroupedOnly: boolean) => {
    const res = await api.GET('/api/v1/gmail/attention/summary', { params: { query: { includeRetryable: false, ungroupedOnly } } });
    expectStatus(res, 200);
    return Object.fromEntries(res.data!.map((r) => [r.reason, r.count]));
  };

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-bulk');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    // Two accounts, so a mail with no number matches neither and stays unresolved.
    await createBankAccount(api, { name: 'Bulk Bank One', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    await createBankAccount(api, { name: 'Bulk Bank Two', last4: '4321', ingestFromDate: isoDaysAgo(60) });
    await createSender(api);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await registerMailbox(identity, [numbered, loose]);
    await scriptExtractions(api, [
      extractionFor(numbered, { json: extractedTxn({ amount: 120, date: isoDaysAgo(4), last4: '5560', merchant: 'BULK GROUPED' }) }),
      extractionFor(loose, {
        json: { isTransaction: true, amount: 80, currency: 'INR', direction: 'DEBIT', date: isoDaysAgo(3), description: 'BULK LOOSE', confidence: 0.92 },
      }),
    ]);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
  });

  test('the Settings badge, the Inbox row and the card header share one total; the summary can be limited to individual emails', async () => {
    test.slow();
    await runSync(api);
    const g = await groups();
    expect(g.unknownNumbers.map((n) => n.last4)).toEqual(['5560']);
    // 1 unknown-number group + 1 individual email.
    expect(g.total).toBe(2);
    expect(await inboxCount()).toBe(g.total);

    expect(await summaryOf(false)).toEqual({ NO_ACCOUNT: 2 });
    expect(await summaryOf(true)).toEqual({ NO_ACCOUNT: 1 });
    const byReason = await api.GET('/api/v1/gmail/attention/ungrouped', { params: { query: { page: 0, size: 20, includeRetryable: false, reason: 'NO_ACCOUNT' } } });
    expect(byReason.data?.content.map((i) => i.extractedLast4)).toEqual([null]);
    const other = await api.GET('/api/v1/gmail/attention/ungrouped', { params: { query: { page: 0, size: 20, includeRetryable: false, reason: 'NO_AI_KEY' } } });
    expect(other.data?.content).toHaveLength(0);
  });

  test('Archive all on a reason (ungrouped only) leaves the unknown-number group untouched', async () => {
    const res = await api.POST('/api/v1/gmail/attention/archive-all', { body: { reason: 'NO_ACCOUNT', ungroupedOnly: true } });
    expectStatus(res, 200);
    expect(res.data?.affected).toBe(1);

    const g = await groups();
    expect(g.unknownNumbers.map((n) => [n.last4, n.count])).toEqual([['5560', 1]]);
    expect(g.total).toBe(1);
    expect(await inboxCount()).toBe(1);
    expect(await summaryOf(true)).toEqual({});
    const archived = await archivedAttentionItems(api);
    expect(archived.map((i) => i.extractedLast4)).toEqual([null]);

    // Nothing individual is left, so a second Retry all / Archive all on the reason does nothing.
    const again = await api.POST('/api/v1/gmail/attention/retry-all', { body: { reason: 'NO_ACCOUNT', ungroupedOnly: true } });
    expect(again.data?.affected).toBe(0);
    expect((await groups()).unknownNumbers).toHaveLength(1);
  });
});

test.describe('Gmail tenancy', () => {
  test('another user cannot touch connections, senders, ledger rows or cleanup', async ({ request }) => {
    test.slow();
    const userA = await createUser(request, 'gmail-tenant-a');
    const apiA = makeApi(userA.cookie);
    const identity = await registerIdentity();
    try {
      const account = await createBankAccount(apiA, { name: 'Tenant Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
      const sender = await createSender(apiA);
      const connection = await connectGmail(apiA, identity);
      await waitForGmailJobsIdle(apiA);
      const parkedMail = alertMail({ last4: '7777', amount: 5, merchant: 'PARKED', date: isoDaysAgo(2) });
      await registerMailbox(identity, [parkedMail]);
      await scriptExtractions(apiA, [
        extractionFor(parkedMail, { json: extractedTxn({ amount: 5, date: isoDaysAgo(2), last4: '7777', merchant: 'PARKED' }) }),
      ]);
      await runSync(apiA);
      const [ledger] = await attentionItems(apiA);
      expect(ledger).toBeDefined();

      const { api: apiB } = await secondUser(request, 'gmail-tenant-b');
      const statuses: Record<string, number> = {};
      statuses.disconnect = await expectForeign(apiB, 'DELETE', `/api/v1/gmail/connections/${connection.id}`);
      statuses.updateSender = await expectForeign(apiB, 'PUT', `/api/v1/gmail/senders/${sender.id}`, {
        senderAddress: 'hijack@example.test',
      });
      statuses.deleteSender = await expectForeign(apiB, 'DELETE', `/api/v1/gmail/senders/${sender.id}`);
      statuses.retry = await expectForeign(apiB, 'POST', `/api/v1/gmail/attention/${ledger.id}/retry`);
      const accountB = await createBankAccount(apiB, { name: 'Tenant B Bank', last4: '4321' });
      statuses.assignForeignRow = await expectForeign(apiB, 'POST', `/api/v1/gmail/attention/${ledger.id}/assign`, {
        accountId: accountB.id,
      });
      // A's own row, but B's account as the target.
      statuses.assignForeignAccount = await expectForeign(apiA, 'POST', `/api/v1/gmail/attention/${ledger.id}/assign`, {
        accountId: accountB.id,
      });
      statuses.cleanupPreview = await expectForeign(
        apiB,
        'GET',
        `/api/v1/accounts/${account.id}/gmail-cleanup-preview?before=${isoDaysAgo(0)}`
      );
      statuses.cleanup = await expectForeign(apiB, 'POST', `/api/v1/accounts/${account.id}/gmail-cleanup?before=${isoDaysAgo(0)}`);
      // Ownership checks answer 400 (ValidationException); tenant-filtered lookups answer 404. Never 500.
      for (const [name, status] of Object.entries(statuses)) {
        expect([400, 404], `${name} returned ${status}`).toContain(status);
      }

      // B sees none of A's Gmail state.
      expect(await listConnections(apiB)).toHaveLength(0);
      expect((await apiB.GET('/api/v1/gmail/senders')).data).toHaveLength(0);
      expect(await attentionItems(apiB)).toHaveLength(0);

      // A's state is intact.
      expect((await listConnections(apiA))[0].isConnected).toBe(true);
      expect((await apiA.GET('/api/v1/gmail/senders')).data?.[0].senderAddress).toBe(BANK_SENDER);
      expect(await attentionItems(apiA)).toHaveLength(1);
    } finally {
      await resetLlm(apiA);
      await cleanupIdentity(identity);
    }
  });
});

test.describe('Gmail token rejection and reconnect', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let connectionId: string;
  let failingRefreshMapping: string | null = null;
  let unmatchedBefore = 0;

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-reconnect');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    unmatchedBefore = await unmatchedCount();
    // A sender is what makes a sync actually talk to Google (no senders → the sync returns early),
    // and an empty mailbox is what lets the repaired sync at the end list nothing and succeed.
    await createSender(api);
    await registerMailbox(identity, []);
    const connection = await connectGmail(api, identity);
    connectionId = connection.id;
    await waitForGmailJobsIdle(api);
    expect(connection.needsReconnect).toBe(false);
    expect(connection.authFailedAt ?? null).toBeNull();
  });

  test.afterAll(async () => {
    if (failingRefreshMapping) await removeMappings([failingRefreshMapping]);
    await cleanupIdentity(identity);
    expect(await unmatchedCount(), 'WireMock saw requests no stub matched').toBe(unmatchedBefore);
  });

  test('a refresh token Google rejects fails the sync as an auth error and flags the mailbox', async () => {
    test.slow();
    // Priority 0 beats the identity's own refresh stub: Google now answers invalid_grant, as it does
    // for a token minted under a Testing-mode consent screen after seven days.
    failingRefreshMapping = await addMapping({
      name: `token-refresh-dead-${identity.id}`,
      priority: 0,
      request: {
        method: 'POST',
        urlPath: '/google/oauth2/token',
        bodyPatterns: [{ contains: 'grant_type=refresh_token' }, { contains: `refresh_token=${identity.refreshToken}` }],
      },
      response: {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' },
      },
    });

    const { job } = await runSync(api);
    expect(job.status, JSON.stringify(job)).toBe('FAILED');
    expect(job.errorMessage ?? '').toContain('invalid_grant');

    const [connection] = (await listConnections(api)).filter((c) => c.id === connectionId);
    expect(connection.isConnected, 'the user still wants this mailbox').toBe(true);
    expect(connection.needsReconnect).toBe(true);
    expect(connection.authFailedAt).toBeTruthy();
  });

  test('a second failure keeps the first failure time', async () => {
    const before = (await listConnections(api)).find((c) => c.id === connectionId)!.authFailedAt;
    const { job } = await runSync(api);
    expect(job.status).toBe('FAILED');
    const after = (await listConnections(api)).find((c) => c.id === connectionId)!.authFailedAt;
    expect(after).toBe(before);
  });

  test('reconnecting the same mailbox repairs it', async () => {
    await removeMappings([failingRefreshMapping!]);
    failingRefreshMapping = null;

    const repaired = await connectGmail(api, identity, 1);
    expect(repaired.id, 'reconnect upserts the existing row').toBe(connectionId);
    expect(repaired.needsReconnect).toBe(false);
    expect(repaired.authFailedAt ?? null).toBeNull();
    await waitForGmailJobsIdle(api);

    const { job } = await runSync(api);
    expect(job.status, JSON.stringify(job)).toBe('SUCCEEDED');
  });
});

test.describe('Gmail attention digest marker', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let unmatchedBefore = 0;

  const orphan = alertMail({ last4: '4242', amount: 999, merchant: 'ORPHAN STORE', date: isoDaysAgo(3), sentAt: daysAgo(3) });

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-attention');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    unmatchedBefore = await unmatchedCount();
    await createSender(api);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await registerMailbox(identity, [orphan]);
    await scriptExtractions(api, [
      extractionFor(orphan, { json: extractedTxn({ amount: 999, date: isoDaysAgo(3), last4: '4242', merchant: 'ORPHAN STORE' }) }),
    ]);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
    expect(await unmatchedCount(), 'WireMock saw requests no stub matched').toBe(unmatchedBefore);
  });

  test('the on-demand tick stamps new attention items once; a retry clears the stamp', async () => {
    test.slow();
    const { job } = await runSync(api);
    expect(job.status, JSON.stringify(job)).toBe('SUCCEEDED');
    const [parked] = await attentionItems(api);
    expect(parked).toMatchObject({ status: 'UNRESOLVED_ACCOUNT', extractedLast4: '4242' });
    expect(parked.attentionNotifiedAt ?? null, 'not announced yet').toBeNull();

    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 0 } }), 200);
    const first = await api.POST('/api/v1/notifications/evaluate');
    expectStatus(first, 200);
    expect(first.data!.failed).toBe(0);

    const [announced] = await attentionItems(api);
    expect(announced.attentionNotifiedAt).toBeTruthy();

    // Second pass: already announced, nothing new.
    expectStatus(await api.POST('/api/v1/notifications/evaluate'), 200);
    expect((await attentionItems(api))[0].attentionNotifiedAt).toBe(announced.attentionNotifiedAt);

    // Retrying puts the item back in the queue and clears the stamp, so a second parking is announced again.
    // Scripted LLM answers are consumed once, so the retry needs its extraction re-armed to park again.
    await scriptExtractions(api, [
      extractionFor(orphan, { json: extractedTxn({ amount: 999, date: isoDaysAgo(3), last4: '4242', merchant: 'ORPHAN STORE' }) }),
    ]);
    const retry = await api.POST('/api/v1/gmail/attention/{ledgerId}/retry', { params: { path: { ledgerId: parked.id } } });
    expectStatus(retry, 202);
    const retried = await waitForJob(api, retry.data!.jobId);
    expect(retried.status).toBe('SUCCEEDED');
    const [reparked] = await attentionItems(api);
    expect(reparked.id).toBe(parked.id);
    expect(reparked.attentionNotifiedAt ?? null).toBeNull();
  });
});
