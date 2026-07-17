'use server';

import { statementsApi, ApiError } from '@/lib/apiClient';
import type { StatementSummary, StatementDetail } from '@/lib/statement.types';
import type { ApiResult } from '@/lib/types';

export async function listStatementsByAccount(accountId: string): Promise<ApiResult<StatementSummary[]>> {
  try {
    const list = await statementsApi.listByAccount(accountId);
    return { success: true, data: list };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to fetch statements',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function getStatementDetail(statementId: string): Promise<ApiResult<StatementDetail>> {
  try {
    const detail = await statementsApi.getById(statementId);
    return { success: true, data: detail };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to fetch statement details',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
