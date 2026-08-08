'use server';

import { revalidatePath } from 'next/cache';

import { counterpartiesApi, lendingsApi, obligationsApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type { Page } from '@/lib/pagination';
import type {
  ApiResult,
  CounterpartyResponse,
  CreateCounterpartyRequest,
  CreateLendingRequest,
  LendingResponse,
  ObligationsResponse,
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/types';

export async function fetchCounterpartiesAction(
  page = 0,
  size = 50,
): Promise<ApiResult<Page<CounterpartyResponse>>> {
  return apiResult('Failed to fetch counterparties', () => counterpartiesApi.list(page, size));
}

export async function createCounterpartyAction(
  data: CreateCounterpartyRequest,
): Promise<ApiResult<CounterpartyResponse>> {
  return apiResult('Failed to create counterparty', async () => {
    const res = await counterpartiesApi.create(data);
    revalidatePath('/loans/lendings');
    return res;
  });
}

export async function updateCounterpartyAction(
  id: string,
  data: UpdateCounterpartyRequest,
): Promise<ApiResult<CounterpartyResponse>> {
  return apiResult('Failed to update counterparty', async () => {
    const res = await counterpartiesApi.update(id, data);
    revalidatePath('/loans/lendings');
    revalidatePath(`/loans/lendings/${id}`);
    return res;
  });
}

export async function deleteCounterpartyAction(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to delete counterparty', async () => {
    await counterpartiesApi.remove(id);
    revalidatePath('/loans/lendings');
  });
}

export async function fetchLendingsAction(
  counterpartyId?: string,
  page = 0,
  size = 50,
): Promise<ApiResult<Page<LendingResponse>>> {
  return apiResult('Failed to fetch lendings', () =>
    lendingsApi.list(counterpartyId, page, size),
  );
}

export async function fetchLendingDetailAction(
  id: string,
): Promise<ApiResult<LendingResponse>> {
  return apiResult('Failed to fetch lending detail', () => lendingsApi.getDetail(id));
}

export async function createLendingAction(
  data: CreateLendingRequest,
): Promise<ApiResult<LendingResponse>> {
  return apiResult('Failed to create lending', async () => {
    const res = await lendingsApi.create(data);
    revalidatePath('/loans/lendings');
    if (data.counterpartyId) {
      revalidatePath(`/loans/lendings/${data.counterpartyId}`);
    }
    return res;
  });
}

export async function updateLendingAction(
  id: string,
  data: UpdateLendingRequest,
  counterpartyId?: string,
): Promise<ApiResult<LendingResponse>> {
  return apiResult('Failed to update lending', async () => {
    const res = await lendingsApi.update(id, data);
    revalidatePath('/loans/lendings');
    if (counterpartyId) {
      revalidatePath(`/loans/lendings/${counterpartyId}`);
    }
    return res;
  });
}

export async function deleteLendingAction(
  id: string,
  counterpartyId?: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete lending', async () => {
    await lendingsApi.remove(id);
    revalidatePath('/loans/lendings');
    if (counterpartyId) {
      revalidatePath(`/loans/lendings/${counterpartyId}`);
    }
  });
}

export async function fetchUpcomingObligationsAction(
  months = 3,
): Promise<ApiResult<ObligationsResponse>> {
  return apiResult('Failed to fetch upcoming obligations', () =>
    obligationsApi.getUpcoming(months),
  );
}
