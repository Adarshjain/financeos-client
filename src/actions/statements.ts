'use server';

import { statementsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

export const listStatementsByAccount = createDomainAction(
  { fallbackError: 'Failed to fetch statements' },
  (accountId: string) => statementsApi.listByAccount(accountId)
);

export const getStatementDetail = createDomainAction(
  { fallbackError: 'Failed to fetch statement details' },
  (statementId: string) => statementsApi.getById(statementId)
);
