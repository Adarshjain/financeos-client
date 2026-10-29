'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateRewardQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { RewardMilestoneRequest } from '@/lib/rewards.types';

import {
  createRewardMilestone,
  deleteRewardMilestone,
  loadRewardMilestones,
  updateRewardMilestone,
} from '../actions';

export function useRewardMilestones(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.milestones(accountId),
    queryFn: () => unwrapAction(loadRewardMilestones(accountId)),
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRewardMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardMilestoneRequest) => unwrapAction(createRewardMilestone(body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}

export function useUpdateRewardMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RewardMilestoneRequest }) =>
      unwrapAction(updateRewardMilestone(id, body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}

export function useDeleteRewardMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrapAction(deleteRewardMilestone(id)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}
