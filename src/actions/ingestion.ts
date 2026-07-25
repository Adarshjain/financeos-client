'use server';

import { ingestionApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type { ApiResult, FileIngestionResult } from '@/lib/types';

export async function ingestStatementFiles(
  accountId: string,
  formData: FormData,
): Promise<ApiResult<FileIngestionResult>> {
  return apiResult('Failed to ingest files', () =>
    ingestionApi.ingest(accountId, formData),
  );
}
