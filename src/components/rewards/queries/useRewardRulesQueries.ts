'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { ReorderRewardRulesRequest, RewardRuleRequest } from '@/lib/rewards.types';

/**
 * `RewardRuleRequest` (rewards.types.ts) allows `null` on several optional
 * fields to explicitly clear them; the generated `RewardRuleRequest` schema
 * only allows `undefined`. Since this is a full PUT/POST replace (not a
 * merge-patch), an absent key deserializes identically to an explicit `null`
 * server-side, so mapping `null` -> `undefined` per field is behaviourally
 * equivalent and needs no cast. See "Spec follow-ups" in the migration report
 * (the generated schema should mark these `nullable: true`).
 */
function toRequestBody(body: RewardRuleRequest): Schemas['RewardRuleRequest'] {
  return {
    accountId: body.accountId,
    cardholderId: body.cardholderId ?? undefined,
    counterScope: body.counterScope,
    name: body.name,
    priority: body.priority,
    stacking: body.stacking,
    activeFrom: body.activeFrom ?? undefined,
    activeTo: body.activeTo ?? undefined,
    categoryIds: body.categoryIds,
    mccs: body.mccs,
    channels: body.channels,
    daysOfWeek: body.daysOfWeek,
    merchantPattern: body.merchantPattern ?? undefined,
    merchantMatch: body.merchantMatch ?? undefined,
    minAmount: body.minAmount ?? undefined,
    maxAmount: body.maxAmount ?? undefined,
    emiTreatment: body.emiTreatment,
    intlTreatment: body.intlTreatment,
    feeTreatment: body.feeTreatment,
    rewardType: body.rewardType,
    accrualType: body.accrualType,
    percentRate: body.percentRate ?? undefined,
    rounding: body.rounding ?? undefined,
    slabSize: body.slabSize ?? undefined,
    pointsPerSlab: body.pointsPerSlab ?? undefined,
    pointPrecision: body.pointPrecision ?? undefined,
    tierWindow: body.tierWindow ?? undefined,
    tiers: body.tiers?.map((tier) => ({ rate: tier.rate, upTo: tier.upTo ?? undefined })) ?? undefined,
    perTxnCap: body.perTxnCap ?? undefined,
    periodCap: body.periodCap ?? undefined,
    capWindow: body.capWindow ?? undefined,
    capBucketId: body.capBucketId ?? undefined,
    onCapExhausted: body.onCapExhausted,
  };
}

export function useRewardRules(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.rules(accountId),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/reward-rules', { params: { query: { accountId } } });
      return data ?? [];
    },
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardRuleRequest) =>
      api.POST('/api/v1/reward-rules', { body: toRequestBody(body) }).then((r) => r.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}

export function useUpdateRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RewardRuleRequest }) =>
      api
        .PUT('/api/v1/reward-rules/{id}', { params: { path: { id } }, body: toRequestBody(body) })
        .then((r) => r.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}

export function useDeleteRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/reward-rules/{id}', { params: { path: { id } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}

export function useReorderRewardRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderRewardRulesRequest) =>
      api.POST('/api/v1/reward-rules/reorder', { body }).then((r) => r.data ?? []),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rewards.all }),
  });
}
