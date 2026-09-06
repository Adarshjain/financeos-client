import { expectStatus, waitForJob } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory, createRule, RuleResponse } from '../fixtures/seed/categories';
import { createTransaction } from '../fixtures/seed/transactions';
import { expectForeign, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('Rules API', () => {
  test('create rules with each matchType and validate invalid patterns', async ({
    api,
  }) => {
    const cat = await createCategory(api, 'Rule Test Category');

    // 1. Valid match types
    const matchTypes = [
      { type: 'MERCHANT_KEY', key: 'STARBUCKS' },
      { type: 'CONTAINS', key: 'AUTOPAY' },
      { type: 'STARTS_WITH', key: 'ACH/' },
      { type: 'EXACT', key: 'NEFT SALARY CREDIT' },
      { type: 'REGEX', key: 'NEFT.*(HDFC|ICICI)' },
    ];

    for (const { type, key } of matchTypes) {
      const rule = await createRule(api, {
        merchantKey: key,
        categoryIds: [cat.id],
        matchType: type,
        displayName: `Display ${type}`,
      });
      expect(rule.id).toBeDefined();
      expect(rule.matchType).toBe(type);
      expect(rule.categories.map((c) => c.id)).toContain(cat.id);
    }

    // 2. Invalid regex pattern -> 400 Bad Request
    const badRegexRes = await api.POST('/api/v1/rules', {
      body: {
        merchantKey: '[unclosed-regex-bracket(',
        categoryIds: [cat.id],
        matchType: 'REGEX',
      },
    });
    expectStatus(badRegexRes, 400);

    // 3. Short pattern (< 3 chars) for CONTAINS -> 400
    const shortPatternRes = await api.POST('/api/v1/rules', {
      body: {
        merchantKey: 'ab',
        categoryIds: [cat.id],
        matchType: 'CONTAINS',
      },
    });
    expectStatus(shortPatternRes, 400);

    // 4. Duplicate rule (same key + matchType) -> 409 Conflict
    const dupRes = await api.POST('/api/v1/rules', {
      body: {
        merchantKey: 'STARBUCKS',
        categoryIds: [cat.id],
        matchType: 'MERCHANT_KEY',
      },
    });
    expectStatus(dupRes, 409);
  });

  test('sourced-only matching in preview-matches: manual transactions do not match', async ({
    api,
  }) => {
    const account = await createBankAccount(api, { name: 'Rule Preview Account' });

    // Create a manual transaction whose description contains 'SWIGGY'
    const manualTxn = await createTransaction(api, account.id, {
      description: 'SWIGGY FOOD DELIVERY BANGALORE',
      amount: -450,
    });
    expect(manualTxn.id).toBeDefined();
    // Manual transactions do not carry sourcedDescription
    expect(manualTxn.sourcedDescription ?? null).toBeNull();

    // Call preview-matches for SWIGGY
    const previewRes = await api.POST('/api/v1/rules/preview-matches', {
      body: {
        merchantKey: 'SWIGGY',
        matchType: 'MERCHANT_KEY',
      },
    });
    expectStatus(previewRes, 200);
    const page = previewRes.data!;
    expect(page.content).toBeDefined();
    // Confirms sourced-only matching: manual description-only transactions never match
    expect(page.content.find((t: { id: string }) => t.id === manualTxn.id)).toBeUndefined();
    expect(page.totalElements).toBe(0);
  });

  test('apply rule enqueues RULE_APPLY job and completes', async ({
    api,
  }) => {
    const account = await createBankAccount(api, { name: 'Apply Rule Account' });
    const cat = await createCategory(api, 'Dining Category');
    const rule = await createRule(api, {
      merchantKey: 'MCDONALDS',
      categoryIds: [cat.id],
      matchType: 'CONTAINS',
    });

    const txn = await createTransaction(api, account.id, {
      description: 'MCDONALDS BURGER',
    });

    // 1. Apply rule to all matches ({ all: true })
    const applyAllRes = await api.POST('/api/v1/rules/{id}/apply', {
      params: { path: { id: rule.id } },
      body: { all: true },
    });
    expectStatus(applyAllRes, 202);
    expect(applyAllRes.data?.jobId).toBeDefined();

    const jobResultAll = await waitForJob(api, applyAllRes.data!.jobId);
    expect(jobResultAll.status).toBe('SUCCEEDED');

    // 2. Apply rule with explicit transactionIds
    const applyExplicitRes = await api.POST('/api/v1/rules/{id}/apply', {
      params: { path: { id: rule.id } },
      body: { transactionIds: [txn.id] },
    });
    expectStatus(applyExplicitRes, 202);
    expect(applyExplicitRes.data?.jobId).toBeDefined();

    const jobResultExplicit = await waitForJob(
      api,
      applyExplicitRes.data!.jobId
    );
    expect(jobResultExplicit.status).toBe('SUCCEEDED');

    // 3. Apply without all and without transactionIds -> 400
    const badApplyRes = await api.POST('/api/v1/rules/{id}/apply', {
      params: { path: { id: rule.id } },
      body: {},
    });
    expectStatus(badApplyRes, 400);
  });

  test('verify, search, filter, update, and pagination of rules', async ({
    api,
  }) => {
    const cat1 = await createCategory(api, 'Category Alpha');
    const cat2 = await createCategory(api, 'Category Beta');

    const rule = await createRule(api, {
      merchantKey: 'DOMINOS PIZZA',
      displayName: 'Dominos Special',
      categoryIds: [cat1.id],
      matchType: 'CONTAINS',
      mcc: '5814',
    });

    // Verify endpoint
    const verifyRes = await api.POST('/api/v1/rules/{id}/verify', {
      params: { path: { id: rule.id } },
    });
    expectStatus(verifyRes, 200);
    expect(verifyRes.data?.verified).toBe(true);

    // Filter by verified=true
    const verifiedListRes = await api.GET('/api/v1/rules', {
      params: { query: { verified: true, page: 0, size: 20, sort: [] } },
    });
    expectStatus(verifiedListRes, 200);
    expect(
      verifiedListRes.data?.content.some((r: RuleResponse) => r.id === rule.id)
    ).toBe(true);

    // Search by merchantKey
    const searchKeyRes = await api.GET('/api/v1/rules', {
      params: { query: { search: 'DOMINOS', page: 0, size: 20, sort: [] } },
    });
    expectStatus(searchKeyRes, 200);
    expect(
      searchKeyRes.data?.content.some((r: RuleResponse) => r.id === rule.id)
    ).toBe(true);

    // Search by displayName
    const searchDisplayRes = await api.GET('/api/v1/rules', {
      params: { query: { search: 'Special', page: 0, size: 20, sort: [] } },
    });
    expectStatus(searchDisplayRes, 200);
    expect(
      searchDisplayRes.data?.content.some((r: RuleResponse) => r.id === rule.id)
    ).toBe(true);

    // Update rule
    const updateRes = await api.PUT('/api/v1/rules/{id}', {
      params: { path: { id: rule.id } },
      body: {
        displayName: 'Dominos Delivery',
        categoryIds: [cat2.id],
        mcc: '5812',
      },
    });
    expectStatus(updateRes, 200);
    expect(updateRes.data?.displayName).toBe('Dominos Delivery');
    expect(updateRes.data?.mcc).toBe('5812');
    expect(updateRes.data?.categories.map((c) => c.id)).toContain(cat2.id);

    // Pagination contract
    const pageRes = await api.GET('/api/v1/rules', {
      params: { query: { page: 0, size: 2, sort: [] } },
    });
    expectStatus(pageRes, 200);
    const p = pageRes.data!;
    expect(p.size).toBe(2);
    expect(p.number).toBe(0);
    expect(typeof p.totalElements).toBe('number');
    expect(typeof p.totalPages).toBe('number');
  });

  test('delete rule removes it and updates rule list', async ({ api }) => {
    const cat = await createCategory(api, 'Temp Cat');
    const rule = await createRule(api, {
      merchantKey: 'TEMP_MERCHANT',
      categoryIds: [cat.id],
    });

    // Delete rule
    const delRes = await api.DELETE('/api/v1/rules/{id}', {
      params: { path: { id: rule.id } },
    });
    expectStatus(delRes, 204);

    // Confirm it is gone from rules list
    const listRes = await api.GET('/api/v1/rules', {
      params: { query: { page: 0, size: 50, sort: [] } },
    });
    expectStatus(listRes, 200);
    expect(listRes.data?.content.some((r: RuleResponse) => r.id === rule.id)).toBe(false);

    // Delete unknown -> 404
    const delUnknownRes = await api.DELETE('/api/v1/rules/{id}', {
      params: { path: { id: UNKNOWN_UUID } },
    });
    expectStatus(delUnknownRes, 404);
  });

  test('tenancy: user B cannot modify, verify, apply, or delete user A rule', async ({
    api,
    request,
  }) => {
    const catA = await createCategory(api, 'Tenant A Category');
    const ruleA = await createRule(api, {
      merchantKey: 'USER_A_MERCHANT',
      categoryIds: [catA.id],
    });
    const u2 = await secondUser(request);

    // User B tries to update user A's rule -> 400 (ValidationException)
    await expectForeign(u2.api, 'PUT', `/api/v1/rules/${ruleA.id}`, {
      displayName: 'Hacked Rule',
    });

    // User B tries to verify user A's rule -> 400
    await expectForeign(u2.api, 'POST', `/api/v1/rules/${ruleA.id}/verify`);

    // User B tries to apply user A's rule -> 400
    await expectForeign(u2.api, 'POST', `/api/v1/rules/${ruleA.id}/apply`, {
      all: true,
    });

    // User B tries to delete user A's rule -> 400
    await expectForeign(u2.api, 'DELETE', `/api/v1/rules/${ruleA.id}`);

    // User B rules list should NOT contain user A's rule
    const listB = await u2.api.GET('/api/v1/rules', {
      params: { query: { page: 0, size: 50, sort: [] } },
    });
    expectStatus(listB, 200);
    expect(listB.data?.content.some((r: RuleResponse) => r.id === ruleA.id)).toBe(false);
  });

});
