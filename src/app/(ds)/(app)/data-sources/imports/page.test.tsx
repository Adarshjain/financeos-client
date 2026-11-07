import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ importsApi: { list: api.list } }));
vi.mock('@/features/shell/loadHelpers', () => ({ guardSession: (p: Promise<unknown>) => p }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock('@/features/data-sources/imports/ImportsScreen', () => ({ ImportsScreen: () => null }));

import DsDataSourcesImportsPage from './page';

beforeEach(() => vi.resetAllMocks());

const list = (over = {}) => ({ content: [{ id: 'a' }], totalElements: 1, totalPages: 1, ...over });

describe('Imports page', () => {
  it('reads page and kind from the address and fetches once', async () => {
    api.list.mockResolvedValue(list({ totalElements: 60, totalPages: 3 }));
    const element = await DsDataSourcesImportsPage({ searchParams: Promise.resolve({ page: '2', kind: 'epf_passbook' }) });
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 25, kind: 'epf_passbook' });
    expect(element.props).toMatchObject({ page: 1, size: 25, kind: 'epf_passbook', totalElements: 60, totalPages: 3 });
  });

  it('sends no kind for every kind', async () => {
    api.list.mockResolvedValue(list());
    await DsDataSourcesImportsPage({ searchParams: Promise.resolve({}) });
    expect(api.list).toHaveBeenCalledWith({ page: 0, size: 25, kind: undefined });
  });

  it('goes to the last page when the address is past it', async () => {
    api.list.mockResolvedValue(list({ content: [], totalElements: 30, totalPages: 2 }));
    await expect(DsDataSourcesImportsPage({ searchParams: Promise.resolve({ page: '9', kind: 'statement' }) })).rejects.toThrow(
      'REDIRECT /data-sources/imports?kind=statement&page=2',
    );
  });
});
