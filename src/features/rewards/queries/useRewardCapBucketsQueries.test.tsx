import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as actions from '@/features/rewards/rewardActions';
import type { RewardCapBucket } from '@/lib/rewards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import {
  useCreateRewardCapBucket,
  useDeleteRewardCapBucket,
  useRewardCapBuckets,
  useUpdateRewardCapBucket,
} from './useRewardCapBucketsQueries';

vi.mock('@/features/rewards/rewardActions', () => ({
  loadRewardCapBuckets: vi.fn(),
  createRewardCapBucket: vi.fn(),
  updateRewardCapBucket: vi.fn(),
  deleteRewardCapBucket: vi.fn(),
}));

const mocked = vi.mocked(actions);
const ok = (data: unknown) => ({ success: true, data }) as never;

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
    mocked.loadRewardCapBuckets.mockResolvedValue(ok([bucket]));
    mocked.createRewardCapBucket.mockResolvedValue(ok({ ...bucket, id: 'bucket-2', name: 'New Bucket' }));

    renderWithQuery(<Harness accountId="acc-1" />);

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(mocked.loadRewardCapBuckets).toHaveBeenCalledWith('acc-1');

    mocked.loadRewardCapBuckets.mockResolvedValue(ok([bucket, { ...bucket, id: 'bucket-2' }]));
    fireEvent.click(screen.getByText('create'));

    await waitFor(() => {
      expect(mocked.createRewardCapBucket).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Bucket', cap: 1000 }));
    });
    // The mutation's onSuccess invalidates keys.rewards.all, which refetches the list query.
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
  });

  it('sends an update to the correct bucket id', async () => {
    mocked.loadRewardCapBuckets.mockResolvedValue(ok([bucket]));
    mocked.updateRewardCapBucket.mockResolvedValue(ok({ ...bucket, name: 'Renamed', cap: 750 }));

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('update'));

    await waitFor(() => {
      expect(mocked.updateRewardCapBucket).toHaveBeenCalledWith(
        'bucket-1',
        expect.objectContaining({ name: 'Renamed', cap: 750 })
      );
    });
  });

  it('deletes a bucket by id', async () => {
    mocked.loadRewardCapBuckets.mockResolvedValue(ok([bucket]));
    mocked.deleteRewardCapBucket.mockResolvedValue(ok(undefined));

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('delete'));

    await waitFor(() => {
      expect(mocked.deleteRewardCapBucket).toHaveBeenCalledWith('bucket-1');
    });
  });

  it('does not fetch when accountId is empty', () => {
    renderWithQuery(<Harness accountId="" />);
    expect(mocked.loadRewardCapBuckets).not.toHaveBeenCalled();
  });
});
