'use server';

import { revalidatePath } from 'next/cache';

import { rewardsApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type {
  PagedRewardLines,
  ReorderRewardRulesRequest,
  RewardAccountConfig,
  RewardAccountConfigRequest,
  RewardCapBucket,
  RewardCapBucketRequest,
  RewardMilestone,
  RewardMilestoneRequest,
  RewardReport,
  RewardRule,
  RewardRuleRequest,
} from '@/lib/rewards.types';
import type { ApiResult } from '@/lib/types';

function revalidateRewardViews(): void {
  revalidatePath('/rewards');
  revalidatePath('/rewards/rules');
}

export async function listRewardRules(accountId: string): Promise<ApiResult<RewardRule[]>> {
  return apiResult('Failed to load reward rules', async () => rewardsApi.listRules(accountId));
}

export async function createRewardRule(body: RewardRuleRequest): Promise<ApiResult<RewardRule>> {
  return apiResult('Failed to create reward rule', async () => {
    const rule = await rewardsApi.createRule(body);
    revalidateRewardViews();
    return rule;
  });
}

export async function updateRewardRule(id: string, body: RewardRuleRequest): Promise<ApiResult<RewardRule>> {
  return apiResult('Failed to update reward rule', async () => {
    const rule = await rewardsApi.updateRule(id, body);
    revalidateRewardViews();
    return rule;
  });
}

export async function deleteRewardRule(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to delete reward rule', async () => {
    await rewardsApi.deleteRule(id);
    revalidateRewardViews();
  });
}

export async function reorderRewardRules(body: ReorderRewardRulesRequest): Promise<ApiResult<RewardRule[]>> {
  return apiResult('Failed to reorder reward rules', async () => {
    const rules = await rewardsApi.reorderRules(body);
    revalidateRewardViews();
    return rules;
  });
}

export async function listRewardMilestones(accountId: string): Promise<ApiResult<RewardMilestone[]>> {
  return apiResult('Failed to load milestones', async () => rewardsApi.listMilestones(accountId));
}

export async function createRewardMilestone(body: RewardMilestoneRequest): Promise<ApiResult<RewardMilestone>> {
  return apiResult('Failed to create milestone', async () => {
    const milestone = await rewardsApi.createMilestone(body);
    revalidateRewardViews();
    return milestone;
  });
}

export async function updateRewardMilestone(id: string, body: RewardMilestoneRequest): Promise<ApiResult<RewardMilestone>> {
  return apiResult('Failed to update milestone', async () => {
    const milestone = await rewardsApi.updateMilestone(id, body);
    revalidateRewardViews();
    return milestone;
  });
}

export async function deleteRewardMilestone(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to delete milestone', async () => {
    await rewardsApi.deleteMilestone(id);
    revalidateRewardViews();
  });
}

export async function listRewardCapBuckets(accountId: string): Promise<ApiResult<RewardCapBucket[]>> {
  return apiResult('Failed to load cap buckets', async () => rewardsApi.listCapBuckets(accountId));
}

export async function createRewardCapBucket(body: RewardCapBucketRequest): Promise<ApiResult<RewardCapBucket>> {
  return apiResult('Failed to create cap bucket', async () => {
    const bucket = await rewardsApi.createCapBucket(body);
    revalidateRewardViews();
    return bucket;
  });
}

export async function updateRewardCapBucket(id: string, body: RewardCapBucketRequest): Promise<ApiResult<RewardCapBucket>> {
  return apiResult('Failed to update cap bucket', async () => {
    const bucket = await rewardsApi.updateCapBucket(id, body);
    revalidateRewardViews();
    return bucket;
  });
}

export async function deleteRewardCapBucket(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to delete cap bucket', async () => {
    await rewardsApi.deleteCapBucket(id);
    revalidateRewardViews();
  });
}

export async function getRewardAccountConfig(accountId: string): Promise<ApiResult<RewardAccountConfig>> {
  return apiResult('Failed to load reward config', async () => rewardsApi.getAccountConfig(accountId));
}

export async function updateRewardAccountConfig(body: RewardAccountConfigRequest): Promise<ApiResult<RewardAccountConfig>> {
  return apiResult('Failed to update reward config', async () => {
    const config = await rewardsApi.updateAccountConfig(body);
    revalidateRewardViews();
    return config;
  });
}

export async function getRewardReport(
  accountId: string,
  from: string,
  to: string,
): Promise<ApiResult<RewardReport>> {
  return apiResult('Failed to load rewards report', async () =>
    rewardsApi.report({ accountId, from, to }),
  );
}

export async function listRewardLines(params: {
  accountId: string;
  from: string;
  to: string;
  ruleId?: string;
  page?: number;
  size?: number;
}): Promise<ApiResult<PagedRewardLines>> {
  return apiResult('Failed to load reward lines', async () => rewardsApi.lines(params));
}
