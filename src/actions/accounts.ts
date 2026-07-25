'use server';

import { revalidatePath } from 'next/cache';

import { Account, AccountRequest } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type { CardCycleSummary } from '@/lib/statement.types';
import { ApiResult } from '@/lib/types';

export async function createAccount(
  accountRequest: AccountRequest,
): Promise<ApiResult<Account>> {
  return apiResult('Failed to create account', async () => {
    const account = await accountsApi.create(accountRequest);
    revalidatePath('/accounts');
    return account;
  });
}

export async function updateAccount(
  accountId: string,
  accountRequest: AccountRequest,
): Promise<ApiResult<Account>> {
  return apiResult('Failed to update account', async () => {
    const account = await accountsApi.update(accountId, accountRequest);
    // Dropped a second revalidatePath(`/accounts/${accountId}`): there is no
    // such route (accounts has no [id] segment), so the call was a no-op.
    revalidatePath('/accounts');
    return account;
  });
}

export async function deleteAccount(
  accountId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete account', async () => {
    await accountsApi.delete(accountId);
    revalidatePath('/accounts');
  });
}

export async function listAccounts(): Promise<ApiResult<Account[]>> {
  return apiResult('Failed to list accounts', () => accountsApi.list());
}

export async function getCardCycleSummary(
  accountId: string,
): Promise<ApiResult<CardCycleSummary>> {
  return apiResult('Failed to fetch card cycle summary', () =>
    accountsApi.getCardCycleSummary(accountId),
  );
}
