'use server';

import { revalidatePath } from 'next/cache';

import { Account, AccountRequest } from '@/lib/account.types';
import { accountsApi, ApiError } from '@/lib/apiClient';
import { CardCycleSummary } from '@/lib/statement.types';
import { ApiResult, ErrorResponse } from '@/lib/types';

function handleAccountError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function createAccount(
  accountRequest: AccountRequest,
): Promise<ApiResult<Account>> {
  try {
    const account = await accountsApi.create(accountRequest);
    revalidatePath('/accounts');
    return { success: true, data: account };
  } catch (error) {
    return handleAccountError(error, 'Failed to create account');
  }
}

export async function updateAccount(
  accountId: string,
  accountRequest: AccountRequest,
): Promise<ApiResult<Account>> {
  try {
    const account = await accountsApi.update(accountId, accountRequest);
    revalidatePath('/accounts');
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data: account };
  } catch (error) {
    return handleAccountError(error, 'Failed to update account');
  }
}

export async function deleteAccount(
  accountId: string,
): Promise<ApiResult<void>> {
  try {
    await accountsApi.delete(accountId);
    revalidatePath('/accounts');
    return { success: true, data: undefined };
  } catch (error) {
    return handleAccountError(error, 'Failed to delete account');
  }
}

export async function listAccounts(): Promise<ApiResult<Account[]>> {
  try {
    const list = await accountsApi.list();
    return { success: true, data: list };
  } catch (error) {
    return handleAccountError(error, 'Failed to list accounts');
  }
}

export async function getAccountCardSummary(accountId: string): Promise<ApiResult<CardCycleSummary>> {
  try {
    const summary = await accountsApi.getCardSummary(accountId);
    return { success: true, data: summary };
  } catch (error) {
    return handleAccountError(error, 'Failed to fetch card cycle summary');
  }
}
