import { type ApiClient, expectStatus } from '../fixtures/api';
import { type AccountDetectSeedEntity, clearAccountDetect, seedAccountDetect } from '../fixtures/control';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { todayString } from '../fixtures/seed/transactions';
import { expectForeign, newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const entity = (over: Partial<AccountDetectSeedEntity>): AccountDetectSeedEntity => ({
  bank: 'hdfc',
  last4: '4321',
  kind: 'CREDIT_CARD',
  existsConf: 'HIGH',
  kindConf: 'HIGH',
  first: '2025-01-10',
  last: todayString(-3),
  evidenceMails: 6,
  ...over,
});

async function items(api: ApiClient) {
  const res = await api.GET('/api/v1/account-suggestions');
  expectStatus(res, 200);
  return res.data!.items;
}

test.describe('Account suggestion answers API (@api)', () => {
  test('is-this: no drops the candidate and keeps the row, a second answer is refused', async ({ request }) => {
    const { api } = await newUser(request, 'sugg-is-this-no');
    // A bank account at Axis with no number is the one candidate for an Axis number found in mail.
    const mine = await createBankAccount(api, { name: 'My Axis', bank: 'axis', last4: null } as never);
    await seedAccountDetect(api, { entities: [entity({ bank: 'axis', last4: '9876', kind: 'ACCOUNT' })] });

    const [row] = await items(api);
    expect(row.candidateAccount).toMatchObject({ id: mine.id, name: 'My Axis' });

    const no = await api.POST('/api/v1/account-suggestions/{id}/is-this', {
      params: { path: { id: row.id } },
      body: { accountId: mine.id, yes: false },
    });
    expectStatus(no, 204);
    const after = await items(api);
    expect(after.map((i) => i.id)).toEqual([row.id]);
    expect(after[0].candidateAccount).toBeNull();

    // The candidate is gone, so answering for that account again is not valid.
    const again = await api.POST('/api/v1/account-suggestions/{id}/is-this', {
      params: { path: { id: row.id } },
      body: { accountId: mine.id, yes: true },
    });
    expect(again.response.status).toBe(400);
    await clearAccountDetect(api);
  });

  test('is-this: yes writes the number on the account and the row leaves the list', async ({ request }) => {
    const { api } = await newUser(request, 'sugg-is-this-yes');
    const mine = await createBankAccount(api, { name: 'My Axis', bank: 'axis', last4: null } as never);
    await seedAccountDetect(api, { entities: [entity({ bank: 'axis', last4: '9876', kind: 'ACCOUNT' })] });
    const [row] = await items(api);

    const yes = await api.POST('/api/v1/account-suggestions/{id}/is-this', {
      params: { path: { id: row.id } },
      body: { accountId: mine.id, yes: true },
    });
    expectStatus(yes, 204);
    expect(await items(api)).toEqual([]);

    const account = await api.GET('/api/v1/accounts/{id}', { params: { path: { id: mine.id } } });
    expectStatus(account, 200);
    expect(JSON.stringify(account.data)).toContain('9876');
    await clearAccountDetect(api);
  });

  test('is-this: an unknown id is 404 and another user cannot answer', async ({ request }) => {
    const { api } = await newUser(request, 'sugg-is-this-404');
    const mine = await createBankAccount(api, { name: 'My Axis', bank: 'axis', last4: null } as never);
    const unknown = await api.POST('/api/v1/account-suggestions/{id}/is-this', {
      params: { path: { id: '00000000-0000-4000-8000-000000000000' } },
      body: { accountId: mine.id, yes: true },
    });
    expect(unknown.response.status).toBe(404);

    await seedAccountDetect(api, { entities: [entity({ bank: 'axis', last4: '9876', kind: 'ACCOUNT' })] });
    const [row] = await items(api);
    const { api: other } = await secondUser(request, 'sugg-is-this-other');
    expect(
      await expectForeign(other, 'POST', `/api/v1/account-suggestions/${row.id}/is-this`, { accountId: mine.id, yes: true }),
    ).toBe(404);
    await clearAccountDetect(api);
  });

  test('not-part refuses the older-number link for good, and only an older-number row can be refused', async ({ request }) => {
    const { api } = await newUser(request, 'sugg-not-part');
    // 4321 was replaced by the card the user has (1111): the row reads "Older number on My HDFC card?".
    const mine = await createCreditCard(api, { name: 'My HDFC card', last4: '1111', issuer: 'HDFC', bank: 'hdfc' });
    await seedAccountDetect(api, { entities: [entity({ lifecycle: 'REPLACED', lifecycleConf: 'HIGH', linkedTo: 'hdfc:1111' })] });

    const [row] = await items(api);
    expect(row.parentAccount).toMatchObject({ id: mine.id, name: 'My HDFC card', last4: '1111' });

    const refused = await api.POST('/api/v1/account-suggestions/{id}/not-part', { params: { path: { id: row.id } } });
    expectStatus(refused, 204);
    const [after] = await items(api);
    expect(after.id).toBe(row.id);
    expect(after.parentAccount).toBeNull();

    // No older-number link is left to refuse.
    const twice = await api.POST('/api/v1/account-suggestions/{id}/not-part', { params: { path: { id: row.id } } });
    expect(twice.response.status).toBe(400);

    const unknown = await api.POST('/api/v1/account-suggestions/{id}/not-part', {
      params: { path: { id: '00000000-0000-4000-8000-000000000000' } },
    });
    expect(unknown.response.status).toBe(404);
    await clearAccountDetect(api);
  });
});
