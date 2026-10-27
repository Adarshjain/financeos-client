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
const file2 = new File(['%PDF2'], 'q.pdf');
beforeEach(() => post.mockReset());

describe('useEpfImportMutations', () => {
  it('posts every PDF as a repeated files part to the batch preview, with each employer pick as an assign query value', async () => {
    post.mockResolvedValue({ data: { sections: [], refused: [] } });
    const { result } = renderHook(() => useEpfImportMutations(), { wrapper: queryWrapper });
    await result.current.previewMutation.mutateAsync({ files: [file, file2], assign: ['k1=e1', 'k2=e2'] });
    await waitFor(() => expect(post).toHaveBeenCalled());
    const [path, init] = post.mock.calls[0];
    expect(path).toBe('/api/v1/epf/import/batch/preview');
    expect(init.params.query).toEqual({ assign: ['k1=e1', 'k2=e2'] });
    expect((init.bodySerializer(init.body) as FormData).getAll('files')).toEqual([file, file2]);
  });

  it('sends no assign parameter when nothing was picked', async () => {
    post.mockResolvedValue({ data: { sections: [], refused: [] } });
    const { result } = renderHook(() => useEpfImportMutations(), { wrapper: queryWrapper });
    await result.current.previewMutation.mutateAsync({ files: [file], assign: [] });
    expect(post.mock.calls[0][1].params.query).toEqual({ assign: undefined });
  });

  it('posts the same to the batch commit endpoint', async () => {
    post.mockResolvedValue({ data: { imported: 1 } });
    const { result } = renderHook(() => useEpfImportMutations(), { wrapper: queryWrapper });
    await result.current.commitMutation.mutateAsync({ files: [file], assign: ['k1=e1'] });
    expect(post.mock.calls[0][0]).toBe('/api/v1/epf/import/batch/commit');
    expect(post.mock.calls[0][1].params.query).toEqual({ assign: ['k1=e1'] });
  });
});
