import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';

export type CreateLoanRequest = components['schemas']['CreateLoanRequest'];
export type UpdateLoanRequest = components['schemas']['UpdateLoanRequest'];
export type LoanResponse = components['schemas']['LoanResponse'];
export type LoanDetailResponse = components['schemas']['LoanDetailResponse'];
export interface LoanScheduleResponse {
  installments: components['schemas']['InstallmentDto'][];
}
export type InstallmentDto = components['schemas']['InstallmentDto'];
export type CreateLoanPaymentRequest = components['schemas']['CreateLoanPaymentRequest'];
export type LoanPaymentResponse = components['schemas']['LoanPaymentResponse'];
export type BatchLoanPaymentRequest = components['schemas']['BatchLoanPaymentRequest'];
export interface BatchLoanPaymentResponse {
  created: number;
}
export type CreateLoanEventRequest = components['schemas']['CreateLoanEventRequest'];
export type LoanEventResponse = components['schemas']['LoanEventResponse'];
export type CreateLoanChargeRequest = components['schemas']['CreateLoanChargeRequest'];
export type LoanChargeResponse = components['schemas']['LoanChargeResponse'];
export type MatchSuggestionsResponse = components['schemas']['MatchSuggestionsResponse'];
export type LoansSummaryResponse = components['schemas']['LoansSummaryResponse'];
export type CreateCounterpartyRequest = components['schemas']['CreateCounterpartyRequest'];
export type UpdateCounterpartyRequest = components['schemas']['UpdateCounterpartyRequest'];
export type CounterpartyResponse = components['schemas']['CounterpartyResponse'];
export type CreateLendingRequest = components['schemas']['CreateLendingRequest'];
export type UpdateLendingRequest = components['schemas']['UpdateLendingRequest'];
export type LendingResponse = components['schemas']['LendingResponse'];
export type ObligationsResponse = components['schemas']['ObligationsResponse'];

let seedCounter = 0;

/**
 * Returns ISO date YYYY-MM-01 for N months ago from current system date.
 */
export function monthsAgo(n: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Returns ISO date YYYY-MM-01 for N months ahead from current system date.
 */
export function monthsAhead(n: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Adds or subtracts days from a date string (YYYY-MM-DD).
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function createLoan(
  api: ApiClient,
  overrides: Partial<CreateLoanRequest> = {}
): Promise<LoanResponse> {
  seedCounter += 1;
  const defaultDate = monthsAgo(3);
  const body: CreateLoanRequest = {
    name: overrides.name ?? `Test Loan ${seedCounter}`,
    loanType: overrides.loanType ?? 'personal',
    lender: overrides.lender ?? 'HDFC Bank',
    principal: overrides.principal ?? 120000,
    annualRatePct: overrides.annualRatePct ?? 12,
    rateType: overrides.rateType ?? 'fixed',
    tenureMonths: overrides.tenureMonths ?? 12,
    startDate: overrides.startDate ?? defaultDate,
    firstEmiDate: overrides.firstEmiDate ?? defaultDate,
    ...overrides,
  };

  const res = await api.POST('/api/v1/loans', { body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`createLoan failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function getLoan(api: ApiClient, id: string): Promise<LoanDetailResponse> {
  const res = await api.GET('/api/v1/loans/{id}', { params: { path: { id } } });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`getLoan failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function updateLoan(
  api: ApiClient,
  id: string,
  body: UpdateLoanRequest
): Promise<LoanResponse> {
  const res = await api.PUT('/api/v1/loans/{id}', { params: { path: { id } }, body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`updateLoan failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function deleteLoan(api: ApiClient, id: string): Promise<void> {
  const res = await api.DELETE('/api/v1/loans/{id}', { params: { path: { id } } });
  if (res.error || res.response.status !== 204) {
    throw new Error(`deleteLoan failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

export async function schedule(api: ApiClient, id: string): Promise<LoanScheduleResponse> {
  const res = await api.GET('/api/v1/loans/{id}/schedule', { params: { path: { id } } });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`schedule failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data as unknown as LoanScheduleResponse;
}

export async function pay(
  api: ApiClient,
  id: string,
  options: {
    paymentDate?: string;
    amount?: number;
    installmentSeq?: number;
    transactionId?: string;
  } = {}
): Promise<LoanPaymentResponse> {
  const body: CreateLoanPaymentRequest = {
    paymentDate: options.paymentDate ?? monthsAgo(3),
    amount: options.amount ?? 10661.85,
    installmentSeq: options.installmentSeq,
    transactionId: options.transactionId,
  };
  const res = await api.POST('/api/v1/loans/{id}/payments', { params: { path: { id } }, body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`pay failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function batchPay(
  api: ApiClient,
  id: string,
  items: CreateLoanPaymentRequest[]
): Promise<BatchLoanPaymentResponse> {
  const body: BatchLoanPaymentRequest = { items };
  const res = await api.POST('/api/v1/loans/{id}/payments/batch', { params: { path: { id } }, body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`batchPay failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data as unknown as BatchLoanPaymentResponse;
}

export async function deletePayment(api: ApiClient, loanId: string, paymentId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/loans/{id}/payments/{paymentId}', {
    params: { path: { id: loanId, paymentId } },
  });
  if (res.error || res.response.status !== 204) {
    throw new Error(`deletePayment failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

export async function addEvent(
  api: ApiClient,
  id: string,
  event: CreateLoanEventRequest
): Promise<LoanEventResponse> {
  const res = await api.POST('/api/v1/loans/{id}/events', { params: { path: { id } }, body: event });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`addEvent failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function deleteEvent(api: ApiClient, loanId: string, eventId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/loans/{id}/events/{eventId}', {
    params: { path: { id: loanId, eventId } },
  });
  if (res.error || res.response.status !== 204) {
    throw new Error(`deleteEvent failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

export async function addCharge(
  api: ApiClient,
  id: string,
  charge: CreateLoanChargeRequest
): Promise<LoanChargeResponse> {
  const res = await api.POST('/api/v1/loans/{id}/charges', { params: { path: { id } }, body: charge });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`addCharge failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function deleteCharge(api: ApiClient, loanId: string, chargeId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/loans/{id}/charges/{chargeId}', {
    params: { path: { id: loanId, chargeId } },
  });
  if (res.error || res.response.status !== 204) {
    throw new Error(`deleteCharge failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

export async function closeLoan(api: ApiClient, id: string): Promise<void> {
  const res = await api.POST('/api/v1/loans/{id}/close', { params: { path: { id } } });
  if (res.error || res.response.status !== 200) {
    throw new Error(`closeLoan failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

export async function reopenLoan(api: ApiClient, id: string): Promise<void> {
  const res = await api.POST('/api/v1/loans/{id}/reopen', { params: { path: { id } } });
  if (res.error || res.response.status !== 200) {
    throw new Error(`reopenLoan failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

export async function matchSuggestions(api: ApiClient, id: string): Promise<MatchSuggestionsResponse> {
  const res = await api.GET('/api/v1/loans/{id}/match-suggestions', { params: { path: { id } } });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`matchSuggestions failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function loansSummary(api: ApiClient): Promise<LoansSummaryResponse> {
  const res = await api.GET('/api/v1/loans/summary');
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`loansSummary failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function obligations(api: ApiClient, months: number = 3): Promise<ObligationsResponse> {
  const res = await api.GET('/api/v1/obligations/upcoming', { params: { query: { months } } });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`obligations failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function createCounterparty(
  api: ApiClient,
  overrides: Partial<CreateCounterpartyRequest> = {}
): Promise<CounterpartyResponse> {
  seedCounter += 1;
  const body: CreateCounterpartyRequest = {
    name: overrides.name ?? `Counterparty ${seedCounter}`,
    notes: overrides.notes ?? 'Initial notes',
    ...overrides,
  };
  const res = await api.POST('/api/v1/counterparties', { body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`createCounterparty failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function getCounterparty(api: ApiClient, id: string): Promise<CounterpartyResponse | undefined> {
  const res = await api.GET('/api/v1/counterparties', { params: { query: { size: 100 } } });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`getCounterparty failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data.content.find((cp) => cp.id === id);
}

export async function updateCounterparty(
  api: ApiClient,
  id: string,
  body: UpdateCounterpartyRequest
): Promise<CounterpartyResponse> {
  const res = await api.PUT('/api/v1/counterparties/{id}', { params: { path: { id } }, body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`updateCounterparty failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function deleteCounterparty(api: ApiClient, id: string): Promise<void> {
  const res = await api.DELETE('/api/v1/counterparties/{id}', { params: { path: { id } } });
  if (res.error || res.response.status !== 204) {
    throw new Error(`deleteCounterparty failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}

export async function addLending(
  api: ApiClient,
  options: {
    counterpartyId?: string;
    newCounterpartyName?: string;
    direction?: 'lent' | 'borrowed';
    amount?: number;
    entryDate?: string;
    expectedReturnDate?: string;
    notes?: string;
    transactionId?: string;
  }
): Promise<LendingResponse> {
  const body: CreateLendingRequest = {
    direction: options.direction ?? 'lent',
    amount: options.amount ?? 10000,
    entryDate: options.entryDate ?? monthsAgo(1),
    expectedReturnDate: options.expectedReturnDate,
    counterpartyId: options.counterpartyId,
    newCounterpartyName: options.newCounterpartyName,
    notes: options.notes,
    transactionId: options.transactionId,
  };
  const res = await api.POST('/api/v1/lendings', { body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`addLending failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function updateLending(
  api: ApiClient,
  id: string,
  body: UpdateLendingRequest
): Promise<LendingResponse> {
  const res = await api.PUT('/api/v1/lendings/{id}', { params: { path: { id } }, body });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(`updateLending failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export async function deleteLending(api: ApiClient, id: string): Promise<void> {
  const res = await api.DELETE('/api/v1/lendings/{id}', { params: { path: { id } } });
  if (res.error || res.response.status !== 204) {
    throw new Error(`deleteLending failed (${res.response.status}): ${JSON.stringify(res.error)}`);
  }
}
