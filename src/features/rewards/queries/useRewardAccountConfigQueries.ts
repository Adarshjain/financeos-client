'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { loadRewardAccountConfig, updateRewardAccountConfig } from '@/features/rewards/rewardActions';
import { unwrapAction } from '@/lib/actionResult';
import { invalidateRewardQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { RewardAccountConfigRequest } from '@/lib/rewards.types';

export function useRewardAccountConfig(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.config(accountId),
    queryFn: () => unwrapAction(loadRewardAccountConfig(accountId)),
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateRewardAccountConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardAccountConfigRequest) => unwrapAction(updateRewardAccountConfig(body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}
