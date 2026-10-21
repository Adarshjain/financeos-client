'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  Select,
  type SelectGroup,
  type SelectOption,
  showToast,
  Text,
  TextArea,
  TextField,
} from '@/components/ds';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { type CounterpartyResponse, type CounterpartySelection, selectionName } from '@/lib/lending.types';
import {
  directionOf,
  ENTRY_TYPE_LABEL,
  entryTypesForDirection,
  isSettlementType,
  type LendingEntryType,
  settlementWarning,
} from '@/lib/lendingEntry';
import type { Transaction } from '@/lib/transaction.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { buildCreateLendingRequest, lendingEntryProblem } from '../lendingEntryForm';
import { useCreateLending } from '../useCreateLending';
import { PersonSelect } from './PersonSelect';

const FORM_ID = 'add-lending-form';

const entryOptions = (direction: 'lent' | 'borrowed'): SelectOption[] =>
  entryTypesForDirection(direction).map((t) => ({ value: t, label: ENTRY_TYPE_LABEL[t] }));

const ENTRY_TYPE_GROUPS: SelectGroup[] = [
  { name: 'Money out', options: entryOptions('lent') },
  { name: 'Money in', options: entryOptions('borrowed') },
];

interface Errors {
  party?: string;
  amount?: string;
}

/**
 * Add lending: records one ledger entry for an existing person or a new one, optionally linked to the bank
 * transaction behind it. `initialPerson` opens it with that person already picked (a person's page).
 */
export function AddLendingDialog({
  onClose,
  initialPerson,
}: {
  onClose: () => void;
  initialPerson?: CounterpartyResponse;
}) {
  const router = useRouter();
  const today = todayInAppZone();
  const createLending = useCreateLending({
    onError: (e) => showToast(getErrorMessage(e, 'Failed to create lending'), { tone: 'danger' }),
  });

  const [party, setParty] = React.useState<CounterpartySelection | null>(
    initialPerson ? { kind: 'existing', counterparty: initialPerson } : null,
  );
  const [entryType, setEntryType] = React.useState<LendingEntryType>('lent');
  const [amount, setAmount] = React.useState('');
  const [entryDate, setEntryDate] = React.useState(today);
  const [expectedReturnDate, setExpectedReturnDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [transaction, setTransaction] = React.useState<Transaction | null>(null);
  const [errors, setErrors] = React.useState<Errors>({});

  const settlement = isSettlementType(entryType);
  const partyNet = party?.kind === 'existing' ? party.counterparty.netPosition : 0;
  const warning = party ? settlementWarning(entryType, Number(amount), partyNet, selectionName(party)) : null;

  const submit = async () => {
    const problem = lendingEntryProblem(party, amount);
    setErrors(problem ? { [problem.field]: problem.message } : {});
    if (problem || !party) return;
    try {
      await createLending.mutateAsync(
        buildCreateLendingRequest({
          party,
          entryType,
          amount,
          entryDate,
          expectedReturnDate: settlement ? '' : expectedReturnDate,
          notes,
          transactionId: transaction?.id,
        }),
      );
      showToast('Lending recorded successfully');
      onClose();
      router.refresh();
    } catch {
      // onError already surfaced the toast.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="md"
        title="Add ledger entry"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: createLending.isPending }}
        primary={{
          label: 'Save entry',
          type: 'submit',
          form: FORM_ID,
          loading: createLending.isPending,
        }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <PersonSelect
              value={party}
              onChange={(next) => {
                setParty(next);
                setErrors((e) => ({ ...e, party: undefined }));
              }}
              error={errors.party}
            />
            <Select
              label="Entry type"
              groups={ENTRY_TYPE_GROUPS}
              value={entryType}
              onValueChange={(v) => {
                const next = v as LendingEntryType;
                // The picker's debit/credit filter follows the money's direction, so a pick may stop fitting.
                if (directionOf(next) !== directionOf(entryType)) setTransaction(null);
                setEntryType(next);
              }}
            />
            <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12">
              <TextField
                label="Amount"
                prefix="₹"
                inputMode="decimal"
                placeholder="5000"
                value={amount}
                onValueChange={(v) => {
                  setAmount(sanitizeDecimalInput(v));
                  setErrors((e) => ({ ...e, amount: undefined }));
                }}
                error={errors.amount}
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
              onSelect={setTransaction}
              onClear={() => setTransaction(null)}
              direction={directionOf(entryType)}
              suggestAmount={amount && Number(amount) > 0 ? Number(amount) : null}
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
            <TextArea
              label="Notes"
              optional
              placeholder="e.g. Dinner split, trip cash advance..."
              value={notes}
              onValueChange={setNotes}
              minRows={2}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
