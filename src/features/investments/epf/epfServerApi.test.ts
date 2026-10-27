import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ epfApi: { summary: vi.fn(), employers: vi.fn(), fys: vi.fn(), entries: vi.fn() } }));
vi.mock('@/lib/apiClient', () => api);

import { fetchEpfEmployers, fetchEpfEntries, fetchEpfFys, fetchEpfSummary } from './epfServerApi';

beforeEach(() => vi.clearAllMocks());

describe('EPF fetchers', () => {
  it('reads the summary and the employers', async () => {
    api.epfApi.summary.mockResolvedValue('s');
    api.epfApi.employers.mockResolvedValue(['e']);
    expect(await fetchEpfSummary()).toBe('s');
    expect(await fetchEpfEmployers()).toEqual(['e']);
  });

  it('asks for the FYs of one employer', async () => {
    api.epfApi.fys.mockResolvedValue([2026]);
    expect(await fetchEpfFys('e1')).toEqual([2026]);
    expect(api.epfApi.fys).toHaveBeenCalledWith('e1');
  });

  it('asks for a page of entries and keeps only what the page needs', async () => {
    api.epfApi.entries.mockResolvedValue({ content: ['x'], totalElements: 1, totalPages: 1, number: 2, size: 25 });
    expect(await fetchEpfEntries({ employerId: 'e1', fy: 2026, page: 2, size: 25 })).toEqual({ content: ['x'], totalElements: 1, totalPages: 1 });
    expect(api.epfApi.entries).toHaveBeenCalledWith({ employerId: 'e1', fy: 2026, page: 2, size: 25 });
  });
});
