import { randomUUID } from 'node:crypto';

import { expectStatus, makeApi, waitForJob } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { genBankPdf } from '../fixtures/gen/statements';
import type { GoogleIdentity, Mailbox } from '../fixtures/google-stubs';
import {
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
  listConnections,
  otpMail,
  runSync,
  scriptExtractions,
  SETTINGS_GMAIL_URL,
  statementMail,
  waitForGmailJobsIdle,
} from '../fixtures/seed/gmail';
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

  test('oauth start returns a consent URL scoped to gmail.readonly with the server callback', async () => {
    const res = await api.GET('/api/v1/gmail/oauth/start');
    expectStatus(res, 200);
    const url = new URL(res.data!.authorizationUrl);
    expect(res.data!.authorizationUrl.startsWith(`${GOOGLE_AUTH_URL}?`)).toBe(true);
    expect(url.searchParams.get('client_id')).toBe('e2e-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(GMAIL_REDIRECT_URI);
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/gmail.readonly');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('approval_prompt')).toBe('force');
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

  test('senders CRUD', async () => {
    const created = await createSender(api, { name: undefined });
    expect(created.senderAddress).toBe(BANK_SENDER);
    expect(created.name ?? null).toBeNull();
    expect(created.enabled).toBe(true);

    const blank = await api.POST('/api/v1/gmail/senders', { body: { senderAddress: '   ' } });
    expectStatus(blank, 400);

    // FINDING: the address is only checked for blankness — a malformed sender is accepted as-is.
    const malformed = await api.POST('/api/v1/gmail/senders', { body: { senderAddress: 'not-an-email' } });
    expectStatus(malformed, 200);
    await api.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id: malformed.data!.id } } });

    const updated = await api.PUT('/api/v1/gmail/senders/{id}', {
      params: { path: { id: created.id } },
      body: { senderAddress: BANK_SENDER.toUpperCase(), name: 'Renamed Bank', enabled: false },
    });
    expectStatus(updated, 200);
    expect(updated.data).toMatchObject({ id: created.id, senderAddress: BANK_SENDER, name: 'Renamed Bank', enabled: false });

    const list = await api.GET('/api/v1/gmail/senders');
    expectStatus(list, 200);
    expect(list.data?.map((s) => s.id)).toEqual([created.id]);

    const del = await api.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id: created.id } } });
    expectStatus(del, 204);
    const after = await api.GET('/api/v1/gmail/senders');
    expect(after.data).toHaveLength(0);

    const missing = await api.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id: randomUUID() } } });
    expect([400, 404]).toContain(missing.response.status);
  });

  test('a sync with no enabled senders succeeds with an all-zero summary and never calls Gmail', async () => {
    await waitForGmailJobsIdle(api);
    const before = await messagesListCount(identity);

    const { job, summary } = await runSync(api);
    expect(job.status).toBe('SUCCEEDED');
    expect(summary).toEqual({
      discovered: 0,
      processed: 0,
      created: 0,
      reconciled: 0,
      skipped: 0,
      parked: 0,
      failedRetryable: 0,
      failedPermanent: 0,
      backlogRemaining: 0,
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
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);

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
    expect(summary).toEqual({
      discovered: 5,
      processed: 5,
      created: 1,
      reconciled: 1,
      skipped: 2,
      parked: 1,
      failedRetryable: 0,
      failedPermanent: 0,
      backlogRemaining: 0,
    });

    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const alert = txns.find((t) => t.source === 'gmail_transaction_alert');
    expect(alert, 'the SWIGGY alert should be a transaction').toBeDefined();
    // Amounts are signed in the API: debits negative, credits positive.
    expect(alert).toMatchObject({
      amount: -1250.5,
      date: isoDaysAgo(5),
      reviewType: 'NEEDS_REVIEW',
      sourcedDescription: 'SWIGGY',
    });
    expect(alert?.reviewReasons).toContain('UNRECONCILED');

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
    expect(match![1]).toBe(BANK_SENDER);
    const afterEpoch = Number(match![2]);
    const nowEpoch = Math.floor(Date.now() / 1000);
    // 15-minute overlap behind the previous listing, allowing for the run so far.
    expect(afterEpoch).toBeGreaterThan(nowEpoch - 15 * 60 - 10 * 60);
    expect(afterEpoch).toBeLessThan(nowEpoch);
  });

  test('parked alert: retry surfaces not-opted-in, opting the account in re-activates and imports it', async () => {
    test.slow();
    // The card the alert names now exists — but without an ingest date, so it stays parked.
    const late = await createBankAccount(api, { name: 'E2E Late Account', last4: '9999' });
    lateAccountId = late.id;
    await waitForGmailJobsIdle(api);
    expect((await attentionItems(api)).map((i) => i.id)).toEqual([unresolvedLedgerId]);

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

    const parked = await attentionItems(api);
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
    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: late.id }]);
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ amount: -640, sourcedDescription: 'UBER', source: 'gmail_transaction_alert', reviewType: 'NEEDS_REVIEW' });

    // A row that has been imported is no longer retryable.
    const done = await api.POST('/api/v1/gmail/attention/{ledgerId}/retry', {
      params: { path: { ledgerId: unresolvedLedgerId } },
    });
    expectStatus(done, 400);
    expect((done.error as { message?: string })?.message).toContain('not in a retryable attention status');
  });

  test('rescan lowers the backfill floor and lists a bounded window; too-old dates are rejected', async () => {
    test.slow();
    const tooOld = await api.POST('/api/v1/gmail/rescan', { body: { fromDate: isoDaysAgo(400) } });
    expectStatus(tooOld, 400);
    expect((tooOld.error as { message?: string })?.message).toContain('Rescan date cannot be earlier than');

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

  test('a later statement reconciles an earlier alert instead of duplicating it', async () => {
    test.slow();
    const amazon = alertMail({ last4: '1234', amount: 999, merchant: 'AMAZON', date: isoDaysAgo(12), sentAt: daysAgo(12) });
    await removeMappings(mailbox.mappingIds);
    mailbox = await registerMailbox(identity, [...mailbox.messages, amazon]);
    await scriptExtractions(api, [
      extractionFor(amazon, { json: extractedTxn({ amount: 999, date: isoDaysAgo(12), last4: '1234', merchant: 'AMAZON' }) }),
    ]);
    const first = await runSync(api);
    expect(first.summary).toMatchObject({ discovered: 1, processed: 1, created: 1 });

    const pdf = await genBankPdf({
      bank: 'HDFC Bank',
      accountLast10: '5566771234',
      periodStart: isoDaysAgo(15),
      periodEnd: isoDaysAgo(8),
      opening: 87800,
      rows: [
        { date: isoDaysAgo(12), description: 'AMAZON', debit: 999 },
        { date: isoDaysAgo(11), description: 'FUEL STATION', debit: 500 },
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
      statuses.cleanupPreview = await expectForeign(
        apiB,
        'GET',
        `/api/v1/accounts/${account.id}/gmail-cleanup-preview?before=${isoDaysAgo(0)}`
      );
      statuses.cleanup = await expectForeign(apiB, 'POST', `/api/v1/accounts/${account.id}/gmail-cleanup?before=${isoDaysAgo(0)}`);
      console.log(`[gmail tenancy] cross-tenant statuses: ${JSON.stringify(statuses)}`);

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
