import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGmailSender, deleteGmailSender, disconnectGmailConnection, listGmailConnections, listGmailSenders, startGmailOAuth, syncGmail, updateGmailSender } from '@/actions/gmail';
import { gmailApi } from '@/lib/apiClient';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/apiClient', () => ({
  gmailApi: {
    startOAuth: vi.fn(),
    sync: vi.fn(),
    listSenders: vi.fn(),
    createSender: vi.fn(),
    updateSender: vi.fn(),
    deleteSender: vi.fn(),
    listConnections: vi.fn(),
    disconnectConnection: vi.fn(),
  },
}));

describe('gmail server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles OAuth, sync, senders, and connections API calls', async () => {
    vi.mocked(gmailApi.startOAuth).mockResolvedValue({ authUrl: 'http://auth' });
    vi.mocked(gmailApi.sync).mockResolvedValue({ syncedCount: 5 } as any);
    vi.mocked(gmailApi.listSenders).mockResolvedValue([]);
    vi.mocked(gmailApi.createSender).mockResolvedValue({ id: 's1' } as any);
    vi.mocked(gmailApi.updateSender).mockResolvedValue({ id: 's1' } as any);
    vi.mocked(gmailApi.deleteSender).mockResolvedValue(undefined);
    vi.mocked(gmailApi.listConnections).mockResolvedValue([]);
    vi.mocked(gmailApi.disconnectConnection).mockResolvedValue(undefined);

    expect((await startGmailOAuth()).success).toBe(true);
    expect((await syncGmail()).success).toBe(true);
    expect((await listGmailSenders()).success).toBe(true);
    expect((await createGmailSender({ email: 'e@g.com' } as any)).success).toBe(true);
    expect((await updateGmailSender('s1', { email: 'e2@g.com' } as any)).success).toBe(true);
    expect((await deleteGmailSender('s1')).success).toBe(true);
    expect((await listGmailConnections()).success).toBe(true);
    expect((await disconnectGmailConnection('c1')).success).toBe(true);
  });
});
