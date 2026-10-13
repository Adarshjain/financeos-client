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

  test('Custom model rows: probe with own key, save with knobs, read back, duplicates and bad knobs rejected', async ({
    request,
  }) => {
    const user = await newUser(request, 'llm-routing-custom');

    // 1. No key for the provider yet -> the probe says which key to add (200, ok=false)
    const noKey = await user.api.POST('/api/v1/llm/routing/test-model', {
      body: { provider: 'gemini', model: 'gemini-e2e-custom' },
    });
    expectStatus(noKey, 200);
    expect(noKey.data?.ok).toBe(false);
    expect(noKey.data?.error).toContain('Add a Google Gemini API key first.');

    // 2. With a key the probe reaches the (stubbed) provider with the typed model and succeeds
    await user.api.POST('/api/v1/llm-keys', { body: { provider: 'gemini', key: 'e2e-gemini-good' } });
    const probe = await user.api.POST('/api/v1/llm/routing/test-model', {
      body: { provider: 'gemini', model: 'gemini-e2e-custom', reasoningEffort: 'low', maxOutputTokens: 512 },
    });
    expectStatus(probe, 200);
    expect(probe.data?.ok).toBe(true);
    expect(probe.data?.message).toContain('gemini-e2e-custom');

    // 3. Validation on the probe: unknown provider / bad knob -> 400
    const badProvider = await user.api.POST('/api/v1/llm/routing/test-model', {
      body: { provider: 'anthropic', model: 'claude' },
    });
    expectStatus(badProvider, 400);
    const badEffort = await user.api.POST('/api/v1/llm/routing/test-model', {
      body: { provider: 'gemini', model: 'gemini-e2e-custom', reasoningEffort: 'turbo' },
    });
    expectStatus(badEffort, 400);

    // 4. Save the custom row first in the default group, with its knobs, plus every menu option
    const custom = {
      optionId: 'custom',
      provider: 'Gemini',
      model: ' gemini-e2e-custom ',
      structuredOutput: 'JSON-SCHEMA',
      reasoningEffort: 'LOW',
      maxOutputTokens: 512,
      providerPin: null,
    };
    const menu = [
      { optionId: 'gemini-chain' },
      { optionId: 'groq' },
      { optionId: 'openrouter-free' },
      { optionId: 'openrouter-glm' },
      { optionId: 'gemini-flash-chain' },
    ];
    const putRes = await user.api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'default' } },
      body: { entries: [custom, ...menu] },
    });
    expectStatus(putRes, 200);
    expect(putRes.data?.usingDefaults).toBe(false);
    const saved = putRes.data!.entries[0];
    expect(saved.custom).toBe(true);
    expect(saved.optionId).toBe('custom');
    expect(saved.provider).toBe('gemini');
    expect(saved.model).toBe('gemini-e2e-custom');
    expect(saved.optionLabel).toBe('gemini-e2e-custom');
    expect(saved.hasKey).toBe(true);
    expect(saved.structuredOutput).toBe('json-schema');
    expect(saved.reasoningEffort).toBe('low');
    expect(saved.maxOutputTokens).toBe(512);
    expect(putRes.data?.entries.map((e) => e.optionId)).toEqual([
      'custom',
      'gemini-chain',
      'groq',
      'openrouter-free',
      'openrouter-glm',
      'gemini-flash-chain',
    ]);

    // GET /routing reads the same row back; chat is untouched
    const routing = await user.api.GET('/api/v1/llm/routing');
    expectStatus(routing, 200);
    expect(routing.data?.default.entries[0].custom).toBe(true);
    expect(routing.data?.default.entries[0].model).toBe('gemini-e2e-custom');
    expect(routing.data?.chat.usingDefaults).toBe(true);

    // Health lists the typed model under the Gemini key
    const health = await user.api.GET('/api/v1/llm/health');
    expectStatus(health, 200);
    expect(health.data?.some((h) => h.model === 'gemini-e2e-custom' && h.provider === 'gemini')).toBe(true);

    // 5. The same model twice (any case) -> 400; a custom row never excuses a missing menu option
    const dup = await user.api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'default' } },
      body: { entries: [custom, { ...custom, model: 'GEMINI-E2E-CUSTOM' }, ...menu] },
    });
    expectStatus(dup, 400);
    expect(JSON.stringify(dup.error)).toContain('Duplicate custom model');
    const partial = await user.api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'default' } },
      body: { entries: [custom, ...menu.slice(1)] },
    });
    expectStatus(partial, 400);
    expect(JSON.stringify(partial.error)).toContain('Missing: gemini-chain');

    // 6. Removing the custom row is just a save without it
    const without = await user.api.PUT('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'default' } },
      body: { entries: menu },
    });
    expectStatus(without, 200);
    expect(without.data?.entries.some((e) => e.custom)).toBe(false);
  });
});
