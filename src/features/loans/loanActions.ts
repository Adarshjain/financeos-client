'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type {
  BatchLoanPaymentRequest,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
  CreateLoanRequest,
  LoanResponse,
  UpdateLoanRequest,
} from '@/lib/loan.types';
import { action } from '@/lib/observability/action';

/** POST /loans. */
export const createLoan = action('loans.loan.createLoan', createDomainAction(
  { fallbackError: "Couldn't create loan. Try again." },
  async (body: CreateLoanRequest) => {
    const { data } = await serverApi.POST('/api/v1/loans', { body });
    return data! as LoanResponse;
  },
));

/** PUT /loans/{id}. */
export const updateLoan = action('loans.loan.updateLoan', createDomainAction(
  { fallbackError: "Couldn't update loan. Try again." },
  async (id: string, body: UpdateLoanRequest) => {
    const { data } = await serverApi.PUT('/api/v1/loans/{id}', { params: { path: { id } }, body });
    return data! as LoanResponse;
  },
));

/** DELETE /loans/{id}. */
export const deleteLoan = action('loans.loan.deleteLoan', createDomainAction(
  { fallbackError: "Couldn't delete loan. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}', { params: { path: { id } } });
  },
));

/** GET /loans/{id}: the facts behind "Is this loan closed?" (the Upcoming rows only know the loan's id). */
export const loadLoanCloseEvidence = action('loans.loan.loadLoanCloseEvidence', createDomainAction(
  { fallbackError: "Couldn't load the loan's payments. Try again." },
  async (id: string) => {
    const { data } = await serverApi.GET('/api/v1/loans/{id}', { params: { path: { id } } });
    return data?.closeEvidence ?? null;
  },
));

/** POST /loans/{id}/close. */
export const closeLoan = action('loans.loan.closeLoan', createDomainAction(
  { fallbackError: "Couldn't close loan. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/loans/{id}/close', { params: { path: { id } } });
  },
));

/** POST /loans/{id}/closed-prompt/dismiss: "Not yet" on the "Is this loan closed?" question. */
export const dismissLoanClosedPrompt = action('loans.loan.dismissLoanClosedPrompt', createDomainAction(
  { fallbackError: "Couldn't save that. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/loans/{id}/closed-prompt/dismiss', { params: { path: { id } } });
  },
));

/** POST /loans/{id}/reopen. */
export const reopenLoan = action('loans.loan.reopenLoan', createDomainAction(
  { fallbackError: "Couldn't reopen loan. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/loans/{id}/reopen', { params: { path: { id } } });
  },
));

/** POST /loans/{id}/payments. */
export const addLoanPayment = action('loans.loan.addLoanPayment', createDomainAction(
  { fallbackError: "Couldn't record loan payment. Try again." },
  async (loanId: string, body: CreateLoanPaymentRequest) => {
    const { data } = await serverApi.POST('/api/v1/loans/{id}/payments', { params: { path: { id: loanId } }, body });
    return data!;
  },
));

/** POST /loans/{id}/payments/batch: records several installments in one call. */
export const addLoanPaymentsBatch = action('loans.loan.addLoanPaymentsBatch', createDomainAction(
  { fallbackError: "Couldn't record batch loan payments. Try again." },
  async (loanId: string, body: BatchLoanPaymentRequest): Promise<{ created: number }> => {
    await serverApi.POST('/api/v1/loans/{id}/payments/batch', {
      params: { path: { id: loanId } },
      // The generated request type requires `transactionId` on every item; the match-confirmation
      // flow always supplies one, but the hand-authored item type marks it optional like the
      // single-payment request.
      body: body as Schemas['BatchLoanPaymentRequest'],
    });
    return { created: body.items.length };
  },
));

/** DELETE /loans/{id}/payments/{paymentId}. */
export const deleteLoanPayment = action('loans.loan.deleteLoanPayment', createDomainAction(
  { fallbackError: "Couldn't delete loan payment. Try again." },
  async (loanId: string, paymentId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}/payments/{paymentId}', { params: { path: { id: loanId, paymentId } } });
  },
));

/** POST /loans/{id}/events. */
export const addLoanEvent = action('loans.loan.addLoanEvent', createDomainAction(
  { fallbackError: "Couldn't add loan event. Try again." },
  async (loanId: string, body: CreateLoanEventRequest) => {
    const { data } = await serverApi.POST('/api/v1/loans/{id}/events', { params: { path: { id: loanId } }, body });
    return data!;
  },
));

/** DELETE /loans/{id}/events/{eventId}. */
export const deleteLoanEvent = action('loans.loan.deleteLoanEvent', createDomainAction(
  { fallbackError: "Couldn't delete loan event. Try again." },
  async (loanId: string, eventId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}/events/{eventId}', { params: { path: { id: loanId, eventId } } });
  },
));

/** POST /loans/{id}/charges. */
export const addLoanCharge = action('loans.loan.addLoanCharge', createDomainAction(
  { fallbackError: "Couldn't add loan charge. Try again." },
  async (loanId: string, body: CreateLoanChargeRequest) => {
    const { data } = await serverApi.POST('/api/v1/loans/{id}/charges', { params: { path: { id: loanId } }, body });
    return data!;
  },
));

/** DELETE /loans/{id}/charges/{chargeId}. */
export const deleteLoanCharge = action('loans.loan.deleteLoanCharge', createDomainAction(
  { fallbackError: "Couldn't delete loan charge. Try again." },
  async (loanId: string, chargeId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}/charges/{chargeId}', { params: { path: { id: loanId, chargeId } } });
  },
));
