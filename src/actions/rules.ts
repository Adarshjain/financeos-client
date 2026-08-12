'use server';

import { rulesApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type {
  ApplyRuleRequest,
  CreateRuleRequest,
  PreviewMatchesRequest,
  UpdateRuleRequest,
} from '@/lib/rules.types';

const RULE_PATHS = ['/rules', '/transactions', '/transactions/review'];

export const createRule = createDomainAction(
  { fallbackError: 'Failed to create rule', revalidatePaths: RULE_PATHS },
  (body: CreateRuleRequest) => rulesApi.create(body)
);

export const updateRule = createDomainAction(
  { fallbackError: 'Failed to update rule', revalidatePaths: RULE_PATHS },
  (id: string, body: UpdateRuleRequest) => rulesApi.update(id, body)
);

export const verifyRule = createDomainAction(
  { fallbackError: 'Failed to verify rule', revalidatePaths: RULE_PATHS },
  (id: string) => rulesApi.verify(id)
);

export const deleteRule = createDomainAction(
  { fallbackError: 'Failed to delete rule', revalidatePaths: RULE_PATHS },
  (id: string) => rulesApi.remove(id)
);

export const previewRuleMatches = createDomainAction(
  { fallbackError: 'Failed to find matching transactions' },
  (body: PreviewMatchesRequest, params: { page?: number; size?: number } = {}) =>
    rulesApi.previewMatches(body, params)
);

export const applyRule = createDomainAction(
  { fallbackError: 'Failed to apply rule', revalidatePaths: RULE_PATHS },
  (id: string, body: ApplyRuleRequest) => rulesApi.apply(id, body)
);
