'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { RewardCapBucketRequest } from '@/lib/rewards.types';

export function useRewardCapBuckets(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.capBuckets(accountId),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/reward-cap-buckets', { params: { query: { accountId } } });
      return data ?? [];
    },
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRewardCapBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardCapBucketRequest) =>
      api.POST('/api/v1/reward-cap-buckets', { body }).then((r) => r.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}

export function useUpdateRewardCapBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RewardCapBucketRequest }) =>
      api
        .PUT('/api/v1/reward-cap-buckets/{id}', { params: { path: { id } }, body })
        .then((r) => r.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}

export function useDeleteRewardCapBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/reward-cap-buckets/{id}', { params: { path: { id } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}
