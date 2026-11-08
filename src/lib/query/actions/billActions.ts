'use server';

import { serverApi } from '@/lib/api/server';
import type {
  CardBillResponse,
  MarkBillPaidRequest,
  PaymentCandidateResponse,
  UpdateBillDetailsRequest,
} from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

/** Every open card's current bill, or one card's when `accountId` is given. */
export const loadBills = action('query.bill.loadBills', createDomainAction(
  { fallbackError: "Couldn't load bills. Try again." },
  async (accountId: string | null): Promise<CardBillResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/bills', { params: { query: accountId ? { accountId } : {} } });
    return data ?? [];
  },
));

/** One statement's bill, or null when the server has none. */
export const loadBill = action('query.bill.loadBill', createDomainAction(
  { fallbackError: "Couldn't load the bill. Try again." },
  async (statementId: string): Promise<CardBillResponse | null> => {
    const { data } = await serverApi.GET('/api/v1/bills/{statementId}', { params: { path: { statementId } } });
    return data ?? null;
  },
));

export const markBillPaid = action('query.bill.markBillPaid', createDomainAction(
  { fallbackError: "Couldn't mark the bill paid. Try again." },
  async (statementId: string, body: MarkBillPaidRequest): Promise<CardBillResponse> => {
    const { data } = await serverApi.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId } },
      body,
    });
    return data!;
  },
));

export const unmarkBillPaid = action('query.bill.unmarkBillPaid', createDomainAction(
  { fallbackError: "Couldn't undo the payment. Try again." },
  async (statementId: string): Promise<CardBillResponse> => {
    const { data } = await serverApi.DELETE('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId } },
    });
    return data!;
  },
));

export const updateBillDetails = action('query.bill.updateBillDetails', createDomainAction(
  { fallbackError: "Couldn't save the bill details. Try again." },
  async (statementId: string, body: UpdateBillDetailsRequest): Promise<CardBillResponse> => {
    const { data } = await serverApi.PATCH('/api/v1/bills/{statementId}/details', {
      params: { path: { statementId } },
      body,
    });
    return data!;
  },
));

/** Unlinked bank debits that could be this bill's payment: equal to `amount` (default: what is left) near the due date. */
export const loadPaymentCandidates = action('query.bill.loadPaymentCandidates', createDomainAction(
  { fallbackError: "Couldn't look for the payment. Try again." },
  async (statementId: string, amount: number | null): Promise<PaymentCandidateResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/bills/{statementId}/payment-candidates', {
      params: { path: { statementId }, query: amount != null ? { amount } : {} },
    });
    return data ?? [];
  },
));
