import type { ApiClient } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createCreditCard,type CreditCardAccountResponse } from '../fixtures/seed/accounts';
import { createTransaction } from '../fixtures/seed/transactions';
import { secondUser } from '../fixtures/tenancy';
import { expect, freshUser, test } from '../fixtures/test';

/**
 * Shared credit limits: several credit card accounts drawing on one pool. Each test uses its own
 * user so pool counts and totals cannot leak between workers.
 */

type Pool = NonNullable<CreditCardAccountResponse['limitPool']>;

async function getCard(api: ApiClient, id: string): Promise<CreditCardAccountResponse> {
  const res = await api.GET('/api/v1/accounts/{id}', { params: { path: { id } } });
  expect(res.response.status).toBe(200);
  return res.data as CreditCardAccountResponse;
}

async function listCard(api: ApiClient, id: string): Promise<CreditCardAccountResponse> {
  const res = await api.GET('/api/v1/accounts');
  expect(res.response.status).toBe(200);
  return (res.data as CreditCardAccountResponse[]).find((a) => a.id === id)!;
}

function cardBody(name: string, last4: string, extra: Record<string, unknown>) {
  return { type: 'credit_card', name, last4, anniversaryDate: istToday(), ...extra } as never;
}

async function postCard(api: ApiClient, body: unknown) {
  return api.POST('/api/v1/accounts', { body: body as never });
}

async function putCard(api: ApiClient, id: string, body: unknown) {
  return api.PUT('/api/v1/accounts/{id}', { params: { path: { id } }, body: body as never });
}

function errorMessage(res: { error?: unknown }): string {
  return (res.error as { message?: string } | undefined)?.message ?? '';
}

async function pooledPair(api: ApiClient) {
  const a = await createCreditCard(api, {
    name: 'HDFC Regalia',
    last4: '2222',
    creditLimit: null,
    limitPool: { name: 'HDFC shared', creditLimit: 500000 },
  });
  const pool = a.limitPool as Pool;
  const b = await createCreditCard(api, {
    name: 'HDFC Millennia',
    last4: '3333',
    creditLimit: 100000,
    limitPool: { id: pool.id },
  });
  return { a, b, pool };
}

test.describe('Shared credit limits API (@api)', () => {
  test('a card created with a new shared limit needs no limit of its own and is measured on the pool', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-create');

    const a = await createCreditCard(api, {
      name: 'HDFC Regalia',
      last4: '2222',
      creditLimit: null,
      limitPool: { name: '  HDFC shared  ', creditLimit: 500000 },
    });

    expect(a.creditLimit ?? null).toBeNull();
    expect(Number(a.effectiveCreditLimit)).toBe(500000);
    const pool = a.limitPool as Pool;
    expect(pool.name).toBe('HDFC shared');
    expect(Number(pool.creditLimit)).toBe(500000);
    expect(Number(pool.owed)).toBe(0);
    expect(Number(pool.available)).toBe(500000);
    expect(pool.memberCount).toBe(1);
    expect(pool.openMemberCount).toBe(1);
  });

  test('a second card joins by id without a limit of its own, and both see one pool with two accounts', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-join');
    const { a, b, pool } = await pooledPair(api);

    // pooledPair sends an own limit for the second card; a pooled card keeps none.
    expect(b.creditLimit ?? null).toBeNull();
    expect(Number(b.effectiveCreditLimit)).toBe(500000);
    for (const id of [a.id, b.id]) {
      const listed = await listCard(api, id);
      expect(listed.limitPool?.id).toBe(pool.id);
      expect(listed.limitPool?.memberCount).toBe(2);
    }
  });

  test('validation: unpooled cards need a limit; new pools need a name and a positive limit', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-validation');

    const noLimit = await postCard(api, cardBody('No limit', '1111', {}));
    expect(noLimit.response.status).toBe(400);
    expect(errorMessage(noLimit)).toBe('Credit limit is required');

    const noName = await postCard(api, cardBody('No name', '1112', { limitPool: { name: ' ', creditLimit: 1000 } }));
    expect(noName.response.status).toBe(400);
    expect(errorMessage(noName)).toBe('Shared limit name is required');

    const zero = await postCard(api, cardBody('Zero', '1113', { limitPool: { name: 'X', creditLimit: 0 } }));
    expect(zero.response.status).toBe(400);
    expect(errorMessage(zero)).toBe('Shared credit limit must be greater than zero');

    const missingPool = await postCard(api, cardBody('Ghost', '1115', { limitPool: { id: crypto.randomUUID() } }));
    expect(missingPool.response.status).toBe(404);

    const accounts = await api.GET('/api/v1/accounts');
    expect(accounts.data ?? []).toHaveLength(0);
  });

  test('an own limit sent with a shared limit is dropped, even one above the pool, on create and on update', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-own-limit');

    const created = await postCard(
      api,
      cardBody('Over cap', '1114', { creditLimit: 600000, limitPool: { name: 'Small', creditLimit: 500000 } })
    );
    expect(created.response.status).toBe(201);
    const card = created.data as CreditCardAccountResponse;
    expect(card.creditLimit ?? null).toBeNull();
    expect(Number(card.effectiveCreditLimit)).toBe(500000);

    const updated = await putCard(
      api,
      card.id,
      cardBody('Over cap', '1114', { creditLimit: 200000, limitPool: { id: (card.limitPool as Pool).id } })
    );
    expect(updated.response.status).toBe(200);
    for (const read of [listCard, getCard]) {
      const after = await read(api, card.id);
      expect(after.creditLimit ?? null).toBeNull();
      expect(Number(after.effectiveCreditLimit)).toBe(500000);
    }
  });

  test('utilisation is what every card in the pool owes over the shared limit, on the list and the single read', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-util');
    const { a, b } = await pooledPair(api);
    const solo = await createCreditCard(api, { name: 'Solo', last4: '4444', creditLimit: 100000 });
    await createTransaction(api, a.id, { amount: -100000 });
    await createTransaction(api, b.id, { amount: -50000 });
    await createTransaction(api, solo.id, { amount: -30000 });

    for (const read of [listCard, getCard]) {
      for (const id of [a.id, b.id]) {
        const card = await read(api, id);
        expect(Number(card.utilizationPct)).toBe(30);
        expect(Number(card.limitPool?.owed)).toBe(150000);
        expect(Number(card.limitPool?.available)).toBe(350000);
        expect(Number(card.limitPool?.utilizationPct)).toBe(30);
      }
      const soloCard = await read(api, solo.id);
      expect(Number(soloCard.utilizationPct)).toBe(30);
      expect(soloCard.limitPool ?? null).toBeNull();
    }
  });

  test('a card in credit adds nothing to what the pool owes', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-credit');
    const { a, b } = await pooledPair(api);
    await createTransaction(api, a.id, { amount: -20000 });
    await createTransaction(api, b.id, { amount: 7000 });

    expect(Number((await getCard(api, b.id)).limitPool?.owed)).toBe(20000);
  });

  test('renaming or re-limiting the pool from one card changes it for every card', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-edit');
    const { a, b, pool } = await pooledPair(api);

    const res = await putCard(
      api,
      b.id,
      cardBody('HDFC Millennia', '3333', { creditLimit: 100000, limitPool: { id: pool.id, name: 'HDFC Bank', creditLimit: 650000 } })
    );
    expect(res.response.status).toBe(200);

    const other = await getCard(api, a.id);
    expect(other.limitPool?.name).toBe('HDFC Bank');
    expect(Number(other.limitPool?.creditLimit)).toBe(650000);
    expect(Number(other.effectiveCreditLimit)).toBe(650000);
  });

  test("a closed card's unpaid balance still counts, but it is no longer an open member", async ({ request }) => {
    const { api } = await freshUser(request, 'pool-closed');
    const { a, b } = await pooledPair(api);
    await createTransaction(api, a.id, { amount: -10000, date: '2026-01-10' });
    await createTransaction(api, b.id, { amount: -5000, date: '2026-01-10' });

    const closed = await api.POST('/api/v1/accounts/{id}/close', {
      params: { path: { id: b.id } },
      body: { closedOn: '2026-02-01' },
    });
    expect(closed.response.status).toBe(200);

    const pool = (await getCard(api, a.id)).limitPool as Pool;
    expect(Number(pool.owed)).toBe(15000);
    expect(pool.memberCount).toBe(2);
    expect(pool.openMemberCount).toBe(1);
  });

  test('a pool disappears once its last card leaves it or is deleted', async ({ request }) => {
    const { api } = await freshUser(request, 'pool-prune');
    const { a, b, pool } = await pooledPair(api);

    // Leaving needs a limit of its own again.
    const noLimit = await putCard(api, a.id, cardBody('HDFC Regalia', '2222', {}));
    expect(noLimit.response.status).toBe(400);
    const left = await putCard(api, a.id, cardBody('HDFC Regalia', '2222', { creditLimit: 300000 }));
    expect(left.response.status).toBe(200);
    expect((left.data as CreditCardAccountResponse).limitPool ?? null).toBeNull();
    expect((await getCard(api, b.id)).limitPool?.memberCount).toBe(1);

    const del = await api.DELETE('/api/v1/accounts/{id}', { params: { path: { id: b.id } } });
    expect(del.response.status).toBe(200);

    const rejoin = await putCard(api, a.id, cardBody('HDFC Regalia', '2222', { limitPool: { id: pool.id } }));
    expect(rejoin.response.status).toBe(404);
  });

  test("another user can neither join nor see my pool", async ({ request }) => {
    const { api } = await freshUser(request, 'pool-owner');
    const { pool } = await pooledPair(api);
    const { api: apiB } = await secondUser(request, 'pool-intruder');

    const join = await postCard(apiB, cardBody('Intruder', '9999', { limitPool: { id: pool.id } }));
    expect(join.response.status).toBe(404);

    const theirs = await apiB.GET('/api/v1/accounts');
    expect(theirs.data ?? []).toHaveLength(0);
    const mine = (await api.GET('/api/v1/accounts')).data as CreditCardAccountResponse[];
    expect(mine.every((c) => c.limitPool?.memberCount === 2)).toBe(true);
  });
});
