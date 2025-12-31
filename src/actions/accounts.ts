'use server';

import { revalidatePath } from 'next/cache';
import { accountsApi, ApiError } from '@/lib/api-client';
import type {
  ApiResult,
  AccountResponse,
  CreateAccountRequest,
  AccountType,
  FinancialPosition,
} from '@/lib/types';

export async function createAccount(
  _prevState: ApiResult<AccountResponse> | null,
  formData: FormData
): Promise<ApiResult<AccountResponse>> {
  const name = formData.get('name') as string;
  const type = formData.get('type') as AccountType;
  const excludeFromNetAsset = formData.get('excludeFromNetAsset') === 'true';
  const financialPosition = formData.get('financialPosition') as FinancialPosition | undefined;
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

  const data: CreateAccountRequest = {
    name,
    type,
    excludeFromNetAsset,
    financialPosition: financialPosition || undefined,
    description: description || undefined,
  };

  try {
    const account = await accountsApi.create(data);
    revalidatePath('/accounts');
    return { success: true, data: account };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to create account',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function addBankDetails(
  accountId: string,
  _prevState: ApiResult<AccountResponse> | null,
  formData: FormData
): Promise<ApiResult<AccountResponse>> {
  const openingBalance = formData.get('openingBalance') as string | undefined;
  const last4 = formData.get('last4') as string | undefined;

  try {
    const account = await accountsApi.addBankDetails(accountId, {
      openingBalance: openingBalance || undefined,
      last4: last4 || undefined,
    });
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data: account };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to add bank details',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function addCreditCardDetails(
  accountId: string,
  _prevState: ApiResult<AccountResponse> | null,
  formData: FormData
): Promise<ApiResult<AccountResponse>> {
  const last4 = formData.get('last4') as string;
  const creditLimit = formData.get('creditLimit') as string;
  const paymentDueDay = parseInt(formData.get('paymentDueDay') as string, 10);
  const gracePeriodDays = parseInt(formData.get('gracePeriodDays') as string, 10);
  const statementPassword = formData.get('statementPassword') as string | undefined;

  if (!last4 || !creditLimit || isNaN(paymentDueDay) || isNaN(gracePeriodDays)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'All credit card fields are required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const account = await accountsApi.addCreditCardDetails(accountId, {
      last4,
      creditLimit,
      paymentDueDay,
      gracePeriodDays,
      statementPassword: statementPassword || undefined,
    });
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data: account };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to add credit card details',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function addStockDetails(
  accountId: string,
  _prevState: ApiResult<AccountResponse> | null,
  formData: FormData
): Promise<ApiResult<AccountResponse>> {
  const instrumentCode = formData.get('instrumentCode') as string;
  const lastTradedPrice = formData.get('lastTradedPrice') as string | undefined;

  if (!instrumentCode) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Instrument code is required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const account = await accountsApi.addStockDetails(accountId, {
      instrumentCode,
      lastTradedPrice: lastTradedPrice || undefined,
    });
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data: account };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to add stock details',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function addMutualFundDetails(
  accountId: string,
  _prevState: ApiResult<AccountResponse> | null,
  formData: FormData
): Promise<ApiResult<AccountResponse>> {
  const instrumentCode = formData.get('instrumentCode') as string;
  const lastTradedPrice = formData.get('lastTradedPrice') as string | undefined;

  if (!instrumentCode) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Instrument code is required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const account = await accountsApi.addMutualFundDetails(accountId, {
      instrumentCode,
      lastTradedPrice: lastTradedPrice || undefined,
    });
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data: account };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to add mutual fund details',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
