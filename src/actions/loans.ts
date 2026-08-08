'use server';

import { revalidatePath } from 'next/cache';

import { loansApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type { Page } from '@/lib/pagination';
import type {
  ApiResult,
  BatchLoanPaymentRequest,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
  CreateLoanRequest,
  InstallmentDto,
  LoanChargeResponse,
  LoanDetailResponse,
  LoanEventResponse,
  LoanPaymentResponse,
  LoanResponse,
  LoansSummaryResponse,
  LoanStatus,
  MatchSuggestionsResponse,
  UpdateLoanRequest,
} from '@/lib/types';

export async function fetchLoansAction(
  status?: LoanStatus,
  page = 0,
  size = 50,
): Promise<ApiResult<Page<LoanResponse>>> {
  return apiResult('Failed to fetch loans', () => loansApi.list(status, page, size));
}

export async function fetchLoansSummaryAction(): Promise<ApiResult<LoansSummaryResponse>> {
  return apiResult('Failed to fetch loans summary', () => loansApi.getSummary());
}

export async function fetchLoanDetailAction(id: string): Promise<ApiResult<LoanDetailResponse>> {
  return apiResult('Failed to fetch loan detail', () => loansApi.getDetail(id));
}

export async function fetchLoanScheduleAction(
  id: string,
): Promise<ApiResult<{ installments: InstallmentDto[] }>> {
  return apiResult('Failed to fetch loan schedule', () => loansApi.getSchedule(id));
}

export async function fetchMatchSuggestionsAction(
  id: string,
): Promise<ApiResult<MatchSuggestionsResponse>> {
  return apiResult('Failed to fetch match suggestions', () => loansApi.getMatchSuggestions(id));
}

export async function createLoanAction(
  data: CreateLoanRequest,
): Promise<ApiResult<LoanResponse>> {
  return apiResult('Failed to create loan', async () => {
    const res = await loansApi.create(data);
    revalidatePath('/loans');
    return res;
  });
}

export async function updateLoanAction(
  id: string,
  data: UpdateLoanRequest,
): Promise<ApiResult<LoanResponse>> {
  return apiResult('Failed to update loan', async () => {
    const res = await loansApi.update(id, data);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
    return res;
  });
}

export async function deleteLoanAction(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to delete loan', async () => {
    await loansApi.remove(id);
    revalidatePath('/loans');
  });
}

export async function closeLoanAction(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to close loan', async () => {
    await loansApi.close(id);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
  });
}

export async function reopenLoanAction(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to reopen loan', async () => {
    await loansApi.reopen(id);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
  });
}

export async function addLoanEventAction(
  id: string,
  data: CreateLoanEventRequest,
): Promise<ApiResult<LoanEventResponse>> {
  return apiResult('Failed to add loan event', async () => {
    const res = await loansApi.addEvent(id, data);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
    return res;
  });
}

export async function deleteLoanEventAction(
  id: string,
  eventId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete loan event', async () => {
    await loansApi.deleteEvent(id, eventId);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
  });
}

export async function addLoanPaymentAction(
  id: string,
  data: CreateLoanPaymentRequest,
): Promise<ApiResult<LoanPaymentResponse>> {
  return apiResult('Failed to record loan payment', async () => {
    const res = await loansApi.addPayment(id, data);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
    return res;
  });
}

export async function addLoanPaymentsBatchAction(
  id: string,
  data: BatchLoanPaymentRequest,
): Promise<ApiResult<{ created: number }>> {
  return apiResult('Failed to record batch loan payments', async () => {
    const res = await loansApi.addPaymentsBatch(id, data);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
    return res;
  });
}

export async function deleteLoanPaymentAction(
  id: string,
  paymentId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete loan payment', async () => {
    await loansApi.deletePayment(id, paymentId);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
  });
}

export async function addLoanChargeAction(
  id: string,
  data: CreateLoanChargeRequest,
): Promise<ApiResult<LoanChargeResponse>> {
  return apiResult('Failed to add loan charge', async () => {
    const res = await loansApi.addCharge(id, data);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
    return res;
  });
}

export async function deleteLoanChargeAction(
  id: string,
  chargeId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete loan charge', async () => {
    await loansApi.deleteCharge(id, chargeId);
    revalidatePath('/loans');
    revalidatePath(`/loans/${id}`);
  });
}
