import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient, WaitForJobOptions } from '../api';
import { expectStatus, waitForJob } from '../api';

export type StatementDetailResponse =
  components['schemas']['StatementDetailResponse'];
export type StatementSummaryResponse =
  components['schemas']['StatementSummaryResponse'];
export type StatementLineResponse =
  components['schemas']['StatementLineResponse'];
export type StatementCardDetailsResponse =
  components['schemas']['StatementCardDetailsResponse'];

export interface FileDetail {
  filename: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  linesParsed?: number;
  errorMessage?: string;
  warning?: string;
  created?: number;
  duplicates?: number;
}

export interface DuplicateDetail {
  fileDescription: string;
  matchedDescription: string;
  date: string;
  amount: number;
}

export interface FileIngestionResult {
  filesProcessed: number;
  totalCreated: number;
  totalDuplicatesFound: number;
  fileDetails: FileDetail[];
  duplicateDetails?: DuplicateDetail[];
  duplicatesTruncated?: boolean;
}

export interface UploadFile {
  filename: string;
  buffer: Buffer;
  contentType?: string;
}

export async function uploadStatements(
  api: ApiClient,
  accountId: string,
  files: UploadFile[]
) {
  const formData = new FormData();
  for (const f of files) {
    const mime =
      f.contentType ||
      (f.filename.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf');
    const blob = new Blob([new Uint8Array(f.buffer)], { type: mime });
    formData.append('files', blob, f.filename);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (api as any).POST('/api/v1/accounts/{accountId}/ingest', {
    params: { path: { accountId } },
    body: formData,
    bodySerializer: (b: unknown) => b,
  });
}

export async function uploadAndIngest(
  api: ApiClient,
  accountId: string,
  files: UploadFile[],
  options?: WaitForJobOptions
) {
  const uploadRes = await uploadStatements(api, accountId, files);
  expectStatus(uploadRes, 202);
  const jobId = (uploadRes.data as { jobId: string }).jobId;
  const job = await waitForJob(api, jobId, options);
  const result = job.result as unknown as FileIngestionResult;
  return { job, result };
}

export async function getStatement(
  api: ApiClient,
  statementId: string
): Promise<StatementDetailResponse> {
  const res = await api.GET('/api/v1/statements/{statementId}', {
    params: { path: { statementId } },
  });
  expectStatus(res, 200);
  return res.data!;
}

export async function getAccountStatements(
  api: ApiClient,
  accountId: string
): Promise<StatementSummaryResponse[]> {
  const res = await api.GET('/api/v1/accounts/{accountId}/statements', {
    params: { path: { accountId } },
  });
  expectStatus(res, 200);
  return res.data!;
}
