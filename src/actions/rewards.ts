'use server';

import { rewardsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type {
  ReorderRewardRulesRequest,
  RewardAccountConfigRequest,
  RewardCapBucketRequest,
  RewardMilestoneRequest,
  RewardRuleRequest,
} from '@/lib/rewards.types';

const REWARD_PATHS = ['/rewards', '/rewards/rules'];

export const listRewardRules = createDomainAction(
  { fallbackError: 'Failed to load reward rules' },
  (accountId: string) => rewardsApi.listRules(accountId)
);

export const createRewardRule = createDomainAction(
  { fallbackError: 'Failed to create reward rule', revalidatePaths: REWARD_PATHS },
  (body: RewardRuleRequest) => rewardsApi.createRule(body)
);

export const updateRewardRule = createDomainAction(
  { fallbackError: 'Failed to update reward rule', revalidatePaths: REWARD_PATHS },
  (id: string, body: RewardRuleRequest) => rewardsApi.updateRule(id, body)
);

export const deleteRewardRule = createDomainAction(
  { fallbackError: 'Failed to delete reward rule', revalidatePaths: REWARD_PATHS },
  (id: string) => rewardsApi.deleteRule(id)
);

export const reorderRewardRules = createDomainAction(
  { fallbackError: 'Failed to reorder reward rules', revalidatePaths: REWARD_PATHS },
  (body: ReorderRewardRulesRequest) => rewardsApi.reorderRules(body)
);

export const listRewardMilestones = createDomainAction(
  { fallbackError: 'Failed to load reward milestones' },
  (accountId: string) => rewardsApi.listMilestones(accountId)
);

export const createRewardMilestone = createDomainAction(
  { fallbackError: 'Failed to create milestone', revalidatePaths: REWARD_PATHS },
  (body: RewardMilestoneRequest) => rewardsApi.createMilestone(body)
);

export const updateRewardMilestone = createDomainAction(
  { fallbackError: 'Failed to update milestone', revalidatePaths: REWARD_PATHS },
  (id: string, body: RewardMilestoneRequest) => rewardsApi.updateMilestone(id, body)
);

export const deleteRewardMilestone = createDomainAction(
  { fallbackError: 'Failed to delete milestone', revalidatePaths: REWARD_PATHS },
  (id: string) => rewardsApi.deleteMilestone(id)
);

export const listRewardCapBuckets = createDomainAction(
  { fallbackError: 'Failed to load cap buckets' },
  (accountId: string) => rewardsApi.listCapBuckets(accountId)
);

export const createRewardCapBucket = createDomainAction(
  { fallbackError: 'Failed to create cap bucket', revalidatePaths: REWARD_PATHS },
  (body: RewardCapBucketRequest) => rewardsApi.createCapBucket(body)
);

export const updateRewardCapBucket = createDomainAction(
  { fallbackError: 'Failed to update cap bucket', revalidatePaths: REWARD_PATHS },
  (id: string, body: RewardCapBucketRequest) => rewardsApi.updateCapBucket(id, body)
);

export const deleteRewardCapBucket = createDomainAction(
  { fallbackError: 'Failed to delete cap bucket', revalidatePaths: REWARD_PATHS },
  (id: string) => rewardsApi.deleteCapBucket(id)
);

export const getRewardAccountConfig = createDomainAction(
  { fallbackError: 'Failed to load reward config' },
  (accountId: string) => rewardsApi.getAccountConfig(accountId)
);

export const updateRewardAccountConfig = createDomainAction(
  { fallbackError: 'Failed to update reward config', revalidatePaths: REWARD_PATHS },
  (body: RewardAccountConfigRequest) => rewardsApi.updateAccountConfig(body)
);

export const getRewardReport = createDomainAction(
  { fallbackError: 'Failed to load rewards report' },
  (accountId: string, from: string, to: string) => rewardsApi.report({ accountId, from, to })
);

export const listRewardLines = createDomainAction(
  { fallbackError: 'Failed to load reward lines' },
  (params: { accountId: string; from: string; to: string; ruleId?: string; page?: number; size?: number }) =>
    rewardsApi.lines(params)
);
