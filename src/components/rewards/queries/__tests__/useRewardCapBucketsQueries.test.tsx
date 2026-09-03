import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import type { RewardCapBucket } from '@/lib/rewards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import {
  useCreateRewardCapBucket,
  useDeleteRewardCapBucket,
  useRewardCapBuckets,
  useUpdateRewardCapBucket,
} from '../useRewardCapBucketsQueries';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const bucket: RewardCapBucket = {
  id: 'bucket-1',
  accountId: 'acc-1',
  name: 'ACE combined cap',
  cap: 500,
  rewardType: 'CASH',
  windowType: 'STATEMENT_CYCLE',
  counterScope: 'ACCOUNT',
  ruleCount: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function Harness({ accountId }: { accountId: string }) {
  const bucketsQuery = useRewardCapBuckets(accountId);
  const create = useCreateRewardCapBucket();
  const update = useUpdateRewardCapBucket();
  const del = useDeleteRewardCapBucket();

  return (
    <div>
      <div data-testid="count">{bucketsQuery.data?.length ?? 0}</div>
      <button
        onClick={() =>
          create.mutate({ accountId, name: 'New Bucket', cap: 1000, windowType: 'CALENDAR_MONTH' })
        }
      >
        create
      </button>
      <button onClick={() => update.mutate({ id: 'bucket-1', body: { name: 'Renamed', cap: 750, windowType: 'STATEMENT_CYCLE' } })}>
        update
      </button>
      <button onClick={() => del.mutate('bucket-1')}>delete</button>
    </div>
  );
}

describe('useRewardCapBucketsQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches buckets scoped to the account and refetches after a mutation invalidates', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [bucket] });
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { ...bucket, id: 'bucket-2', name: 'New Bucket' } });

    renderWithQuery(<Harness accountId="acc-1" />);

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(api.GET).toHaveBeenCalledWith(
      '/api/v1/reward-cap-buckets',
      expect.objectContaining({ params: { query: { accountId: 'acc-1' } } })
    );

    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [bucket, { ...bucket, id: 'bucket-2' }] });
    fireEvent.click(screen.getByText('create'));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/reward-cap-buckets',
        expect.objectContaining({ body: expect.objectContaining({ name: 'New Bucket', cap: 1000 }) })
      );
    });
    // The mutation's onSuccess invalidates keys.rewards.all, which refetches the list query.
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
  });

  it('sends an update to the correct bucket id', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [bucket] });
    (api.PUT as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { ...bucket, name: 'Renamed', cap: 750 } });

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('update'));

    await waitFor(() => {
      expect(api.PUT).toHaveBeenCalledWith(
        '/api/v1/reward-cap-buckets/{id}',
        expect.objectContaining({
          params: { path: { id: 'bucket-1' } },
          body: expect.objectContaining({ name: 'Renamed', cap: 750 }),
        })
      );
    });
  });

  it('deletes a bucket by id', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [bucket] });
    (api.DELETE as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined });

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('delete'));

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith(
        '/api/v1/reward-cap-buckets/{id}',
        expect.objectContaining({ params: { path: { id: 'bucket-1' } } })
      );
    });
  });

  it('does not fetch when accountId is empty', () => {
    renderWithQuery(<Harness accountId="" />);
    expect(api.GET).not.toHaveBeenCalled();
  });
});
