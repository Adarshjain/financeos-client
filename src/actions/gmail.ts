'use server';

import { revalidatePath } from 'next/cache';
import { gmailApi, ApiError } from '@/lib/api-client';
import type { ApiResult } from '@/lib/types';

export async function startGmailOAuth(): Promise<ApiResult<{ url?: string }>> {
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

export async function syncGmail(): Promise<ApiResult<{ synced?: number }>> {
  try {
    const result = await gmailApi.sync();
    revalidatePath('/transactions');
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


