'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { loadRewardLines, loadRewardReport, type RewardLinesParams } from '@/features/rewards/rewardActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

export type { RewardLinesParams };

export function useRewardReport(accountId: string, from: string, to: string) {
  return useQuery({
    queryKey: keys.rewards.report(accountId, from, to),
    queryFn: () => unwrapAction(loadRewardReport(accountId, from, to)),
    enabled: Boolean(accountId && from && to),
  });
}

export function useRewardLines(params: RewardLinesParams) {
  return useQuery({
    queryKey: keys.rewards.lines({ ...params }),
    queryFn: () => unwrapAction(loadRewardLines({ ...params })),
    enabled: Boolean(params.accountId && params.from && params.to),
    placeholderData: keepPreviousData,
  });
}
