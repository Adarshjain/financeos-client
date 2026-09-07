import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn() } };
});

import { useDiagnosticsLookup } from '@/app/(protected)/debug/useDiagnosticsLookup';
import { api } from '@/lib/api/client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useDiagnosticsLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when admin is false', () => {
    const { result } = renderHook(() => useDiagnosticsLookup('E2EERR01', 'auto', false), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('is disabled when ref is empty or invalid', () => {
    const { result: emptyResult } = renderHook(() => useDiagnosticsLookup('', 'auto', true), {
      wrapper: createWrapper(),
    });
    expect(emptyResult.current.fetchStatus).toBe('idle');

    const { result: invalidResult } = renderHook(() => useDiagnosticsLookup('bad$ref', 'auto', true), {
      wrapper: createWrapper(),
    });
    expect(invalidResult.current.fetchStatus).toBe('idle');
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('calls api.GET with /api/v1/diagnostics/lookup when enabled and returns data', async () => {
    const mockData = {
      ref: 'E2EERR01',
      found: true,
      refType: 'errorId',
      rootCause: { kind: 'SERVER_EXCEPTION', headline: 'Crash', hints: [] },
      timeline: [],
    };

    vi.mocked(api.GET).mockResolvedValue({
      data: mockData,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useDiagnosticsLookup('E2EERR01', 'errorId', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.GET).toHaveBeenCalledWith('/api/v1/diagnostics/lookup', {
      params: {
        query: {
          ref: 'E2EERR01',
          type: 'errorId',
        },
      },
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('throws when api.GET returns error', async () => {
    const mockError = new Error('503 Service Unavailable');
    vi.mocked(api.GET).mockResolvedValue({
      data: undefined,
      error: mockError,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useDiagnosticsLookup('E2EERR01', 'auto', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(mockError);
  });
});
