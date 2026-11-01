import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import { createTransaction, searchAll } from '../fixtures/seed/transactions';
import { newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('Tags API (@api)', () => {
  test('create, list with counts, search page, rename and delete', async ({ request }) => {
    const { api } = await newUser(request, 'tags-crud');
    const bank = await createBankAccount(api, { name: 'Tags Bank' });
    const goa = await createCategory(api, 'Goa trip');
    const work = await createCategory(api, 'Work');
    await createTransaction(api, bank.id, { amount: -100, description: 'Tag row 1', tagIds: [goa.id] });
    await createTransaction(api, bank.id, { amount: -200, description: 'Tag row 2', tagIds: [goa.id, work.id] });

    const list = await api.GET('/api/v1/tags');
    expectStatus(list, 200);
    expect(list.data!.find((t) => t.id === goa.id)?.transactionCount).toBe(2);
    expect(list.data!.find((t) => t.id === work.id)?.transactionCount).toBe(1);

    const page = await api.GET('/api/v1/tags/page', { params: { query: { search: 'goa', page: 0, size: 10 } } });
    expectStatus(page, 200);
    expect(page.data!.content.map((t) => t.name)).toEqual(['Goa trip']);

    const renamed = await api.PUT('/api/v1/tags/{id}', { params: { path: { id: goa.id } }, body: { name: 'Goa 2026' } });
    expectStatus(renamed, 200);
    expect(renamed.data).toMatchObject({ id: goa.id, name: 'Goa 2026', transactionCount: 2 });
    const shown = await searchAll(api, [{ field: 'tag', operator: 'is', value: goa.id }]);
    expect(shown.map((t) => t.description).sort()).toEqual(['Tag row 1', 'Tag row 2']);
    expect(shown[0].tags.map((t) => t.name)).toContain('Goa 2026');

    // Deleting a tag removes it from its transactions and changes nothing else.
    expectStatus(await api.DELETE('/api/v1/tags/{id}', { params: { path: { id: goa.id } } }), 204);
    const after = await searchAll(api, [{ field: 'accountId', operator: 'is', value: bank.id }]);
    expect(after).toHaveLength(2);
    expect(after.flatMap((t) => t.tags.map((x) => x.id))).toEqual([work.id]);
    expectStatus(await api.GET('/api/v1/tags/{id}', { params: { path: { id: goa.id } } }), 404);
  });

  test('creating a name that exists returns that tag, renaming onto an existing name is a conflict, a blank name is refused', async ({ request }) => {
    const { api } = await newUser(request, 'tags-unique');
    const first = await createCategory(api, 'Holiday');
    const dup = await api.POST('/api/v1/tags', { body: { name: 'Holiday' } });
    expect(dup.data?.id).toBe(first.id);
    expect((await api.GET('/api/v1/tags')).data!.filter((t) => t.name === 'Holiday')).toHaveLength(1);
    const other = await createCategory(api, 'Garden');
    const clash = await api.PUT('/api/v1/tags/{id}', { params: { path: { id: other.id } }, body: { name: 'Holiday' } });
    expectStatus(clash, 400);
    expect((clash.error as { message?: string }).message).toBe('A tag with this name already exists.');
    expectStatus(await api.POST('/api/v1/tags', { body: { name: '   ' } }), 400);
    // Another user may use the same name.
    const b = await secondUser(request, 'tags-unique-b');
    const theirs = await b.api.POST('/api/v1/tags', { body: { name: 'Holiday' } });
    expectStatus(theirs, 201);
    expect(theirs.data!.id).not.toBe(first.id);
  });

  test('bulk-add tags every transaction with every tag, is idempotent, and skips what is not the caller\'s', async ({ request }) => {
    const a = await newUser(request, 'tags-bulk-a');
    const b = await secondUser(request, 'tags-bulk-b');
    const bankA = await createBankAccount(a.api, { name: 'Bulk A' });
    const bankB = await createBankAccount(b.api, { name: 'Bulk B' });
    const t1 = await createTransaction(a.api, bankA.id, { amount: -10, description: 'Bulk 1' });
    const t2 = await createTransaction(a.api, bankA.id, { amount: -20, description: 'Bulk 2' });
    const foreign = await createTransaction(b.api, bankB.id, { amount: -30, description: 'Bulk foreign' });
    const trip = await createCategory(a.api, 'Bulk trip');
    const foreignTag = await createCategory(b.api, 'Not yours');

    const res = await a.api.POST('/api/v1/tags/bulk-add', {
      body: { transactionIds: [t1.id, t2.id, foreign.id, UNKNOWN_UUID], tagIds: [trip.id] },
    });
    expectStatus(res, 200);
    expect(res.data).toMatchObject({ transactionsFound: 2, tagsAdded: 2 });
    const rows = await searchAll(a.api, [{ field: 'tag', operator: 'is', value: trip.id }]);
    expect(rows.map((r) => r.id).sort()).toEqual([t1.id, t2.id].sort());

    // Again: nothing new.
    const again = await a.api.POST('/api/v1/tags/bulk-add', { body: { transactionIds: [t1.id, t2.id], tagIds: [trip.id] } });
    expectStatus(again, 200);
    expect(again.data!.tagsAdded).toBe(0);

    // The foreign transaction got nothing.
    const bRows = await searchAll(b.api, [{ field: 'accountId', operator: 'is', value: bankB.id }]);
    expect(bRows.every((r) => r.tags.length === 0)).toBe(true);

    // Someone else's tag is refused, and nothing is attached.
    const stolen = await a.api.POST('/api/v1/tags/bulk-add', { body: { transactionIds: [t1.id], tagIds: [foreignTag.id] } });
    expect([400, 404]).toContain(stolen.response.status);
    const t1After = (await searchAll(a.api, [{ field: 'accountId', operator: 'is', value: bankA.id }])).find((r) => r.id === t1.id)!;
    expect(t1After.tags.map((t) => t.id)).toEqual([trip.id]);
  });

  test("tenancy: another user's tag cannot be read, renamed, deleted or put on a transaction", async ({ request }) => {
    const a = await newUser(request, 'tags-tenant-a');
    const b = await secondUser(request, 'tags-tenant-b');
    const mine = await createCategory(a.api, 'Private tag');
    const bank = await createBankAccount(b.api, { name: 'Tenant B Bank' });

    // Refused like every other foreign id: a permission 400 or a 404, never the data.
    const refused = [400, 403, 404];
    expect(refused).toContain((await b.api.GET('/api/v1/tags/{id}', { params: { path: { id: mine.id } } })).response.status);
    expect(refused).toContain(
      (await b.api.PUT('/api/v1/tags/{id}', { params: { path: { id: mine.id } }, body: { name: 'Taken' } })).response.status
    );
    expect(refused).toContain((await b.api.DELETE('/api/v1/tags/{id}', { params: { path: { id: mine.id } } })).response.status);
    const withForeignTag = await b.api.POST('/api/v1/transactions', {
      body: { accountId: bank.id, amount: -5, date: '2026-07-01', description: 'Sneaky', tagIds: [mine.id] },
    });
    expect([400, 403, 404]).toContain(withForeignTag.response.status);
    const still = await a.api.GET('/api/v1/tags');
    expect(still.data!.find((t) => t.id === mine.id)?.name).toBe('Private tag');
    expect((await b.api.GET('/api/v1/tags')).data!.map((t) => t.id)).not.toContain(mine.id);
  });
});
