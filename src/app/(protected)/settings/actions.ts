'use server';

import { redirect } from 'next/navigation';

import { authApi } from '@/lib/apiClient';
import { clearSessionCookie } from '@/lib/auth';
import { createDomainAction } from '@/lib/domainApi';
import type { ApiResult, DeleteAccountRequest, DeletionSummaryResponse } from '@/lib/types';

export const getDeletionSummary = createDomainAction(
  { fallbackError: 'Failed to fetch deletion summary' },
  () => authApi.getDeletionSummary()
);

export async function deleteAccount(input: DeleteAccountRequest): Promise<ApiResult<void>> {
  const result = await createDomainAction(
    { fallbackError: 'Failed to delete account' },
    (req: DeleteAccountRequest) => authApi.deleteAccount(req)
  )(input);
  if (!result.success) return result;
  await clearSessionCookie();
  redirect('/login?deleted=1');
}
