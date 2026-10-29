'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { CreateLendingRequest, LendingResponse } from '@/lib/lending.types';
import type { CreateLoanPaymentRequest, InstallmentDto, LoanPaymentResponse, LoanResponse } from '@/lib/loan.types';

import type { DividendRow, UNRESOLVED_RECEIPTS } from './dividendLinkModel';

// EPF withdrawal

/** The unlinked withdrawals offered for one credit. */
export const loadEpfWithdrawals = createDomainAction(
  { fallbackError: "Couldn't load the withdrawals. Try again." },
  async (transactionId: string): Promise<Schemas['EpfWithdrawalOption'][]> => {
    const { data } = await serverApi.GET('/api/v1/epf/withdrawals', { params: { query: { forTransactionId: transactionId } } });
    return (data ?? []) as Schemas['EpfWithdrawalOption'][];
  },
);

export const loadEpfEmployers = createDomainAction(
  { fallbackError: "Couldn't load the employers. Try again." },
  async () => {
    const { data } = await serverApi.GET('/api/v1/epf/employers');
    return data ?? [];
  },
);

/** Links the credit to an existing withdrawal. */
export const linkEpfWithdrawal = createDomainAction(
  { fallbackError: "Couldn't link the EPF withdrawal. Try again." },
  async (entryId: string, transactionId: string, recordTds: boolean): Promise<void> => {
    await serverApi.PUT('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: entryId } },
      body: { transactionId, recordTds },
    });
  },
);

export const createEpfWithdrawal = createDomainAction(
  { fallbackError: "Couldn't record the EPF withdrawal. Try again." },
  async (body: Schemas['EpfEntryRequest']): Promise<{ id: string }> => {
    const { data } = await serverApi.POST('/api/v1/epf/entries', { body });
    return { id: data!.id };
  },
);

// Dividend

/** Every dividend whose receipt is not yet matched, one page per receipt state. */
export const loadDividendPages = createDomainAction(
  { fallbackError: "Couldn't load the dividends. Try again." },
  async (receipts: (typeof UNRESOLVED_RECEIPTS)[number][]): Promise<DividendRow[][]> => {
    const pages = await Promise.all(
      receipts.map((receipt) =>
        serverApi.GET('/api/v1/investments/dividends', {
          params: { query: { receipt, page: 0, size: 50 } },
        }),
      ),
    );
    return pages.map((p) => (p.data?.content ?? []) as DividendRow[]);
  },
);

export const linkDividend = createDomainAction(
  { fallbackError: "Couldn't link the dividend. Try again." },
  async (dividendId: string, transactionId: string, updateTds: boolean): Promise<void> => {
    await serverApi.PUT('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: dividendId } },
      body: { transactionId, updateTds },
    });
  },
);

export const createDividend = createDomainAction(
  { fallbackError: "Couldn't record the dividend. Try again." },
  async (body: Schemas['CreateDividendRequest']): Promise<{ id: string }> => {
    const { data } = await serverApi.POST('/api/v1/investments/dividends', { body });
    return { id: data!.id };
  },
);

// Lending

/** One person's lending entries (the first 50). */
export const loadPersonLendings = createDomainAction(
  { fallbackError: "Couldn't load the entries. Try again." },
  async (counterpartyId: string): Promise<LendingResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/lendings', {
      params: { query: { counterpartyId, page: 0, size: 50 } },
    });
    return (data?.content ?? []) as LendingResponse[];
  },
);

export const createLending = createDomainAction(
  { fallbackError: "Couldn't record the lending. Try again." },
  async (body: CreateLendingRequest) => {
    const { data } = await serverApi.POST('/api/v1/lendings', { body });
    return data!;
  },
);

export const attachLendingTransaction = createDomainAction(
  { fallbackError: "Couldn't attach the transaction. Try again." },
  async (lendingId: string, transactionId: string): Promise<void> => {
    await serverApi.PUT('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: lendingId } },
      body: { transactionId },
    });
  },
);

// Loan payment

export const loadActiveLoans = createDomainAction(
  { fallbackError: "Couldn't load the loans. Try again." },
  async (): Promise<LoanResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/loans', {
      params: { query: { status: 'active', page: 0, size: 100 } },
    });
    return (data?.content ?? []) as LoanResponse[];
  },
);

export const loadLoanInstallments = createDomainAction(
  { fallbackError: "Couldn't load the schedule. Try again." },
  async (loanId: string): Promise<InstallmentDto[]> => {
    const { data } = await serverApi.GET('/api/v1/loans/{id}/schedule', { params: { path: { id: loanId } } });
    // The endpoint returns a map keyed by an internal grouping; in practice a flat list.
    // Object.values(...).flat() is correct either way.
    return Object.values((data ?? {}) as Record<string, InstallmentDto[]>).flat();
  },
);

export const payLoanInstallment = createDomainAction(
  { fallbackError: "Couldn't settle the installment. Try again." },
  async (loanId: string, body: CreateLoanPaymentRequest): Promise<LoanPaymentResponse> => {
    const { data } = await serverApi.POST('/api/v1/loans/{id}/payments', { params: { path: { id: loanId } }, body });
    return data! as LoanPaymentResponse;
  },
);
