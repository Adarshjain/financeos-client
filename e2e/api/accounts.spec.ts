import {
  createBankAccount,
  createBrokerAccount,
  createCreditCard,
  createGenericAccount,
  ensurePrimaryCardholder,
} from '../fixtures/seed/accounts';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, freshUser,test } from '../fixtures/test';

function assertNoExtraKeys(obj: Record<string, unknown>, allowed: Set<string>, entityName: string) {
  for (const key of Object.keys(obj)) {
    expect(allowed.has(key), `Unexpected top-level key '${key}' in ${entityName}`).toBe(true);
  }
}

const COMMON_ACCOUNT_KEYS = [
  'id',
  'name',
  'type',
  'description',
  'financialPosition',
  'excludeFromNetAsset',
  'ingestFromDate',
  'replacesAccountId',
  'closedOn',
  'balance',
  'balanceAnchored',
  'anchorDate',
  'reconciliationGap',
  'warnings',
  'createdAt',
  'updatedAt',
];

const BANK_ACCOUNT_KEYS = new Set([
  ...COMMON_ACCOUNT_KEYS,
  'last4',
  'openingBalance',
  'lastStatementDate',
  'cardholders',
]);

const CREDIT_CARD_KEYS = new Set([
  ...COMMON_ACCOUNT_KEYS,
  'last4',
  'creditLimit',
  'anniversaryDate',
  'issuer',
  'productName',
  'lastStatementDate',
  'cardholders',
]);

const BROKER_KEYS = new Set([
  ...COMMON_ACCOUNT_KEYS,
  'provider',
  'clientId',
  'cashBalance',
]);

const GENERIC_KEYS = new Set([
  ...COMMON_ACCOUNT_KEYS,
]);

test.describe('Accounts API (@api)', () => {
  test('create: each type with minimal and full bodies + shape check', async ({ api }) => {
    // 1. Bank Account: minimal body
    const bankMin = await api.POST('/api/v1/accounts', {
      body: { type: 'bank_account', name: 'Min Bank' },
    });
    expect(bankMin.response.status).toBe(201);
    expect(bankMin.data?.type).toBe('bank_account');
    assertNoExtraKeys(bankMin.data as any, BANK_ACCOUNT_KEYS, 'BankAccountResponse');

    // Bank Account: full body
    const bankFull = await api.POST('/api/v1/accounts', {
      body: {
        type: 'bank_account',
        name: 'Full Bank Account',
        last4: '5678',
        openingBalance: 25000.5,
        statementPassword: 'secretpassword',
        financialPosition: 'asset',
        excludeFromNetAsset: true,
        description: 'Primary savings account',
      },
    });
    expect(bankFull.response.status).toBe(201);
    expect((bankFull.data as any).last4).toBe('5678');
    expect((bankFull.data as any).openingBalance).toBe(25000.5);
    expect(bankFull.data?.excludeFromNetAsset).toBe(true);
    expect(bankFull.data?.description).toBe('Primary savings account');
    assertNoExtraKeys(bankFull.data as any, BANK_ACCOUNT_KEYS, 'BankAccountResponse');

    // 2. Credit Card: minimal body (name, last4, creditLimit, anniversaryDate required)
    const ccMin = await api.POST('/api/v1/accounts', {
      body: {
        type: 'credit_card',
        name: 'Min Credit Card',
        last4: '1111',
        creditLimit: 50000,
        anniversaryDate: '2024-05-15',
      },
    });
    expect(ccMin.response.status).toBe(201);
    expect(ccMin.data?.type).toBe('credit_card');
    assertNoExtraKeys(ccMin.data as any, CREDIT_CARD_KEYS, 'CreditCardAccountResponse');

    // Credit Card: full body
    const ccFull = await api.POST('/api/v1/accounts', {
      body: {
        type: 'credit_card',
        name: 'Full Credit Card',
        last4: '2222',
        creditLimit: 200000,
        anniversaryDate: '2024-06-01',
        issuer: 'ICICI Bank',
        productName: 'Sapphiro',
        statementPassword: 'ccpass',
        description: 'Premium travel card',
        financialPosition: 'liability',
        excludeFromNetAsset: false,
      },
    });
    expect(ccFull.response.status).toBe(201);
    expect((ccFull.data as any).issuer).toBe('ICICI Bank');
    expect((ccFull.data as any).productName).toBe('Sapphiro');
    assertNoExtraKeys(ccFull.data as any, CREDIT_CARD_KEYS, 'CreditCardAccountResponse');

    // 3. Broker: minimal body (name, provider required)
    const brokerMin = await api.POST('/api/v1/accounts', {
      body: {
        type: 'broker',
        name: 'Min Broker',
        provider: 'Groww',
      },
    });
    expect(brokerMin.response.status).toBe(201);
    expect(brokerMin.data?.type).toBe('broker');
    assertNoExtraKeys(brokerMin.data as any, BROKER_KEYS, 'BrokerAccountResponse');

    // Broker: full body
    const brokerFull = await api.POST('/api/v1/accounts', {
      body: {
        type: 'broker',
        name: 'Full Broker Account',
        provider: 'Zerodha',
        clientId: 'ZRD1234',
        cashBalance: 15400.75,
        description: 'Equities and F&O',
        financialPosition: 'asset',
        excludeFromNetAsset: false,
      },
    });
    expect(brokerFull.response.status).toBe(201);
    expect((brokerFull.data as any).provider).toBe('Zerodha');
    expect((brokerFull.data as any).clientId).toBe('ZRD1234');
    expect((brokerFull.data as any).cashBalance).toBe(15400.75);
    assertNoExtraKeys(brokerFull.data as any, BROKER_KEYS, 'BrokerAccountResponse');

    // 4. Generic Account: minimal body (name required)
    const genericMin = await api.POST('/api/v1/accounts', {
      body: {
        type: 'generic',
        name: 'Cash Wallet',
      },
    });
    expect(genericMin.response.status).toBe(201);
    expect(genericMin.data?.type).toBe('generic');
    assertNoExtraKeys(genericMin.data as any, GENERIC_KEYS, 'GenericAccountResponse');

    // Generic Account: full body
    const genericFull = await api.POST('/api/v1/accounts', {
      body: {
        type: 'generic',
        name: 'Safe Deposit Cash',
        description: 'Emergency physical cash',
        financialPosition: 'asset',
        excludeFromNetAsset: false,
      },
    });
    expect(genericFull.response.status).toBe(201);
    expect(genericFull.data?.description).toBe('Emergency physical cash');
    assertNoExtraKeys(genericFull.data as any, GENERIC_KEYS, 'GenericAccountResponse');
  });

  test('create: validation errors for missing or invalid fields', async ({ api }) => {
    // 1. Missing name
    const noNameRes = await api.POST('/api/v1/accounts', {
      body: { type: 'bank_account', name: '' } as any,
    });
    expect(noNameRes.response.status).toBe(400);

    // 2. Credit Card missing required fields (creditLimit, anniversaryDate, last4)
    const ccMissingRes = await api.POST('/api/v1/accounts', {
      body: { type: 'credit_card', name: 'Incomplete CC' } as any,
    });
    expect(ccMissingRes.response.status).toBe(400);

    // 3. Bad last4 (not 4 digits) - triggers 400 validation or 409 DB constraint violation
    const badLast4Res = await api.POST('/api/v1/accounts', {
      body: {
        type: 'credit_card',
        name: 'Bad last4 CC',
        last4: '12',
        creditLimit: 50000,
        anniversaryDate: '2024-01-01',
      } as any,
    });
    expect([400, 409].includes(badLast4Res.response.status)).toBe(true);

    // 4. Unknown account type
    const unknownTypeRes = await api.POST('/api/v1/accounts', {
      body: { type: 'crypto_wallet', name: 'Bitcoin' } as any,
    });
    expect(unknownTypeRes.response.status).toBe(400);
  });

  test('list: accounts appear, stable ordering, closed accounts included', async ({ request }) => {
    const { api: freshApi } = await freshUser(request, 'acc-list');

    const b1 = await createBankAccount(freshApi, { name: 'Alpha Bank' });
    const b2 = await createBankAccount(freshApi, { name: 'Beta Bank' });
    const cc = await createCreditCard(freshApi, { name: 'Gamma Card' });

    // Close b1
    await freshApi.POST('/api/v1/accounts/{id}/close', {
      params: { path: { id: b1.id } },
      body: { closedOn: '2025-03-01' },
    });

    const list1 = await freshApi.GET('/api/v1/accounts');
    expect(list1.response.status).toBe(200);
    const accounts1 = list1.data ?? [];
    expect(accounts1.length).toBe(3);

    // Closed account is returned and has closedOn set
    const closedInList = accounts1.find((a) => a.id === b1.id);
    expect(closedInList).toBeDefined();
    expect(closedInList?.closedOn).toBeTruthy();

    // Call again to verify ordering stability
    const list2 = await freshApi.GET('/api/v1/accounts');
    expect(list2.response.status).toBe(200);
    const ids1 = accounts1.map((a) => a.id);
    const ids2 = (list2.data ?? []).map((a) => a.id);
    expect(ids1).toEqual(ids2);
  });

  test('get, update, and delete empty account', async ({ api }) => {
    const acc = await createBankAccount(api, {
      name: 'To Be Updated',
      description: 'Old description',
      openingBalance: 5000,
    });

    // 1. GET by id
    const getRes = await api.GET('/api/v1/accounts/{id}', {
      params: { path: { id: acc.id } },
    });
    expect(getRes.response.status).toBe(200);
    expect(getRes.data?.name).toBe('To Be Updated');

    // 2. PUT update
    const updateRes = await api.PUT('/api/v1/accounts/{id}', {
      params: { path: { id: acc.id } },
      body: {
        type: 'bank_account',
        name: 'Updated Bank Name',
        description: 'New description',
        openingBalance: 7500,
      },
    });
    expect(updateRes.response.status).toBe(200);
    expect(updateRes.data?.name).toBe('Updated Bank Name');
    expect(updateRes.data?.description).toBe('New description');
    expect((updateRes.data as any).openingBalance).toBe(7500);

    // Verify update reflected on GET
    const getUpdatedRes = await api.GET('/api/v1/accounts/{id}', {
      params: { path: { id: acc.id } },
    });
    expect(getUpdatedRes.data?.name).toBe('Updated Bank Name');

    // 3. DELETE empty account
    const deleteRes = await api.DELETE('/api/v1/accounts/{id}', {
      params: { path: { id: acc.id } },
    });
    expect([200, 204].includes(deleteRes.response.status)).toBe(true);

    // After delete, GET returns 404
    const getAfterDelete = await api.GET('/api/v1/accounts/{id}', {
      params: { path: { id: acc.id } },
    });
    expect(getAfterDelete.response.status).toBe(404);
  });

  test.fixme('delete account with dependent transactions blocked/cascaded (Phase 6 placeholder)', async () => {
    // Covered in Phase 6 when transaction seeding is available
  });

  test('close and reopen account lifecycle', async ({ api }) => {
    const acc = await createCreditCard(api, { name: 'Lifecycle CC' });

    // Close account
    const closeRes = await api.POST('/api/v1/accounts/{id}/close', {
      params: { path: { id: acc.id } },
      body: { closedOn: '2025-06-15' },
    });
    expect(closeRes.response.status).toBe(200);
    expect(closeRes.data?.closedOn).toBe('2025-06-15');

    // Reopen account
    const reopenRes = await api.POST('/api/v1/accounts/{id}/reopen', {
      params: { path: { id: acc.id } },
    });
    expect(reopenRes.response.status).toBe(200);
    expect(reopenRes.data?.closedOn).toBeNull();
  });

  test('card-summary on credit card vs bank account', async ({ api }) => {
    const cc = await createCreditCard(api, { name: 'Card Summary CC' });
    const bank = await createBankAccount(api, { name: 'Card Summary Bank' });

    // On credit card -> returns 200
    const ccSummary = await api.GET('/api/v1/accounts/{id}/card-summary', {
      params: { path: { id: cc.id } },
    });
    expect(ccSummary.response.status).toBe(200);

    // On bank account -> rejected with 400 (only supported for credit card)
    const bankSummary = await api.GET('/api/v1/accounts/{id}/card-summary', {
      params: { path: { id: bank.id } },
    });
    expect(bankSummary.response.status).toBe(400);
  });

  test('statements on fresh account returns empty list', async ({ api }) => {
    const acc = await createBankAccount(api, { name: 'Fresh Statements Bank' });
    const res = await api.GET('/api/v1/accounts/{accountId}/statements', {
      params: { path: { accountId: acc.id } },
    });
    expect(res.response.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data?.length).toBe(0);
  });

  test('balance: fresh bank account balance equals openingBalance', async ({ api }) => {
    const acc = await createBankAccount(api, {
      name: 'Balance Test Bank',
      openingBalance: 12345.67,
    });

    const getRes = await api.GET('/api/v1/accounts/{id}', {
      params: { path: { id: acc.id } },
    });
    expect(getRes.response.status).toBe(200);
    expect(getRes.data?.balance).toBe(12345.67);
  });

  test('tenancy: cross-tenant access returns 404/403/400; unauthenticated returns 401', async ({
    api: apiA,
    request,
  }) => {
    const accA = await createBankAccount(apiA, { name: "User A's Bank" });
    const { api: apiB } = await secondUser(request, 'acc-tenancy');

    const accountEndpoints = [
      { method: 'GET' as const, path: `/api/v1/accounts/${accA.id}` },
      {
        method: 'PUT' as const,
        path: `/api/v1/accounts/${accA.id}`,
        body: { type: 'bank_account', name: 'Hacked' },
      },
      { method: 'POST' as const, path: `/api/v1/accounts/${accA.id}/close`, body: {} },
      { method: 'POST' as const, path: `/api/v1/accounts/${accA.id}/reopen`, body: {} },
      { method: 'GET' as const, path: `/api/v1/accounts/${accA.id}/card-summary` },
      { method: 'GET' as const, path: `/api/v1/accounts/${accA.id}/statements` },
      { method: 'DELETE' as const, path: `/api/v1/accounts/${accA.id}` },
    ];

    for (const ep of accountEndpoints) {
      // 1. Cross-tenant for user B with user A's real id
      await expectForeign(apiB, ep.method, ep.path, ep.body);

      // 2. Unauthenticated request with no cookie
      await expectUnauthenticated(ep.method, ep.path, ep.body);
    }
  });
});
