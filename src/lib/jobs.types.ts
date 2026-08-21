export type JobType =
  | 'STATEMENT_INGEST'
  | 'GMAIL_SYNC'
  | 'PRICE_REFRESH'
  | 'INVESTMENT_IMPORT_COMMIT'
  | 'BROKER_RECONCILE_COMMIT'
  | 'RULE_APPLY';

export type JobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type JobTrigger = 'USER' | 'CRON';

export interface EnqueueResponse {
  jobId: string;
}

export interface JobResponse<T = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  triggerSource: JobTrigger;
  progressCurrent?: number | null;
  progressTotal?: number | null;
  progressNote?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  result?: T | null;
  cancelRequested: boolean;
  attempt: number;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface PagedJobResponse {
  content: JobResponse[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
}
