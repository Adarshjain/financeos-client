import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/renderWithQuery';

import { useEpfImportMutations } from './useEpfImportMutations';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { POST: post } }));

const queryWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);
const file = new File(['%PDF'], 'p.pdf');
beforeEach(() => post.mockReset());

describe('useEpfImportMutations', () => {
  it('posts the PDF to the preview endpoint with the employer as a query parameter', async () => {
    post.mockResolvedValue({ data: { rows: [] } });
    const { result } = renderHook(() => useEpfImportMutations(), { wrapper: queryWrapper });
    await result.current.previewMutation.mutateAsync({ file, employerId: 'e1' });
    await waitFor(() => expect(post).toHaveBeenCalled());
    const [path, init] = post.mock.calls[0];
    expect(path).toBe('/api/v1/epf/import/preview');
    expect(init.params.query).toEqual({ employerId: 'e1' });
    expect((init.bodySerializer(init.body) as FormData).get('file')).toBe(file);
  });

  it('posts the same to the commit endpoint', async () => {
    post.mockResolvedValue({ data: { imported: 1 } });
    const { result } = renderHook(() => useEpfImportMutations(), { wrapper: queryWrapper });
    await result.current.commitMutation.mutateAsync({ file });
    expect(post.mock.calls[0][0]).toBe('/api/v1/epf/import/commit');
    expect(post.mock.calls[0][1].params.query).toEqual({ employerId: undefined });
  });
});
