'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, rulesApi } from '@/lib/apiClient';
import type { CategoryRule, CreateRuleRequest, UpdateRuleRequest } from '@/lib/rules.types';
import type { ApiResult, ErrorResponse } from '@/lib/types';

function handleRuleError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function createRule(
  body: CreateRuleRequest,
): Promise<ApiResult<CategoryRule>> {
  try {
    const rule = await rulesApi.create(body);
    revalidatePath('/rules');
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: rule };
  } catch (error) {
    return handleRuleError(error, 'Failed to create rule');
  }
}

export async function updateRule(
  id: string,
  body: UpdateRuleRequest,
): Promise<ApiResult<CategoryRule>> {
  try {
    const rule = await rulesApi.update(id, body);
    revalidatePath('/rules');
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: rule };
  } catch (error) {
    return handleRuleError(error, 'Failed to update rule');
  }
}

export async function verifyRule(
  id: string,
): Promise<ApiResult<CategoryRule>> {
  try {
    const rule = await rulesApi.verify(id);
    revalidatePath('/rules');
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: rule };
  } catch (error) {
    return handleRuleError(error, 'Failed to verify rule');
  }
}

export async function deleteRule(
  id: string,
): Promise<ApiResult<void>> {
  try {
    await rulesApi.remove(id);
    revalidatePath('/rules');
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: undefined };
  } catch (error) {
    return handleRuleError(error, 'Failed to delete rule');
  }
}
