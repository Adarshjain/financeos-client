'use server';

import { ApiError,ingestionApi } from '@/lib/apiClient';
import type { ApiResult, FileIngestionResult } from '@/lib/types';

export async function ingestStatementFiles(
  accountId: string,
  formData: FormData,
): Promise<ApiResult<FileIngestionResult>> {
  try {
    const result = await ingestionApi.ingest(accountId, formData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to ingest files',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
