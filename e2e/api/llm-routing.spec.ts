import { expectStatus } from '../fixtures/api';
import { newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('LLM Routing API', () => {
  test('Task groups, catalog, routing-options, and default routing orders', async ({
    request,
  }) => {
    const user = await newUser(request, 'llm-routing-get');

    // 1. GET /api/v1/llm/task-groups -> exactly 'chat' and 'default'
    const tgRes = await user.api.GET('/api/v1/llm/task-groups');
    expectStatus(tgRes, 200);
    const groups = tgRes.data!;
    expect(groups.map((g: { code: string }) => g.code).sort()).toEqual(['chat', 'default']);

    // 2. GET /api/v1/llm/catalog -> lists providers with model catalogs
    const catRes = await user.api.GET('/api/v1/llm/catalog');
    expectStatus(catRes, 200);
    const catalog = catRes.data!;
    const providerIds = catalog.map((p) => p.id);
    expect(providerIds).toContain('gemini');
    expect(providerIds).toContain('groq');
    expect(providerIds).toContain('openrouter');

    // 3. GET /api/v1/llm/routing-options -> 5 options, initially available=false
    const optRes = await user.api.GET('/api/v1/llm/routing-options');
    expectStatus(optRes, 200);
    const options = optRes.data!;
    const optIds = options.map((o: { id: string }) => o.id);
    expect(optIds).toEqual([
      'gemini-chain',
      'gemini-flash-chain',
      'groq',
      'openrouter-free',
      'openrouter-glm',
    ]);
    const geminiFlashOpt = options.find((o: { id: string }) => o.id === 'gemini-flash-chain');
    expect(geminiFlashOpt?.available).toBe(false);

    // Add Gemini key -> available flips to true for Gemini options
    await user.api.POST('/api/v1/llm-keys', {
      body: { provider: 'gemini', key: 'e2e-gemini-good' },
    });
    const optResAfterKey = await user.api.GET('/api/v1/llm/routing-options');
    expectStatus(optResAfterKey, 200);
    const geminiFlashAfter = optResAfterKey.data?.find((o: { id: string }) => o.id === 'gemini-flash-chain');
    expect(geminiFlashAfter?.available).toBe(true);

    // 4. GET /api/v1/llm/routing -> initial default routing
    const routingRes = await user.api.GET('/api/v1/llm/routing');
    expectStatus(routingRes, 200);
    const routing = routingRes.data!;
    expect(routing.chat.usingDefaults).toBe(true);
    expect(routing.chat.entries.map((e: { optionId: string }) => e.optionId)).toEqual([
      'gemini-flash-chain',
      'gemini-chain',
      'groq',
      'openrouter-free',
      'openrouter-glm',
    ]);
    expect(routing.default.usingDefaults).toBe(true);
    expect(routing.default.entries.map((e: { optionId: string }) => e.optionId)).toEqual([
      'gemini-chain',
      'groq',
      'openrouter-free',
      'openrouter-glm',
      'gemini-flash-chain',
    ]);

    // 5. GET /api/v1/llm/health -> returns health array
    const healthRes = await user.api.GET('/api/v1/llm/health');
    expectStatus(healthRes, 200);
    expect(Array.isArray(healthRes.data)).toBe(true);
  });

  test('PUT routing mutation: full permutation persistence, validation errors, reset, and tenancy', async ({
    api,
    request,
  }) => {
    const { api: userB } = await secondUser(request, 'llm-routing-mut-b');

    const fullPermutation = [
      { optionId: 'groq' },
      { optionId: 'gemini-chain' },
      { optionId: 'gemini-flash-chain' },
      { optionId: 'openrouter-free' },
      { optionId: 'openrouter-glm' },
    ];

    // 1. PUT custom routing for chat group
    const putRes = await api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'chat' } },
      body: { entries: fullPermutation },
    });
    expectStatus(putRes, 200);
    expect(putRes.data?.usingDefaults).toBe(false);
    expect(putRes.data?.entries.map((e: { optionId: string }) => e.optionId)).toEqual([
      'groq',
      'gemini-chain',
      'gemini-flash-chain',
      'openrouter-free',
      'openrouter-glm',
    ]);

    // GET /routing reflects customized order for userA
    const routingA = await api.GET('/api/v1/llm/routing');
    expectStatus(routingA, 200);
    expect(routingA.data?.chat.usingDefaults).toBe(false);
    expect(routingA.data?.chat.entries.map((e: { optionId: string }) => e.optionId)).toEqual([
      'groq',
      'gemini-chain',
      'gemini-flash-chain',
      'openrouter-free',
      'openrouter-glm',
    ]);

    // User B's routing remains on defaults (tenancy check)
    const routingB = await userB.GET('/api/v1/llm/routing');
    expectStatus(routingB, 200);
    expect(routingB.data?.chat.usingDefaults).toBe(true);

    // 2. Validation: missing option -> 400
    const missingOptionRes = await api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'chat' } },
      body: {
        entries: [{ optionId: 'groq' }, { optionId: 'gemini-chain' }],
      },
    });
    expectStatus(missingOptionRes, 400);
    expect(JSON.stringify(missingOptionRes.error)).toContain('Routing order must include every option. Missing:');

    // 3. Validation: duplicate option -> 400
    const dupOptionRes = await api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'chat' } },
      body: {
        entries: [
          { optionId: 'groq' },
          { optionId: 'groq' },
          { optionId: 'gemini-chain' },
          { optionId: 'gemini-flash-chain' },
          { optionId: 'openrouter-free' },
        ],
      },
    });
    expectStatus(dupOptionRes, 400);

    // 4. Validation: unknown option -> 400
    const unknownOptionRes = await api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'chat' } },
      body: {
        entries: [
          { optionId: 'invalid-opt' },
          { optionId: 'gemini-chain' },
          { optionId: 'gemini-flash-chain' },
          { optionId: 'groq' },
          { optionId: 'openrouter-free' },
        ],
      },
    });
    expectStatus(unknownOptionRes, 400);

    // 5. Validation: unknown group -> 400
    const unknownGroupRes = await api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'unknown-group' } },
      body: { entries: fullPermutation },
    });
    expectStatus(unknownGroupRes, 400);

    // 6. Reset routing: POST /api/v1/llm/routing/{group}/reset -> returns to defaults
    const resetRes = await api.POST('/api/v1/llm/routing/{group}/reset', {
      params: { path: { group: 'chat' } },
    });
    expectStatus(resetRes, 200);
    expect(resetRes.data?.usingDefaults).toBe(true);
    expect(resetRes.data?.entries.map((e: { optionId: string }) => e.optionId)).toEqual([
      'gemini-flash-chain',
      'gemini-chain',
      'groq',
      'openrouter-free',
      'openrouter-glm',
    ]);
  });

});
