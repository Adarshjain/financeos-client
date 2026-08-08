import type { Page } from './pagination';
import type { Transaction } from './transaction.types';

export type LoanType =
  | 'home'
  | 'car'
  | 'personal'
  | 'education'
  | 'gold'
  | 'two_wheeler'
  | 'consumer_durable'
  | 'other';

export type RateType = 'fixed' | 'floating';

export type LoanStatus = 'active' | 'closed' | 'foreclosed';

export type LoanEventType = 'rate_change' | 'prepayment' | 'foreclosure';

export type AdjustmentMode = 'reduce_emi' | 'reduce_tenure';

export type LoanChargeType =
  | 'processing_fee'
  | 'insurance_premium'
  | 'foreclosure_charge'
  | 'bounce_charge'
  | 'late_fee'
  | 'legal_valuation'
  | 'other';

export interface CreateLoanRequest {
  name: string;
  loanType: LoanType;
  lender: string;
  loanAccountNumber?: string;
  paymentAccountId?: string;
  principal: number;
  annualRatePct: number;
  rateType: RateType;
  tenureMonths: number;
  startDate: string;
  firstEmiDate: string;
  emiAmount?: number;
  notes?: string;
}

export interface UpdateLoanRequest {
  name?: string;
  loanType?: LoanType;
  lender?: string;
  loanAccountNumber?: string;
  paymentAccountId?: string;
  principal?: number;
  annualRatePct?: number;
  rateType?: RateType;
  tenureMonths?: number;
  startDate?: string;
  firstEmiDate?: string;
  emiAmount?: number;
  notes?: string;
}

export interface LoanResponse {
  id: string;
  name: string;
  loanType: LoanType;
  lender: string;
  loanAccountNumber?: string;
  paymentAccountId?: string;
  principal: number;
  annualRatePct: number;
  rateType: RateType;
  tenureMonths: number;
  startDate: string;
  firstEmiDate: string;
  emiAmount: number;
  status: LoanStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  currentAnnualRatePct: number;
  currentEmi: number;
  outstandingPrincipal: number;
  totalInstallments: number;
  settledInstallments: number;
  nextDueDate?: string;
  projectedEndDate?: string;
  totalInterestPaid: number;
  totalInterestRemaining: number;
  effectiveAprPct?: number;
}

export interface LoanEventResponse {
  id: string;
  loanId: string;
  eventType: LoanEventType;
  effectiveDate: string;
  newAnnualRatePct?: number;
  amount?: number;
  adjustmentMode?: AdjustmentMode;
  newEmiOverride?: number;
  transactionId?: string;
  createdAt: string;
}

export interface LoanChargeResponse {
  id: string;
  loanId: string;
  chargeType: LoanChargeType;
  amount: number;
  chargeDate: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface LoanDetailResponse {
  loan: LoanResponse;
  events: LoanEventResponse[];
  charges: LoanChargeResponse[];
}

export interface PaymentInfo {
  id: string;
  paymentDate: string;
  amount: number;
  transactionId?: string;
}

export interface InstallmentDto {
  seq: number;
  dueDate: string;
  openingBalance: number;
  emi: number;
  interest: number;
  principal: number;
  closingBalance: number;
  status: 'settled' | 'overdue' | 'upcoming';
  payment?: PaymentInfo;
}

export interface CreateLoanEventRequest {
  eventType: LoanEventType;
  effectiveDate: string;
  newAnnualRatePct?: number;
  amount?: number;
  adjustmentMode?: AdjustmentMode;
  newEmiOverride?: number;
  transactionId?: string;
}

export interface CreateLoanPaymentRequest {
  paymentDate: string;
  amount: number;
  installmentSeq?: number;
  transactionId?: string;
}

export interface BatchLoanPaymentItem {
  installmentSeq?: number;
  paymentDate: string;
  amount: number;
  transactionId?: string;
}

export interface BatchLoanPaymentRequest {
  items: BatchLoanPaymentItem[];
}

export interface LoanPaymentResponse {
  id: string;
  loanId: string;
  installmentSeq: number;
  paymentDate: string;
  amount: number;
  transactionId?: string;
  createdAt: string;
}

export interface CreateLoanChargeRequest {
  chargeType: LoanChargeType;
  amount: number;
  chargeDate: string;
  transactionId?: string;
  notes?: string;
}

export interface InstallmentMatchSuggestion {
  installmentSeq: number;
  dueDate: string;
  expectedAmount: number;
  candidates: Transaction[];
}

export interface MatchSuggestionsResponse {
  suggestions: InstallmentMatchSuggestion[];
}

export interface LoansSummaryResponse {
  totalOutstanding: number;
  activeLoanCount: number;
  lentOutstanding: number;
  borrowedOutstanding: number;
  netReceivable: number;
}
