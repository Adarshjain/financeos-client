import { type ApiClient,expectStatus, waitForJob } from '../fixtures/api';
import { resetLlm } from '../fixtures/control';
import { genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory, createRule } from '../fixtures/seed/categories';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

async function feed(api: ApiClient) {
  const res = await api.GET('/api/v1/notifications/feed', { params: { query: { page: 0, size: 50 } } });
  expectStatus(res, 200);
  return res.data!.content ?? [];
}

async function unread(api: ApiClient): Promise<number> {
  const res = await api.GET('/api/v1/notifications/feed/summary');
  expectStatus(res, 200);
  return res.data!.unread;
}

async function applyRule(api: ApiClient, ruleId: string): Promise<string> {
  const res = await api.POST('/api/v1/rules/{id}/apply', { params: { path: { id: ruleId } }, body: { all: true } });
  expectStatus(res, 202);
  const jobId = res.data!.jobId;
  const job = await waitForJob(api, jobId);
  expect(job.status).toBe('SUCCEEDED');
  return jobId;
}

// Rules only match ingested transactions, so seed one through a statement, then apply a matching rule.
async function categoriseOne(api: ApiClient, key: string): Promise<string> {
  await resetLlm(api);
  const cat = await createCategory(api);
  const account = await createBankAccount(api);
  const pdf = await genBankPdf({
    bank: 'HDFC Bank',
    accountLast10: '4455667788',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 20000,
    rows: [{ date: '2026-04-03', description: `${key} PURCHASE`, debit: 450 }],
  });
  const { job } = await uploadAndIngest(api, account.id, [{ filename: 'feed.pdf', buffer: pdf }]);
  expect(job.status).toBe('SUCCEEDED');
  const rule = await createRule(api, { merchantKey: key, categoryIds: [cat.id], matchType: 'CONTAINS' });
  return applyRule(api, rule.id);
}

test.describe('Notification feed API (@api)', () => {
  test('a new user has an empty feed and zero unread', async ({ request }) => {
    const { api } = await newUser(request, 'feed-empty');
    expect(await feed(api)).toEqual([]);
    expect(await unread(api)).toBe(0);
  });

  test('a rule apply that categorises a transaction adds one unread "Rule applied" row', async ({ request }) => {
    const { api } = await newUser(request, 'feed-rule');
    const jobId = await categoriseOne(api, 'FEEDSHOP');

    await expect.poll(async () => (await feed(api)).length).toBe(1);
    const [row] = await feed(api);
    expect(row).toMatchObject({
      kind: 'job_finished',
      title: 'Rule applied',
      body: '1 transaction categorised',
      read: false,
    });
    expect(row.refs.jobId).toBe(jobId);
    expect(await unread(api)).toBe(1);
  });

  test('a rule apply that categorises nothing adds no row', async ({ request }) => {
    const { api } = await newUser(request, 'feed-rule-zero');
    const cat = await createCategory(api);
    const rule = await createRule(api, { merchantKey: 'NOMATCHXYZ', categoryIds: [cat.id], matchType: 'CONTAINS' });
    await applyRule(api, rule.id);

    await new Promise((r) => setTimeout(r, 1500));
    expect(await feed(api)).toEqual([]);
    expect(await unread(api)).toBe(0);
  });

  test('markRead with before = row createdAt marks it read and zeroes unread', async ({ request }) => {
    const { api } = await newUser(request, 'feed-read');
    await categoriseOne(api, 'READSHOP');
    await expect.poll(async () => unread(api)).toBe(1);
    const [row] = await feed(api);

    const res = await api.POST('/api/v1/notifications/feed/read', { body: { before: row.createdAt } });
    expectStatus(res, 204);
    expect(await unread(api)).toBe(0);
    expect((await feed(api))[0].read).toBe(true);
  });

  test('clear hides a row and drops it from unread, restore brings both back', async ({ request }) => {
    const { api } = await newUser(request, 'feed-clear');
    await categoriseOne(api, 'CLEARSHOP');
    await expect.poll(async () => (await feed(api)).length).toBe(1);
    const [row] = await feed(api);

    const clear = await api.POST('/api/v1/notifications/feed/{id}/clear', { params: { path: { id: row.id } } });
    expectStatus(clear, 204);
    expect((await feed(api)).map((r) => r.id)).not.toContain(row.id);
    expect(await unread(api)).toBe(0);

    const restore = await api.POST('/api/v1/notifications/feed/{id}/restore', { params: { path: { id: row.id } } });
    expectStatus(restore, 204);
    expect((await feed(api)).map((r) => r.id)).toContain(row.id);
    expect(await unread(api)).toBe(1);
  });

  test('clear all returns the count and empties the feed', async ({ request }) => {
    const { api } = await newUser(request, 'feed-clear-all');
    await categoriseOne(api, 'ALLSHOP');
    await expect.poll(async () => (await feed(api)).length).toBe(1);

    const res = await api.POST('/api/v1/notifications/feed/clear');
    expectStatus(res, 200);
    expect(res.data).toEqual({ cleared: 1 });
    expect(await feed(api)).toEqual([]);
  });

  test("another user cannot clear or restore a user's row and sees none of them", async ({ request }) => {
    const { api: apiA } = await newUser(request, 'feed-owner');
    const { api: apiB } = await newUser(request, 'feed-other');
    await categoriseOne(apiA, 'OWNSHOP');
    await expect.poll(async () => (await feed(apiA)).length).toBe(1);
    const [row] = await feed(apiA);

    expect(await feed(apiB)).toEqual([]);
    expect(await unread(apiB)).toBe(0);
    const clear = await apiB.POST('/api/v1/notifications/feed/{id}/clear', { params: { path: { id: row.id } } });
    expectStatus(clear, 404);
    const restore = await apiB.POST('/api/v1/notifications/feed/{id}/restore', { params: { path: { id: row.id } } });
    expectStatus(restore, 404);
    expect((await feed(apiA)).map((r) => r.id)).toContain(row.id);
  });
});
