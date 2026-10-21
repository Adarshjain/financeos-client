'use server';

import { redirect } from 'next/navigation';

import { appHref } from '@/features/shell/routes';
import { authApi } from '@/lib/apiClient';
import { clearSessionCookie } from '@/lib/auth';
import { createDomainAction } from '@/lib/domainApi';
import type { ApiResult, DeleteAccountRequest } from '@/lib/types';

/** `toDinero` sends the user to the Dinero login; Legacy callers keep the Legacy one. A flag, not a URL, so callers can't pick any redirect. */
export async function deleteAccount(input: DeleteAccountRequest, toDinero = false): Promise<ApiResult<void>> {
  const result = await createDomainAction(
    { fallbackError: 'Failed to delete account' },
    (req: DeleteAccountRequest) => authApi.deleteAccount(req)
  )(input);
  if (!result.success) return result;
  await clearSessionCookie();
  redirect(toDinero ? appHref('/login?deleted=1') : '/login?deleted=1');
}
