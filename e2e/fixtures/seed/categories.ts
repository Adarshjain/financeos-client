import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';
import { expectStatus } from '../api';

export type CategoryResponse = components['schemas']['CategoryResponse'];
export type CategoryRequest = components['schemas']['CategoryRequest'];
export type RuleResponse = components['schemas']['RuleResponse'];
export type CreateRuleRequest = components['schemas']['CreateRuleRequest'];
export type UpdateRuleRequest = components['schemas']['UpdateRuleRequest'];

let categoryCounter = 0;
let ruleCounter = 0;

export async function createCategory(
  api: ApiClient,
  name?: string
): Promise<CategoryResponse> {
  categoryCounter += 1;
  const catName = name ?? `Category ${categoryCounter}`;
  const res = await api.POST('/api/v1/categories', {
    body: { name: catName },
  });

  expectStatus(res, 201);
  if (!res.data) {
    throw new Error(`createCategory did not return data`);
  }
  return res.data;
}

export interface CreateRuleOptions {
  merchantKey: string;
  categoryIds: string[];
  matchType?: string;
  displayName?: string;
  mcc?: string;
}

export async function createRule(
  api: ApiClient,
  options: CreateRuleOptions
): Promise<RuleResponse> {
  ruleCounter += 1;
  const body: CreateRuleRequest = {
    merchantKey: options.merchantKey,
    categoryIds: options.categoryIds,
    matchType: options.matchType ?? 'MERCHANT_KEY',
    displayName: options.displayName ?? `Rule ${ruleCounter}`,
    mcc: options.mcc,
  };

  const res = await api.POST('/api/v1/rules', {
    body,
  });

  expectStatus(res, 201);
  if (!res.data) {
    throw new Error(`createRule did not return data`);
  }
  return res.data;
}
