import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const obligationsApi = vi.hoisted(() => ({ getUpcoming: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ obligationsApi }));
let qc: QueryClient;
vi.mock('@/lib/query/client', () => ({ getQueryClient: () => qc }));
vi.mock('../UpcomingView', () => ({ UpcomingView: () => null }));

import { keys } from '@/lib/query/keys';

import UpcomingPage from '../page';

type El = { props: { state: { queries: Array<{ queryKey: unknown; state: { data: unknown } }> } } };

describe('UpcomingPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('prefetches 3 months under keys.obligations.upcoming({months:3}) with the items array', async () => {
    obligationsApi.getUpcoming.mockResolvedValue({ items: [{ id: 'o1' }] });
    const el = (await UpcomingPage()) as unknown as El;
    expect(obligationsApi.getUpcoming).toHaveBeenCalledWith(3);
    const q = el.props.state.queries.find((x) => JSON.stringify(x.queryKey) === JSON.stringify(keys.obligations.upcoming({ months: 3 })));
    expect(q?.state.data).toEqual([{ id: 'o1' }]);
  });

  it('tolerates a failed prefetch: renders with nothing hydrated', async () => {
    obligationsApi.getUpcoming.mockRejectedValue(new Error('down'));
    const el = (await UpcomingPage()) as unknown as El;
    expect(el.props.state.queries).toHaveLength(0);
  });
});
