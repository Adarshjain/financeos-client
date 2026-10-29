import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: mocks }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { dismissEpfSuggestion, dismissInboxItem, linkEpfSuggestion, snoozeInboxItem, undoInboxState } from './inboxActions';

beforeEach(() => {
  vi.clearAllMocks();
  for (const m of Object.values(mocks)) m.mockResolvedValue({ data: undefined });
});

describe('inbox actions', () => {
  it('undo clears the row state by its raw key', async () => {
    expect(await undoInboxState('bill:1')).toEqual({ success: true, data: undefined });
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/inbox/{key}/state', { params: { path: { key: 'bill:1' } } });
  });

  it('snooze sends the date', async () => {
    await snoozeInboxItem('bill:1', '2026-11-01');
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/snooze', { params: { path: { key: 'bill:1' } }, body: { until: '2026-11-01' } });
  });

  it('dismiss posts the key', async () => {
    await dismissInboxItem('bill:1');
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'bill:1' } } });
  });

  it('links an EPF suggestion without recording TDS', async () => {
    await linkEpfSuggestion('e1', 't1');
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: 'e1' } },
      body: { transactionId: 't1', recordTds: false },
    });
  });

  it('"Not this one" turns the suggestion down, then dismisses the row', async () => {
    await dismissEpfSuggestion('epf:1', 'e1', 't1');
    expect(mocks.POST).toHaveBeenNthCalledWith(1, '/api/v1/epf/entries/{id}/suggestion/dismiss', {
      params: { path: { id: 'e1' } },
      body: { transactionId: 't1' },
    });
    expect(mocks.POST).toHaveBeenNthCalledWith(2, '/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'epf:1' } } });
  });

  it('"Not this one" only dismisses the row when the refs are missing', async () => {
    await dismissEpfSuggestion('epf:1', undefined, undefined);
    expect(mocks.POST).toHaveBeenCalledTimes(1);
  });

  it('reports a failure instead of throwing', async () => {
    mocks.POST.mockRejectedValue(new Error('down'));
    const result = await snoozeInboxItem('bill:1', '2026-11-01');
    expect(result).toMatchObject({ success: false, error: { message: "Couldn't snooze this item. Try again." } });
  });
});
