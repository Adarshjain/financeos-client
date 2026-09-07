'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { suggestCounterparty } from '@/lib/lending.helpers';
import type {
  CounterpartyResponse,
  CreateLendingRequest,
  LendingDirection,
  LendingResponse,
} from '@/lib/lending.types';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

/** Sentinel `Select` value for "+ Add new person", mirroring AddLendingDialog. */
export const NEW_COUNTERPARTY_VALUE = 'new';

interface UseRecordLendingProps {
  /** Undefined whenever the LENDING link kind isn't the active/enabled one. */
  transaction: Transaction | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface UseRecordLendingResult {
  direction: LendingDirection;
  mode: 'new' | 'existing';
  setMode: (mode: 'new' | 'existing') => void;
  counterparties: CounterpartyResponse[];
  loadingCounterparties: boolean;
  selectedCpId: string;
  setSelectedCpId: (id: string) => void;
  newCpName: string;
  setNewCpName: (name: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  entryDate: string;
  setEntryDate: (value: string) => void;
  expectedReturnDate: string;
  setExpectedReturnDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
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

  const [mode, setMode] = React.useState<'new' | 'existing'>('new');
  const [selectedCpId, setSelectedCpId] = React.useState('');
  const [newCpName, setNewCpName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [entryDate, setEntryDate] = React.useState('');
  const [expectedReturnDate, setExpectedReturnDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [attachingId, setAttachingId] = React.useState<string | null>(null);

  const suggestionAppliedRef = React.useRef(false);
  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !prevOpenRef.current && transaction) {
      setMode('new');
      setSelectedCpId('');
      setNewCpName('');
      setAmount(Math.abs(transaction.amount).toString());
      setEntryDate(transaction.date);
      setExpectedReturnDate('');
      setNotes('');
      setAttachingId(null);
      suggestionAppliedRef.current = false;
    }
    prevOpenRef.current = open;
  }, [open, transaction]);

  const counterpartiesQuery = useQuery({
    queryKey: keys.lendings.counterparties({ page: 0, size: 200 }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/counterparties', {
        params: { query: { page: 0, size: 200 } },
      });
      return (data?.content ?? []) as CounterpartyResponse[];
    },
    enabled: open,
  });
  const counterparties = React.useMemo(
    () => counterpartiesQuery.data ?? [],
    [counterpartiesQuery.data],
  );

  // Pre-select a counterparty once per dialog open, when the description text
  // has an unambiguous single best match.
  React.useEffect(() => {
    if (!open || !transaction || suggestionAppliedRef.current || counterparties.length === 0) return;
    suggestionAppliedRef.current = true;
    const text = transaction.description ?? transaction.sourcedDescription;
    const suggestedId = suggestCounterparty(text, counterparties);
    if (suggestedId) setSelectedCpId(suggestedId);
  }, [open, counterparties, transaction]);

  const hasRealCounterparty = Boolean(selectedCpId) && selectedCpId !== NEW_COUNTERPARTY_VALUE;

  const existingEntriesQuery = useQuery({
    queryKey: keys.lendings.list({ counterpartyId: selectedCpId, page: 0, size: 50 }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/lendings', {
        params: { query: { counterpartyId: selectedCpId, page: 0, size: 50 } },
      });
      return (data?.content ?? []) as LendingResponse[];
    },
    enabled: open && mode === 'existing' && hasRealCounterparty,
  });

  const unlinkedEntries = React.useMemo(
    () =>
      (existingEntriesQuery.data ?? []).filter(
        (entry) => !entry.transaction && entry.direction === direction,
      ),
    [existingEntriesQuery.data, direction],
  );

  const finishAndClose = () => {
    queryClient.invalidateQueries({ queryKey: keys.lendings.all });
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
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to record lending');
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
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to attach transaction');
    },
    onSettled: () => setAttachingId(null),
  });

  const canSubmitNew =
    Boolean(transaction) &&
    (selectedCpId === NEW_COUNTERPARTY_VALUE ? newCpName.trim().length > 0 : hasRealCounterparty) &&
    Number(amount) > 0 &&
    Boolean(entryDate);

  const handleSubmitNew = () => {
    if (!canSubmitNew || !transaction) {
      toast.error('Fill in the required fields');
      return;
    }
    const body: CreateLendingRequest = {
      direction,
      amount: Number(amount),
      entryDate,
      transactionId: transaction.id,
      expectedReturnDate: expectedReturnDate || undefined,
      notes: notes.trim() || undefined,
      ...(selectedCpId === NEW_COUNTERPARTY_VALUE
        ? { newCounterpartyName: newCpName.trim() }
        : { counterpartyId: selectedCpId }),
    };
    createMutation.mutate(body);
  };

  const handleAttach = (lendingId: string) => {
    if (!transaction) return;
    attachMutation.mutate(lendingId);
  };

  return {
    direction,
    mode,
    setMode,
    counterparties,
    loadingCounterparties: counterpartiesQuery.isLoading,
    selectedCpId,
    setSelectedCpId,
    newCpName,
    setNewCpName,
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
