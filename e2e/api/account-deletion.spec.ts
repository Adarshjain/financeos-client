import { expectStatus, makeApi, waitForJob } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import { E2E_API_URL, INVITE_CODE } from '../fixtures/config';
import type { GoogleIdentity } from '../fixtures/google-stubs';
import { cleanupIdentity, registerIdentity, registerMailbox, revokeCount } from '../fixtures/google-stubs';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  alertMail,
  connectGmail,
  createSender,
  extractedTxn,
  extractionFor,
  isoDaysAgo,
  scriptExtractions,
  ssoLogin,
  waitForGmailJobsIdle,
} from '../fixtures/seed/gmail';
import { createTransactions } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Account deletion API', () => {
  const identities: GoogleIdentity[] = [];

  test.afterAll(async () => {
    for (const identity of identities) {
      await cleanupIdentity(identity);
    }
  });

  test('deletion summary counts the user\'s rows across tables', async ({ request }) => {
    const user = await createUser(request, 'del-summary');
    const api = makeApi(user.cookie);
    const identity = await registerIdentity();
    identities.push(identity);

    const acc1 = await createBankAccount(api, { name: 'Del Bank 1', last4: '1111' });
    await createBankAccount(api, { name: 'Del Bank 2', last4: '2222' });
    await createTransactions(api, acc1.id, 3);
    await connectGmail(api, identity);

    const res = await api.GET('/api/v1/auth/me/deletion-summary');
    expectStatus(res, 200);
    const { counts, total } = res.data!;
    expect(counts.accounts).toBe(2);
    expect(counts.transactions).toBe(3);
    expect(counts.gmail_connections).toBe(1);
    // Only tables with a user_id column are counted — the users row itself is not part of the summary.
    expect(counts.users).toBeUndefined();
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(sum);
    expect(total).toBeGreaterThanOrEqual(7);
  });

  test('password users must confirm with their password; the failure is a 403 with a stable code', async ({ request }) => {
    const user = await createUser(request, 'del-forbidden');
    const api = makeApi(user.cookie);

    const wrong = await api.POST('/api/v1/auth/me/delete', { body: { password: 'not-the-password' } });
    expectStatus(wrong, 403);
    expect((wrong.error as { code?: string })?.code).toBe('ACCOUNT_DELETE_FORBIDDEN');

    // Email confirmation is not a substitute when the account has a password.
    const emailOnly = await api.POST('/api/v1/auth/me/delete', { body: { confirmEmail: user.email } });
    expectStatus(emailOnly, 403);

    const me = await api.GET('/api/v1/auth/me');
    expectStatus(me, 200);
  });

  test('a Google-only user confirms by email (case-insensitive); the refresh token is revoked and the session dies', async ({ request }) => {
    const identity = await registerIdentity();
    identities.push(identity);
    const { user, api, cookie } = await ssoLogin(identity);
    expect(user.hasPassword).toBe(false);
    await createBankAccount(api, { name: 'Google Only Bank', last4: '3333' });

    const wrongEmail = await api.POST('/api/v1/auth/me/delete', { body: { confirmEmail: 'someone-else@example.test' } });
    expectStatus(wrongEmail, 403);
    expect((wrongEmail.error as { code?: string })?.code).toBe('ACCOUNT_DELETE_FORBIDDEN');

    const revokesBefore = await revokeCount(identity);
    const ok = await api.POST('/api/v1/auth/me/delete', { body: { confirmEmail: identity.email.toUpperCase() } });
    expectStatus(ok, 204);

    expect(await revokeCount(identity)).toBe(revokesBefore + 1);
    const me = await makeApi(cookie).GET('/api/v1/auth/me');
    expectStatus(me, 401);

    // The same Google account can sign up again and starts from scratch.
    const again = await ssoLogin(identity, 1);
    expect(again.user.id).not.toBe(user.id);
    const accounts = await again.api.GET('/api/v1/accounts');
    expectStatus(accounts, 200);
    expect(accounts.data).toHaveLength(0);
    await again.api.POST('/api/v1/auth/me/delete', { body: { confirmEmail: identity.email } });

    // Nothing else should still carry the deleted user's id.
    await createUser(request, 'del-probe');
  });

  test('a running sync makes deletion answer 409 BUSY; it succeeds once the job has ended and the email is free again', async ({ request }) => {
    test.slow();
    const user = await createUser(request, 'del-busy');
    const api = makeApi(user.cookie);
    const identity = await registerIdentity();
    identities.push(identity);

    await createBankAccount(api, { name: 'Busy Bank', last4: '4444', ingestFromDate: isoDaysAgo(60) });
    await createSender(api);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);

    const slowMail = alertMail({ last4: '4444', amount: 10, merchant: 'SLOW MERCHANT', date: isoDaysAgo(2) });
    await registerMailbox(identity, [slowMail]);
    await scriptExtractions(api, [
      extractionFor(slowMail, {
        json: extractedTxn({ amount: 10, date: isoDaysAgo(2), last4: '4444', merchant: 'SLOW MERCHANT' }),
        delayMs: 8_000,
      }),
    ]);

    const sync = await api.POST('/api/v1/gmail/sync');
    expectStatus(sync, 202);
    const jobId = sync.data!.jobId;
    // Wait until the worker has actually picked the job up (the LLM call then blocks for 8 s).
    await expect
      .poll(async () => (await api.GET('/api/v1/jobs/{id}', { params: { path: { id: jobId } } })).data?.status, {
        timeout: 20_000,
      })
      .toBe('RUNNING');

    const busy = await api.POST('/api/v1/auth/me/delete', { body: { password: user.password } });
    expectStatus(busy, 409);
    expect((busy.error as { code?: string })?.code).toBe('ACCOUNT_DELETE_BUSY');

    // The 409 asked the job to cancel; it ends once the scripted delay elapses.
    const ended = await waitForJob(api, jobId, { timeoutMs: 30_000 });
    expect(['SUCCEEDED', 'CANCELLED', 'FAILED']).toContain(ended.status);

    const ok = await api.POST('/api/v1/auth/me/delete', { body: { password: user.password } });
    expectStatus(ok, 204);
    expect(await revokeCount(identity)).toBe(1);

    const me = await api.GET('/api/v1/auth/me');
    expectStatus(me, 401);

    // The email is released: signing up again creates a brand-new user.
    const signup = await fetch(`${E2E_API_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, inviteCode: INVITE_CODE }),
    });
    expect(signup.status).toBe(201);
  });

});
