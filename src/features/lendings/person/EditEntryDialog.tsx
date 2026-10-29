'use client';

import React from 'react';

import {
  DateField,
  Dialog,
  Select,
  type SelectGroup,
  type SelectOption,
  Text,
  TextArea,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import type { PickerSummaryLike } from '@/features/transactions/pickerModel';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { todayInAppZone } from '@/lib/date-range';
import type { LedgerEntryResponse } from '@/lib/lending.types';
import {
  directionOf,
  ENTRY_TYPE_LABEL,
  entryTypesForDirection,
  fromEntryType,
  isSettlementType,
  type LendingEntryType,
  settlementWarning,
  toEntryType,
} from '@/lib/lendingEntry';
import type { Transaction } from '@/lib/transaction.types';

import type { EntryChange } from './usePersonMutations';

const FORM_ID = 'edit-entry-form';

const optionsFor = (direction: 'lent' | 'borrowed'): SelectOption[] =>
  entryTypesForDirection(direction).map((t) => ({ value: t, label: ENTRY_TYPE_LABEL[t] }));

const ENTRY_TYPE_GROUPS: SelectGroup[] = [
  { name: 'Money out', options: optionsFor('lent') },
  { name: 'Money in', options: optionsFor('borrowed') },
];

export interface EditEntryDialogProps {
  entry: LedgerEntryResponse;
  /** The person's balance (positive = they owe you); drives the settlement warning. */
  netPosition: number;
  personName: string;
  submitting: boolean;
  /** Resolves true when the entry was saved. */
  onSubmit: (id: string, change: EntryChange) => Promise<boolean>;
  onDelete: (entry: LedgerEntryResponse) => void;
  onClose: () => void;
}

/** One ledger entry: type, amount, date, linked transaction, expected return and notes. Delete asks first. */
export function EditEntryDialog({
  entry,
  netPosition,
  personName,
  submitting,
  onSubmit,
  onDelete,
  onClose,
}: EditEntryDialogProps) {
  const today = todayInAppZone();
  const [entryType, setEntryType] = React.useState<LendingEntryType>(toEntryType(entry.direction, entry.kind));
  const [amount, setAmount] = React.useState(String(entry.amount));
  const [entryDate, setEntryDate] = React.useState(entry.entryDate);
  const [expectedReturnDate, setExpectedReturnDate] = React.useState(entry.expectedReturnDate ?? '');
  const [notes, setNotes] = React.useState(entry.notes ?? '');
  const [transaction, setTransaction] = React.useState<PickerSummaryLike | null>(entry.transaction ?? null);
  const [amountError, setAmountError] = React.useState<string | null>(null);

  const direction = directionOf(entryType);
  const settlement = isSettlementType(entryType);
  // A linked transaction fixes the money direction; principal and repayment within it stay editable.
  const directionLocked = transaction !== null;
  const warning = settlementWarning(entryType, Number(amount), netPosition, personName);

  const submit = async () => {
    const resolvedAmount = resolveAmountExpression(amount);
    if (resolvedAmount !== amount) setAmount(resolvedAmount);
    if (!resolvedAmount || !Number.isFinite(Number(resolvedAmount)) || Number(resolvedAmount) <= 0) {
      setAmountError('Amount must be greater than zero');
      return;
    }
    const saved = await onSubmit(entry.id, {
      body: {
        ...fromEntryType(entryType),
        amount: Number(resolvedAmount),
        entryDate: entryDate || undefined,
        expectedReturnDate: expectedReturnDate || undefined,
        notes: notes.trim() || undefined,
      },
      originalTransactionId: entry.transaction?.id ?? null,
      transactionId: transaction?.id ?? null,
    });
    if (saved) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title="Edit ledger entry"
        tertiary={{ label: 'Delete', tone: 'danger', onSelect: () => onDelete(entry), disabled: submitting }}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{ label: 'Save entry', type: 'submit', form: FORM_ID, loading: submitting }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-8 desk:gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Select
              label="Entry type"
              groups={directionLocked ? undefined : ENTRY_TYPE_GROUPS}
              options={directionLocked ? optionsFor(direction) : undefined}
              helper={directionLocked ? 'Remove the transaction to change direction.' : undefined}
              value={entryType}
              onValueChange={(v) => setEntryType(v as LendingEntryType)}
            />
            <div className="grid grid-cols-1 desk:grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
              <AmountField
                label="Amount"
                prefix="₹"
                inputMode="decimal"
                value={amount}
                {...amountExpressionProps(amount, setAmount, () => setAmountError(null))}
                error={amountError ?? undefined}
              />
              <DateField
                label="Date"
                today={today}
                value={entryDate}
                onValueChange={(v) => setEntryDate(typeof v === 'string' ? v : '')}
              />
            </div>
            {warning ? (
              <Text variant="label" tone="warning">
                {warning}
              </Text>
            ) : null}
            <TransactionPickerField
              label="Linked transaction (optional)"
              value={transaction}
              onSelect={(t: Transaction) => setTransaction(t)}
              onClear={() => setTransaction(null)}
              direction={direction}
              suggestAmount={amount ? Number(amount) : null}
              suggestDate={entryDate || null}
            />
            {settlement ? null : (
              <DateField
                label="Expected return date"
                optional
                today={today}
                value={expectedReturnDate}
                onValueChange={(v) => setExpectedReturnDate(typeof v === 'string' ? v : '')}
              />
            )}
            <TextArea label="Notes" optional value={notes} onValueChange={setNotes} minRows={2} />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
