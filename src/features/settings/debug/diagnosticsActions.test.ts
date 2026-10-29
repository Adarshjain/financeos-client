import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: get } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { loadRawLog, lookupDiagnostics } from './diagnosticsActions';

beforeEach(() => vi.clearAllMocks());

describe('diagnostics actions', () => {
  it('looks a ref up, defaulting an empty type to auto', async () => {
    get.mockResolvedValue({ data: { ref: 'R' } });
    expect(await lookupDiagnostics('R', '')).toEqual({ success: true, data: { ref: 'R' } });
    expect(get).toHaveBeenCalledWith('/api/v1/diagnostics/lookup', { params: { query: { ref: 'R', type: 'auto' } } });
  });

  it('loads the raw log, or an empty list', async () => {
    get.mockResolvedValue({ data: [{ a: 1 }] });
    expect(await loadRawLog('R', 'request')).toEqual({ success: true, data: [{ a: 1 }] });
    expect(get).toHaveBeenCalledWith('/api/v1/diagnostics/lookup/raw', { params: { query: { ref: 'R', type: 'request' } } });
    get.mockResolvedValue({ data: undefined });
    expect(await loadRawLog('R', 'auto')).toEqual({ success: true, data: [] });
  });

  it('reports a failure instead of throwing', async () => {
    get.mockRejectedValue(new Error('down'));
    expect((await lookupDiagnostics('R', 'auto')).success).toBe(false);
  });
});
