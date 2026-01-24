'use server';

import { revalidatePath } from 'next/cache';

import { Account, AccountRequest, BankAccountRequest, CreditCardRequest } from '@/lib/account.types';
import { accountsApi, ApiError } from '@/lib/apiClient';
import type { AccountType, ApiResult, ErrorResponse, FinancialPosition } from '@/lib/types';

function buildAccountRequest(
  formData: FormData,
): { success: true; data: AccountRequest } | { success: false; error: ErrorResponse } {
  const name = formData.get('name') as string;
  const type = formData.get('type') as AccountType;
  const excludeFromNetAsset = formData.get('excludeFromNetAsset') === 'true';
  const financialPosition = formData.get('financialPosition') as
    | FinancialPosition
    | undefined;
  const description = formData.get('description') as string | undefined;
  if (!name || !type) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name and type are required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  let data: AccountRequest = {
    name,
    type,
    excludeFromNetAsset,
    financialPosition: financialPosition || undefined,
    description: description || undefined,
  };

  if (type === 'bank_account') {
    data = {
      ...data,
      last4: formData.get('last4') as string ?? undefined,
      openingBalance: formData.get('openingBalance') as string ?? undefined,
    } satisfies BankAccountRequest;
  }

  if (type === 'credit_card') {
    data = {
      ...data,
      last4: formData.get('last4') as string ?? undefined,
      creditLimit: parseInt(formData.get('creditLimit') as string, 10) ?? undefined,
      paymentDueDay: parseInt(formData.get('paymentDueDay') as string, 10) ?? undefined,
      gracePeriodDays: parseInt(formData.get('gracePeriodDays') as string, 10) ?? undefined,
      statementPassword: formData.get('statementPassword') as string ?? undefined,
    } satisfies CreditCardRequest;
  }

  return { success: true, data };
}

function handleAccountError(error: unknown, defaultMessage: string): ApiResult<Account> {
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
  _prevState: ApiResult<Account> | null,
  formData: FormData,
): Promise<ApiResult<Account>> {
  const requestResult = buildAccountRequest(formData);
  if (!requestResult.success) {
    return requestResult;
  }

  try {
    const account = await accountsApi.create(requestResult.data);
    revalidatePath('/accounts');
    return { success: true, data: account };
  } catch (error) {
    return handleAccountError(error, 'Failed to create account');
  }
}

export async function updateAccount(
  accountId: string,
  _prevState: ApiResult<Account> | null,
  formData: FormData,
): Promise<ApiResult<Account>> {
  const requestResult = buildAccountRequest(formData);
  if (!requestResult.success) {
    return requestResult;
  }

  try {
    const account = await accountsApi.update(accountId, requestResult.data);
    revalidatePath('/accounts');
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data: account };
  } catch (error) {
    return handleAccountError(error, 'Failed to update account');
  }
}
