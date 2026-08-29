import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLlmCatalog,
  getLlmHealth,
  getLlmRouting,
  getLlmTaskGroups,
  resetLlmRouting,
  testLlmKey,
  updateLlmRouting,
} from '@/app/(protected)/settings/llm-keys/actions';
import { llmKeysApi, llmRoutingApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  llmKeysApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updatePosition: vi.fn(),
    test: vi.fn(),
  },
  llmRoutingApi: {
    getTaskGroups: vi.fn(),
    getCatalog: vi.fn(),
    getRouting: vi.fn(),
    updateRouting: vi.fn(),
    resetRouting: vi.fn(),
    getHealth: vi.fn(),
  },
}));

describe('llm routing server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLlmTaskGroups calls llmRoutingApi.getTaskGroups', async () => {
    vi.mocked(llmRoutingApi.getTaskGroups).mockResolvedValue([
      { code: 'chat', displayName: 'Chat', description: 'Fast models' },
    ]);
    const res = await getLlmTaskGroups();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toHaveLength(1);
    }
  });

  it('getLlmCatalog calls llmRoutingApi.getCatalog', async () => {
    vi.mocked(llmRoutingApi.getCatalog).mockResolvedValue([
      { id: 'gemini', name: 'Google Gemini', type: 'gemini', models: [] },
    ]);
    const res = await getLlmCatalog();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data?.[0].id).toBe('gemini');
    }
  });

  it('getLlmRouting calls llmRoutingApi.getRouting', async () => {
    vi.mocked(llmRoutingApi.getRouting).mockResolvedValue({
      chat: { group: 'chat', displayName: 'Chat', description: '', usingDefaults: true, entries: [] },
      default: { group: 'default', displayName: 'Everything else', description: '', usingDefaults: true, entries: [] },
    });
    const res = await getLlmRouting();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.chat.displayName).toBe('Chat');
    }
  });

  it('updateLlmRouting calls llmRoutingApi.updateRouting', async () => {
    vi.mocked(llmRoutingApi.updateRouting).mockResolvedValue({
      group: 'chat',
      displayName: 'Chat',
      description: '...',
      usingDefaults: false,
      entries: [],
    });
    const res = await updateLlmRouting('chat', {
      entries: [{ optionId: 'gemini-chain' }],
    });
    expect(res.success).toBe(true);
    expect(vi.mocked(llmRoutingApi.updateRouting)).toHaveBeenCalledWith('chat', {
      entries: [{ optionId: 'gemini-chain' }],
    });
  });

  it('resetLlmRouting calls llmRoutingApi.resetRouting', async () => {
    vi.mocked(llmRoutingApi.resetRouting).mockResolvedValue({
      group: 'chat',
      displayName: 'Chat',
      description: '...',
      usingDefaults: true,
      entries: [],
    });
    const res = await resetLlmRouting('chat');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data?.usingDefaults).toBe(true);
    }
  });

  it('testLlmKey calls llmKeysApi.test', async () => {
    vi.mocked(llmKeysApi.test).mockResolvedValue({ ok: true, message: 'Success' });
    const res = await testLlmKey('key-123', 'gemini-3.7-flash');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data?.ok).toBe(true);
    }
  });

  it('getLlmHealth calls llmRoutingApi.getHealth', async () => {
    vi.mocked(llmRoutingApi.getHealth).mockResolvedValue([]);
    const res = await getLlmHealth();
    expect(res.success).toBe(true);
  });
});
