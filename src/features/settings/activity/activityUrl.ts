import { parsePage } from '@/features/shell/pagination';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

import { ACTIVITY_SIZE_OPTIONS } from './activityModel';

export interface ActivityUrl {
  /** 0-based page. */
  page: number;
  size: number;
  statusFilter: string;
  typeFilter: string;
  /** The job opened by a link (`?job=`), or null. */
  jobId: string | null;
}

/** What an /settings/activity address asks for: the page, size, status and type filters, and one job to open. */
export function parseActivityUrl(params: SearchParamsRecord): ActivityUrl {
  const { page, size } = parsePage(params, { sizes: ACTIVITY_SIZE_OPTIONS });
  return {
    page,
    size,
    statusFilter: first(params.status) || '',
    typeFilter: first(params.type) || '',
    jobId: first(params.job) || null,
  };
}
