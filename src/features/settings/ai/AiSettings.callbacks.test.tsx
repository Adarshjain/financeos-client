import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { LlmKeyDto } from '@/lib/api/types';
import { keys as queryKeys } from '@/lib/query/keys';

import { AiSettings } from './AiSettings';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(async () => ({ data: [] })), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const seen: Array<{ onAdd: unknown; onTest: unknown; onMove: unknown; onDelete: unknown }> = [];
vi.mock('./YourKeysCard', () => ({
  YourKeysCard: (p: { onAdd: unknown; onTest: unknown; onMove: unknown; onDelete: unknown }) => {
    seen.push({ onAdd: p.onAdd, onTest: p.onTest, onMove: p.onMove, onDelete: p.onDelete });
    return null;
  },
}));

const key = (over: Partial<LlmKeyDto>): LlmKeyDto => ({
  id: 'g1', createdAt: '2026-09-01T00:00:00Z', keyLast4: 'k3Qa', label: null, lastUsedAt: null, position: 1, provider: 'gemini', status: 'ACTIVE', ...over,
});

describe('AiSettings key callbacks', () => {
  it('hands YourKeysCard the same callbacks on every render, so its columns (and an open key menu) survive', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(queryKeys.settings.llmKeys(), [key({})]);
    const ui = <QueryClientProvider client={client}><AiSettings /></QueryClientProvider>;
    const { rerender } = render(ui);
    const before = seen.length;
    rerender(<QueryClientProvider client={client}><AiSettings /></QueryClientProvider>);
    expect(seen.length).toBeGreaterThan(before);
    const first = seen[0];
    const last = seen[seen.length - 1];
    expect(last.onAdd).toBe(first.onAdd);
    expect(last.onTest).toBe(first.onTest);
    expect(last.onMove).toBe(first.onMove);
    expect(last.onDelete).toBe(first.onDelete);
  });
});
