import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ listConversations: vi.fn(), getConversation: vi.fn() }));
vi.mock('@/lib/apiClient', async (orig) => ({ ...(await orig<typeof import('@/lib/apiClient')>()), chatApi: api }));
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));

import { ApiError } from '@/lib/apiClient';

import { loadChatList, loadConversation } from './chatData';

beforeEach(() => vi.clearAllMocks());

const apiError = (status: number) => new ApiError(status, { code: 'X', message: 'x', timestamp: '' } as never);

describe('chat page data', () => {
  it('returns the recent chats, and an empty list when they cannot load', async () => {
    api.listConversations.mockResolvedValueOnce([{ id: 'c1' }]);
    expect(await loadChatList()).toEqual([{ id: 'c1' }]);
    api.listConversations.mockRejectedValueOnce(apiError(500));
    expect(await loadChatList()).toEqual([]);
  });

  it('returns a stored conversation', async () => {
    api.getConversation.mockResolvedValue({ id: 'c1' });
    expect(await loadConversation('c1')).toEqual({ id: 'c1' });
  });

  it('sends a missing conversation to the not-found page, and rethrows other failures', async () => {
    api.getConversation.mockRejectedValueOnce(apiError(404));
    await expect(loadConversation('x')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    api.getConversation.mockRejectedValueOnce(apiError(500));
    await expect(loadConversation('x')).rejects.toBeInstanceOf(ApiError);
  });
});
