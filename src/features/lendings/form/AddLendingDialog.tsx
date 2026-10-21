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
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { type CounterpartyResponse, type CounterpartySelection, selectionName } from '@/lib/lending.types';
import {
  ENTRY_TYPE_LABEL,
  entryTypesForDirection,
  isSettlementType,
  type LendingEntryType,
  settlementWarning,
} from '@/lib/lendingEntry';
import { useCounterpartySearch } from '@/lib/query/hooks/useCounterparties';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { sanitizeDecimalInput } from '@/lib/utils';

import { buildCreateLendingRequest, entriesLabel, lendingEntryProblem, positionLabel } from '../lendingEntryForm';
import { useCreateLending } from '../useCreateLending';

const FORM_ID = 'add-lending-form';
const NEW_PREFIX = 'new:';
const SEARCH_DEBOUNCE_MS = 250;

const entryOptions = (direction: 'lent' | 'borrowed'): SelectOption[] =>
  entryTypesForDirection(direction).map((t) => ({ value: t, label: ENTRY_TYPE_LABEL[t] }));

const ENTRY_TYPE_GROUPS: SelectGroup[] = [
  { name: 'Money out', options: entryOptions('lent') },
  { name: 'Money in', options: entryOptions('borrowed') },
];

function personOption(cp: CounterpartyResponse): SelectOption {
  return { value: cp.id, label: cp.name, hint: `${positionLabel(cp)} · ${entriesLabel(cp.entryCount)}` };
}

interface Errors {
  party?: string;
  amount?: string;
}

/**
 * Add lending: records one ledger entry for an existing person or a new one. The linked-transaction
 * field of the Legacy form is left out until Dinero has a transaction picker (open question).
 */
export function AddLendingDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const today = todayInAppZone();
  const createLending = useCreateLending({
    onError: (e) => showToast(getErrorMessage(e, 'Failed to create lending'), { tone: 'danger' }),
  });

  const [party, setParty] = React.useState<CounterpartySelection | null>(null);
  const [search, setSearch] = React.useState('');
  const [entryType, setEntryType] = React.useState<LendingEntryType>('lent');
  const [amount, setAmount] = React.useState('');
  const [entryDate, setEntryDate] = React.useState(today);
  const [expectedReturnDate, setExpectedReturnDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Errors>({});

  const term = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const { data: found } = useCounterpartySearch(term);
  const people = React.useMemo(() => found?.content ?? [], [found]);

  const partyOptions = React.useMemo(() => {
    const list = people.map(personOption);
    if (party?.kind === 'existing' && !people.some((p) => p.id === party.counterparty.id)) {
      list.unshift(personOption(party.counterparty));
    }
    if (party?.kind === 'new') list.unshift({ value: NEW_PREFIX + party.name, label: party.name, hint: 'New person' });
    return list;
  }, [people, party]);

  const settlement = isSettlementType(entryType);
  const partyNet = party?.kind === 'existing' ? party.counterparty.netPosition : 0;
  const warning = party ? settlementWarning(entryType, Number(amount), partyNet, selectionName(party)) : null;

  const pickParty = (value: string) => {
    if (value.startsWith(NEW_PREFIX)) return;
    const existing = people.find((p) => p.id === value);
    if (existing) setParty({ kind: 'existing', counterparty: existing });
    setErrors((e) => ({ ...e, party: undefined }));
  };

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
            <Select
              label="Person"
              placeholder="Pick or type a name"
              searchable
              searchPlaceholder="Type a name"
              searchValue={search}
              onSearchChange={setSearch}
              filter="none"
              options={partyOptions}
              value={party ? (party.kind === 'new' ? NEW_PREFIX + party.name : party.counterparty.id) : undefined}
              onValueChange={(v) => pickParty(v as string)}
              onCreate={(name) => {
                setParty({ kind: 'new', name });
                setErrors((e) => ({ ...e, party: undefined }));
              }}
              createLabel={(name) => `Add "${name}"`}
              emptyText={() => 'No people yet. Type a name to add one.'}
              error={errors.party}
            />
            <Select
              label="Entry type"
              groups={ENTRY_TYPE_GROUPS}
              value={entryType}
              onValueChange={(v) => setEntryType(v as LendingEntryType)}
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
