'use server';

import { redirect } from 'next/navigation';

import { authApi } from '@/lib/apiClient';
import { clearSessionCookie } from '@/lib/auth';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';
import type { ApiResult, DeleteAccountRequest } from '@/lib/types';

export const deleteAccount = action('profile.deleteAccount', async function deleteAccount(input: DeleteAccountRequest): Promise<ApiResult<void>> {
  const result = await createDomainAction(
    { fallbackError: "Couldn't delete the account. Try again." },
    (req: DeleteAccountRequest) => authApi.deleteAccount(req)
  )(input);
  if (!result.success) return result;
  await clearSessionCookie();
  redirect('/login?deleted=1');
});
