'use server';

import { revalidatePath } from 'next/cache';

import { rulesApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type {
  ApplyRuleRequest,
  ApplyRuleResult,
  CategoryRule,
  CreateRuleRequest,
  PagedRuleMatches,
  PreviewMatchesRequest,
  UpdateRuleRequest,
} from '@/lib/rules.types';
import type { ApiResult } from '@/lib/types';

/**
 * Rules drive auto-categorisation, so any change also invalidates the
 * transaction views that display the resulting categories.
 */
function revalidateRuleViews(): void {
  revalidatePath('/rules');
  revalidatePath('/transactions');
  revalidatePath('/transactions/review');
}

export async function createRule(
  body: CreateRuleRequest,
): Promise<ApiResult<CategoryRule>> {
  return apiResult('Failed to create rule', async () => {
    const rule = await rulesApi.create(body);
    revalidateRuleViews();
    return rule;
  });
}

export async function updateRule(
  id: string,
  body: UpdateRuleRequest,
): Promise<ApiResult<CategoryRule>> {
  return apiResult('Failed to update rule', async () => {
    const rule = await rulesApi.update(id, body);
    revalidateRuleViews();
    return rule;
  });
}

export async function verifyRule(
  id: string,
): Promise<ApiResult<CategoryRule>> {
  return apiResult('Failed to verify rule', async () => {
    const rule = await rulesApi.verify(id);
    revalidateRuleViews();
    return rule;
  });
}

export async function deleteRule(
  id: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete rule', async () => {
    await rulesApi.remove(id);
    revalidateRuleViews();
  });
}

/** Read-only preview of what a (possibly unsaved) rule definition would match. */
export async function previewRuleMatches(
  body: PreviewMatchesRequest,
  params: { page?: number; size?: number } = {},
): Promise<ApiResult<PagedRuleMatches>> {
  return apiResult('Failed to find matching transactions', async () =>
    rulesApi.previewMatches(body, params),
  );
}

export async function applyRule(
  id: string,
  body: ApplyRuleRequest,
): Promise<ApiResult<ApplyRuleResult>> {
  return apiResult('Failed to apply rule', async () => {
    const result = await rulesApi.apply(id, body);
    revalidateRuleViews();
    return result;
  });
}
