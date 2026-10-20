import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { CUSTOM_OPTION_ID, draftEntryKey, useLlmRoutingEditor } from '@/features/settings/ai/useLlmRoutingEditor';
import { api } from '@/lib/api/client';
import type { LlmRoutingGroupDto } from '@/lib/api/types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const group: LlmRoutingGroupDto = {
  group: 'default',
  displayName: 'Everything else',
  description: 'Reading emails',
  usingDefaults: false,
  entries: [
    {
      position: 1,
      optionId: 'custom',
      optionLabel: 'anthropic/claude-haiku-5.5',
      provider: 'openrouter',
      providerName: 'OpenRouter',
      model: 'anthropic/claude-haiku-5.5',
      hasKey: true,
      custom: true,
      reasoningEffort: 'low',
      maxOutputTokens: 4096,
      providerPin: 'anthropic',
      structuredOutput: null,
    },
    {
      position: 2,
      optionId: 'gemini-chain',
      optionLabel: 'Gemini (full chain)',
      provider: 'gemini',
      providerName: 'Google Gemini',
      model: null,
      hasKey: true,
      custom: false,
    },
  ],
};

const input = { provider: 'openrouter', model: ' z-ai/glm-5.3-flashx ', reasoningEffort: 'low', maxOutputTokens: 512 };

describe('useLlmRoutingEditor custom rows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('turns a saved custom entry back into a draft row with its knobs, and a menu entry into just its id', () => {
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));

    expect(result.current.defaultDraft).toEqual([
      {
        optionId: CUSTOM_OPTION_ID,
        provider: 'openrouter',
        model: 'anthropic/claude-haiku-5.5',
        structuredOutput: null,
        reasoningEffort: 'low',
        maxOutputTokens: 4096,
        providerPin: 'anthropic',
      },
      { optionId: 'gemini-chain' },
    ]);
  });

  it('probes the typed model with its knobs and appends it only when the provider answered', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { ok: true, message: 'ok' } } as never);
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));

    let added = false;
    await act(async () => {
      added = await result.current.handleAddCustomModel('default', input);
    });

    expect(added).toBe(true);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/llm/routing/test-model', {
      body: {
        provider: 'openrouter',
        model: 'z-ai/glm-5.3-flashx',
        structuredOutput: null,
        reasoningEffort: 'low',
        maxOutputTokens: 512,
        providerPin: null,
      },
    });
    expect(result.current.defaultDraft).toHaveLength(3);
    expect(result.current.defaultDraft[2]).toMatchObject({ optionId: CUSTOM_OPTION_ID, model: 'z-ai/glm-5.3-flashx' });
    expect(result.current.defaultAddError).toBeNull();
    expect(result.current.chatDraft).toEqual([]);
  });

  it('keeps the row out of the draft and surfaces the reason when the probe says no', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { ok: false, error: "Model 'x' was not found on OpenRouter." } } as never);
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));

    let added = true;
    await act(async () => {
      added = await result.current.handleAddCustomModel('default', input);
    });

    expect(added).toBe(false);
    expect(result.current.defaultDraft).toHaveLength(2);
    expect(result.current.defaultAddError).toBe("Model 'x' was not found on OpenRouter.");
  });

  it('refuses a model already in the list without calling the server, ignoring case and padding', async () => {
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));

    await act(async () => {
      await result.current.handleAddCustomModel('default', { provider: 'OpenRouter', model: ' Anthropic/Claude-Haiku-5.5 ' });
    });

    expect(api.POST).not.toHaveBeenCalled();
    expect(result.current.defaultAddError).toBe('That model is already in this list.');
    expect(result.current.defaultDraft).toHaveLength(2);
  });

  it('reports a transport failure as the add error, not as a routing error', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));

    await act(async () => {
      await result.current.handleAddCustomModel('default', input);
    });

    expect(result.current.defaultAddError).toBeTruthy();
    expect(result.current.routingError).toBeNull();
    expect(result.current.testingDefault).toBe(false);
  });

  it('removes custom rows only; menu rows stay so the save keeps the full menu', () => {
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));

    act(() => result.current.handleRemoveDraftItem('default', 1));
    expect(result.current.defaultDraft).toHaveLength(2);

    act(() => result.current.handleRemoveDraftItem('default', 0));
    expect(result.current.defaultDraft).toEqual([{ optionId: 'gemini-chain' }]);
  });

  it('cancelling an edit clears the add error', async () => {
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));
    await act(async () => {
      await result.current.handleAddCustomModel('default', { provider: 'openrouter', model: 'anthropic/claude-haiku-5.5' });
    });
    expect(result.current.defaultAddError).toBeTruthy();

    act(() => result.current.setDefaultEditing(false));

    expect(result.current.defaultEditing).toBe(false);
    expect(result.current.defaultAddError).toBeNull();
  });

  it('saves custom rows with their knobs in the draft order', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: group } as never);
    const { result } = renderHook(() => useLlmRoutingEditor(), { wrapper: createWrapper() });
    act(() => result.current.startCustomizingGroup('default', group));
    act(() => result.current.handleMoveDraftItem('default', 0, 1));

    await act(async () => {
      await result.current.handleSaveRouting('default');
    });

    expect(api.PUT).toHaveBeenCalledWith('/api/v1/llm/routing/{group}', {
      params: { path: { group: 'default' } },
      body: {
        entries: [
          { optionId: 'gemini-chain' },
          expect.objectContaining({ optionId: CUSTOM_OPTION_ID, model: 'anthropic/claude-haiku-5.5', reasoningEffort: 'low' }),
        ],
      },
    });
    expect(result.current.defaultEditing).toBe(false);
  });

  it('keys draft rows so two different typed models never collide and a menu row keeps its id', () => {
    expect(draftEntryKey({ optionId: 'groq' })).toBe('groq');
    expect(draftEntryKey({ optionId: 'custom', provider: 'OpenRouter', model: 'A/B' })).toBe('custom:openrouter:a/b');
    expect(draftEntryKey({ optionId: 'custom', provider: 'openrouter', model: 'a/c' })).not.toBe(
      draftEntryKey({ optionId: 'custom', provider: 'openrouter', model: 'a/b' })
    );
  });
});
