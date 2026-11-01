import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction, searchAll } from '../fixtures/seed/transactions';
import { newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000';

/** A shop name the built-in engine cannot place, so rows seeded under it arrive uncategorised. */
const shop = (label: string) => `Zxqv ${label} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test.describe('Category list, suggestion and recent picks (@api)', () => {
  test('category-list: the fixed list with sub-categories, directions and icons', async ({ api }) => {
    const res = await api.GET('/api/v1/category-list');
    expectStatus(res, 200);
    const list = res.data!.categories;
    expect(list.length).toBeGreaterThanOrEqual(30);
    const food = list.find((c) => c.key === 'food')!;
    expect(food).toMatchObject({ name: 'Food', direction: 'OUT' });
    expect(food.icon).toBeTruthy();
    expect(food.subs.map((s) => s.key)).toContain('food.delivery');
    expect(list.find((c) => c.key === 'salary')!.direction).toBe('IN');
    expect(list.find((c) => c.key === 'card_bill')!.excludedByDefault).toBe(true);
    expect(new Set(list.map((c) => c.key)).size).toBe(list.length);
  });

  test('categorize: a known shop is suggested, an unknown one has no answer', async ({ api }) => {
    const known = await api.POST('/api/v1/categorize', { body: { description: 'ZOMATO ORDER', type: 'DEBIT' } });
    expectStatus(known, 200);
    expect(known.data?.categoryKey).toBe('food');
    expect(known.data?.source).toBeTruthy();

    const unknown = await api.POST('/api/v1/categorize', { body: { description: shop('none'), type: 'DEBIT' } });
    expectStatus(unknown, 200);
    expect(unknown.data?.categoryKey ?? null).toBeNull();
  });

  test('category-recent: newest distinct picks per direction, capped at four; a bad direction is a 400', async ({ request }) => {
    const { api } = await newUser(request, 'cat-recent');
    const bank = await createBankAccount(api, { name: 'Recent Bank' });
    const pick = async (key: string, sub: string | null, amount: number) => {
      const t = await createTransaction(api, bank.id, { amount, description: shop(key) });
      expectStatus(
        await api.PUT('/api/v1/transactions/{id}/category', {
          params: { path: { id: t.id } },
          body: { categoryKey: key, subcategoryKey: sub },
        }),
        200
      );
    };
    await pick('food', 'food.delivery', -100);
    await pick('groceries', null, -100);
    await pick('transport', null, -100);
    await pick('food', 'food.delivery', -100); // a repeat moves to the front, no duplicate
    await pick('shopping', null, -100);
    await pick('bills', null, -100);
    await pick('salary', null, 100);

    const out = await api.GET('/api/v1/transactions/category-recent', { params: { query: { direction: 'OUT' } } });
    expectStatus(out, 200);
    expect(out.data!.length).toBeLessThanOrEqual(4);
    expect(out.data![0]).toMatchObject({ categoryKey: 'bills' });
    expect(out.data!.map((p) => p.categoryKey)).not.toContain('salary');
    expect(new Set(out.data!.map((p) => `${p.categoryKey}/${p.subcategoryKey ?? ''}`)).size).toBe(out.data!.length);

    const inn = await api.GET('/api/v1/transactions/category-recent', { params: { query: { direction: 'IN' } } });
    expect(inn.data!.map((p) => p.categoryKey)).toEqual(['salary']);

    const bad = await api.GET('/api/v1/transactions/category-recent', { params: { query: { direction: 'SIDEWAYS' as 'OUT' } } });
    expectStatus(bad, 400);
  });
});

test.describe('Set a transaction category (@api)', () => {
  test('set, change, clear and Undo through restore; the response carries what it replaced', async ({ request }) => {
    const { api } = await newUser(request, 'cat-set');
    const bank = await createBankAccount(api, { name: 'Set Bank' });
    const t = await createTransaction(api, bank.id, { amount: -250, description: shop('set') });
    expect(t.category ?? null).toBeNull();
    const put = (body: object) =>
      api.PUT('/api/v1/transactions/{id}/category', { params: { path: { id: t.id } }, body });

    const first = await put({ categoryKey: 'food', subcategoryKey: 'food.delivery' });
    expectStatus(first, 200);
    expect(first.data).toMatchObject({
      transactionId: t.id,
      category: { key: 'food' },
      subcategory: { key: 'food.delivery' },
      categorySource: 'USER',
    });
    expect(first.data!.previous.categoryKey ?? null).toBeNull();

    const shown = (await searchAll(api, [{ field: 'accountId', operator: 'is', value: bank.id }]))[0];
    expect(shown.category?.key).toBe('food');
    expect(shown.subcategory?.key).toBe('food.delivery');
    expect(shown.categorySource).toBe('USER');

    const second = await put({ categoryKey: 'shopping' });
    expectStatus(second, 200);
    expect(second.data!.previous).toMatchObject({ categoryKey: 'food', subcategoryKey: 'food.delivery', source: 'USER' });
    expect(second.data!.subcategory ?? null).toBeNull();

    // Undo: the previous state goes back as restore.
    const prev = second.data!.previous;
    const undone = await put({
      categoryKey: prev.categoryKey,
      subcategoryKey: prev.subcategoryKey,
      restore: { source: prev.source, ruleId: prev.ruleId, setAt: prev.setAt },
    });
    expectStatus(undone, 200);
    expect(undone.data!.category?.key).toBe('food');
    expect(undone.data!.subcategory?.key).toBe('food.delivery');

    // Clearing the category is the user's own decision and is remembered as USER.
    const cleared = await put({ categoryKey: null });
    expectStatus(cleared, 200);
    expect(cleared.data!.category ?? null).toBeNull();
    expect(cleared.data!.categorySource).toBe('USER');
  });

  test('validation: unknown key, a sub-category of another category, and a direction the category does not fit', async ({ request }) => {
    const { api } = await newUser(request, 'cat-validate');
    const bank = await createBankAccount(api, { name: 'Validate Bank' });
    const debit = await createTransaction(api, bank.id, { amount: -80, description: shop('debit') });
    const credit = await createTransaction(api, bank.id, { amount: 80, description: shop('credit') });
    const put = (id: string, body: object) => api.PUT('/api/v1/transactions/{id}/category', { params: { path: { id } }, body });

    expectStatus(await put(debit.id, { categoryKey: 'no_such_category' }), 400);
    expectStatus(await put(debit.id, { categoryKey: 'food', subcategoryKey: 'transport.fuel' }), 400);
    // Direction: an income category on a debit, and a spend category on a credit.
    expectStatus(await put(debit.id, { categoryKey: 'salary' }), 400);
    expectStatus(await put(credit.id, { categoryKey: 'food' }), 400);
    expectStatus(await put(credit.id, { categoryKey: 'salary' }), 200);
    // Nothing was written by the refused calls.
    const rows = await searchAll(api, [{ field: 'accountId', operator: 'is', value: bank.id }]);
    expect(rows.find((r) => r.id === debit.id)?.category ?? null).toBeNull();
  });

  test("tenancy: another user's transaction is a 404, and nothing changes", async ({ request }) => {
    const a = await newUser(request, 'cat-tenant-a');
    const b = await secondUser(request, 'cat-tenant-b');
    const bank = await createBankAccount(a.api, { name: 'Tenant Bank' });
    const t = await createTransaction(a.api, bank.id, { amount: -40, description: shop('tenant') });
    const foreign = await b.api.PUT('/api/v1/transactions/{id}/category', {
      params: { path: { id: t.id } },
      body: { categoryKey: 'food' },
    });
    expectStatus(foreign, 404);
    expectStatus(
      await b.api.PUT('/api/v1/transactions/{id}/category', { params: { path: { id: UNKNOWN_UUID } }, body: { categoryKey: 'food' } }),
      404
    );
    const own = (await searchAll(a.api, [{ field: 'accountId', operator: 'is', value: bank.id }]))[0];
    expect(own.category ?? null).toBeNull();
  });

  test('create takes a category and sub-category; a bad pair is refused', async ({ request }) => {
    const { api } = await newUser(request, 'cat-create');
    const bank = await createBankAccount(api, { name: 'Create Bank' });
    const t = await createTransaction(api, bank.id, {
      amount: -300,
      description: shop('create'),
      categoryKey: 'food',
      subcategoryKey: 'food.delivery',
    });
    expect(t.category?.key).toBe('food');
    expect(t.subcategory?.key).toBe('food.delivery');
    expect(t.categorySource).toBe('USER');

    const bad = await api.POST('/api/v1/transactions', {
      body: { accountId: bank.id, amount: -300, date: t.date, description: shop('bad'), categoryKey: 'salary' },
    });
    expectStatus(bad, 400);
  });
});

test.describe('Category counts and list filters (@api)', () => {
  test('category-counts covers the whole ledger; the list filters OR their positive clauses and sub narrows its own category', async ({
    request,
  }) => {
    const { api } = await newUser(request, 'cat-filter');
    const bank = await createBankAccount(api, { name: 'Filter Bank' });
    const mk = (label: string, amount: number, categoryKey?: string, subcategoryKey?: string) =>
      createTransaction(api, bank.id, { amount, description: shop(label), categoryKey, subcategoryKey });
    const delivery = await mk('deliv', -100, 'food', 'food.delivery');
    const dining = await mk('dine', -110, 'food', 'food.dining');
    const groc = await mk('groc', -120, 'groceries');
    const none = await mk('none', -130);

    const counts = await api.GET('/api/v1/transactions/category-counts');
    expectStatus(counts, 200);
    expect(counts.data!.uncategorized).toBe(1);
    const food = counts.data!.categories.find((c) => c.categoryKey === 'food')!;
    expect(food.count).toBe(2);
    expect(food.subs.find((s) => s.subcategoryKey === 'food.delivery')?.count).toBe(1);
    expect(counts.data!.categories.find((c) => c.categoryKey === 'groceries')?.count).toBe(1);

    const ids = async (filters: object[]) =>
      (await searchAll(api, [{ field: 'accountId', operator: 'is', value: bank.id }, ...(filters as never[])])).map((t) => t.id).sort();
    const sorted = (...rows: { id: string }[]) => rows.map((r) => r.id).sort();

    expect(await ids([{ field: 'category', operator: 'is', value: 'food' }])).toEqual(sorted(delivery, dining));
    expect(await ids([{ field: 'uncategorized', operator: 'is', value: true }])).toEqual(sorted(none));
    // Uncategorized plus a category widen each other.
    expect(
      await ids([
        { field: 'uncategorized', operator: 'is', value: true },
        { field: 'category', operator: 'is', value: 'groceries' },
      ])
    ).toEqual(sorted(none, groc));
    // A sub-category of a chosen category narrows that category to the sub.
    expect(
      await ids([
        { field: 'category', operator: 'is', value: 'food' },
        { field: 'subcategory', operator: 'is', value: 'food.delivery' },
      ])
    ).toEqual(sorted(delivery));
    // A sub-category alone, and a list of categories.
    expect(await ids([{ field: 'subcategory', operator: 'is', value: 'food.dining' }])).toEqual(sorted(dining));
    expect(await ids([{ field: 'category', operator: 'in', value: ['food', 'groceries'] }])).toEqual(sorted(delivery, dining, groc));
    // Negated clauses stay ANDed.
    expect(await ids([{ field: 'category', operator: 'is_not', value: 'food' }])).toEqual(sorted(groc, none));
    expect(await ids([{ field: 'uncategorized', operator: 'is', value: false }])).toEqual(sorted(delivery, dining, groc));
  });

  test('tag and untagged filters (OR together), and the flag fields take only a boolean', async ({ request }) => {
    const { api } = await newUser(request, 'tag-filter');
    const bank = await createBankAccount(api, { name: 'Tag Filter Bank' });
    const trip = (await api.POST('/api/v1/tags', { body: { name: `Trip ${Date.now()}` } })).data!;
    const work = (await api.POST('/api/v1/tags', { body: { name: `Work ${Date.now()}` } })).data!;
    const a = await createTransaction(api, bank.id, { amount: -10, description: shop('a'), tagIds: [trip.id] });
    const b = await createTransaction(api, bank.id, { amount: -20, description: shop('b'), tagIds: [work.id] });
    const c = await createTransaction(api, bank.id, { amount: -30, description: shop('c') });
    const ids = async (filters: object[]) =>
      (await searchAll(api, [{ field: 'accountId', operator: 'is', value: bank.id }, ...(filters as never[])])).map((t) => t.id).sort();
    const sorted = (...rows: { id: string }[]) => rows.map((r) => r.id).sort();

    expect(await ids([{ field: 'tag', operator: 'is', value: trip.id }])).toEqual(sorted(a));
    expect(await ids([{ field: 'untagged', operator: 'is', value: true }])).toEqual(sorted(c));
    expect(
      await ids([
        { field: 'untagged', operator: 'is', value: true },
        { field: 'tag', operator: 'is', value: work.id },
      ])
    ).toEqual(sorted(b, c));
    expect(await ids([{ field: 'tag', operator: 'in', value: [trip.id, work.id] }])).toEqual(sorted(a, b));

    const bad = await api.POST('/api/v1/transactions/search', {
      body: { filters: [{ field: 'uncategorized', operator: 'is', value: 'yes' }] },
    });
    expectStatus(bad, 400);
  });
});

test.describe('Uncategorized: summary, groups and apply (@api)', () => {
  test('summary and groups: groups of two or more come first, one-offs after; a group lists its rows', async ({ request }) => {
    const { api } = await newUser(request, 'unc-groups');
    const bank = await createBankAccount(api, { name: 'Group Bank' });
    const big = shop('big');
    const small = shop('small');
    const lone = shop('lone');
    await createTransaction(api, bank.id, { amount: -100, description: big });
    await createTransaction(api, bank.id, { amount: -200, description: big });
    await createTransaction(api, bank.id, { amount: -300, description: big });
    await createTransaction(api, bank.id, { amount: -50, description: small });
    await createTransaction(api, bank.id, { amount: -60, description: small });
    await createTransaction(api, bank.id, { amount: -999, description: lone });

    const summary = await api.GET('/api/v1/transactions/uncategorized/summary');
    expectStatus(summary, 200);
    expect(summary.data!.count).toBe(6);
    expect(summary.data!.groupCount).toBe(2);
    expect(summary.data!.topGroups.length).toBeGreaterThanOrEqual(1);

    const groups = await api.GET('/api/v1/transactions/uncategorized/groups', { params: { query: { page: 0, size: 20 } } });
    expectStatus(groups, 200);
    const content = groups.data!.content;
    expect(content.map((g) => g.count)).toEqual([3, 2, 1]);
    expect(content.map((g) => g.oneOff)).toEqual([false, false, true]);
    expect(content[0]).toMatchObject({ direction: 'OUT', person: false, total: 600 });
    expect(content[0].groupKey).toBeTruthy();

    const rows = await api.GET('/api/v1/transactions/uncategorized/groups/{groupKey}/transactions', {
      params: { path: { groupKey: content[0].groupKey }, query: { page: 0, size: 2 } },
    });
    expectStatus(rows, 200);
    expect(rows.data!.totalElements).toBe(3);
    expect(rows.data!.content).toHaveLength(2);
    expect(rows.data!.content[0].accountName).toBe('Group Bank');

    const unknown = await api.GET('/api/v1/transactions/uncategorized/groups/{groupKey}/transactions', {
      params: { path: { groupKey: 'no-such-group' } },
    });
    expectStatus(unknown, 404);
  });

  test('apply: sets the category and sub-category, skips rows already categorised, and "do the same next time" adds a rule once', async ({
    request,
  }) => {
    const { api } = await newUser(request, 'unc-apply');
    const bank = await createBankAccount(api, { name: 'Apply Bank' });
    const name = shop('apply');
    const a = await createTransaction(api, bank.id, { amount: -100, description: name });
    const b = await createTransaction(api, bank.id, { amount: -200, description: name });
    const done = await createTransaction(api, bank.id, { amount: -300, description: shop('done'), categoryKey: 'bills' });

    const res = await api.POST('/api/v1/transactions/uncategorized/apply', {
      body: {
        transactionIds: [a.id, b.id, done.id],
        categoryKey: 'food',
        subcategoryKey: 'food.delivery',
        rule: { pattern: name, matchType: 'CONTAINS' },
      },
    });
    expectStatus(res, 200);
    expect(res.data).toMatchObject({ updated: 2, skipped: 1 });
    expect(res.data!.ruleId).toBeTruthy();

    const rows = await searchAll(api, [{ field: 'accountId', operator: 'is', value: bank.id }]);
    for (const id of [a.id, b.id]) {
      const r = rows.find((x) => x.id === id)!;
      expect(r.category?.key).toBe('food');
      expect(r.subcategory?.key).toBe('food.delivery');
      expect(r.categorySource).toBe('USER');
    }
    // The already-categorised row kept its category.
    expect(rows.find((x) => x.id === done.id)?.category?.key).toBe('bills');

    // The summary no longer counts the sorted rows.
    const summary = await api.GET('/api/v1/transactions/uncategorized/summary');
    expect(summary.data!.count).toBe(0);

    // The rule exists with that pattern; applying the same pattern again re-points it instead of adding another.
    const rules = await api.GET('/api/v1/rules');
    const created = (rules.data as { content?: Array<{ id: string; merchantKey: string }> }).content ?? [];
    expect(created.filter((r) => r.id === res.data!.ruleId)).toHaveLength(1);
    const again = await createTransaction(api, bank.id, { amount: -400, description: shop('again') });
    const second = await api.POST('/api/v1/transactions/uncategorized/apply', {
      body: { transactionIds: [again.id], categoryKey: 'groceries', rule: { pattern: name, matchType: 'CONTAINS' } },
    });
    expectStatus(second, 200);
    expect(second.data!.ruleId).toBe(res.data!.ruleId);
    const after = await api.GET('/api/v1/rules');
    const repointed = ((after.data as { content?: Array<{ id: string; category: { key: string } }> }).content ?? []).find(
      (r) => r.id === res.data!.ruleId
    );
    expect(repointed?.category.key).toBe('groceries');
  });

  test('apply: a direction the category does not fit is skipped, an unknown key is a 400', async ({ request }) => {
    const { api } = await newUser(request, 'unc-direction');
    const bank = await createBankAccount(api, { name: 'Direction Bank' });
    const debit = await createTransaction(api, bank.id, { amount: -90, description: shop('out') });
    const credit = await createTransaction(api, bank.id, { amount: 90, description: shop('in') });

    const res = await api.POST('/api/v1/transactions/uncategorized/apply', {
      body: { transactionIds: [debit.id, credit.id], categoryKey: 'food' },
    });
    expectStatus(res, 200);
    expect(res.data).toMatchObject({ updated: 1, skipped: 1 });
    const rows = await searchAll(api, [{ field: 'accountId', operator: 'is', value: bank.id }]);
    expect(rows.find((r) => r.id === debit.id)?.category?.key).toBe('food');
    expect(rows.find((r) => r.id === credit.id)?.category ?? null).toBeNull();

    expectStatus(
      await api.POST('/api/v1/transactions/uncategorized/apply', {
        body: { transactionIds: [credit.id], categoryKey: 'no_such_category' },
      }),
      400
    );
  });

  test("tenancy: another user's ids are skipped, their rows stay uncategorised, and their groups are invisible", async ({ request }) => {
    const a = await newUser(request, 'unc-tenant-a');
    const b = await secondUser(request, 'unc-tenant-b');
    const bankA = await createBankAccount(a.api, { name: 'Tenant A Bank' });
    const mine = shop('mine');
    const foreignRow = await createTransaction(a.api, bankA.id, { amount: -70, description: mine });
    await createTransaction(a.api, bankA.id, { amount: -71, description: mine });

    const bankB = await createBankAccount(b.api, { name: 'Tenant B Bank' });
    const own = await createTransaction(b.api, bankB.id, { amount: -72, description: shop('b-own') });

    const res = await b.api.POST('/api/v1/transactions/uncategorized/apply', {
      body: { transactionIds: [foreignRow.id, own.id, UNKNOWN_UUID], categoryKey: 'food' },
    });
    expectStatus(res, 200);
    expect(res.data).toMatchObject({ updated: 1, skipped: 2 });
    const aRows = await searchAll(a.api, [{ field: 'accountId', operator: 'is', value: bankA.id }]);
    expect(aRows.every((r) => (r.category ?? null) === null)).toBe(true);

    // B sees only B's group, and cannot open A's.
    const groupsA = await a.api.GET('/api/v1/transactions/uncategorized/groups');
    const keyA = groupsA.data!.content.find((g) => g.count === 2)!.groupKey;
    expectStatus(
      await b.api.GET('/api/v1/transactions/uncategorized/groups/{groupKey}/transactions', { params: { path: { groupKey: keyA } } }),
      404
    );
    const summaryB = await b.api.GET('/api/v1/transactions/uncategorized/summary');
    expect(summaryB.data!.count).toBe(0);
  });
});
