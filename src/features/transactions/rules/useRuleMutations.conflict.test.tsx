import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ toast: vi.fn(), update: vi.fn(), create: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: mocks.toast }));
vi.mock('./ruleActions', () => ({ updateRule: mocks.update, createRule: mocks.create, deleteRule: vi.fn(), applyRule: vi.fn() }));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useRuleMutations } from './useRuleMutations';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
);
const conflict = { success: false, error: { code: 'CONFLICT', message: 'could not execute statement' } };

beforeEach(() => vi.clearAllMocks());

describe('useRuleMutations conflicts', () => {
  it('says a rule for the pattern exists when an update trips the unique constraint', async () => {
    mocks.update.mockResolvedValue(conflict);
    const { result } = renderHook(() => useRuleMutations(), { wrapper });
    result.current.update.mutate({ id: 'r1', body: {} as never });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('A rule for this pattern already exists.', { tone: 'danger' }));
  });

  it('says the same on create, and keeps the server message for other failures', async () => {
    mocks.create.mockResolvedValue(conflict);
    mocks.update.mockResolvedValue({ success: false, error: { code: 'VALIDATION', message: 'Pattern is too long' } });
    const { result } = renderHook(() => useRuleMutations(), { wrapper });
    result.current.create.mutate({} as never);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('A rule for this pattern already exists.', { tone: 'danger' }));
    result.current.update.mutate({ id: 'r1', body: {} as never });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Pattern is too long', { tone: 'danger' }));
  });
});
