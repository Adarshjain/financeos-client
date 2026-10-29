'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateRewardQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { RewardCapBucketRequest } from '@/lib/rewards.types';

import {
  createRewardCapBucket,
  deleteRewardCapBucket,
  loadRewardCapBuckets,
  updateRewardCapBucket,
} from '../actions';

export function useRewardCapBuckets(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.capBuckets(accountId),
    queryFn: () => unwrapAction(loadRewardCapBuckets(accountId)),
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRewardCapBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardCapBucketRequest) => unwrapAction(createRewardCapBucket(body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}

export function useUpdateRewardCapBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RewardCapBucketRequest }) =>
      unwrapAction(updateRewardCapBucket(id, body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}

export function useDeleteRewardCapBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrapAction(deleteRewardCapBucket(id)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}
