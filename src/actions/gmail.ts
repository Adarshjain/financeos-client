'use server';

import { revalidatePath } from 'next/cache';

import { ApiError,gmailApi } from '@/lib/apiClient';
import type {
  ApiResult,
  GmailFetchRequest,
  GmailFetchResult,
  GmailOAuthStartResponse,
} from '@/lib/types';

export async function startGmailOAuth(): Promise<
  ApiResult<GmailOAuthStartResponse>
> {
  try {
    const result = await gmailApi.startOAuth();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to start Gmail OAuth',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function syncGmail(
  request?: GmailFetchRequest
): Promise<ApiResult<GmailFetchResult>> {
  try {
    const result = await gmailApi.sync(request);
    revalidatePath('/transactions');
    revalidatePath('/settings');
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to sync Gmail',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
