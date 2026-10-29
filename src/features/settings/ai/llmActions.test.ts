import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/server', () => ({
  serverApi: { GET: m.get, POST: m.post, PUT: m.put, PATCH: m.patch, DELETE: m.del },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  createLlmKey,
  deleteLlmKey,
  loadLlmCatalog,
  loadLlmHealth,
  loadLlmKeys,
  loadLlmRouting,
  loadLlmRoutingOptions,
  resetLlmRouting,
  saveLlmRouting,
  testLlmKey,
  testLlmModel,
  updateLlmKeyPosition,
} from './llmActions';

beforeEach(() => {
  vi.clearAllMocks();
  m.get.mockResolvedValue({ data: undefined });
  m.post.mockResolvedValue({ data: { ok: true } });
  m.put.mockResolvedValue({ data: { entries: [] } });
  m.patch.mockResolvedValue({ data: [{ id: 'k1' }] });
  m.del.mockResolvedValue({ data: undefined });
});

describe('llm reads', () => {
  it('lists default to empty and routing to null', async () => {
    expect(await loadLlmKeys()).toEqual({ success: true, data: [] });
    expect(await loadLlmCatalog()).toEqual({ success: true, data: [] });
    expect(await loadLlmRoutingOptions()).toEqual({ success: true, data: [] });
    expect(await loadLlmHealth()).toEqual({ success: true, data: [] });
    expect(await loadLlmRouting()).toEqual({ success: true, data: null });
    expect(m.get.mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/llm-keys',
      '/api/v1/llm/catalog',
      '/api/v1/llm/routing-options',
      '/api/v1/llm/health',
      '/api/v1/llm/routing',
    ]);
  });

  it('reports a failure instead of throwing', async () => {
    m.get.mockRejectedValue(new Error('down'));
    expect((await loadLlmKeys()).success).toBe(false);
  });
});

describe('llm key writes', () => {
  it('creates, deletes, moves and tests a key', async () => {
    expect(await createLlmKey({ provider: 'gemini', key: 'k' } as never)).toEqual({ success: true, data: { ok: true } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/llm-keys', { body: { provider: 'gemini', key: 'k' } });
    expect(await deleteLlmKey('k1')).toEqual({ success: true, data: undefined });
    expect(m.del).toHaveBeenCalledWith('/api/v1/llm-keys/{id}', { params: { path: { id: 'k1' } } });
    expect(await updateLlmKeyPosition('k1', 2)).toEqual({ success: true, data: [{ id: 'k1' }] });
    expect(m.patch).toHaveBeenCalledWith('/api/v1/llm-keys/{id}/position', { params: { path: { id: 'k1' } }, body: { position: 2 } });
    await testLlmKey('k1', 'm');
    expect(m.post).toHaveBeenCalledWith('/api/v1/llm-keys/{id}/test', { params: { path: { id: 'k1' } }, body: { model: 'm' } });
  });
});

describe('llm routing writes', () => {
  it('saves, resets and probes', async () => {
    expect(await saveLlmRouting('chat', [{ optionId: 'a' }])).toEqual({ success: true, data: { entries: [] } });
    expect(m.put).toHaveBeenCalledWith('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'chat' } },
      body: { entries: [{ optionId: 'a' }] },
    });
    await resetLlmRouting('default');
    expect(m.post).toHaveBeenCalledWith('/api/v1/llm/routing/{group}/reset', { params: { path: { group: 'default' } } });
    await testLlmModel({ provider: 'x', model: 'y' } as never);
    expect(m.post).toHaveBeenCalledWith('/api/v1/llm/routing/test-model', { body: { provider: 'x', model: 'y' } });
  });

  it('reports a failure with the action fallback', async () => {
    m.put.mockRejectedValue(new Error('down'));
    const res = await saveLlmRouting('chat', []);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.message).toBe("Couldn't save routing. Try again.");
  });
});
