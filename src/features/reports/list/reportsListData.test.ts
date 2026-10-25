import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ reports: vi.fn(), datasource: vi.fn(), dashboards: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({
  reportsApi: { list: api.reports, getDatasource: api.datasource },
  dashboardsApi: { list: api.dashboards },
}));
vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));

import { loadReportsList } from './reportsListData';

beforeEach(() => {
  vi.resetAllMocks();
  api.reports.mockResolvedValue([]);
  api.datasource.mockResolvedValue({ datasources: [{ name: 'transactions', label: 'Transactions' }] });
});

describe('loadReportsList', () => {
  it('loads the dashboards count with the reports', async () => {
    api.dashboards.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);
    const result = await loadReportsList();
    expect(result).toEqual({ ok: true, data: { reports: [], datasourceLabels: { transactions: 'Transactions' }, dashboardCount: 2 } });
  });

  it('has no count when the dashboards request fails, and still lists the reports', async () => {
    api.dashboards.mockRejectedValue(new Error('boom'));
    const result = await loadReportsList();
    expect(result).toMatchObject({ ok: true, data: { dashboardCount: null } });
  });
});
