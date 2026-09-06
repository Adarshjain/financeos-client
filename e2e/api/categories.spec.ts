import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import { createTransaction, searchAll } from '../fixtures/seed/transactions';
import { expectForeign, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

'00000000-0000-0000-0000-000000000000';

test.describe('Categories API', () => {
  test('CRUD category by ID', async ({ api }) => {
    // 1. Create category
    const cat = await createCategory(api, 'Initial Name');
    expect(cat.id).toBeDefined();
    expect(cat.name).toBe('Initial Name');

    // 2. GET by ID
    const getRes = await api.GET('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
    });
    expectStatus(getRes, 200);
    expect(getRes.data).toEqual({ id: cat.id, name: 'Initial Name' });

    // 3. PUT rename
    const putRes = await api.PUT('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
      body: { name: 'Renamed Category' },
    });
    expectStatus(putRes, 200);
    expect(putRes.data).toEqual({ id: cat.id, name: 'Renamed Category' });

    // Verify GET reflects rename
    const getRenamedRes = await api.GET('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
    });
    expectStatus(getRenamedRes, 200);
    expect(getRenamedRes.data?.name).toBe('Renamed Category');

    // 4. DELETE by ID
    const delRes = await api.DELETE('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
    });
    expectStatus(delRes, 204);

    // Verify GET after delete -> 404
    const getDeletedRes = await api.GET('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
    });
    expectStatus(getDeletedRes, 404);
  });

  test('duplicate name behavior on POST and PUT', async ({ api }) => {
    const cat1 = await createCategory(api, 'Electronics');
    const cat2 = await createCategory(api, 'Books');

    // POST with existing name returns existing category (idempotent / documented behavior)
    const postDupRes = await api.POST('/api/v1/categories', {
      body: { name: 'Electronics' },
    });
    expect([200, 201]).toContain(postDupRes.response.status);
    expect(postDupRes.data?.id).toBe(cat1.id);

    // PUT with existing name of same category succeeds
    const putSameRes = await api.PUT('/api/v1/categories/{id}', {
      params: { path: { id: cat1.id } },
      body: { name: 'Electronics' },
    });
    expectStatus(putSameRes, 200);

    // PUT rename to another existing category's name throws 400 ValidationException
    const putConflictRes = await api.PUT('/api/v1/categories/{id}', {
      params: { path: { id: cat2.id } },
      body: { name: 'Electronics' },
    });
    expectStatus(putConflictRes, 400);
  });

  test('PUT rename reflects on transactions categories', async ({ api }) => {
    const account = await createBankAccount(api, { name: 'Rename Test Account' });
    const cat = await createCategory(api, 'Original Tag');

    const txn = await createTransaction(api, account.id, {
      description: 'Transaction with category',
      categoryIds: [cat.id],
    });
    expect(txn.categories.map((c) => c.name)).toContain('Original Tag');

    // Rename the category
    const renameRes = await api.PUT('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
      body: { name: 'Updated Tag' },
    });
    expectStatus(renameRes, 200);

    // Fetch transactions and verify updated category name
    const allTxns = await searchAll(api);
    const updatedTxn = allTxns.find((t) => t.id === txn.id);
    expect(updatedTxn).toBeDefined();
    expect(updatedTxn?.categories.map((c) => c.name)).toContain('Updated Tag');
    expect(updatedTxn?.categories.map((c) => c.name)).not.toContain('Original Tag');
  });

  test('delete category attached to transaction detaches category without deleting transaction', async ({
    api,
  }) => {
    const account = await createBankAccount(api, { name: 'Detach Test Account' });
    const cat = await createCategory(api, 'Category In Use');

    const txn = await createTransaction(api, account.id, {
      description: 'Transaction to test cascade',
      categoryIds: [cat.id],
    });
    expect(txn.categories.some((c) => c.id === cat.id)).toBe(true);

    // Delete the category attached to this transaction
    const delRes = await api.DELETE('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
    });
    expectStatus(delRes, 204);

    // Verify category is gone
    const getRes = await api.GET('/api/v1/categories/{id}', {
      params: { path: { id: cat.id } },
    });
    expectStatus(getRes, 404);

    // Verify transaction still exists, but category is detached cleanly
    const allTxns = await searchAll(api);
    const postDelTxn = allTxns.find((t) => t.id === txn.id);
    expect(postDelTxn).toBeDefined();
    expect(postDelTxn?.categories.some((c) => c.id === cat.id)).toBe(false);
  });

  test('tenancy isolation: user B cannot read, update, or delete user A category', async ({
    api,
    request,
  }) => {
    const catA = await createCategory(api, 'User A Only Category');
    const u2 = await secondUser(request);

    // User B GET user A's category -> 400 (permission check) or 404
    await expectForeign(u2.api, 'GET', `/api/v1/categories/${catA.id}`);

    // User B PUT user A's category -> 400/403/404
    await expectForeign(u2.api, 'PUT', `/api/v1/categories/${catA.id}`, {
      name: 'Hacked Name',
    });

    // User B DELETE user A's category -> 400/403/404
    await expectForeign(u2.api, 'DELETE', `/api/v1/categories/${catA.id}`);

    // Verify category was not modified
    const checkRes = await api.GET('/api/v1/categories/{id}', {
      params: { path: { id: catA.id } },
    });
    expectStatus(checkRes, 200);
    expect(checkRes.data?.name).toBe('User A Only Category');
  });

});
