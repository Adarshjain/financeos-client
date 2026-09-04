import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';
import { addCard, addCardholder, createCreditCard, ensurePrimaryCardholder } from './accounts';
import { createTransaction } from './transactions';

export type RewardAccountConfigRequest = components['schemas']['RewardAccountConfigRequest'];
export type RewardAccountConfigResponse = components['schemas']['RewardAccountConfigResponse'];
export type RewardCapBucketRequest = components['schemas']['RewardCapBucketRequest'];
export type RewardCapBucketResponse = components['schemas']['RewardCapBucketResponse'];
export type RewardRuleRequest = components['schemas']['RewardRuleRequest'];
export type RewardRuleResponse = components['schemas']['RewardRuleResponse'];
export type ReorderRewardRulesRequest = components['schemas']['ReorderRewardRulesRequest'];
export type RewardMilestoneRequest = components['schemas']['RewardMilestoneRequest'];
export type RewardMilestoneResponse = components['schemas']['RewardMilestoneResponse'];
export type RewardReportResponse = components['schemas']['RewardReportResponse'];
export type PageRewardLineResponse = components['schemas']['PageRewardLineResponse'];
export type RewardLineResponse = components['schemas']['RewardLineResponse'];
export type RewardRecommendationRequest = components['schemas']['RewardRecommendationRequest'];
export type RewardRecommendationResponse = components['schemas']['RewardRecommendationResponse'];
export type RewardCardRecommendationResponse = components['schemas']['RewardCardRecommendationResponse'];
export type CreditCardAccountResponse = components['schemas']['CreditCardAccountResponse'];
export type CardholderResponse = components['schemas']['CardholderResponse'];

let seedCounter = 0;

// Deterministic fixed past calendar month (e.g. 2 full months before current date)
export function fixedMonth(): { from: string; to: string; year: number; month: number } {
  const now = new Date();
  // 2 full calendar months prior
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    year,
    month,
  };
}

export interface CreateRewardCardOptions {
  anniversaryDate?: string;
  name?: string;
  cardholders?: number | Array<{ name: string; openedOn?: string }>;
}

export async function createRewardCard(
  api: ApiClient,
  options: CreateRewardCardOptions = {}
): Promise<{
  account: CreditCardAccountResponse;
  cardholders: CardholderResponse[];
  cards: Array<{ id: string; cardholderId: string; last4: string }>;
}> {
  seedCounter += 1;
  const account = await createCreditCard(api, {
    name: options.name ?? `Reward Card ${seedCounter}`,
    anniversaryDate: options.anniversaryDate ?? '2025-06-01',
  });

  const cardholders: CardholderResponse[] = [];
  const cards: Array<{ id: string; cardholderId: string; last4: string }> = [];

  const primaryCh = await ensurePrimaryCardholder(api, account.id, '1000');
  cardholders.push(primaryCh);
  if (primaryCh.cards?.[0]) {
    cards.push({ id: primaryCh.cards[0].id, cardholderId: primaryCh.id, last4: primaryCh.cards[0].last4 });
  }

  if (options.cardholders) {
    const specs =
      typeof options.cardholders === 'number'
        ? Array.from({ length: Math.max(0, options.cardholders - 1) }, (_, i) => ({
            name: `Addon Holder ${i + 1}`,
            openedOn: '2025-01-01',
          }))
        : options.cardholders.slice(1);

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const ch = await addCardholder(api, account.id, {
        personName: spec.name,
        openedOn: spec.openedOn ?? '2025-01-01',
        last4: `${1001 + i}`,
      });
      cardholders.push(ch);

      const card = ch.cards?.[0];
      if (card) {
        cards.push({ id: card.id, cardholderId: ch.id, last4: card.last4 });
      }
    }
  }

  return { account, cardholders, cards };
}

export async function getRewardConfig(
  api: ApiClient,
  accountId: string
): Promise<RewardAccountConfigResponse> {
  const res = await api.GET('/api/v1/reward-config', {
    params: {
      query: { accountId },
    },
  });

  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `getRewardConfig failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function setRewardConfig(
  api: ApiClient,
  accountId: string,
  config: Partial<RewardAccountConfigRequest>
): Promise<RewardAccountConfigResponse> {
  const res = await api.PUT('/api/v1/reward-config', {
    body: {
      accountId,
      ...config,
    },
  });

  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `setRewardConfig failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function createBucket(
  api: ApiClient,
  accountId: string,
  overrides?: Partial<RewardCapBucketRequest>
): Promise<RewardCapBucketResponse> {
  seedCounter += 1;
  const body: RewardCapBucketRequest = {
    accountId,
    name: `Cap Bucket ${seedCounter}`,
    cap: 500,
    windowType: 'CALENDAR_MONTH',
    rewardType: 'CASH',
    counterScope: 'ACCOUNT',
    ...overrides,
  };

  const res = await api.POST('/api/v1/reward-cap-buckets', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createBucket failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function createRule(
  api: ApiClient,
  accountId: string,
  overrides?: Partial<RewardRuleRequest>
): Promise<RewardRuleResponse> {
  seedCounter += 1;
  const body: RewardRuleRequest = {
    accountId,
    name: `Reward Rule ${seedCounter}`,
    priority: 10,
    stacking: 'EXCLUSIVE',
    rewardType: 'CASH',
    accrualType: 'PERCENT',
    percentRate: 1.0,
    rounding: 'NONE',
    feeTreatment: 'INCLUDE',
    emiTreatment: 'INCLUDE',
    intlTreatment: 'INCLUDE',
    counterScope: 'ACCOUNT',
    ...overrides,
  };

  const res = await api.POST('/api/v1/reward-rules', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createRule failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function createMilestone(
  api: ApiClient,
  accountId: string,
  overrides?: Partial<RewardMilestoneRequest>
): Promise<RewardMilestoneResponse> {
  seedCounter += 1;
  const body: RewardMilestoneRequest = {
    accountId,
    name: `Milestone ${seedCounter}`,
    basis: 'SPEND',
    threshold: 10000,
    payoutType: 'CASH_VALUE',
    payoutValue: 500,
    payoutTiming: 'WINDOW_END',
    windowType: 'CALENDAR_MONTH',
    rewardType: 'CASH',
    ...overrides,
  };

  const res = await api.POST('/api/v1/reward-milestones', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createMilestone failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export interface SpendOptions {
  amount: number;
  date?: string;
  mcc?: string;
  categoryIds?: string[];
  convenienceFee?: number;
  instantDiscount?: number;
  channel?: 'ONLINE' | 'POS' | 'UPI' | 'CONTACTLESS' | 'ATM' | 'OTHER';
  isEmi?: boolean;
  isIntl?: boolean;
  cardId?: string;
  description?: string;
}

export async function spend(
  api: ApiClient,
  accountId: string,
  options: SpendOptions
) {
  seedCounter += 1;
  const month = fixedMonth();
  const date = options.date ?? `${month.from.slice(0, 7)}-15`;
  const amount = -Math.abs(options.amount); // negative = debit

  return createTransaction(api, accountId, {
    amount,
    date,
    description: options.description ?? `Spend ${seedCounter}`,
    mcc: options.mcc,
    categoryIds: options.categoryIds,
    cardId: options.cardId,
    rewardDetails: {
      convenienceFee: options.convenienceFee,
      instantDiscount: options.instantDiscount,
      channel: options.channel,
      isEmi: options.isEmi,
      isInternational: options.isIntl,
    },
  });
}

export async function report(
  api: ApiClient,
  accountId: string,
  from: string,
  to: string
): Promise<RewardReportResponse> {
  const res = await api.GET('/api/v1/rewards/report', {
    params: {
      query: { accountId, from, to },
    },
  });

  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `report failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export interface LinesOptions {
  ruleId?: string;
  page?: number;
  size?: number;
}

export async function lines(
  api: ApiClient,
  accountId: string,
  from: string,
  to: string,
  options: LinesOptions = {}
): Promise<PageRewardLineResponse> {
  const res = await api.GET('/api/v1/rewards/lines', {
    params: {
      query: {
        accountId,
        from,
        to,
        ruleId: options.ruleId,
        page: options.page,
        size: options.size,
      },
    },
  });

  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `lines failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function recommend(
  api: ApiClient,
  body: RewardRecommendationRequest
): Promise<RewardRecommendationResponse> {
  const res = await api.POST('/api/v1/reward-recommendations', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `recommend failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}
