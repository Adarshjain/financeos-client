'use client';

import React from 'react';

import {
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  Select,
  type SelectOption,
  Text,
  TextField,
} from '@/components/ds';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import type { InstallmentDto } from '@/lib/loan.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import type { Transaction } from '@/lib/transaction.types';
import { getAccountName, sanitizeDecimalInput } from '@/lib/utils';

import { PAYMENT_TRANSACTION_HINT } from './eventFormModel';
import {
  differenceWords,
  foundDebitLine,
  PAY_CHOICE_COPY,
  type PayChoice,
  payDescription,
  type PayField,
  payProblems,
} from './payModel';

export interface MarkPaidValues {
  amount: string;
  paymentDate: string;
  transactionId?: string;
}

export interface MarkPaidDialogProps {
  installment: InstallmentDto;
  loanName: string;
  today: string;
  /** The bank debit the server found for this EMI, once the search is back. */
  found: Transaction | null;
  searching: boolean;
  submitting: boolean;
  /** Records the payment; resolves true when it was saved (the dialog then closes). */
  onSubmit: (values: MarkPaidValues) => Promise<boolean>;
  onClose: () => void;
}

const amountText = (tx: Transaction) => String(Math.abs(tx.amount));

/**
 * Mark EMI paid: link the debit we found, record without a transaction, or pick another debit. What was
 * paid is recorded as it is; when it differs from the EMI the form says by how much.
 */
export function MarkPaidDialog({
  installment,
  loanName,
  today,
  found,
  searching,
  submitting,
  onSubmit,
  onClose,
}: MarkPaidDialogProps) {
  const { data: accounts = [] } = useAccounts();
  const [choice, setChoice] = React.useState<PayChoice>(found ? 'found' : 'none');
  const [amount, setAmount] = React.useState(found ? amountText(found) : String(installment.emi));
  const [date, setDate] = React.useState(found ? found.date : installment.dueDate);
  const [picked, setPicked] = React.useState<Transaction | null>(null);
  const [errors, setErrors] = React.useState<Partial<Record<PayField, string>>>({});
  const chose = React.useRef(false);

  // The search can come back after the form opened: offer it unless the person already chose.
  React.useEffect(() => {
    if (!found || chose.current) return;
    setChoice('found');
    setAmount(amountText(found));
    setDate(found.date);
  }, [found]);

  const choose = (next: PayChoice) => {
    chose.current = true;
    setChoice(next);
    setErrors({});
    if (next === 'found' && found) {
      setAmount(amountText(found));
      setDate(found.date);
    }
    if (next === 'none') {
      setPicked(null);
      setAmount(String(installment.emi));
      setDate(installment.dueDate);
    }
    if (next === 'pick' && picked) {
      setAmount(amountText(picked));
      setDate(picked.date);
    }
  };

  const options: SelectOption[] = [
    ...(found
      ? [{ value: 'found', label: PAY_CHOICE_COPY.found.label, description: foundDebitLine(found, getAccountName(accounts, found.accountId)) }]
      : []),
    { value: 'none', ...PAY_CHOICE_COPY.none },
    { value: 'pick', ...PAY_CHOICE_COPY.pick },
  ];

  const transactionId = choice === 'found' ? found?.id : choice === 'pick' ? picked?.id : undefined;
  const difference = amount.trim() ? differenceWords(Number(amount.trim()), installment.emi) : null;

  const submit = async () => {
    const problems = payProblems({ choice, amount, date, transactionId });
    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    if (problems.length > 0) return;
    const saved = await onSubmit({ amount, paymentDate: date, transactionId });
    if (saved) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="sm"
        title={`Mark EMI #${installment.seq} paid`}
        description={payDescription(installment, loanName)}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{
          label: choice === 'none' ? 'Mark paid' : 'Mark paid & link',
          onSelect: () => void submit(),
          loading: submitting,
        }}
      >
        <DialogBody>
          <Select
            aria-label="How the EMI was paid"
            options={options}
            value={choice}
            onValueChange={(value) => choose(value as PayChoice)}
          />
          {choice === 'found' && found ? (
            <Text variant="caption" tone="ink-3" as="p">
              {foundDebitLine(found, getAccountName(accounts, found.accountId))}
            </Text>
          ) : null}
          {searching && !found ? (
            <Text variant="caption" tone="ink-3" as="p">
              Looking for the bank debit…
            </Text>
          ) : null}
          {choice === 'pick' ? (
            <TransactionPickerField
              label="Bank debit"
              value={picked}
              onSelect={(tx) => {
                setPicked(tx);
                setAmount(amountText(tx));
                setDate(tx.date);
                setErrors({});
              }}
              onClear={() => setPicked(null)}
              type="DEBIT"
              excludeAnyObligationRef
              suggestAmount={installment.emi}
              suggestDate={installment.dueDate}
              ruleHint={PAYMENT_TRANSACTION_HINT}
              error={errors.transaction}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-space-12">
            <TextField
              label="Amount paid"
              prefix="₹"
              inputMode="decimal"
              value={amount}
              onValueChange={(v) => {
                chose.current = true;
                setAmount(sanitizeDecimalInput(v));
                setErrors((e) => ({ ...e, amount: undefined }));
              }}
              helper={difference ?? undefined}
              error={errors.amount}
            />
            <DateField
              label="Paid on"
              today={today}
              value={date}
              onValueChange={(v) => {
                chose.current = true;
                setDate(typeof v === 'string' ? v : '');
                setErrors((e) => ({ ...e, date: undefined }));
              }}
              error={errors.date}
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
