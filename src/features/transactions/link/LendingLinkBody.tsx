'use client';

import React from 'react';

import {
  DateField,
  ListRow,
  Radio,
  SegmentedControl,
  Select,
  Skeleton,
  Text,
  TextArea,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { PersonSelect } from '@/features/lendings/form/PersonSelect';
import { plainAmount } from '@/features/loans/loanFormat';
import { amountExpressionProps } from '@/lib/amountExpression';
import { todayInAppZone } from '@/lib/date-range';
import { selectionName } from '@/lib/lending.types';
import { ENTRY_TYPE_LABEL, entryTypesForDirection, isSettlementType, settlementWarning } from '@/lib/lendingEntry';

import type { UseRecordLendingResult } from './useRecordLending';

export type LendingMode = 'new' | 'existing';

export interface LendingLinkBodyProps {
  lending: UseRecordLendingResult;
  mode: LendingMode;
  onModeChange: (mode: LendingMode) => void;
  /** The open entry picked to attach the transaction to (Existing entry). */
  entryId: string;
  onEntryChange: (id: string) => void;
}

const DIRECTION_WORDS = { lent: 'You lent', borrowed: 'You borrowed' } as const;

/** Lending entry: record a new ledger entry for the transaction, or attach it to an entry already in the ledger. */
export function LendingLinkBody({ lending, mode, onModeChange, entryId, onEntryChange }: LendingLinkBodyProps) {
  const today = todayInAppZone();
  const { party, direction, entryType } = lending;
  const existingPerson = party?.kind === 'existing' ? party.counterparty : null;
  const warning = party
    ? settlementWarning(entryType, Number(lending.amount), existingPerson?.netPosition ?? 0, selectionName(party))
    : null;
  // The amount error waits for the field to lose focus, so a sum being typed ("120+") doesn't flash it.
  const [amountTouched, setAmountTouched] = React.useState(false);
  const amountProps = amountExpressionProps(lending.amount, lending.setAmount);

  return (
    <>
      <SegmentedControl<LendingMode>
        fullWidth
        value={mode}
        onValueChange={onModeChange}
        options={[
          { value: 'new', label: 'New entry' },
          { value: 'existing', label: 'Existing entry' },
        ]}
      />
      <PersonSelect value={party} onChange={lending.setParty} />
      {mode === 'new' ? (
        <>
          <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12">
            <Select
              label="Direction"
              disabled
              value={direction}
              options={[{ value: direction, label: DIRECTION_WORDS[direction] }]}
            />
            <Select
              label="Kind"
              value={entryType}
              onValueChange={(v) => lending.setEntryType(v as typeof entryType)}
              options={entryTypesForDirection(direction).map((t) => ({ value: t, label: ENTRY_TYPE_LABEL[t] }))}
            />
          </div>
          <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12">
            <AmountField
              label="Amount"
              prefix="₹"
              inputMode="decimal"
              value={lending.amount}
              {...amountProps}
              onBlur={() => {
                amountProps.onBlur();
                setAmountTouched(true);
              }}
              error={amountTouched ? lending.amountError : undefined}
            />
            <DateField
              label="Date"
              today={today}
              value={lending.entryDate}
              onValueChange={(v) => lending.setEntryDate(typeof v === 'string' ? v : '')}
            />
          </div>
          {warning ? (
            <Text variant="label" tone="warning">
              {warning}
            </Text>
          ) : null}
          {isSettlementType(entryType) ? null : (
            <DateField
              label="Expected back"
              optional
              today={today}
              value={lending.expectedReturnDate}
              onValueChange={(v) => lending.setExpectedReturnDate(typeof v === 'string' ? v : '')}
            />
          )}
          <TextArea
            label="Note"
            optional
            placeholder="e.g. Dinner split, trip cash advance..."
            value={lending.notes}
            onValueChange={lending.setNotes}
            minRows={2}
          />
        </>
      ) : (
        <ExistingEntries lending={lending} entryId={entryId} onEntryChange={onEntryChange} />
      )}
    </>
  );
}

function ExistingEntries({
  lending,
  entryId,
  onEntryChange,
}: Pick<LendingLinkBodyProps, 'lending' | 'entryId' | 'onEntryChange'>) {
  const { party, direction, unlinkedEntries } = lending;
  if (!party) {
    return (
      <Text variant="body" tone="ink-3" as="p">
        Pick the person to see their open entries.
      </Text>
    );
  }
  if (party.kind === 'new') {
    return (
      <Text variant="body" tone="ink-3" as="p">
        {party.name} is new, so there are no entries yet. Record a new entry instead.
      </Text>
    );
  }
  if (lending.loadingExistingEntries) return <Skeleton width="60%" height={14} />;
  if (unlinkedEntries.length === 0) {
    return (
      <Text variant="body" tone="ink-3" as="p">
        {party.counterparty.name} has no open {direction} entries without a transaction. Record a new entry instead.
      </Text>
    );
  }
  return (
    <div className="flex flex-col">
      <Text variant="label" tone="ink-3" as="div">
        {`Open entries with ${party.counterparty.name}`}
      </Text>
      <div role="radiogroup" aria-label="Open entries" className="flex flex-col">
        {unlinkedEntries.map((entry) => (
          <ListRow
            key={entry.id}
            role="radio"
            aria-checked={entryId === entry.id}
            aria-label={`${formatDayMonth(entry.entryDate)} ₹${plainAmount(entry.amount)}`}
            className="px-0"
            wrap
            onClick={() => onEntryChange(entry.id)}
            leading={<Radio checked={entryId === entry.id} tabIndex={-1} aria-hidden="true" />}
            title={entry.notes || DIRECTION_WORDS[direction]}
            subtitle={formatDayMonth(entry.entryDate)}
            trailing={
              <Text variant="body-strong" as="span">
                {`₹${plainAmount(entry.amount)}`}
              </Text>
            }
          />
        ))}
      </div>
    </div>
  );
}
