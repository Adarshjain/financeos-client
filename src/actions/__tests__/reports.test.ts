import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReport, deleteReport, runAdHocReport, runSavedReport, updateReport } from '@/actions/reports';
import { reportsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  reportsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    runSaved: vi.fn(),
    runAdHoc: vi.fn(),
  },
}));

describe('reports server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles report CRUD and run API calls', async () => {
    vi.mocked(reportsApi.create).mockResolvedValue({ id: 'r1' } as any);
    vi.mocked(reportsApi.update).mockResolvedValue({ id: 'r1' } as any);
    vi.mocked(reportsApi.delete).mockResolvedValue(undefined);
    vi.mocked(reportsApi.runSaved).mockResolvedValue({ rows: [] } as any);
    vi.mocked(reportsApi.runAdHoc).mockResolvedValue({ rows: [] } as any);

    expect((await createReport({ name: 'Rep' } as any)).success).toBe(true);
    expect((await updateReport('r1', { name: 'Rep2' } as any)).success).toBe(true);
    expect((await deleteReport('r1')).success).toBe(true);
    expect((await runSavedReport('r1', { page: 0 })).success).toBe(true);
    expect((await runAdHocReport({} as any)).success).toBe(true);
  });
});

