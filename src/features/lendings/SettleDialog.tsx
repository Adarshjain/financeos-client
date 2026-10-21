'use client';

import React from 'react';

import {
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  FilterChip,
  SegmentedControl,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import type { LendingDirection } from '@/lib/lending.types';
import { directionOf, fromEntryType, settlementWarning } from '@/lib/lendingEntry';
import type { Transaction } from '@/lib/transaction.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import {
  firstNameOf,
  halfOf,
  netPositionOf,
  rupeesExact,
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
    onError: (e) => showToast(getErrorMessage(e, 'Failed to create lending'), { tone: 'danger' }),
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
    if (next === 'custom') amountRef.current?.focus();
  };

  const submit = async () => {
    if (!amount || !Number.isFinite(parsed) || parsed <= 0) {
      setAmountError('Amount must be greater than zero');
      return;
    }
    try {
      await createLending.mutateAsync({
        counterpartyId,
        ...fromEntryType(entryType),
        amount: parsed,
        entryDate: date,
        transactionId: transaction?.id,
        notes: note.trim() || undefined,
      });
      showToast('Entry added');
      onRecorded?.();
      onOpenChange(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title={`Settle up with ${first}`}
        description={settleBalanceLine(direction, balance, first)}
        secondary={{
          label: 'Cancel',
          onSelect: () => onOpenChange(false),
          disabled: createLending.isPending,
        }}
        primary={{
          label: segment === 'settle' ? 'Record settlement' : 'Add entry',
          onSelect: submit,
          loading: createLending.isPending,
        }}
      >
        <DialogBody>
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
          <div className="grid grid-cols-2 gap-space-12">
            <TextField
              ref={amountRef}
              label="Amount"
              prefix="₹"
              inputMode="decimal"
              value={amount}
              onValueChange={(v) => {
                setAmount(sanitizeDecimalInput(v));
                setQuick('custom');
                setAmountError(null);
              }}
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
                {`Full ${rupeesExact(balance)}`}
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
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
