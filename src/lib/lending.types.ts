import type { Page } from './pagination';

export type LendingDirection = 'lent' | 'borrowed';

export type LendingStatus =
  | 'outstanding'
  | 'partially_repaid'
  | 'settled'
  | 'written_off';

export interface CreateCounterpartyRequest {
  name: string;
  notes?: string;
}

export interface UpdateCounterpartyRequest {
  name?: string;
  notes?: string;
}

export interface CounterpartyResponse {
  id: string;
  name: string;
  notes?: string;
  lentOutstanding: number;
  borrowedOutstanding: number;
  netPosition: number;
  openLendingCount: number;
}

export interface CreateLendingRequest {
  counterpartyId?: string;
  newCounterpartyName?: string;
  direction: LendingDirection;
  amount: number;
  lendDate: string;
  expectedReturnDate?: string;
  transactionId?: string;
  notes?: string;
}

export interface UpdateLendingRequest {
  direction?: LendingDirection;
  amount?: number;
  lendDate?: string;
  expectedReturnDate?: string;
  notes?: string;
}

export interface LendingRepaymentResponse {
  id: string;
  lendingId: string;
  amount: number;
  date: string;
  transactionId?: string;
  createdAt: string;
}

export interface LendingResponse {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  direction: LendingDirection;
  amount: number;
  lendDate: string;
  expectedReturnDate?: string;
  status: LendingStatus;
  transactionId?: string;
  notes?: string;
  repaidTotal: number;
  outstanding: number;
  repayments: LendingRepaymentResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLendingRepaymentRequest {
  amount: number;
  date: string;
  transactionId?: string;
}

export interface ObligationItemDto {
  type: 'emi' | 'lending_due';
  date: string;
  amount: number;
  status: 'upcoming' | 'overdue';
  loanId?: string;
  loanName?: string;
  installmentSeq?: number;
  lendingId?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  direction?: LendingDirection;
}

export interface ObligationsResponse {
  items: ObligationItemDto[];
}
