import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), error: vi.fn(), toastError: vi.fn() }));

vi.mock('./tagActions', () => ({ createTag: mocks.create }));
vi.mock('@/lib/notify', () => ({ notify: { error: mocks.error } }));
vi.mock('@/lib/toastError', () => ({ toastError: mocks.toastError }));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useTagSelection } from './useTagSelection';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => vi.clearAllMocks());

describe('useTagSelection createTag', () => {
  it('says a tag with the name exists when the server answers CONFLICT, and adds nothing', async () => {
    mocks.create.mockResolvedValue({ success: false, error: { code: 'CONFLICT', message: 'duplicate key' } });
    const { result } = renderHook(() => useTagSelection({ tags: [], initialSelectedTags: [] }), { wrapper });
    await result.current.createTag('Goa trip');
    expect(mocks.error).toHaveBeenCalledWith('A tag with this name already exists.');
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(result.current.selectedTags).toEqual([]);
  });

  it('keeps the general failure for anything else, and selects a created tag', async () => {
    mocks.create.mockResolvedValueOnce({ success: false, error: { code: 'INTERNAL', message: 'boom' } });
    const { result } = renderHook(() => useTagSelection({ tags: [], initialSelectedTags: [] }), { wrapper });
    await result.current.createTag('Goa trip');
    expect(mocks.toastError).toHaveBeenCalledWith(expect.anything(), "Couldn't add the tag. Try again.");
    mocks.create.mockResolvedValueOnce({ success: true, data: { id: 't9', name: 'Work' } });
    await result.current.createTag('Work');
    await waitFor(() => expect(result.current.selectedTags).toEqual([{ id: 't9', name: 'Work' }]));
  });
});
