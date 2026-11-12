import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/api/server', () => ({ serverApi: { POST: vi.fn() } }));

import { serverApi as api } from '@/lib/api/server';

import { useQuickApprove } from './useQuickApprove';

describe('useQuickApprove: a lone Duplicate', () => {
  it('goes through the dialog (evidence first) and sends nothing', async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useQuickApprove(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.quickApprove({ id: 'a', reviewReasons: ['DUPLICATE_SUSPECT'] });
    });
    expect(outcome).toBe('needs-dialog');
    expect(api.POST).not.toHaveBeenCalled();
  });
});
