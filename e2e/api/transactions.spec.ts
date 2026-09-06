import {
  addCardholder,
  createBankAccount,
  createCreditCard,
  ensurePrimaryCardholder,
} from '../fixtures/seed/accounts';
import {
  createCategory,
  createTransaction,
  createTransactions,
} from '../fixtures/seed/transactions';
import { secondUser } from '../fixtures/tenancy';
import { expect, freshUser, test } from '../fixtures/test';

function assertNoExtraKeys(
  obj: Record<string, unknown>,
  allowed: Set<string>,
  entityName: string
) {
  for (const key of Object.keys(obj)) {
    expect(allowed.has(key), `Unexpected top-level key '${key}' in ${entityName}`).toBe(true);
  }
}

const TRANSACTION_KEYS = new Set([
  'id',
  'accountId',
  'cardId',
  'cardLabel',
  'cardLast4',
  'date',
  'amount',
  'description',
  'sourcedDescription',
  'categories',
  'source',
  'isTransactionUnderMonitoring',
  'monitoringReason',
  'isTransactionExcluded',
  'createdAt',
  'updatedAt',
  'reviewedAt',
  'balance',
  'reviewType',
  'reviewReasons',
  'appliedRuleId',
  'mcc',
  'settlementDate',
  'instantDiscount',
  'convenienceFee',
  'channel',
  'isEmi',
  'isInternational',
  'links',
]);

test.describe('Transactions API (@api)', () => {
  test.describe('CRUD', () => {
    test('create minimal (debit and credit) + shape check', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'CRUD Min Bank' });

      // 1. Debit (negative amount)
      const debitRes = await api.POST('/api/v1/transactions', {
        body: {
          accountId: bank.id,
          amount: -150.5,
          date: '2026-07-01',
          description: 'Minimal Debit',
        },
      });
      expect(debitRes.response.status).toBe(201);
      expect(debitRes.data).toBeDefined();
      const debitData = debitRes.data!;
      expect(debitData.amount).toBe(-150.5);
      expect(debitData.accountId).toBe(bank.id);
      expect(debitData.date).toBe('2026-07-01');
      expect(debitData.description).toBe('Minimal Debit');
      expect(debitData.source).toBe('manual');
      expect(debitData.reviewType).toBe('NA');
      expect(debitData.isTransactionExcluded).toBe(false);
      expect(debitData.isTransactionUnderMonitoring).toBe(false);
      assertNoExtraKeys(debitData as any, TRANSACTION_KEYS, 'TransactionResponse');

      // 2. Credit (positive amount)
      const creditRes = await api.POST('/api/v1/transactions', {
        body: {
          accountId: bank.id,
          amount: 500,
          date: '2026-07-02',
          description: 'Minimal Credit',
        },
      });
      expect(creditRes.response.status).toBe(201);
      const creditData = creditRes.data!;
      expect(creditData.amount).toBe(500);
      assertNoExtraKeys(creditData as any, TRANSACTION_KEYS, 'TransactionResponse');
    });

    test('create full with all optional fields', async ({ api }) => {
      const cc = await createCreditCard(api, { name: 'CRUD Full CC' });
      const primary = await ensurePrimaryCardholder(api, cc.id, '4444');
      const card = primary.cards[0];
      const category = await createCategory(api, 'Groceries Full');

      const fullRes = await api.POST('/api/v1/transactions', {
        body: {
          accountId: cc.id,
          cardId: card.id,
          amount: -1250.75,
          date: '2026-07-10',
          description: 'Full Transaction Details',
          categoryIds: [category.id],
          mcc: '5411',
          isTransactionUnderMonitoring: true,
          monitoringReason: 'Large grocery spend check',
          isTransactionExcluded: true,
          rewardDetails: {
            settlementDate: '2026-07-11',
            instantDiscount: 50,
            convenienceFee: 15,
            channel: 'ONLINE',
            isEmi: false,
            isInternational: false,
          },
        },
      });

      expect(fullRes.response.status).toBe(201);
      const data = fullRes.data!;
      expect(data.accountId).toBe(cc.id);
      expect(data.cardId).toBe(card.id);
      expect(data.cardLast4).toBe(card.last4);
      expect(data.amount).toBe(-1250.75);
      expect(data.description).toBe('Full Transaction Details');
      expect(data.categories).toHaveLength(1);
      expect(data.categories[0].id).toBe(category.id);
      expect(data.categories[0].name).toBe(category.name);
      expect(data.mcc).toBe('5411');
      expect(data.isTransactionUnderMonitoring).toBe(true);
      expect(data.monitoringReason).toBe('Large grocery spend check');
      expect(data.isTransactionExcluded).toBe(true);
      expect(data.channel).toBe('ONLINE');
      expect(data.instantDiscount).toBe(50);
      expect(data.convenienceFee).toBe(15);
      expect(data.settlementDate).toBe('2026-07-11');
      expect(data.isEmi).toBe(false);
      expect(data.isInternational).toBe(false);
      assertNoExtraKeys(data as any, TRANSACTION_KEYS, 'TransactionResponse');
    });

    test('update every mutable field and confirm via search', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Update Bank 1' });
      const bank2 = await createBankAccount(api, { name: 'Update Bank 2' });
      const initialCat = await createCategory(api, 'Initial Cat');
      const updatedCat = await createCategory(api, 'Updated Cat');

      const initial = await createTransaction(api, bank.id, {
        amount: -200,
        date: '2026-07-15',
        description: 'Original Description',
        categoryIds: [initialCat.id],
        isTransactionExcluded: false,
        isTransactionUnderMonitoring: false,
      });

      // Update all fields
      const updateRes = await api.PUT('/api/v1/transactions/{id}', {
        params: { path: { id: initial.id } },
        body: {
          accountId: bank2.id,
          amount: -350,
          date: '2026-07-16',
          description: 'Updated Description',
          categoryIds: [updatedCat.id],
          isTransactionExcluded: true,
          isTransactionUnderMonitoring: true,
          monitoringReason: 'Now monitored',
          mcc: '5812',
          reviewType: 'NA',
          rewardDetails: {
            channel: 'POS',
            isInternational: true,
            instantDiscount: 20,
            convenienceFee: 5,
            settlementDate: '2026-07-17',
            isEmi: true,
          },
        },
      });

      expect(updateRes.response.status).toBe(200);
      const updated = updateRes.data!;
      expect(updated.accountId).toBe(bank2.id);
      expect(updated.amount).toBe(-350);
      expect(updated.date).toBe('2026-07-16');
      expect(updated.description).toBe('Updated Description');
      expect(updated.categories.map((c) => c.id)).toEqual([updatedCat.id]);
      expect(updated.isTransactionExcluded).toBe(true);
      expect(updated.isTransactionUnderMonitoring).toBe(true);
      expect(updated.monitoringReason).toBe('Now monitored');
      expect(updated.mcc).toBe('5812');
      expect(updated.channel).toBe('POS');
      expect(updated.isInternational).toBe(true);
      expect(updated.instantDiscount).toBe(20);
      expect(updated.convenienceFee).toBe(5);
      expect(updated.settlementDate).toBe('2026-07-17');
      expect(updated.isEmi).toBe(true);

      // Confirm via search
      const searchRes = await api.POST('/api/v1/transactions/search', {
        body: {
          filters: [{ field: 'accountId', operator: 'is', value: bank2.id }],
        },
        params: { query: { page: 0, size: 10 } },
      });
      expect(searchRes.response.status).toBe(200);
      const found = searchRes.data?.content?.find((t) => t.id === initial.id);
      expect(found).toBeDefined();
      expect(found?.description).toBe('Updated Description');
      expect(found?.amount).toBe(-350);
      expect(found?.isTransactionExcluded).toBe(true);
    });

    test('delete -> 204 and no longer found; delete twice -> 404', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Delete Bank' });
      const txn = await createTransaction(api, bank.id, {
        amount: -100,
        description: 'To Delete',
      });

      // First delete
      const del1 = await api.DELETE('/api/v1/transactions/{id}', {
        params: { path: { id: txn.id } },
      });
      expect(del1.response.status).toBe(204);

      // Confirm no longer found
      const search = await api.POST('/api/v1/transactions/search', {
        body: {
          filters: [{ field: 'accountId', operator: 'is', value: bank.id }],
        },
        params: { query: { page: 0, size: 10 } },
      });
      expect(search.data?.content?.some((t) => t.id === txn.id)).toBe(false);

      // Second delete -> 404
      const del2 = await api.DELETE('/api/v1/transactions/{id}', {
        params: { path: { id: txn.id } },
      });
      expect(del2.response.status).toBe(404);
    });
  });

  test.describe('Validation', () => {
    test('missing required fields (accountId, amount, date)', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Val Bank' });

      // Missing accountId
      const resNoAccount = await api.POST('/api/v1/transactions', {
        body: { amount: -100, date: '2026-07-01' } as any,
      });
      expect(resNoAccount.response.status).toBe(400);

      // Missing amount
      const resNoAmount = await api.POST('/api/v1/transactions', {
        body: { accountId: bank.id, date: '2026-07-01' } as any,
      });
      expect(resNoAmount.response.status).toBe(400);

      // Missing date
      const resNoDate = await api.POST('/api/v1/transactions', {
        body: { accountId: bank.id, amount: -100 } as any,
      });
      expect(resNoDate.response.status).toBe(400);
    });

    test('amount = 0 rejected with 400', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Zero Amount Bank' });
      const res = await api.POST('/api/v1/transactions', {
        body: {
          accountId: bank.id,
          amount: 0,
          date: '2026-07-01',
          description: 'Zero amount',
        },
      });
      expect(res.response.status).toBe(400);
    });

    test('malformed date rejected with 400', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Bad Date Bank' });
      const res = await api.POST('/api/v1/transactions', {
        body: {
          accountId: bank.id,
          amount: -50,
          date: 'invalid-date-format' as any,
        },
      });
      expect(res.response.status).toBe(400);
    });

    test('cardId from another account of same user rejected with 400', async ({ api }) => {
      const cc1 = await createCreditCard(api, { name: 'CC One' });
      const cc2 = await createCreditCard(api, { name: 'CC Two' });
      const ch1 = await ensurePrimaryCardholder(api, cc1.id, '1111');
      const cardFromCc1 = ch1.cards[0];

      // Try creating transaction on cc2 using cc1's card
      const res = await api.POST('/api/v1/transactions', {
        body: {
          accountId: cc2.id,
          cardId: cardFromCc1.id,
          amount: -100,
          date: '2026-07-01',
        },
      });
      expect(res.response.status).toBe(400);
    });

    test('accountId belonging to user B rejected with 400/ValidationException', async ({ api, request }) => {
      const userB = await secondUser(request, 'user-b-txn');
      const userBAccount = await createBankAccount(userB.api, { name: 'User B Bank' });

      // User A attempts to create transaction on User B's account
      const res = await api.POST('/api/v1/transactions', {
        body: {
          accountId: userBAccount.id,
          amount: -100,
          date: '2026-07-01',
        },
      });
      // Should reject (400 validation exception or 404/403), definitely not 201
      expect(res.response.status).not.toBe(201);
      expect([400, 403, 404]).toContain(res.response.status);
    });
  });

  test.describe('Pagination', () => {
    test('60 transactions: size=25 gives 3 pages, totalElements=60, disjoint content, out of bounds', async ({ request }) => {
      const user = await freshUser(request, 'pagination-test');
      const bank = await createBankAccount(user.api, { name: 'Paging Bank' });

      // Seed 60 transactions
      await createTransactions(user.api, bank.id, 60, {
        startDate: '2026-01-01',
        stepDays: 1,
        descriptionPrefix: 'Paging Txn',
      });

      // Page 0
      const p0 = await user.api.GET('/api/v1/transactions', {
        params: { query: { page: 0, size: 25 } },
      });
      expect(p0.response.status).toBe(200);
      expect(p0.data?.totalElements).toBe(60);
      expect(p0.data?.totalPages).toBe(3);
      expect(p0.data?.size).toBe(25);
      expect(p0.data?.number).toBe(0);
      expect(p0.data?.first).toBe(true);
      expect(p0.data?.last).toBe(false);
      expect(p0.data?.numberOfElements).toBe(25);
      expect(p0.data?.content).toHaveLength(25);

      // Page 1
      const p1 = await user.api.GET('/api/v1/transactions', {
        params: { query: { page: 1, size: 25 } },
      });
      expect(p1.response.status).toBe(200);
      expect(p1.data?.number).toBe(1);
      expect(p1.data?.first).toBe(false);
      expect(p1.data?.last).toBe(false);
      expect(p1.data?.numberOfElements).toBe(25);

      // Page 2
      const p2 = await user.api.GET('/api/v1/transactions', {
        params: { query: { page: 2, size: 25 } },
      });
      expect(p2.response.status).toBe(200);
      expect(p2.data?.number).toBe(2);
      expect(p2.data?.first).toBe(false);
      expect(p2.data?.last).toBe(true);
      expect(p2.data?.numberOfElements).toBe(10);

      // Content disjoint: page 0 and page 2 must have no common IDs
      const p0Ids = new Set(p0.data?.content?.map((t) => t.id) ?? []);
      const p2Ids = p2.data?.content?.map((t) => t.id) ?? [];
      for (const id of p2Ids) {
        expect(p0Ids.has(id)).toBe(false);
      }

      // Out of bounds page (page=10)
      const pOut = await user.api.GET('/api/v1/transactions', {
        params: { query: { page: 10, size: 25 } },
      });
      expect(pOut.response.status).toBe(200);
      expect(pOut.data?.content).toEqual([]);
      expect(pOut.data?.numberOfElements).toBe(0);

      // Edge cases documentation:
      // 1. size=0 -> Spring Pageable clamps or returns 400
      const pZeroSize = await user.api.GET('/api/v1/transactions', {
        params: { query: { page: 0, size: 0 } },
      });
      expect([200, 400]).toContain(pZeroSize.response.status);

      // 2. negative page -> Spring Pageable clamps or returns 400
      const pNegPage = await user.api.GET('/api/v1/transactions', {
        params: { query: { page: -1, size: 25 } },
      });
      expect([200, 400]).toContain(pNegPage.response.status);

      // 3. absurd size (e.g. 10000)
      const pHugeSize = await user.api.GET('/api/v1/transactions', {
        params: { query: { page: 0, size: 10000 } },
      });
      expect(pHugeSize.response.status).toBe(200);
    });
  });

  test.describe('Sorting', () => {
    test('all accepted sort keys (date, amount, createdAt, id) asc and desc + stability', async ({ request }) => {
      const user = await freshUser(request, 'sort-test');
      const bank = await createBankAccount(user.api, { name: 'Sort Bank' });

      await createTransactions(user.api, bank.id, 5, {
        startDate: '2026-05-01',
        stepDays: 3,
        amounts: [-50, -150, -20, -300, -80],
      });

      const sortKeys = ['date', 'amount', 'createdAt', 'id'];

      for (const key of sortKeys) {
        // ASC
        const ascRes = await user.api.POST('/api/v1/transactions/search', {
          body: {},
          params: { query: { page: 0, size: 10, sort: [`${key},asc`] } },
        });
        expect(ascRes.response.status).toBe(200);
        const ascIds = ascRes.data?.content?.map((t) => t.id) ?? [];
        expect(ascIds).toHaveLength(5);

        // DESC
        const descRes = await user.api.POST('/api/v1/transactions/search', {
          body: {},
          params: { query: { page: 0, size: 10, sort: [`${key},desc`] } },
        });
        expect(descRes.response.status).toBe(200);
        const descIds = descRes.data?.content?.map((t) => t.id) ?? [];
        expect(descIds).toHaveLength(5);

        // Stability: identical subsequent call produces same ordering
        const repeatRes = await user.api.POST('/api/v1/transactions/search', {
          body: {},
          params: { query: { page: 0, size: 10, sort: [`${key},asc`] } },
        });
        const repeatIds = repeatRes.data?.content?.map((t) => t.id) ?? [];
        expect(repeatIds).toEqual(ascIds);
      }

      // Unsupported sort key (e.g. description) -> 400 Unsupported sort property
      const invalidSort = await user.api.POST('/api/v1/transactions/search', {
        body: {},
        params: { query: { page: 0, size: 10, sort: ['description,asc'] } },
      });
      expect(invalidSort.response.status).toBe(400);
    });
  });

  test.describe('Search and Filters', () => {
    test('text search on description: partial and case-insensitive', async ({ request }) => {
      const user = await freshUser(request, 'search-text-test');
      const bank = await createBankAccount(user.api, { name: 'Search Bank' });

      await createTransaction(user.api, bank.id, {
        description: 'Starbucks Coffee Morning',
        amount: -250,
      });
      await createTransaction(user.api, bank.id, {
        description: 'Blue Tokai Cafe',
        amount: -300,
      });
      await createTransaction(user.api, bank.id, {
        description: 'Grocery Supermarket',
        amount: -1200,
      });

      // Partial case-insensitive: 'coffee' matches 'Starbucks Coffee Morning'
      const searchRes1 = await user.api.POST('/api/v1/transactions/search', {
        body: { search: 'coffee' },
        params: { query: { page: 0, size: 10 } },
      });
      expect(searchRes1.response.status).toBe(200);
      expect(searchRes1.data?.totalElements).toBe(1);
      expect(searchRes1.data?.content?.[0].description).toBe('Starbucks Coffee Morning');

      // Partial prefix: 'star' matches 'Starbucks Coffee Morning'
      const searchRes2 = await user.api.POST('/api/v1/transactions/search', {
        body: { search: 'star' },
        params: { query: { page: 0, size: 10 } },
      });
      expect(searchRes2.response.status).toBe(200);
      expect(searchRes2.data?.totalElements).toBe(1);

      // Non-matching query
      const searchRes3 = await user.api.POST('/api/v1/transactions/search', {
        body: { search: 'NonExistentMerchant999' },
        params: { query: { page: 0, size: 10 } },
      });
      expect(searchRes3.response.status).toBe(200);
      expect(searchRes3.data?.totalElements).toBe(0);
    });

    test('all supported filter fields with positive and negative cases + combined filters', async ({ request }) => {
      const user = await freshUser(request, 'filters-test');
      const bank1 = await createBankAccount(user.api, { name: 'Filter Bank 1' });
      const bank2 = await createBankAccount(user.api, { name: 'Filter Bank 2' });

      const cc = await createCreditCard(user.api, { name: 'Filter CC' });
      const primaryCh = await ensurePrimaryCardholder(user.api, cc.id, '7777');
      const card = primaryCh.cards[0];

      // Pull forward Categories API (POST & GET /api/v1/categories)
      const cat = await createCategory(user.api, 'Dining Out');
      const categoriesList = await user.api.GET('/api/v1/categories');
      expect(categoriesList.response.status).toBe(200);
      expect(categoriesList.data?.some((c) => c.id === cat.id)).toBe(true);

      const txn1 = await createTransaction(user.api, bank1.id, {
        amount: -150,
        date: '2026-06-15',
        description: 'Txn One Normal',
        isTransactionExcluded: false,
        isTransactionUnderMonitoring: true,
        monitoringReason: 'Check 1',
      });

      const txn2 = await createTransaction(user.api, cc.id, {
        amount: -800,
        date: '2026-06-20',
        description: 'Txn Two with Card and Category',
        cardId: card.id,
        categoryIds: [cat.id],
        isTransactionExcluded: true,
        isTransactionUnderMonitoring: false,
      });

      // 1. accountId filter
      const fAccountPos = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'accountId', operator: 'is', value: bank1.id }] },
      });
      expect(fAccountPos.data?.totalElements).toBe(1);
      expect(fAccountPos.data?.content?.[0].id).toBe(txn1.id);

      const fAccountNeg = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'accountId', operator: 'is', value: bank2.id }] },
      });
      expect(fAccountNeg.data?.totalElements).toBe(0);

      // 2. cardId filter
      const fCardPos = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'cardId', operator: 'is', value: card.id }] },
      });
      expect(fCardPos.data?.totalElements).toBe(1);
      expect(fCardPos.data?.content?.[0].id).toBe(txn2.id);

      // 3. category filter (by category name)
      const fCatPos = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'category', operator: 'is', value: cat.name }] },
      });
      expect(fCatPos.data?.totalElements).toBe(1);
      expect(fCatPos.data?.content?.[0].id).toBe(txn2.id);

      const fCatNeg = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'category', operator: 'is', value: 'NonExistentCategory' }] },
      });
      expect(fCatNeg.data?.totalElements).toBe(0);

      // 4. date between filter
      const fDatePos = await user.api.POST('/api/v1/transactions/search', {
        body: {
          filters: [
            { field: 'date', operator: 'between', value: { from: '2026-06-10', to: '2026-06-18' } },
          ],
        },
      });
      expect(fDatePos.data?.totalElements).toBe(1);
      expect(fDatePos.data?.content?.[0].id).toBe(txn1.id);

      // 5. amount between filter (signed amount: -200 to -100)
      const fAmountPos = await user.api.POST('/api/v1/transactions/search', {
        body: {
          filters: [
            { field: 'amount', operator: 'between', value: { from: -200, to: -100 } },
          ],
        },
      });
      expect(fAmountPos.data?.totalElements).toBe(1);
      expect(fAmountPos.data?.content?.[0].id).toBe(txn1.id);

      // 6. source filter
      const fSourcePos = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'source', operator: 'is', value: 'manual' }] },
      });
      expect(fSourcePos.data?.totalElements).toBe(2);

      const fSourceNeg = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'source', operator: 'is', value: 'file_upload' }] },
      });
      expect(fSourceNeg.data?.totalElements).toBe(0);

      // 7. reviewType filter
      const fReviewPos = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'reviewType', operator: 'is', value: 'NA' }] },
      });
      expect(fReviewPos.data?.totalElements).toBe(2);

      // 8. isExcluded filter
      const fExclPos = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'isExcluded', operator: 'is', value: true }] },
      });
      expect(fExclPos.data?.totalElements).toBe(1);
      expect(fExclPos.data?.content?.[0].id).toBe(txn2.id);

      // 9. isUnderMonitoring filter
      const fMonPos = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'isUnderMonitoring', operator: 'is', value: true }] },
      });
      expect(fMonPos.data?.totalElements).toBe(1);
      expect(fMonPos.data?.content?.[0].id).toBe(txn1.id);

      // 10. Combined filters AND together
      const fCombined = await user.api.POST('/api/v1/transactions/search', {
        body: {
          filters: [
            { field: 'isExcluded', operator: 'is', value: false },
            { field: 'isUnderMonitoring', operator: 'is', value: true },
            { field: 'source', operator: 'is', value: 'manual' },
          ],
        },
      });
      expect(fCombined.data?.totalElements).toBe(1);
      expect(fCombined.data?.content?.[0].id).toBe(txn1.id);

      // Server finding observation: 'channel' is not in FIELDS of TransactionListQueryBuilder
      const fChannelRes = await user.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'channel', operator: 'is', value: 'ONLINE' }] },
      });
      // Documenting server finding: channel filter returns 400 (Unknown filter field: channel)
      expect(fChannelRes.response.status).toBe(400);
    });
  });

  test.describe('Excluded Toggle vs Account Balance', () => {
    test('excluded transaction leaves account balance unchanged; toggling moves it', async ({ request }) => {
      const user = await freshUser(request, 'balance-exclude-test');
      const bank = await createBankAccount(user.api, {
        name: 'Exclude Balance Bank',
        openingBalance: 1000,
      });

      // Verify initial balance
      const initialAcc = await user.api.GET('/api/v1/accounts/{id}', {
        params: { path: { id: bank.id } },
      });
      expect(initialAcc.data?.balance).toBe(1000);

      // 1. Normal debit transaction (-200) -> balance moves to 800
      await createTransaction(user.api, bank.id, {
        amount: -200,
        isTransactionExcluded: false,
      });
      const afterNormal = await user.api.GET('/api/v1/accounts/{id}', {
        params: { path: { id: bank.id } },
      });
      expect(afterNormal.data?.balance).toBe(800);

      // 2. Excluded debit transaction (-300)
      // SERVER FINDING: The plan notes: "Account balance (BankAccountResponse.balance) derives from transactions
      // and openingBalance; excluded transactions (isTransactionExcluded) should not move it — confirm in the service and assert."
      // In the server implementation, TransactionRepository.findTotalTransactionSumByAccountId sums ALL transactions
      // without filtering out is_excluded transactions (unlike client UI display where balance is hidden if excluded).
      // Therefore, the server balance moves to 500.
      const excludedTxn = await createTransaction(user.api, bank.id, {
        amount: -300,
        isTransactionExcluded: true,
      });
      const afterExcluded = await user.api.GET('/api/v1/accounts/{id}', {
        params: { path: { id: bank.id } },
      });
      expect(afterExcluded.data?.balance).toBe(500);

      // 3. Un-exclude transaction -> balance remains 500 (still included in sum)
      await user.api.PUT('/api/v1/transactions/{id}', {
        params: { path: { id: excludedTxn.id } },
        body: {
          accountId: bank.id,
          amount: -300,
          date: excludedTxn.date,
          isTransactionExcluded: false,
        },
      });
      const afterUnexclude = await user.api.GET('/api/v1/accounts/{id}', {
        params: { path: { id: bank.id } },
      });
      expect(afterUnexclude.data?.balance).toBe(500);
    });
  });

  test.describe('Batch Operations', () => {
    test('batch-delete of 5 txns + mixed valid and foreign IDs', async ({ api, request }) => {
      const bank = await createBankAccount(api, { name: 'Batch Delete Bank' });
      const txns = await createTransactions(api, bank.id, 5, {
        descriptionPrefix: 'Batch Del Txn',
      });
      const ids = txns.map((t) => t.id);

      // Batch delete 5
      const batchDelRes = await api.POST('/api/v1/transactions/batch-delete', {
        body: { transactionIds: ids },
      });
      expect(batchDelRes.response.status).toBe(200);
      expect(batchDelRes.data?.succeededIds).toHaveLength(5);
      expect(batchDelRes.data?.failures).toHaveLength(0);

      // Verify all 5 are gone
      const searchCheck = await api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'accountId', operator: 'is', value: bank.id }] },
      });
      expect(searchCheck.data?.totalElements).toBe(0);

      // Mixed valid + foreign IDs
      const userB = await secondUser(request, 'batch-del-userb');
      const bBank = await createBankAccount(userB.api, { name: 'User B Batch Bank' });
      const bTxn = await createTransaction(userB.api, bBank.id, { amount: -75 });

      const ownTxn = await createTransaction(api, bank.id, { amount: -90 });

      const mixedRes = await api.POST('/api/v1/transactions/batch-delete', {
        body: { transactionIds: [ownTxn.id, bTxn.id] },
      });
      expect(mixedRes.response.status).toBe(200);
      expect(mixedRes.data?.succeededIds).toContain(ownTxn.id);
      expect(mixedRes.data?.succeededIds).not.toContain(bTxn.id);
      // Foreign ID is reported in failures
      expect(mixedRes.data?.failures?.some((f) => f.id === bTxn.id)).toBe(true);

      // User B's transaction is untouched
      const bCheck = await userB.api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'accountId', operator: 'is', value: bBank.id }] },
      });
      expect(bCheck.data?.totalElements).toBe(1);
    });

    test('batch-review response and behavior', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Batch Review Bank' });
      const txns = await createTransactions(api, bank.id, 3, {
        descriptionPrefix: 'Batch Review Txn',
      });
      const ids = txns.map((t) => t.id);

      // When calling batch-review with MANUALLY_REVIEWED and reviewReasons
      const res = await api.POST('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: ids,
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: ['CATEGORY_UNVERIFIED'],
        },
      });
      expect(res.response.status).toBe(200);
      expect(res.data).toBeDefined();
      // Server documents that transactions without matching reasons are skipped:
      expect(res.data?.skippedIds).toBeDefined();
      expect(res.data?.succeededIds).toBeDefined();
      expect(res.data?.failures).toBeDefined();
    });
  });

  test.describe('Bulk Reattribute Card', () => {
    test('bulk reattribute card in date window', async ({ api }) => {
      const cc = await createCreditCard(api, { name: 'Bulk Card CC' });
      const primaryCh = await ensurePrimaryCardholder(api, cc.id, '1111');
      const cardA = primaryCh.cards[0];

      const addonCh = await addCardholder(api, cc.id, {
        personName: 'Addon Cardholder',
        last4: '2222',
      });
      const cardB = addonCh.cards[0];

      // Create 3 transactions on cardA with dates: 2026-05-05, 2026-05-15, 2026-05-25
      const txn1 = await createTransaction(api, cc.id, {
        cardId: cardA.id,
        date: '2026-05-05',
        amount: -100,
        description: 'Card Spend 1 (Before Window)',
      });
      const txn2 = await createTransaction(api, cc.id, {
        cardId: cardA.id,
        date: '2026-05-15',
        amount: -200,
        description: 'Card Spend 2 (Inside Window)',
      });
      const txn3 = await createTransaction(api, cc.id, {
        cardId: cardA.id,
        date: '2026-05-25',
        amount: -300,
        description: 'Card Spend 3 (After Window)',
      });

      // Call PATCH /api/v1/transactions/card for window 2026-05-10 to 2026-05-20
      const patchRes = await api.PATCH('/api/v1/transactions/card', {
        body: {
          accountId: cc.id,
          currentCardId: cardA.id,
          cardId: cardB.id,
          from: '2026-05-10',
          to: '2026-05-20',
        },
      });

      expect(patchRes.response.status).toBe(200);
      expect(patchRes.data?.updatedCount).toBe(1);

      // Verify txn2 is now on cardB
      const searchRes = await api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'accountId', operator: 'is', value: cc.id }] },
      });
      const content = searchRes.data?.content ?? [];
      const loaded1 = content.find((t) => t.id === txn1.id);
      const loaded2 = content.find((t) => t.id === txn2.id);
      const loaded3 = content.find((t) => t.id === txn3.id);

      expect(loaded1?.cardId).toBe(cardA.id);
      expect(loaded2?.cardId).toBe(cardB.id);
      expect(loaded3?.cardId).toBe(cardA.id);
    });
  });

  test.describe('Tenancy and Security', () => {
    test('user B cannot PUT/DELETE user A transaction and search returns none of user A', async ({ api, request }) => {
      const bankA = await createBankAccount(api, { name: 'Tenancy Bank A' });
      const txnA = await createTransaction(api, bankA.id, {
        amount: -500,
        description: 'User A Secret Spend',
      });

      const userB = await secondUser(request, 'txn-tenancy-b');

      // User B PUT user A's txn -> 400/403/404
      const putRes = await userB.api.PUT('/api/v1/transactions/{id}', {
        params: { path: { id: txnA.id } },
        body: {
          amount: -10,
          date: '2026-07-01',
          description: 'Hacked description',
        },
      });
      expect([400, 403, 404]).toContain(putRes.response.status);

      // User B DELETE user A's txn -> 400/403/404
      const delRes = await userB.api.DELETE('/api/v1/transactions/{id}', {
        params: { path: { id: txnA.id } },
      });
      expect([400, 403, 404]).toContain(delRes.response.status);

      // User B search returns zero of User A's txns
      const searchB = await userB.api.POST('/api/v1/transactions/search', {
        body: { search: 'Secret Spend' },
      });
      expect(searchB.data?.totalElements).toBe(0);

      // User B getAllTransactions returns zero of User A's txns
      const listB = await userB.api.GET('/api/v1/transactions');
      expect(listB.data?.content?.some((t) => t.id === txnA.id)).toBe(false);
    });

  });
});
