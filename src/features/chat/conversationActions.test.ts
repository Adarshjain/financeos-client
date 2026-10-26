import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
  saveDraftResult: vi.fn(),
}));
vi.mock('@/lib/apiClient', async (orig) => ({
  ...(await orig<typeof import('@/lib/apiClient')>()),
  chatApi: api,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  saveDraftResult,
} from './conversationActions';

beforeEach(() => vi.clearAllMocks());

describe('conversation actions', () => {
  it('lists conversations', async () => {
    api.listConversations.mockResolvedValue([{ id: 'c1' }]);
    expect(await listConversations()).toEqual({ success: true, data: [{ id: 'c1' }] });
  });

  it('gets one conversation by id', async () => {
    api.getConversation.mockResolvedValue({ id: 'c1', messages: [] });
    expect(await getConversation('c1')).toEqual({ success: true, data: { id: 'c1', messages: [] } });
    expect(api.getConversation).toHaveBeenCalledWith('c1');
  });

  it('renames with the new title', async () => {
    api.renameConversation.mockResolvedValue({ id: 'c1', title: 'Rent' });
    expect((await renameConversation('c1', 'Rent')).success).toBe(true);
    expect(api.renameConversation).toHaveBeenCalledWith('c1', 'Rent');
  });

  it('deletes by id', async () => {
    api.deleteConversation.mockResolvedValue(undefined);
    expect((await deleteConversation('c1')).success).toBe(true);
    expect(api.deleteConversation).toHaveBeenCalledWith('c1');
  });

  it('saves a draft result against its message', async () => {
    api.saveDraftResult.mockResolvedValue(undefined);
    await saveDraftResult('c1', 'm1', { action: 'saved', reportId: 'r1' });
    expect(api.saveDraftResult).toHaveBeenCalledWith('c1', 'm1', { action: 'saved', reportId: 'r1' });
  });

  it('reports a failure instead of throwing', async () => {
    api.getConversation.mockRejectedValue(new Error('down'));
    expect((await getConversation('c1')).success).toBe(false);
    api.listConversations.mockRejectedValue(new Error('down'));
    expect((await listConversations()).success).toBe(false);
  });
});
