'use server';

import { ingestionApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

export const ingestStatementFiles = createDomainAction(
  { fallbackError: 'Failed to ingest files' },
  (accountId: string, formData: FormData) => ingestionApi.ingest(accountId, formData)
);
