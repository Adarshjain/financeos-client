import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));

const api = vi.hoisted(() => ({ summary: vi.fn(), employers: vi.fn(), fys: vi.fn(), entries: vi.fn() }));
vi.mock('./epfServerApi', () => ({
  fetchEpfSummary: () => api.summary(),
  fetchEpfEmployers: () => api.employers(),
  fetchEpfFys: (id?: string) => api.fys(id),
  fetchEpfEntries: (p: unknown) => api.entries(p),
}));

import { ApiError } from '@/lib/api/client';

import { DEFAULT_EPF_URL, type EpfUrlState } from './epfModel';
import { loadEpfScreen } from './epfScreenData';

const state = (over: Partial<EpfUrlState> = {}): EpfUrlState => ({ ...DEFAULT_EPF_URL, ...over });
const employer = (id: string, status = 'CURRENT') => ({ id, name: id, status });

beforeEach(() => {
  vi.resetAllMocks();
  api.summary.mockResolvedValue({ staleThrough: null });
  api.employers.mockResolvedValue([employer('e1')]);
  api.fys.mockResolvedValue([2026, 2025]);
  api.entries.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });
});

describe('loadEpfScreen', () => {
  it('starts everything an all-employers address knows before any of it resolves', async () => {
    const never = new Promise(() => undefined);
    api.summary.mockReturnValue(never);
    api.employers.mockReturnValue(never);
    void loadEpfScreen(state({ employer: 'all', fy: 2025 }));
    await Promise.resolve();
    expect(api.summary).toHaveBeenCalled();
    expect(api.employers).toHaveBeenCalled();
    expect(api.fys).toHaveBeenCalledWith(undefined);
    expect(api.entries).toHaveBeenCalledWith({ employerId: undefined, fy: 2025, page: 0, size: state().size });
  });

  it('reads the FYs and the entries together once the employer is known and the address names the FY', async () => {
    const never = new Promise(() => undefined);
    api.fys.mockReturnValue(never);
    void loadEpfScreen(state({ fy: 2025 }));
    await vi.waitFor(() => expect(api.entries).toHaveBeenCalledWith(expect.objectContaining({ employerId: 'e1', fy: 2025 })));
    expect(api.fys).toHaveBeenCalledWith('e1');
  });

  it('keeps the default chain: the entries wait for the FYs to pick the newest', async () => {
    const data = await loadEpfScreen(state());
    expect(data.ok).toBe(true);
    expect(api.entries).toHaveBeenCalledWith(expect.objectContaining({ employerId: 'e1', fy: 2026 }));
  });

  it('reports a failed summary first, whatever the early requests did', async () => {
    api.summary.mockRejectedValue(new ApiError(500, { code: 'X', message: 'boom', timestamp: 'x' }));
    api.entries.mockRejectedValue(new ApiError(500, { code: 'X', message: 'other', timestamp: 'x' }));
    const result = await loadEpfScreen(state({ employer: 'all', fy: 'all' }));
    expect(result.ok).toBe(false);
  });

  it('degrades to every year when the FYs fail, and fails when the entries do', async () => {
    api.fys.mockRejectedValue(new Error('down'));
    expect((await loadEpfScreen(state({ employer: 'all' }))).ok).toBe(true);
    api.entries.mockRejectedValue(new Error('down'));
    expect((await loadEpfScreen(state({ employer: 'all', fy: 2025 }))).ok).toBe(false);
  });
});
