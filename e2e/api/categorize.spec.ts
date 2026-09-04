import { expectStatus } from '../fixtures/api';
import { llmCalls, resetLlm, setLlmMode } from '../fixtures/control';
import { scriptCategorize, scriptCategorizeError } from '../fixtures/llm';
import { createCategory, createRule } from '../fixtures/seed/categories';
import { expectUnauthenticated } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Categorize API & Scripted LLM', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test('rule hit: returns fromRule=true, ruleId set, and records NO LLM calls', async ({
    api,
  }) => {
    const cat = await createCategory(api, 'Coffee & Cafes');
    const rule = await createRule(api, {
      merchantKey: 'STARBUCKS',
      categoryIds: [cat.id],
      matchType: 'CONTAINS',
      mcc: '5814',
    });

    // Ensure calls queue is empty initially
    const initialCalls = await llmCalls(api, 'categorize');
    expect(initialCalls.length).toBe(0);

    // Call categorize with a description matching the rule
    const res = await api.POST('/api/v1/categorize', {
      body: { description: 'STARBUCKS COFFEE KORAMANGALA' },
    });
    expectStatus(res, 200);
    expect(res.data?.fromRule).toBe(true);
    expect(res.data?.ruleId).toBe(rule.id);
    expect(res.data?.mcc).toBe('5814');
    expect(res.data?.categories.some((c) => c.id === cat.id)).toBe(true);

    // Crucial assertion: rule match must completely bypass LLM
    const callsAfter = await llmCalls(api, 'categorize');
    expect(callsAfter.length).toBe(0);
  });

  test('rule tie-break: higher precedence rule wins when multiple rules match', async ({
    api,
  }) => {
    // Precedence: EXACT > STARTS_WITH > CONTAINS > REGEX > MERCHANT_KEY
    const catContains = await createCategory(api, 'Contains Category');
    const catExact = await createCategory(api, 'Exact Category');

    await createRule(api, {
      merchantKey: 'SWIGGY',
      categoryIds: [catContains.id],
      matchType: 'CONTAINS',
    });

    const exactRule = await createRule(api, {
      merchantKey: 'SWIGGY',
      categoryIds: [catExact.id],
      matchType: 'EXACT',
    });

    // When description is exactly 'SWIGGY', EXACT rule beats CONTAINS rule
    const res = await api.POST('/api/v1/categorize', {
      body: { description: 'SWIGGY' },
    });
    expectStatus(res, 200);
    expect(res.data?.fromRule).toBe(true);
    expect(res.data?.ruleId).toBe(exactRule.id);
    expect(res.data?.categories.some((c) => c.id === catExact.id)).toBe(true);
    expect(res.data?.categories.some((c) => c.id === catContains.id)).toBe(false);
  });

  test('LLM hit with scripted response: reuses existing category and records LLM call', async ({
    api,
  }) => {
    const existingCat = await createCategory(api, 'Rideshare & Commute');

    // Script the LLM response for 'categorize' task
    await scriptCategorize(api, [
      {
        index: 0,
        merchantKey: 'UBER',
        displayName: 'Uber Rides',
        categoryNames: [existingCat.name],
        noFit: false,
      },
    ]);

    const res = await api.POST('/api/v1/categorize', {
      body: { description: 'UBER TRIP MUMBAI' },
    });
    expectStatus(res, 200);
    expect(res.data?.fromRule).toBe(false);
    expect(res.data?.ruleId ?? null).toBeNull();
    // Existing category reused
    expect(res.data?.categories.some((c) => c.id === existingCat.id)).toBe(true);

    // Verify LLM call was recorded
    const calls = await llmCalls(api, 'categorize');
    expect(calls.length).toBe(1);
    expect(calls[0].task).toBe('categorize');
    expect(calls[0].prompt).toContain('UBER TRIP MUMBAI');
  });

  test('LLM response with noFit=true returns empty categories', async ({
    api,
  }) => {
    await createCategory(api, 'Some Category');

    await scriptCategorize(api, [
      {
        index: 0,
        merchantKey: 'UNINTELLIGIBLE',
        displayName: 'Unintelligible',
        categoryNames: [],
        noFit: true,
      },
    ]);

    const res = await api.POST('/api/v1/categorize', {
      body: { description: 'GARBAGE 992384 10293847' },
    });
    expectStatus(res, 200);
    expect(res.data?.fromRule).toBe(false);
    expect(res.data?.categories.length).toBe(0);
  });

  test('scripted LLM error path handles failure cleanly without stack trace', async ({
    api,
  }) => {
    await createCategory(api, 'Fallback Cat');

    // Script a FATAL error in LLM
    await scriptCategorizeError(api, {
      kind: 'FATAL',
      message: 'LLM connection refused or quota exhausted',
    });

    const res = await api.POST('/api/v1/categorize', {
      body: { description: 'SOME TRANSACTION' },
    });
    // Server design: suggestForDescription catches LLM exception and returns 200 with empty result
    expectStatus(res, 200);
    expect(res.data?.categories.length).toBe(0);
    expect(res.data?.fromRule).toBe(false);
  });

  test('STRICT mode with no script produces clean failure path', async ({
    api,
  }) => {
    await createCategory(api, 'Strict Cat');
    await setLlmMode(api, 'STRICT');

    // With no scripted response queued, STRICT mode throws NoScriptedResponseException
    const res = await api.POST('/api/v1/categorize', {
      body: { description: 'UNSCRIPTED TRANSACTION' },
    });
    // suggestForDescription catches and logs, resolving to empty result
    expectStatus(res, 200);
    expect(res.data?.categories.length).toBe(0);
    expect(res.data?.fromRule).toBe(false);
  });

  test('401 unauthorized on /categorize without session', async () => {
    await expectUnauthenticated('POST', '/api/v1/categorize', {
      description: 'SWIGGY',
    });
  });
});
