import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDashboard, deleteDashboard, setDefaultDashboard, updateDashboard } from '@/actions/dashboards';
import { dashboardsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  dashboardsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn(),
  },
}));

describe('dashboards server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createDashboard calls dashboardsApi.create', async () => {
    vi.mocked(dashboardsApi.create).mockResolvedValue({ id: 'd1', name: 'Main' } as any);
    const res = await createDashboard({ name: 'Main' } as any);
    expect(res.success).toBe(true);
  });

  it('updateDashboard, deleteDashboard, setDefaultDashboard call dashboardsApi', async () => {
    vi.mocked(dashboardsApi.update).mockResolvedValue({ id: 'd1' } as any);
    vi.mocked(dashboardsApi.delete).mockResolvedValue(undefined);
    vi.mocked(dashboardsApi.getById).mockResolvedValue({
      id: 'd1',
      name: 'Main',
      widgets: [],
      updatedAt: '2026-07-25T00:00:00Z',
    } as any);

    expect((await updateDashboard('d1', { name: 'Dash2' } as any)).success).toBe(true);
    expect((await deleteDashboard('d1')).success).toBe(true);
    expect((await setDefaultDashboard('d1', true)).success).toBe(true);
  });
});
