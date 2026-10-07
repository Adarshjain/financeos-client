'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type {
  CounterpartySelection,
  CreateLendingRequest,
  LendingDirection,
  LendingKind,
  LendingResponse,
} from '@/lib/lending.types';
import {
  fromEntryType,
  type LendingEntryType,
  suggestedEntryType,
  toEntryType,
} from '@/lib/lendingEntry';
import { useCounterpartySuggestion } from '@/lib/query/hooks/useCounterparties';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { Transaction } from '@/lib/transaction.types';

interface UseRecordLendingProps {
  /** Undefined whenever the LENDING link kind isn't the active/enabled one. */
  transaction: Transaction | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface UseRecordLendingResult {
  direction: LendingDirection;
  /** Direction is locked to the transaction; this picks principal vs settlement within it. */
  entryType: LendingEntryType;
  setEntryType: (type: LendingEntryType) => void;
  party: CounterpartySelection | null;
  setParty: (party: CounterpartySelection | null) => void;
  /** Counterparty the description matched, if any — shown as "Suggested" by the picker. */
  suggestedId: string | null;
  amount: string;
  setAmount: (value: string) => void;
  entryDate: string;
  setEntryDate: (value: string) => void;
  expectedReturnDate: string;
  setExpectedReturnDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  /** Unlinked, direction-matching entries of the chosen existing person. */
  unlinkedEntries: LendingResponse[];
  loadingExistingEntries: boolean;
  attachingId: string | null;
  submitting: boolean;
  canSubmitNew: boolean;
  handleSubmitNew: () => void;
  handleAttach: (lendingId: string) => void;
}

export function useRecordLending({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: UseRecordLendingProps): UseRecordLendingResult {
  const queryClient = useQueryClient();

  // Server rule: DEBIT (negative amount) <-> lent, CREDIT <-> borrowed. Locked,
  // not user-editable. Defaults to 'lent' when there's no subject transaction
  // yet (the body isn't rendered in that case, so this value is unused).
  const direction: LendingDirection = (transaction?.amount ?? -1) < 0 ? 'lent' : 'borrowed';

  const [party, setParty] = React.useState<CounterpartySelection | null>(null);
  const [kind, setKind] = React.useState<LendingKind>('principal');
  const [amount, setAmount] = React.useState('');
  const [entryDate, setEntryDate] = React.useState('');
  const [expectedReturnDate, setExpectedReturnDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [attachingId, setAttachingId] = React.useState<string | null>(null);

  const suggestionAppliedRef = React.useRef(false);
  const kindTouchedRef = React.useRef(false);
  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !prevOpenRef.current && transaction) {
      setParty(null);
      setKind('principal');
      kindTouchedRef.current = false;
      setAmount(Math.abs(transaction.amount).toString());
      setEntryDate(transaction.date);
      setExpectedReturnDate('');
      setNotes('');
      setAttachingId(null);
      suggestionAppliedRef.current = false;
    }
    prevOpenRef.current = open;
  }, [open, transaction]);

  // Name-token match on the description, computed server-side over all of the
  // user's people. Applied once per dialog open, and only while nothing has
  // been picked yet, so it never overrides a choice the user already made.
  const suggestionQuery = useCounterpartySuggestion(
    transaction?.description ?? transaction?.sourcedDescription,
    open && Boolean(transaction),
  );
  const suggestion = suggestionQuery.data ?? null;
  const suggestedId = open ? (suggestion?.id ?? null) : null;

  React.useEffect(() => {
    if (!open || !suggestion || suggestionAppliedRef.current) return;
    suggestionAppliedRef.current = true;
    setParty((current) => current ?? { kind: 'existing', counterparty: suggestion });
  }, [open, suggestion]);

  // Until the user picks explicitly, default the kind from the person's
  // balance: money in from someone who owes you is a repayment, not a borrow.
  React.useEffect(() => {
    if (kindTouchedRef.current) return;
    const net = party?.kind === 'existing' ? party.counterparty.netPosition : 0;
    setKind(fromEntryType(suggestedEntryType(direction, net)).kind);
  }, [party, direction]);

  const entryType = toEntryType(direction, kind);
  const setEntryType = (next: LendingEntryType) => {
    kindTouchedRef.current = true;
    setKind(fromEntryType(next).kind);
  };

  const existingCounterpartyId = party?.kind === 'existing' ? party.counterparty.id : '';

  const existingEntriesQuery = useQuery({
    queryKey: keys.lendings.list({ counterpartyId: existingCounterpartyId, page: 0, size: 50 }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/lendings', {
        params: { query: { counterpartyId: existingCounterpartyId, page: 0, size: 50 } },
      });
      return (data?.content ?? []) as LendingResponse[];
    },
    enabled: open && Boolean(existingCounterpartyId),
  });

  const unlinkedEntries = React.useMemo(
    () =>
      (existingEntriesQuery.data ?? []).filter(
        (entry) => !entry.transaction && entry.direction === direction,
      ),
    [existingEntriesQuery.data, direction],
  );

  const finishAndClose = () => {
    invalidateLendingQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    onOpenChange(false);
    onSuccess?.();
  };

  const createMutation = useMutation({
    mutationFn: (body: CreateLendingRequest) =>
      api.POST('/api/v1/lendings', { body }).then((r) => r.data!),
    onSuccess: () => {
      toast.success('Lending recorded');
      finishAndClose();
    },
    onError: (err: unknown) => {
      toastError(err, 'Failed to record lending');
    },
  });

  const attachMutation = useMutation({
    mutationFn: (lendingId: string) =>
      api.PUT('/api/v1/lendings/{id}/transaction', {
        params: { path: { id: lendingId } },
        body: { transactionId: transaction!.id },
      }),
    onMutate: (lendingId: string) => setAttachingId(lendingId),
    onSuccess: () => {
      toast.success('Attached to ledger entry');
      finishAndClose();
    },
    onError: (err: unknown) => {
      toastError(err, 'Failed to attach transaction');
    },
    onSettled: () => setAttachingId(null),
  });

  const canSubmitNew =
    Boolean(transaction) && party !== null && Number(amount) > 0 && Boolean(entryDate);

  const handleSubmitNew = () => {
    if (!canSubmitNew || !transaction || !party) {
      toast.error('Fill in the required fields');
      return;
    }
    const body: CreateLendingRequest = {
      direction,
      kind,
      amount: Number(amount),
      entryDate,
      transactionId: transaction.id,
      expectedReturnDate: expectedReturnDate || undefined,
      notes: notes.trim() || undefined,
      ...(party.kind === 'new'
        ? { newCounterpartyName: party.name }
        : { counterpartyId: party.counterparty.id }),
    };
    createMutation.mutate(body);
  };

  const handleAttach = (lendingId: string) => {
    if (!transaction) return;
    attachMutation.mutate(lendingId);
  };

  return {
    direction,
    entryType,
    setEntryType,
    party,
    setParty,
    suggestedId,
    amount,
    setAmount,
    entryDate,
    setEntryDate,
    expectedReturnDate,
    setExpectedReturnDate,
    notes,
    setNotes,
    unlinkedEntries,
    loadingExistingEntries: existingEntriesQuery.isLoading,
    attachingId,
    submitting: createMutation.isPending,
    canSubmitNew,
    handleSubmitNew,
    handleAttach,
  };
}
