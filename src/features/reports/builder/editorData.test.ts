import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { catalogFixture, savedChart } from './editor.fixtures';
import { loadNewReport, loadSavedReport } from './editorData';

const reportsApi = vi.hoisted(() => ({ getById: vi.fn(), getDatasource: vi.fn(), runSaved: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ reportsApi }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));

const result = { type: 'KPI', value: 1 };
let n = 0;
// `loadSavedReport` is cached per render; a fresh id each time keeps one test's answer from serving the next.
const id = () => `r${++n}`;

beforeEach(() => {
  vi.clearAllMocks();
  reportsApi.getById.mockResolvedValue(savedChart);
  reportsApi.getDatasource.mockResolvedValue(catalogFixture);
  reportsApi.runSaved.mockResolvedValue(result);
});

describe('loadNewReport', () => {
  it('loads the catalog', async () => {
    expect(await loadNewReport()).toEqual({ ok: true, data: { catalog: catalogFixture } });
  });

  it('is a failure when the catalog fails, with its reference', async () => {
    reportsApi.getDatasource.mockRejectedValue(new ApiError(500, { message: 'x', code: 'X' } as never, { requestId: 'req-1' }));
    expect(await loadNewReport()).toEqual({ ok: false, reference: 'req-1' });
  });
});

describe('loadSavedReport', () => {
  it('loads the report, the catalog and the report’s first page of results together, once each', async () => {
    const key = id();
    const out = await loadSavedReport(key);
    expect(out).toEqual({ ok: true, data: { catalog: catalogFixture, report: savedChart, initialResult: result } });
    expect(reportsApi.getById).toHaveBeenCalledTimes(1);
    expect(reportsApi.getDatasource).toHaveBeenCalledTimes(1);
    expect(reportsApi.runSaved).toHaveBeenCalledTimes(1);
    expect(reportsApi.runSaved).toHaveBeenCalledWith(key, { page: 0, size: 25 });
  });

  it('opens the report without a result when only the run fails', async () => {
    reportsApi.runSaved.mockRejectedValue(new Error('slow'));
    const out = await loadSavedReport(id());
    expect(out).toMatchObject({ ok: true, data: { report: savedChart, initialResult: null } });
  });

  it('is a failure when the catalog fails', async () => {
    reportsApi.getDatasource.mockRejectedValue(new Error('down'));
    expect(await loadSavedReport(id())).toMatchObject({ ok: false });
  });

  it('is a 404 when the report does not exist', async () => {
    reportsApi.getById.mockRejectedValue(new ApiError(404, { message: 'nope', code: 'NOT_FOUND' } as never, { requestId: 'req-2' }));
    await expect(loadSavedReport(id())).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('throws any other failure of the report itself to the route’s error state', async () => {
    reportsApi.getById.mockRejectedValue(new ApiError(500, { message: 'x', code: 'X' } as never, { requestId: 'req-3' }));
    await expect(loadSavedReport(id())).rejects.toBeInstanceOf(ApiError);
  });
});
