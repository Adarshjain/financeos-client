'use server';

import { loansApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type {
  BatchLoanPaymentRequest,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
  CreateLoanRequest,
  LoanStatus,
  UpdateLoanRequest,
} from '@/lib/types';

const LOANS_PATHS = ['/loans'];

export const fetchLoansAction = createDomainAction(
  { fallbackError: 'Failed to fetch loans' },
  (status?: LoanStatus, page = 0, size = 50) => loansApi.list(status, page, size)
);

export const fetchLoansSummaryAction = createDomainAction(
  { fallbackError: 'Failed to fetch loans summary' },
  () => loansApi.getSummary()
);

export const fetchLoanDetailAction = createDomainAction(
  { fallbackError: 'Failed to fetch loan detail' },
  (id: string) => loansApi.getDetail(id)
);

export const fetchLoanScheduleAction = createDomainAction(
  { fallbackError: 'Failed to fetch loan schedule' },
  (id: string) => loansApi.getSchedule(id)
);

export const fetchMatchSuggestionsAction = createDomainAction(
  { fallbackError: 'Failed to fetch match suggestions' },
  (id: string) => loansApi.getMatchSuggestions(id)
);

export const createLoanAction = createDomainAction(
  { fallbackError: 'Failed to create loan', revalidatePaths: LOANS_PATHS },
  (data: CreateLoanRequest) => loansApi.create(data)
);

export const updateLoanAction = createDomainAction(
  { fallbackError: 'Failed to update loan', revalidatePaths: LOANS_PATHS },
  (id: string, data: UpdateLoanRequest) => loansApi.update(id, data)
);

export const deleteLoanAction = createDomainAction(
  { fallbackError: 'Failed to delete loan', revalidatePaths: LOANS_PATHS },
  (id: string) => loansApi.remove(id)
);

export const closeLoanAction = createDomainAction(
  { fallbackError: 'Failed to close loan', revalidatePaths: LOANS_PATHS },
  (id: string) => loansApi.close(id)
);

export const reopenLoanAction = createDomainAction(
  { fallbackError: 'Failed to reopen loan', revalidatePaths: LOANS_PATHS },
  (id: string) => loansApi.reopen(id)
);

export const addLoanEventAction = createDomainAction(
  { fallbackError: 'Failed to add loan event', revalidatePaths: LOANS_PATHS },
  (id: string, data: CreateLoanEventRequest) => loansApi.addEvent(id, data)
);

export const deleteLoanEventAction = createDomainAction(
  { fallbackError: 'Failed to delete loan event', revalidatePaths: LOANS_PATHS },
  (id: string, eventId: string) => loansApi.deleteEvent(id, eventId)
);

export const addLoanPaymentAction = createDomainAction(
  { fallbackError: 'Failed to record loan payment', revalidatePaths: LOANS_PATHS },
  (id: string, data: CreateLoanPaymentRequest) => loansApi.addPayment(id, data)
);

export const addLoanPaymentsBatchAction = createDomainAction(
  { fallbackError: 'Failed to record batch loan payments', revalidatePaths: LOANS_PATHS },
  (id: string, data: BatchLoanPaymentRequest) => loansApi.addPaymentsBatch(id, data)
);

export const deleteLoanPaymentAction = createDomainAction(
  { fallbackError: 'Failed to delete loan payment', revalidatePaths: LOANS_PATHS },
  (id: string, paymentId: string) => loansApi.deletePayment(id, paymentId)
);

export const addLoanChargeAction = createDomainAction(
  { fallbackError: 'Failed to add loan charge', revalidatePaths: LOANS_PATHS },
  (id: string, data: CreateLoanChargeRequest) => loansApi.addCharge(id, data)
);

export const deleteLoanChargeAction = createDomainAction(
  { fallbackError: 'Failed to delete loan charge', revalidatePaths: LOANS_PATHS },
  (id: string, chargeId: string) => loansApi.deleteCharge(id, chargeId)
);
