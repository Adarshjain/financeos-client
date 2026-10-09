import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { scriptCategorize } from '../fixtures/llm';
import { createBankAccount } from '../fixtures/seed/accounts';
import type { RuleResponse } from '../fixtures/seed/categories';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expect, freshUser, test } from '../fixtures/test';

const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000';

const bankSpec: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '4455667788',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 20000,
  rows: [
    { date: '2026-04-03', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 450 },
    { date: '2026-04-09', description: 'UBER TRIP BANGALORE', debit: 320 },
    { date: '2026-04-15', description: 'BIGBASKET ORDER', debit: 1800 },
  ],
};

/** Ingests one statement whose rows the scripted LLM categorizes, leaving three unverified LLM rules. */
async function seedLlmRules(api: ApiClient): Promise<Record<string, RuleResponse>> {
  await resetLlm(api);
  await setLlmMode(api, 'SCHEMA_DEFAULT');
  await scriptCategorize(api, [
    { index: 0, merchantKey: 'BLUE TOKAI', categoryNames: ['Coffee'] },
    { index: 1, merchantKey: 'UBER', categoryNames: ['Travel'] },
    { index: 2, merchantKey: 'BIGBASKET', categoryNames: ['Groceries'] },
  ]);
  const account = await createBankAccount(api, { name: 'Bulk Verify Account' });
  const { job } = await uploadAndIngest(api, account.id, [
    { filename: 'bulk-verify.pdf', buffer: await genBankPdf(bankSpec) },
  ]);
  expect(job.status).toBe('SUCCEEDED');

  const rules = await listRules(api);
  const byKey = Object.fromEntries(rules.map((r) => [r.merchantKey, r]));
  for (const key of ['BLUE TOKAI', 'UBER', 'BIGBASKET']) {
    expect(byKey[key]?.source).toBe('LLM');
    expect(byKey[key]?.verified).toBe(false);
  }
  return byKey;
}

async function listRules(api: ApiClient): Promise<RuleResponse[]> {
  const res = await api.GET('/api/v1/rules', {
    params: { query: { page: 0, size: 100, sort: [] } },
  });
  expectStatus(res, 200);
  return res.data!.content;
}

async function verifiedById(api: ApiClient): Promise<Record<string, boolean>> {
  return Object.fromEntries((await listRules(api)).map((r) => [r.id, r.verified]));
}

/** Review reasons of the ingested row linked to `rule`. */
async function reasonsFor(api: ApiClient, rule: RuleResponse): Promise<string[]> {
  const txn = (await searchAll(api)).find((t) => t.appliedRuleId === rule.id);
  expect(txn).toBeDefined();
  return txn!.reviewReasons ?? [];
}

test.describe('Rules bulk verify API', () => {
  test('verifies the selected rules and clears CATEGORY_UNVERIFIED from their transactions only', async ({
    request,
  }) => {
    const { api } = await freshUser(request, 'bulk-verify');
    const rules = await seedLlmRules(api);
    expect(await reasonsFor(api, rules['BIGBASKET'])).toContain('CATEGORY_UNVERIFIED');

    const res = await api.POST('/api/v1/rules/verify', {
      body: { ruleIds: [rules['BLUE TOKAI'].id, rules['UBER'].id] },
    });
    expectStatus(res, 200);
    expect(res.data?.verifiedCount).toBe(2);

    const verified = await verifiedById(api);
    expect(verified[rules['BLUE TOKAI'].id]).toBe(true);
    expect(verified[rules['UBER'].id]).toBe(true);
    expect(verified[rules['BIGBASKET'].id]).toBe(false);

    expect(await reasonsFor(api, rules['BLUE TOKAI'])).not.toContain('CATEGORY_UNVERIFIED');
    expect(await reasonsFor(api, rules['UBER'])).not.toContain('CATEGORY_UNVERIFIED');
    expect(await reasonsFor(api, rules['BIGBASKET'])).toContain('CATEGORY_UNVERIFIED');

    // Already-verified rules are accepted but not counted.
    const again = await api.POST('/api/v1/rules/verify', {
      body: { ruleIds: [rules['BLUE TOKAI'].id, rules['BIGBASKET'].id] },
    });
    expectStatus(again, 200);
    expect(again.data?.verifiedCount).toBe(1);
    expect((await verifiedById(api))[rules['BIGBASKET'].id]).toBe(true);
  });

  test('an unknown or foreign rule id fails the whole batch with 404', async ({ request }) => {
    const { api } = await freshUser(request, 'bulk-verify-a');
    const rules = await seedLlmRules(api);
    const { api: apiB } = await freshUser(request, 'bulk-verify-b');

    const unknown = await api.POST('/api/v1/rules/verify', {
      body: { ruleIds: [rules['UBER'].id, UNKNOWN_UUID] },
    });
    expectStatus(unknown, 404);
    expect((await verifiedById(api))[rules['UBER'].id]).toBe(false);

    const foreign = await apiB.POST('/api/v1/rules/verify', {
      body: { ruleIds: [rules['UBER'].id] },
    });
    expectStatus(foreign, 404);
    expect((await verifiedById(api))[rules['UBER'].id]).toBe(false);
  });

  test('rejects an empty or oversized id list with 400', async ({ request }) => {
    const { api } = await freshUser(request, 'bulk-verify-invalid');

    const empty = await api.POST('/api/v1/rules/verify', { body: { ruleIds: [] } });
    expectStatus(empty, 400);

    const oversized = await api.POST('/api/v1/rules/verify', {
      body: { ruleIds: Array.from({ length: 501 }, () => UNKNOWN_UUID) },
    });
    expectStatus(oversized, 400);
  });
});
