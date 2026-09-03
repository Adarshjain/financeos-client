'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { RewardAccountConfigRequest } from '@/lib/rewards.types';

/** See the matching comment in useRewardRulesQueries.ts — same null-vs-undefined schema gap. */
function toRequestBody(body: RewardAccountConfigRequest): Schemas['RewardAccountConfigRequest'] {
  return {
    accountId: body.accountId,
    defaultRewardType: body.defaultRewardType ?? undefined,
    pointValueInr: body.pointValueInr ?? undefined,
  };
}

export function useRewardAccountConfig(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.config(accountId),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/reward-config', { params: { query: { accountId } } });
      return data!;
    },
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateRewardAccountConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardAccountConfigRequest) =>
      api.PUT('/api/v1/reward-config', { body: toRequestBody(body) }).then((r) => r.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}
