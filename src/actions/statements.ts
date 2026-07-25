'use server';

import { statementsApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type { StatementDetail,StatementSummary } from '@/lib/statement.types';
import type { ApiResult } from '@/lib/types';

export async function listStatementsByAccount(accountId: string): Promise<ApiResult<StatementSummary[]>> {
  return apiResult('Failed to fetch statements', () =>
    statementsApi.listByAccount(accountId),
  );
}

export async function getStatementDetail(statementId: string): Promise<ApiResult<StatementDetail>> {
  return apiResult('Failed to fetch statement details', () =>
    statementsApi.getById(statementId),
  );
}
