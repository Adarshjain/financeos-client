import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/renderWithQuery';

import { useImportWizard } from './useImportWizard';

const sonner = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast: sonner }));

describe('useImportWizard (Legacy dialog)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('still tells the Legacy toaster when there is no target account', async () => {
    const { result } = renderHook(() => useImportWizard({ brokerAccounts: [] }), {
      wrapper: ({ children }) => <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>,
    });
    await act(async () => result.current.handlePreviewSubmit({ preventDefault: vi.fn() } as never));
    expect(sonner.error).toHaveBeenCalledWith('Please select a target broker account.');
    expect(result.current.step).toBe(1);
  });
});
