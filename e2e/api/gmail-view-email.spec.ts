import { makeApi } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { resetLlm } from '../fixtures/control';
import type { GoogleIdentity } from '../fixtures/google-stubs';
import { cleanupIdentity, registerIdentity, registerMailbox, registerMessageGone, removeMappings } from '../fixtures/google-stubs';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  connectGmail,
  createSender,
  extractedTxn,
  extractionFor,
  htmlAlertMail,
  isoDaysAgo,
  runSync,
  scriptExtractions,
  waitForGmailJobsIdle,
} from '../fixtures/seed/gmail';
import { expectForeign, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/**
 * GET /api/v1/gmail/messages/{ledgerId}/content ("View email"): the mail read live from the WireMock Gmail,
 * sanitized (no images, scripts or event handlers), current-user only, and a typed answer when it is gone.
 */
test.describe('Gmail View email (API)', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  let ledgerId: string;
  const mail = htmlAlertMail({ last4: '9999', amount: 640, merchant: 'UBER', date: isoDaysAgo(3) });

  test.beforeAll(async ({ request }) => {
    const user = await createUser(request, 'gmail-view');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    await createBankAccount(api, { name: 'E2E View Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    await createSender(api);
    const connectMailbox = await registerMailbox(identity, []);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await removeMappings(connectMailbox.mappingIds);
    await registerMailbox(identity, [mail]);
    await scriptExtractions(api, [
      extractionFor(mail, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) }),
    ]);
    const { summary } = await runSync(api);
    ledgerId = summary.messages[0].ledgerId;
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
  });

  test('returns the sanitized mail: text and link kept, image replaced by its alt, no script or handler', async () => {
    const res = await api.GET('/api/v1/gmail/messages/{ledgerId}/content', { params: { path: { ledgerId } } });
    expect(res.response.status).toBe(200);
    const body = res.data!;
    expect(body.subject).toBe(mail.subject);
    expect(body.from).toBe(mail.from);
    expect(body.to).toBe(identity.email);
    expect(body.text).toBeNull();
    expect(body.attachments).toEqual([]);
    const html = body.html!;
    expect(html).toContain('Dear');
    expect(html).toContain('E2E Bank logo');
    expect(html).toContain('Help centre');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toMatch(/<img|<script|onclick|pixel\.gif|logo\.png|@import|tracker\.example/);
  });

  test("another user's ledger id is a 404", async ({ request }) => {
    const other = await secondUser(request, 'gmail-view-other');
    await expectForeign(other.api, 'GET', `/api/v1/gmail/messages/${ledgerId}/content`);
  });

  test('a message deleted in Gmail is a 410 with the GMAIL_MESSAGE_GONE code', async () => {
    await registerMessageGone(identity, mail.id);
    const res = await api.GET('/api/v1/gmail/messages/{ledgerId}/content', { params: { path: { ledgerId } } });
    expect(res.response.status).toBe(410);
    expect((res.error as { code?: string } | undefined)?.code).toBe('GMAIL_MESSAGE_GONE');
  });
});
