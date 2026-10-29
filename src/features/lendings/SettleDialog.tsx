'use client';

import React from 'react';

import {
  DateField,
  Dialog,
  FilterChip,
  SegmentedControl,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { isPhoneLayout } from '@/components/ds/phoneLayout';
import { AmountField } from '@/components/organisms';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { formatMoney } from '@/lib/format';
import type { LendingDirection } from '@/lib/lending.types';
import { directionOf, fromEntryType, settlementWarning } from '@/lib/lendingEntry';
import type { Transaction } from '@/lib/transaction.types';

import {
  firstNameOf,
  halfOf,
  netPositionOf,
  settleBalanceLine,
  settleEntryType,
  type SettleSegment,
  settleSegmentOptions,
} from './settle';
import { useCreateLending } from './useCreateLending';

export interface SettleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterpartyId: string;
  /** The person's full name; the sheet speaks of their first name. */
  name: string;
  /** lent = they owe you, borrowed = you owe them. */
  direction: LendingDirection;
  /** What is outstanding, always positive. */
  balance: number;
  /** Runs after the entry is recorded, so a page can refresh what it shows. */
  onRecorded?: () => void;
}

type Quick = 'full' | 'half' | 'custom';

/**
 * The Settle up sheet: records a repayment against one person's balance, or a new principal entry
 * ("Lent more" / "Borrowed more"). Opens prefilled with the full balance and today's date.
 */
export function SettleDialog({
  open,
  onOpenChange,
  counterpartyId,
  name,
  direction,
  balance,
  onRecorded,
}: SettleDialogProps) {
  const first = firstNameOf(name);
  const createLending = useCreateLending({
    onError: (e) => showToast(getErrorMessage(e, "Couldn't record lending. Try again."), { tone: 'danger' }),
  });
  const amountRef = React.useRef<HTMLInputElement>(null);
  const [segment, setSegment] = React.useState<SettleSegment>('settle');
  const [amount, setAmount] = React.useState(String(balance));
  const [quick, setQuick] = React.useState<Quick>('full');
  const [date, setDate] = React.useState(todayInAppZone());
  const [note, setNote] = React.useState('');
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const [transaction, setTransaction] = React.useState<Transaction | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSegment('settle');
    setAmount(String(balance));
    setQuick('full');
    setDate(todayInAppZone());
    setNote('');
    setAmountError(null);
    setTransaction(null);
  }, [open, balance]);

  const entryType = settleEntryType(direction, segment);
  const parsed = Number(amount);
  const warning =
    segment === 'settle'
      ? settlementWarning(entryType, parsed, netPositionOf(direction, balance), first)
      : null;

  const pick = (next: Quick) => {
    setQuick(next);
    setAmountError(null);
    if (next === 'full') setAmount(String(balance));
    if (next === 'half') setAmount(String(halfOf(balance)));
    // On phone the amount opens its keypad (a click); focus would bring up the OS keyboard instead.
    if (next === 'custom') {
      if (isPhoneLayout()) amountRef.current?.click();
      else amountRef.current?.focus();
    }
  };

  const submit = async () => {
    const resolvedAmount = resolveAmountExpression(amount);
    if (resolvedAmount !== amount) setAmount(resolvedAmount);
    const value = Number(resolvedAmount);
    if (!resolvedAmount || !Number.isFinite(value) || value <= 0) {
      setAmountError('Amount must be greater than zero');
      return;
    }
    try {
      await createLending.mutateAsync({
        counterpartyId,
        ...fromEntryType(entryType),
        amount: value,
        entryDate: date,
        transactionId: transaction?.id,
        notes: note.trim() || undefined,
      });
      showToast('Entry recorded');
      onRecorded?.();
      onOpenChange(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        size="sm"
        title={`Settle up with ${first}`}
        description={settleBalanceLine(direction, balance, first)}
        secondary={{
          label: 'Cancel',
          onSelect: () => onOpenChange(false),
          disabled: createLending.isPending,
        }}
        primary={{
          label: segment === 'settle' ? 'Record settlement' : 'Record entry',
          onSelect: submit,
          loading: createLending.isPending,
        }}
      >
        <Dialog.Body>
          <SegmentedControl
            fullWidth
            aria-label="Entry type"
            options={settleSegmentOptions(direction)}
            value={segment}
            onValueChange={(v) => {
              const next = v as SettleSegment;
              // The picker's debit/credit filter follows the money's direction, so a pick may stop fitting.
              if (directionOf(settleEntryType(direction, next)) !== directionOf(entryType)) setTransaction(null);
              setSegment(next);
            }}
          />
          <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
            <AmountField
              ref={amountRef}
              label="Amount"
              prefix="₹"
              inputMode="decimal"
              value={amount}
              {...amountExpressionProps(amount, setAmount, () => {
                setQuick('custom');
                setAmountError(null);
              })}
              error={amountError ?? undefined}
            />
            <DateField
              label="Date"
              today={todayInAppZone()}
              value={date}
              onValueChange={(v) => setDate(typeof v === 'string' ? v : '')}
            />
          </div>
          {segment === 'settle' ? (
            <div className="flex gap-space-8">
              <FilterChip selected={quick === 'full'} onClick={() => pick('full')}>
                {`Full ${formatMoney(balance, { decimals: 'auto' })}`}
              </FilterChip>
              <FilterChip selected={quick === 'half'} onClick={() => pick('half')}>
                Half
              </FilterChip>
              <FilterChip selected={quick === 'custom'} onClick={() => pick('custom')}>
                Custom
              </FilterChip>
            </div>
          ) : null}
          <TextField label="Note" value={note} onValueChange={setNote} placeholder="Optional" />
          <TransactionPickerField
            value={transaction}
            onSelect={setTransaction}
            onClear={() => setTransaction(null)}
            direction={directionOf(entryType)}
            suggestAmount={Number.isFinite(parsed) && parsed > 0 ? parsed : null}
            suggestDate={date || null}
          />
          {warning ? (
            <Text variant="label" tone="warning">
              {warning}
            </Text>
          ) : null}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
