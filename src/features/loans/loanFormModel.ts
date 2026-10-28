import type { CreateLoanRequest, LoanResponse, LoanType, RateType, UpdateLoanRequest } from '@/lib/loan.types';

export const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'two_wheeler', label: 'Two Wheeler Loan' },
  { value: 'consumer_durable', label: 'Consumer Durable Loan' },
  { value: 'other', label: 'Other Loan' },
];

export const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: 'fixed', label: 'Fixed Rate' },
  { value: 'floating', label: 'Floating Rate' },
];

/** The "None" choice of the payment account dropdown; it saves as no account. */
export const NO_PAYMENT_ACCOUNT = 'none';

/** The form's fields, as typed: numbers stay text until the request is built. */
export interface LoanFormValues {
  name: string;
  lender: string;
  loanType: LoanType;
  rateType: RateType;
  loanAccountNumber: string;
  paymentAccountId: string;
  principal: string;
  annualRatePct: string;
  tenureMonths: string;
  startDate: string;
  firstEmiDate: string;
  emiAmount: string;
  notes: string;
}

export type LoanFormField = 'name' | 'lender' | 'principal' | 'annualRatePct' | 'tenureMonths' | 'emiAmount';

export function emptyLoanValues(today: string): LoanFormValues {
  return {
    name: '',
    lender: '',
    loanType: 'home',
    rateType: 'fixed',
    loanAccountNumber: '',
    paymentAccountId: '',
    principal: '',
    annualRatePct: '',
    tenureMonths: '',
    startDate: today,
    firstEmiDate: today,
    emiAmount: '',
    notes: '',
  };
}

export function loanValuesFrom(loan: LoanResponse, today: string): LoanFormValues {
  return {
    name: loan.name,
    lender: loan.lender ?? '',
    loanType: loan.loanType,
    rateType: loan.rateType,
    loanAccountNumber: loan.loanAccountNumber ?? '',
    paymentAccountId: loan.paymentAccountId ?? '',
    principal: loan.principal ? String(loan.principal) : '',
    annualRatePct: loan.annualRatePct ? String(loan.annualRatePct) : '',
    tenureMonths: loan.tenureMonths ? String(loan.tenureMonths) : '',
    startDate: loan.startDate ?? today,
    firstEmiDate: loan.firstEmiDate ?? today,
    emiAmount: loan.emiAmount ? String(loan.emiAmount) : '',
    notes: loan.notes ?? '',
  };
}

export interface LoanProblem {
  field: LoanFormField;
  message: string;
}

/**
 * Everything that stops the form from saving, in field order. Name and lender always count; the
 * figures only when creating (an edit may leave locked terms as they are).
 */
export function loanProblems(values: LoanFormValues, isEdit: boolean): LoanProblem[] {
  const problems: LoanProblem[] = [];
  if (!values.name.trim()) problems.push({ field: 'name', message: 'Loan name is required' });
  if (!values.lender.trim()) problems.push({ field: 'lender', message: 'Lender is required' });
  const principalOk = Number.isFinite(Number(values.principal)) && Number(values.principal) > 0;
  const emiBad = values.emiAmount !== '' && !(Number.isFinite(Number(values.emiAmount)) && Number(values.emiAmount) > 0);
  if (isEdit) {
    // Blank figures are kept as they are; anything typed must be a usable amount (not "5+" or "100/0").
    if (values.principal !== '' && !principalOk) {
      problems.push({ field: 'principal', message: 'Principal must be greater than zero' });
    }
    if (emiBad) problems.push({ field: 'emiAmount', message: 'EMI amount must be greater than zero' });
    return problems;
  }
  if (!principalOk) {
    problems.push({ field: 'principal', message: 'Principal must be greater than zero' });
  }
  if (!values.annualRatePct || Number(values.annualRatePct) <= 0) {
    problems.push({ field: 'annualRatePct', message: 'Annual rate % must be greater than zero' });
  }
  if (!values.tenureMonths || Number(values.tenureMonths) < 1) {
    problems.push({ field: 'tenureMonths', message: 'Tenure must be at least 1 month' });
  }
  if (emiBad) problems.push({ field: 'emiAmount', message: 'EMI amount must be greater than zero' });
  return problems;
}

function paymentAccount(id: string): string | undefined {
  return id && id !== NO_PAYMENT_ACCOUNT ? id : undefined;
}

/** The POST /loans body from a form that passed `loanProblems`. */
export function buildCreateLoanRequest(v: LoanFormValues): CreateLoanRequest {
  return {
    name: v.name.trim(),
    lender: v.lender.trim(),
    loanType: v.loanType,
    rateType: v.rateType,
    loanAccountNumber: v.loanAccountNumber.trim() || undefined,
    paymentAccountId: paymentAccount(v.paymentAccountId),
    principal: Number(v.principal),
    annualRatePct: Number(v.annualRatePct),
    tenureMonths: Number(v.tenureMonths),
    startDate: v.startDate,
    firstEmiDate: v.firstEmiDate,
    emiAmount: v.emiAmount ? Number(v.emiAmount) : undefined,
    notes: v.notes.trim() || undefined,
  };
}

/**
 * The PUT /loans/{id} body: blank figures are left out so the server keeps them.
 * `hadPaymentAccount` = the loan being edited has one; emptying it then sends `clearPaymentAccount`.
 */
export function buildUpdateLoanRequest(v: LoanFormValues, hadPaymentAccount = false): UpdateLoanRequest {
  const payment = paymentAccount(v.paymentAccountId);
  return {
    name: v.name.trim(),
    lender: v.lender.trim(),
    loanType: v.loanType,
    rateType: v.rateType,
    loanAccountNumber: v.loanAccountNumber.trim() || undefined,
    paymentAccountId: payment,
    clearPaymentAccount: !payment && hadPaymentAccount ? true : undefined,
    principal: v.principal ? Number(v.principal) : undefined,
    annualRatePct: v.annualRatePct ? Number(v.annualRatePct) : undefined,
    tenureMonths: v.tenureMonths ? Number(v.tenureMonths) : undefined,
    startDate: v.startDate,
    firstEmiDate: v.firstEmiDate,
    emiAmount: v.emiAmount ? Number(v.emiAmount) : undefined,
    notes: v.notes.trim() || undefined,
  };
}
