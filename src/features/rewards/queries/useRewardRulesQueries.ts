'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateRewardQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { ReorderRewardRulesRequest, RewardRuleRequest } from '@/lib/rewards.types';

import {
  createRewardRule,
  deleteRewardRule,
  loadRewardRules,
  reorderRewardRules,
  updateRewardRule,
} from '../actions';

export function useRewardRules(accountId: string) {
  return useQuery({
    queryKey: keys.rewards.rules(accountId),
    queryFn: () => unwrapAction(loadRewardRules(accountId)),
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardRuleRequest) => unwrapAction(createRewardRule(body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}

export function useUpdateRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RewardRuleRequest }) => unwrapAction(updateRewardRule(id, body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}

export function useDeleteRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrapAction(deleteRewardRule(id)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}

export function useReorderRewardRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderRewardRulesRequest) => unwrapAction(reorderRewardRules(body)),
    onSuccess: () => invalidateRewardQueries(qc),
  });
}
