'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { RewardMilestoneRequest } from '@/lib/rewards.types';

/** See the matching comment in useRewardRulesQueries.ts — same null-vs-undefined schema gap. */
function toRequestBody(body: RewardMilestoneRequest): Schemas['RewardMilestoneRequest'] {
  return {
    accountId: body.accountId,
    cardholderId: body.cardholderId ?? undefined,
    name: body.name,
    windowType: body.windowType,
    basis: body.basis,
    threshold: body.threshold,
    minTxnAmount: body.minTxnAmount ?? undefined,
    payoutType: body.payoutType,
    rewardType: body.rewardType,
    payoutValue: body.payoutValue ?? undefined,
    payoutTiming: body.payoutTiming,
    includeCategoryIds: body.includeCategoryIds,
    includeMccs: body.includeMccs,
    excludeCategoryIds: body.excludeCategoryIds,
    excludeMccs: body.excludeMccs,
    activeFrom: body.activeFrom ?? undefined,
    activeTo: body.activeTo ?? undefined,
  };
}

export function useRewardMilestones(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.milestones(accountId),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/reward-milestones', { params: { query: { accountId } } });
      return data ?? [];
    },
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRewardMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardMilestoneRequest) =>
      api.POST('/api/v1/reward-milestones', { body: toRequestBody(body) }).then((r) => r.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}

export function useUpdateRewardMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RewardMilestoneRequest }) =>
      api
        .PUT('/api/v1/reward-milestones/{id}', { params: { path: { id } }, body: toRequestBody(body) })
        .then((r) => r.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}

export function useDeleteRewardMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/reward-milestones/{id}', { params: { path: { id } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}
