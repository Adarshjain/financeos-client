'use client';

import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Radio } from '@/components/ds/Radio/Radio';
import { Select } from '@/components/ds/Select/Select';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { AmountField } from '@/components/organisms/AmountField/AmountField';
import { differenceWords } from '@/features/loans/detail/payModel';
import { daysBetween } from '@/features/loans/loanFormatModel';
import { amountExpressionProps, amountExpressionValue } from '@/lib/amountExpression';
import { todayInAppZone } from '@/lib/date-range';
import { formatCount, formatDate, formatMoney } from '@/lib/format';
import type { InstallmentDto } from '@/lib/loan.types';

import type { UseLoanPaymentLinkResult } from './useLoanPaymentLink';

/** "due 5 Oct · 8 days overdue", or just the due date while it is not late. */
export function installmentSubtitle(i: InstallmentDto, today: string): string {
  const due = `due ${formatDate(i.dueDate, 'list')}`;
  if (i.status !== 'overdue') return due;
  const late = daysBetween(i.dueDate, today);
  return late && late > 0 ? `${due} · ${formatCount(late, ['day', 'days'])} overdue` : due;
}

/** Loan payment: pick the loan and one of its unpaid installments, and say what was paid and when. */
export function LoanPaymentLinkBody({ loanPayment }: { loanPayment: UseLoanPaymentLinkResult }) {
  const today = todayInAppZone();
  const { loans, loanId, installments, installmentSeq } = loanPayment;
  const selected = installments.find((i) => i.seq === installmentSeq);
  const paid = amountExpressionValue(loanPayment.amount);
  const difference = selected && paid !== null ? differenceWords(paid, selected.emi) : null;
  // The amount error waits for the field to lose focus, so a sum being typed ("120+") doesn't flash it.
  const [amountTouched, setAmountTouched] = React.useState(false);
  const amountProps = amountExpressionProps(loanPayment.amount, loanPayment.setAmount);

  return (
    <>
      <Select
        label="Loan"
        placeholder="Select loan"
        loading={loanPayment.loadingLoans}
        value={loanId || ''}
        onValueChange={(v) => loanPayment.setLoanId(v as string)}
        options={loans.map((loan) => ({
          value: loan.id,
          label: loan.name,
          hint: loan.lender || undefined,
        }))}
      />
      {loanId ? (
        loanPayment.loadingSchedule ? (
          <Skeleton width="60%" height={14} />
        ) : installments.length === 0 ? (
          <Text variant="body" tone="ink-3" as="p">
            No unpaid installments on this loan.
          </Text>
        ) : (
          <div className="flex flex-col">
            <Text variant="label" tone="ink-3" as="div">
              Unpaid installments
            </Text>
            <div role="radiogroup" aria-label="Unpaid installments" className="flex flex-col">
              {installments.map((i) => (
                <ListRow
                  key={i.seq}
                  role="radio"
                  aria-checked={installmentSeq === i.seq}
                  aria-label={`EMI #${i.seq}`}
                  className="px-0"
                  wrap
                  onClick={() => loanPayment.setInstallmentSeq(i.seq)}
                  leading={<Radio checked={installmentSeq === i.seq} tabIndex={-1} aria-hidden="true" />}
                  title={`EMI #${i.seq}`}
                  subtitle={installmentSubtitle(i, today)}
                  trailing={
                    <Text variant="body-strong" as="span">
                      {formatMoney(i.emi, { decimals: 'exact' })}
                    </Text>
                  }
                />
              ))}
            </div>
          </div>
        )
      ) : null}
      <div className="grid grid-cols-1 desk:grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
        <AmountField
          label="Amount paid"
          prefix="₹"
          inputMode="decimal"
          value={loanPayment.amount}
          {...amountProps}
          onBlur={() => {
            amountProps.onBlur();
            setAmountTouched(true);
          }}
          error={amountTouched ? loanPayment.amountError : undefined}
          helper={difference ?? undefined}
        />
        <DateField
          label="Paid on"
          today={today}
          value={loanPayment.paymentDate}
          onValueChange={(v) => loanPayment.setPaymentDate(typeof v === 'string' ? v : '')}
        />
      </div>
    </>
  );
}
