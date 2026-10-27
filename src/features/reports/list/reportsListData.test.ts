import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ reports: vi.fn(), datasource: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({
  reportsApi: { list: api.reports, getDatasource: api.datasource },
}));
vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));

import { loadReportsList } from './reportsListData';

beforeEach(() => {
  vi.resetAllMocks();
  api.reports.mockResolvedValue([]);
  api.datasource.mockResolvedValue({ datasources: [{ name: 'transactions', label: 'Transactions' }] });
});

describe('loadReportsList', () => {
  it('loads the reports and the datasource labels, and nothing for tab counts', async () => {
    const result = await loadReportsList();
    expect(result).toEqual({ ok: true, data: { reports: [], datasourceLabels: { transactions: 'Transactions' } } });
  });

  it('still lists the reports when the datasource catalog fails', async () => {
    api.datasource.mockRejectedValue(new Error('boom'));
    const result = await loadReportsList();
    expect(result).toEqual({ ok: true, data: { reports: [], datasourceLabels: {} } });
  });
});
