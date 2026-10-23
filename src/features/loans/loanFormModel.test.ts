import { describe, expect, it } from 'vitest';

import type { LoanResponse } from '@/lib/loan.types';

import {
  buildCreateLoanRequest,
  buildUpdateLoanRequest,
  emptyLoanValues,
  type LoanFormValues,
  loanProblems,
  loanValuesFrom,
  NO_PAYMENT_ACCOUNT,
} from './loanFormModel';

const filled: LoanFormValues = {
  ...emptyLoanValues('2026-10-21'),
  name: ' Home Loan HDFC ',
  lender: ' HDFC Bank ',
  principal: '1000000',
  annualRatePct: '8.5',
  tenureMonths: '240',
};

describe('emptyLoanValues', () => {
  it('starts as a fixed-rate home loan dated today', () => {
    expect(emptyLoanValues('2026-10-21')).toMatchObject({
      loanType: 'home',
      rateType: 'fixed',
      startDate: '2026-10-21',
      firstEmiDate: '2026-10-21',
      name: '',
    });
  });
});

describe('loanProblems', () => {
  it('lists every missing field of a new loan, in field order, with Legacy wording', () => {
    expect(loanProblems(emptyLoanValues('2026-10-21'), false)).toEqual([
      { field: 'name', message: 'Loan name is required' },
      { field: 'lender', message: 'Lender is required' },
      { field: 'principal', message: 'Principal must be greater than zero' },
      { field: 'annualRatePct', message: 'Annual rate % must be greater than zero' },
      { field: 'tenureMonths', message: 'Tenure must be at least 1 month' },
    ]);
  });

  it('rejects whitespace names, zero figures and a zero tenure', () => {
    const problems = loanProblems({ ...filled, name: '  ', principal: '0', annualRatePct: '0', tenureMonths: '0' }, false);
    expect(problems.map((p) => p.field)).toEqual(['name', 'principal', 'annualRatePct', 'tenureMonths']);
  });

  it('passes a complete loan', () => {
    expect(loanProblems(filled, false)).toEqual([]);
  });

  it('only checks name and lender when editing', () => {
    expect(loanProblems(emptyLoanValues('2026-10-21'), true).map((p) => p.field)).toEqual(['name', 'lender']);
  });
});

describe('loanProblems with unresolved expressions', () => {
  it('rejects a non-finite principal or EMI on create', () => {
    for (const bad of ['100/0', '5+', '100-200']) {
      expect(loanProblems({ ...filled, principal: bad }, false)).toEqual([
        { field: 'principal', message: 'Principal must be greater than zero' },
      ]);
      expect(loanProblems({ ...filled, emiAmount: bad }, false)).toEqual([
        { field: 'emiAmount', message: 'EMI amount must be greater than zero' },
      ]);
    }
  });

  it('allows a blank EMI on create but not zero', () => {
    expect(loanProblems({ ...filled, emiAmount: '' }, false)).toEqual([]);
    expect(loanProblems({ ...filled, emiAmount: '0' }, false).map((p) => p.field)).toEqual(['emiAmount']);
  });

  it('on edit keeps blank figures but rejects typed ones that are not usable amounts', () => {
    const blank = { ...emptyLoanValues('2026-10-21'), name: 'a', lender: 'b' };
    expect(loanProblems(blank, true)).toEqual([]);
    expect(loanProblems({ ...blank, principal: '5+', emiAmount: '100/0' }, true).map((p) => p.field)).toEqual([
      'principal',
      'emiAmount',
    ]);
    expect(loanProblems({ ...blank, principal: '450000', emiAmount: '30000' }, true)).toEqual([]);
  });
});

describe('buildCreateLoanRequest', () => {
  it('trims text, converts figures and leaves blanks out', () => {
    expect(buildCreateLoanRequest(filled)).toEqual({
      name: 'Home Loan HDFC',
      lender: 'HDFC Bank',
      loanType: 'home',
      rateType: 'fixed',
      loanAccountNumber: undefined,
      paymentAccountId: undefined,
      principal: 1000000,
      annualRatePct: 8.5,
      tenureMonths: 240,
      startDate: '2026-10-21',
      firstEmiDate: '2026-10-21',
      emiAmount: undefined,
      notes: undefined,
    });
  });

  it('carries the optional fields and treats the None account as no account', () => {
    const request = buildCreateLoanRequest({
      ...filled,
      loanAccountNumber: ' 123 ',
      paymentAccountId: 'acc1',
      emiAmount: '9500.50',
      notes: ' note ',
    });
    expect(request).toMatchObject({ loanAccountNumber: '123', paymentAccountId: 'acc1', emiAmount: 9500.5, notes: 'note' });
    expect(buildCreateLoanRequest({ ...filled, paymentAccountId: NO_PAYMENT_ACCOUNT }).paymentAccountId).toBeUndefined();
  });
});

describe('buildUpdateLoanRequest and loanValuesFrom', () => {
  const loan = {
    name: 'Car Loan',
    lender: 'HDFC',
    loanType: 'car',
    rateType: 'floating',
    loanAccountNumber: null,
    paymentAccountId: 'acc1',
    principal: 800000,
    annualRatePct: 9.25,
    tenureMonths: 60,
    startDate: '2024-01-05',
    firstEmiDate: '2024-02-05',
    emiAmount: 17748,
    notes: null,
  } as LoanResponse;

  it('round-trips a loan through the form', () => {
    const values = loanValuesFrom(loan, '2026-10-21');
    expect(values).toMatchObject({ principal: '800000', annualRatePct: '9.25', tenureMonths: '60', emiAmount: '17748', notes: '' });
    expect(buildUpdateLoanRequest(values)).toMatchObject({
      name: 'Car Loan',
      principal: 800000,
      annualRatePct: 9.25,
      tenureMonths: 60,
      paymentAccountId: 'acc1',
    });
  });

  it('leaves blank figures out of an update', () => {
    const update = buildUpdateLoanRequest({ ...filled, principal: '', annualRatePct: '', tenureMonths: '' });
    expect(update.principal).toBeUndefined();
    expect(update.annualRatePct).toBeUndefined();
    expect(update.tenureMonths).toBeUndefined();
  });
});
