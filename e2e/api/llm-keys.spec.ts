import { expectStatus } from '../fixtures/api';
import { newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('LLM Keys API', () => {
  test('CRUD lifecycle: add keys, list, mask plaintext, position reordering, test key, and delete with compaction', async ({
    request,
  }) => {
    const user = await newUser(request, 'llm-keys-crud');

    // 1. Initial keys list is empty
    const initList = await user.api.GET('/api/v1/llm-keys');
    expectStatus(initList, 200);
    expect(initList.data).toEqual([]);

    // 2. Add Gemini key (e2e-gemini-good) -> 201, position 1, keyLast4 == "good", plaintext absent
    const createRes1 = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'gemini',
        key: 'e2e-gemini-good',
        label: 'Primary Gemini',
      },
    });
    expectStatus(createRes1, 201);
    const key1 = createRes1.data!;
    expect(key1.provider).toBe('gemini');
    expect(key1.keyLast4).toBe('good');
    expect(key1.label).toBe('Primary Gemini');
    expect(key1.status).toBe('ACTIVE');
    expect(key1.position).toBe(1);
    expect((key1 as Record<string, unknown>).key).toBeUndefined();
    expect((key1 as Record<string, unknown>).keyCiphertext).toBeUndefined();

    // 3. Add second Gemini key -> position 2
    const createRes2 = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'gemini',
        key: 'e2e-gemini-good',
        label: 'Secondary Gemini',
      },
    });
    expectStatus(createRes2, 201);
    const key2 = createRes2.data!;
    expect(key2.position).toBe(2);

    // List shows both keys in order
    const listRes = await user.api.GET('/api/v1/llm-keys');
    expectStatus(listRes, 200);
    expect(listRes.data?.length).toBe(2);
    expect(listRes.data?.[0].id).toBe(key1.id);
    expect(listRes.data?.[1].id).toBe(key2.id);

    // 4. Test Key: POST /api/v1/llm-keys/{id}/test -> ok: true
    const testRes = await user.api.POST('/api/v1/llm-keys/{id}/test', {
      params: { path: { id: key1.id } },
      body: { model: 'gemini-3.5-flash-lite' },
    });
    expectStatus(testRes, 200);
    expect(testRes.data?.ok).toBe(true);

    // 5. PATCH position: move key2 to position 1 -> reorders and returns full list
    const patchRes = await user.api.PATCH('/api/v1/llm-keys/{id}/position', {
      params: { path: { id: key2.id } },
      body: { position: 1 },
    });
    expectStatus(patchRes, 200);
    const reordered = patchRes.data!;
    expect(reordered.length).toBe(2);
    expect(reordered[0].id).toBe(key2.id);
    expect(reordered[0].position).toBe(1);
    expect(reordered[1].id).toBe(key1.id);
    expect(reordered[1].position).toBe(2);

    // 6. Delete key2 -> positions recompact (key1 becomes position 1)
    const delRes1 = await user.api.DELETE('/api/v1/llm-keys/{id}', {
      params: { path: { id: key2.id } },
    });
    expectStatus(delRes1, 204);

    const listAfterDel = await user.api.GET('/api/v1/llm-keys');
    expectStatus(listAfterDel, 200);
    expect(listAfterDel.data?.length).toBe(1);
    expect(listAfterDel.data?.[0].id).toBe(key1.id);
    expect(listAfterDel.data?.[0].position).toBe(1);

    // Delete twice -> 404
    const delRes2 = await user.api.DELETE('/api/v1/llm-keys/{id}', {
      params: { path: { id: key2.id } },
    });
    expectStatus(delRes2, 404);
  });

  test('Validation failures: bad key returns 400, broken upstream returns 400, unknown provider returns 400', async ({
    request,
  }) => {
    const user = await newUser(request, 'llm-keys-val');

    // 1. Bad Gemini key (e2e-gemini-bad -> WireMock 401)
    const badGeminiRes = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'gemini',
        key: 'e2e-gemini-bad',
      },
    });
    expectStatus(badGeminiRes, 400);
    expect(JSON.stringify(badGeminiRes.error)).toContain('Invalid API key');

    // 2. Broken Gemini key (e2e-gemini-broken -> WireMock 500)
    const brokenGeminiRes = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'gemini',
        key: 'e2e-gemini-broken',
      },
    });
    expectStatus(brokenGeminiRes, 400);
    expect(JSON.stringify(brokenGeminiRes.error)).toContain('Failed to validate key');

    // 3. Unknown provider -> 400
    const unknownProvRes = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'claude-ai',
        key: 'sk-ant-test',
      },
    });
    expectStatus(unknownProvRes, 400);
    expect(JSON.stringify(unknownProvRes.error)).toContain('Unsupported LLM provider');

    // 4. OpenRouter and Groq validation stubs
    // OpenRouter good
    const openrouterGood = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'openrouter',
        key: 'e2e-openrouter-good',
      },
    });
    expectStatus(openrouterGood, 201);
    expect(openrouterGood.data?.provider).toBe('openrouter');

    // OpenRouter bad
    const openrouterBad = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'openrouter',
        key: 'e2e-openrouter-bad',
      },
    });
    expectStatus(openrouterBad, 400);

    // Groq good
    const groqGood = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'groq',
        key: 'e2e-groq-good',
      },
    });
    expectStatus(groqGood, 201);
    expect(groqGood.data?.provider).toBe('groq');

    // Groq bad
    const groqBad = await user.api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'groq',
        key: 'e2e-groq-bad',
      },
    });
    expectStatus(groqBad, 400);
  });

  test('Tenancy isolation: user B cannot access, reorder, test, or delete user A key', async ({
    api,
    request,
  }) => {
    const { api: userB } = await secondUser(request, 'llm-keys-ten-b');

    const keyA = await api.POST('/api/v1/llm-keys', {
      body: {
        provider: 'gemini',
        key: 'e2e-gemini-good',
      },
    });
    expectStatus(keyA, 201);
    const keyId = keyA.data!.id;

    // User B list does not show User A key
    const bList = await userB.GET('/api/v1/llm-keys');
    expectStatus(bList, 200);
    expect(bList.data?.find((k: { id: string }) => k.id === keyId)).toBeUndefined();

    // User B testing User A key -> returns 400 or ok: false
    const bTest = await userB.POST('/api/v1/llm-keys/{id}/test', {
      params: { path: { id: keyId } },
      body: {},
    });
    expect(bTest.response.status >= 400 || (bTest.data && bTest.data.ok === false)).toBe(true);

    // User B modifying position of User A key -> 400/404
    const bPatch = await userB.PATCH('/api/v1/llm-keys/{id}/position', {
      params: { path: { id: keyId } },
      body: { position: 1 },
    });
    expect(bPatch.response.status).toBeGreaterThanOrEqual(400);

    // User B deleting User A key -> 404
    const bDel = await userB.DELETE('/api/v1/llm-keys/{id}', {
      params: { path: { id: keyId } },
    });
    expectStatus(bDel, 404);
  });

});
