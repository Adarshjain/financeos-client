import type {
  InstallmentDto,
  LoanChargeResponse,
  LoanDetailResponse,
  LoanEventResponse,
  LoanResponse,
} from '@/lib/loan.types';

/** The board's loan: ₹45,00,000 at 8.25% floating, 13 of 240 EMIs paid, EMI #14 overdue. */
export function loanFixture(over: Partial<LoanResponse> = {}): LoanResponse {
  return {
    id: 'l1',
    name: 'Home Loan · SBI MaxGain',
    loanType: 'home',
    lender: 'State Bank of India',
    loanAccountNumber: 'SBIHL00482913',
    paymentAccountId: 'b1',
    principal: 4500000,
    annualRatePct: 8.5,
    rateType: 'floating',
    tenureMonths: 240,
    startDate: '2025-08-01',
    firstEmiDate: '2025-09-05',
    emiAmount: 39052,
    status: 'active',
    notes: null,
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    currentAnnualRatePct: 8.25,
    currentEmi: 36603,
    outstandingPrincipal: 4192327,
    totalInstallments: 233,
    settledInstallments: 13,
    nextDueDate: '2026-10-05',
    projectedEndDate: '2045-01-05',
    totalInterestPaid: 402834,
    totalInterestRemaining: 5000000,
    effectiveAprPct: 8.72,
    ...over,
  };
}

export function installment(seq: number, dueDate: string, over: Partial<InstallmentDto> = {}): InstallmentDto {
  return {
    seq,
    dueDate,
    openingBalance: 4200055,
    emi: 36603,
    interest: 28875,
    principal: 7728,
    closingBalance: 4192327,
    status: 'upcoming',
    ...over,
  };
}

const paid = (seq: number, dueDate: string, over: Partial<InstallmentDto> = {}): InstallmentDto =>
  installment(seq, dueDate, {
    status: 'settled',
    payment: { id: `p${seq}`, paymentDate: dueDate, amount: 36603, transactionId: `t${seq}` },
    ...over,
  });

/** EMIs 12 and 13 paid, 14 overdue (5 Oct 2026), 15 in 23 days, 16 later; 17 falls in the next FY. */
export function scheduleFixture(): InstallmentDto[] {
  return [
    paid(11, '2026-07-05', { emi: 39052 }),
    paid(12, '2026-08-05'),
    paid(13, '2026-09-05'),
    installment(14, '2026-10-05', { status: 'overdue' }),
    installment(15, '2026-11-05'),
    installment(16, '2026-12-05'),
    installment(17, '2027-04-05'),
  ];
}

export function eventFixture(over: Partial<LoanEventResponse>): LoanEventResponse {
  return {
    id: 'e1',
    loanId: 'l1',
    eventType: 'prepayment',
    effectiveDate: '2026-06-01',
    amount: 200000,
    adjustmentMode: 'reduce_tenure',
    createdAt: '2026-06-01T00:00:00Z',
    ...over,
  };
}

export function chargeFixture(over: Partial<LoanChargeResponse> = {}): LoanChargeResponse {
  return {
    id: 'c1',
    loanId: 'l1',
    chargeType: 'insurance_premium',
    amount: 24500,
    chargeDate: '2025-08-01',
    notes: 'SBI Life RiNn Raksha',
    createdAt: '2025-08-01T00:00:00Z',
    ...over,
  };
}

export const TODAY = '2026-10-13';

export function detailFixture(over: Partial<LoanDetailResponse> = {}): LoanDetailResponse {
  return {
    loan: loanFixture(),
    events: [
      eventFixture({ id: 'e1' }),
      eventFixture({
        id: 'e2',
        eventType: 'rate_change',
        effectiveDate: '2026-08-01',
        amount: null,
        newAnnualRatePct: 8.25,
        adjustmentMode: 'reduce_emi',
      }),
    ],
    charges: [
      chargeFixture(),
      chargeFixture({ id: 'c2', chargeType: 'processing_fee', amount: 11800, notes: 'incl. GST' }),
    ],
    ...over,
  };
}
