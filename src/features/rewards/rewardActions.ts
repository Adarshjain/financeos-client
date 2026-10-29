'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type {
  PagedRewardLines,
  ReorderRewardRulesRequest,
  RewardAccountConfigRequest,
  RewardCapBucketRequest,
  RewardLine,
  RewardMilestoneRequest,
  RewardRecommendationRequest,
  RewardRuleRequest,
} from '@/lib/rewards.types';

/**
 * `RewardRuleRequest` (rewards.types.ts) allows `null` on several optional
 * fields to explicitly clear them; the generated `RewardRuleRequest` schema
 * only allows `undefined`. Since this is a full PUT/POST replace (not a
 * merge-patch), an absent key deserializes identically to an explicit `null`
 * server-side, so mapping `null` -> `undefined` per field is behaviourally
 * equivalent and needs no cast. See "Spec follow-ups" in the migration report
 * (the generated schema should mark these `nullable: true`).
 */
function ruleBody(body: RewardRuleRequest): Schemas['RewardRuleRequest'] {
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

/** See the matching comment in useRewardRulesQueries.ts — same null-vs-undefined schema gap. */
function milestoneBody(body: RewardMilestoneRequest): Schemas['RewardMilestoneRequest'] {
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

/** See the matching comment in useRewardRulesQueries.ts — same null-vs-undefined schema gap. */
function configBody(body: RewardAccountConfigRequest): Schemas['RewardAccountConfigRequest'] {
  return {
    accountId: body.accountId,
    defaultRewardType: body.defaultRewardType ?? undefined,
    pointValueInr: body.pointValueInr ?? undefined,
  };
}

/**
 * `earnedUnit` is typed as a bare `string` in the generated schema (should be
 * the `"RUPEES" | "POINTS"` enum the backend actually returns) — narrow it
 * explicitly instead of widening `RewardLine.earnedUnit` everywhere
 * downstream. See "Spec follow-ups" in the migration report.
 */
function toRewardLine(line: Schemas['RewardLineResponse']): RewardLine {
  return { ...line, earnedUnit: line.earnedUnit === 'POINTS' ? 'POINTS' : 'RUPEES' };
}

export interface RewardLinesParams {
  accountId: string;
  from: string;
  to: string;
  ruleId?: string;
  page: number;
  size: number;
}

// Reads

export const loadRewardCapBuckets = createDomainAction(
  { fallbackError: "Couldn't load the cap buckets. Try again." },
  async (accountId: string) => {
    const { data } = await serverApi.GET('/api/v1/reward-cap-buckets', { params: { query: { accountId } } });
    return data ?? [];
  },
);

export const loadRewardMilestones = createDomainAction(
  { fallbackError: "Couldn't load the milestones. Try again." },
  async (accountId: string) => {
    const { data } = await serverApi.GET('/api/v1/reward-milestones', { params: { query: { accountId } } });
    return data ?? [];
  },
);

export const loadRewardRules = createDomainAction(
  { fallbackError: "Couldn't load the reward rules. Try again." },
  async (accountId: string) => {
    const { data } = await serverApi.GET('/api/v1/reward-rules', { params: { query: { accountId } } });
    return data ?? [];
  },
);

export const loadRewardAccountConfig = createDomainAction(
  { fallbackError: "Couldn't load the reward settings. Try again." },
  async (accountId: string) => {
    const { data } = await serverApi.GET('/api/v1/reward-config', { params: { query: { accountId } } });
    return data!;
  },
);

export const loadRewardReport = createDomainAction(
  { fallbackError: "Couldn't load the rewards report. Try again." },
  async (accountId: string, from: string, to: string) => {
    const { data } = await serverApi.GET('/api/v1/rewards/report', { params: { query: { accountId, from, to } } });
    return data!;
  },
);

export const loadRewardLines = createDomainAction(
  { fallbackError: "Couldn't load the reward lines. Try again." },
  async (params: RewardLinesParams): Promise<PagedRewardLines> => {
    const { data } = await serverApi.GET('/api/v1/rewards/lines', {
      params: {
        query: {
          accountId: params.accountId,
          from: params.from,
          to: params.to,
          ruleId: params.ruleId,
          page: params.page,
          size: params.size,
          sort: [],
        },
      },
    });
    const page = data!;
    return {
      content: page.content.map(toRewardLine),
      totalElements: page.totalElements,
      totalPages: page.totalPages,
      size: page.size,
      number: page.number,
      first: page.first,
      last: page.last,
      empty: page.empty,
    };
  },
);

// Cap buckets

export const createRewardCapBucket = createDomainAction(
  { fallbackError: "Couldn't create the cap bucket. Try again." },
  async (body: RewardCapBucketRequest) => {
    const { data } = await serverApi.POST('/api/v1/reward-cap-buckets', { body });
    return data!;
  },
);

export const updateRewardCapBucket = createDomainAction(
  { fallbackError: "Couldn't update the cap bucket. Try again." },
  async (id: string, body: RewardCapBucketRequest) => {
    const { data } = await serverApi.PUT('/api/v1/reward-cap-buckets/{id}', { params: { path: { id } }, body });
    return data!;
  },
);

export const deleteRewardCapBucket = createDomainAction(
  { fallbackError: "Couldn't delete the cap bucket. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/reward-cap-buckets/{id}', { params: { path: { id } } });
  },
);

// Milestones

export const createRewardMilestone = createDomainAction(
  { fallbackError: "Couldn't create the milestone. Try again." },
  async (body: RewardMilestoneRequest) => {
    const { data } = await serverApi.POST('/api/v1/reward-milestones', { body: milestoneBody(body) });
    return data!;
  },
);

export const updateRewardMilestone = createDomainAction(
  { fallbackError: "Couldn't update the milestone. Try again." },
  async (id: string, body: RewardMilestoneRequest) => {
    const { data } = await serverApi.PUT('/api/v1/reward-milestones/{id}', {
      params: { path: { id } },
      body: milestoneBody(body),
    });
    return data!;
  },
);

export const deleteRewardMilestone = createDomainAction(
  { fallbackError: "Couldn't delete the milestone. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/reward-milestones/{id}', { params: { path: { id } } });
  },
);

// Rules

export const createRewardRule = createDomainAction(
  { fallbackError: "Couldn't create the reward rule. Try again." },
  async (body: RewardRuleRequest) => {
    const { data } = await serverApi.POST('/api/v1/reward-rules', { body: ruleBody(body) });
    return data!;
  },
);

export const updateRewardRule = createDomainAction(
  { fallbackError: "Couldn't update the reward rule. Try again." },
  async (id: string, body: RewardRuleRequest) => {
    const { data } = await serverApi.PUT('/api/v1/reward-rules/{id}', {
      params: { path: { id } },
      body: ruleBody(body),
    });
    return data!;
  },
);

export const deleteRewardRule = createDomainAction(
  { fallbackError: "Couldn't delete the reward rule. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/reward-rules/{id}', { params: { path: { id } } });
  },
);

export const reorderRewardRules = createDomainAction(
  { fallbackError: "Couldn't reorder reward rules. Try again." },
  async (body: ReorderRewardRulesRequest) => {
    const { data } = await serverApi.POST('/api/v1/reward-rules/reorder', { body });
    return data ?? [];
  },
);

// Account config and recommendations

export const updateRewardAccountConfig = createDomainAction(
  { fallbackError: "Couldn't update reward settings. Try again." },
  async (body: RewardAccountConfigRequest) => {
    const { data } = await serverApi.PUT('/api/v1/reward-config', { body: configBody(body) });
    return data!;
  },
);

/** The card-picker simulation: read-only server-side, so it needs no cache refresh. */
export const recommendRewardCards = createDomainAction(
  { fallbackError: "Couldn't simulate card rewards. Try again." },
  async (body: RewardRecommendationRequest) => {
    const { data } = await serverApi.POST('/api/v1/reward-recommendations', { body });
    return data!;
  },
);
