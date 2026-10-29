'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { unwrapAction } from '@/lib/actionResult';
import { amountExpressionValue } from '@/lib/amountExpression';
import type { Schemas } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';
import { notify } from '@/lib/notify';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { Transaction } from '@/lib/transaction.types';

import { createEpfWithdrawal, linkEpfWithdrawal, loadEpfEmployers, loadEpfWithdrawals } from './linkActions';

const AMOUNT_ERROR = 'Enter an amount above ₹0.';

export type EpfLinkMode = 'existing' | 'new';
export type EpfWithdrawalKind = NonNullable<Schemas['EpfEntryRequest']['withdrawalKind']>;
export type EpfWithdrawalOption = Schemas['EpfWithdrawalOption'];

export const EPF_KIND_OPTIONS: { value: EpfWithdrawalKind; label: string }[] = [
  { value: 'PARTIAL', label: 'Partial (Form 31)' },
  { value: 'FINAL_SETTLEMENT', label: 'Final settlement (Form 19)' },
  { value: 'PENSION', label: 'Pension (Form 10C)' },
];

const KIND_WORDS: Record<EpfWithdrawalKind, string> = {
  PARTIAL: 'Partial',
  FINAL_SETTLEMENT: 'Final settlement',
  PENSION: 'Pension',
};

const FORM_WORDS: Record<EpfWithdrawalKind, string> = {
  PARTIAL: 'Form 31',
  FINAL_SETTLEMENT: 'Form 19',
  PENSION: 'Form 10C',
};

/** Query key of the unlinked withdrawals offered for one transaction. */
export const epfWithdrawalsKey = (transactionId: string) => keys.epf.withdrawals(transactionId);

/** "Final settlement · Globex Retail". */
export function epfOptionTitle(entry: Schemas['EpfEntryResponse']): string {
  const kind = entry.withdrawalKind ? KIND_WORDS[entry.withdrawalKind as EpfWithdrawalKind] : 'Withdrawal';
  return `${kind} · ${entry.employerName}`;
}

/** The words after the date under a withdrawal: why it is offered, the form, the note. */
export function epfOptionNotes(option: EpfWithdrawalOption): string[] {
  const { entry, suggested, tdsGap } = option;
  const notes: string[] = [];
  if (tdsGap != null) notes.push('no TDS recorded');
  if (suggested) notes.push('suggested');
  if (entry.withdrawalKind === 'PENSION') notes.push(FORM_WORDS.PENSION);
  if (entry.note) notes.push(entry.note);
  return notes;
}

/** What the credit is worth to the entry: the whole amount of the withdrawal. */
export function epfOptionAmount(entry: Schemas['EpfEntryResponse']): number {
  return entry.grossAmount ?? (entry.employeeAmount ?? 0) + (entry.employerAmount ?? 0) + (entry.pensionAmount ?? 0);
}

interface Props {
  /** Undefined whenever the EPF_WITHDRAWAL link kind isn't the active/enabled one. */
  transaction: Transaction | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

class LinkAfterCreateError extends Error {
  constructor(readonly original: unknown) {
    super("Withdrawal recorded, but couldn't link it. Try again.");
  }
}

/** EPF withdrawal: attach the credit to an unlinked withdrawal (TDS gap optional), or record a new one and link it. */
export function useEpfWithdrawalLink({ transaction, open, onOpenChange, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const transactionId = transaction?.id;
  const [mode, setMode] = React.useState<EpfLinkMode>('existing');
  const [search, setSearch] = React.useState('');
  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [tdsChoice, setTdsChoice] = React.useState<boolean | null>(null);

  const [employerId, setEmployerIdState] = React.useState('');
  const [kind, setKindState] = React.useState<EpfWithdrawalKind>('PARTIAL');
  const [creditedOn, setCreditedOn] = React.useState('');
  const [employee, setEmployee] = React.useState('');
  const [employer, setEmployer] = React.useState('');
  const [pension, setPension] = React.useState('');
  const [tdsOn, setTdsOn] = React.useState(false);
  const [tds, setTds] = React.useState('');
  const [note, setNote] = React.useState('');

  // Id of a withdrawal already created by a failed "record & link" attempt; retries only re-link.
  const createdIdRef = React.useRef<string | null>(null);
  const prevOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !prevOpenRef.current && transaction) {
      createdIdRef.current = null;
      setMode('existing');
      setSearch('');
      setPickedId(null);
      setTdsChoice(null);
      setEmployerIdState('');
      setKindState('PARTIAL');
      setCreditedOn(transaction.date);
      setEmployee(Math.abs(transaction.amount).toString());
      setEmployer('');
      setPension(Math.abs(transaction.amount).toString());
      setTdsOn(false);
      setTds('');
      setNote('');
    }
    prevOpenRef.current = open;
  }, [open, transaction]);

  const withdrawalsQuery = useQuery({
    queryKey: epfWithdrawalsKey(transactionId ?? ''),
    queryFn: () => unwrapAction(loadEpfWithdrawals(transactionId!)),
    enabled: open && Boolean(transactionId),
  });
  const employersQuery = useQuery({
    queryKey: keys.epf.employers(),
    queryFn: () => unwrapAction(loadEpfEmployers()),
    enabled: open && mode === 'new',
  });

  const employers = employersQuery.data;
  // A final settlement withdraws the employer's whole balance: the shares are filled from it.
  const fillFromBalance = (nextKind: EpfWithdrawalKind, nextEmployerId: string) => {
    const e = nextKind === 'FINAL_SETTLEMENT' ? employers?.find((x) => x.id === nextEmployerId) : undefined;
    if (!e) return;
    setEmployee(String(e.employeeBalance));
    setEmployer(String(e.employerBalance));
  };
  const setEmployerId = (id: string) => {
    setEmployerIdState(id);
    fillFromBalance(kind, id);
  };
  const setKind = (next: EpfWithdrawalKind) => {
    setKindState(next);
    fillFromBalance(next, employerId);
  };

  const all = React.useMemo(() => withdrawalsQuery.data ?? [], [withdrawalsQuery.data]);
  const options = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => `${o.entry.employerName} ${epfOptionTitle(o.entry)} ${o.entry.note ?? ''}`.toLowerCase().includes(q));
  }, [all, search]);

  const suggestedId = all.find((o) => o.suggested)?.entry.id;
  // A selection hidden by the search filter is dropped so it can't be submitted unseen.
  const candidateId = pickedId ?? suggestedId ?? '';
  const selectedId = options.some((o) => o.entry.id === candidateId) ? candidateId : '';
  const selected = all.find((o) => o.entry.id === selectedId);
  const tdsGap = selected?.tdsGap ?? null;
  const recordTds = tdsGap !== null && (tdsChoice ?? true);

  React.useEffect(() => {
    setTdsChoice(null);
  }, [selectedId]);

  const numEmployee = amountExpressionValue(employee);
  const numEmployer = amountExpressionValue(employer);
  const numPension = amountExpressionValue(pension);
  const numTds = tdsOn ? amountExpressionValue(tds) : null;
  const isPension = kind === 'PENSION';
  const bad = (text: string, n: number | null) => Boolean(text.trim()) && (n === null || n < 0);
  const shareError = (text: string, n: number | null) => (mode === 'new' && !isPension && bad(text, n) ? AMOUNT_ERROR : undefined);
  const employeeError = shareError(employee, numEmployee);
  const employerError = shareError(employer, numEmployer);
  const pensionError = mode === 'new' && isPension && bad(pension, numPension) ? AMOUNT_ERROR : undefined;
  const tdsError = mode === 'new' && tdsOn && bad(tds, numTds) ? AMOUNT_ERROR : undefined;
  const sharesTotal = isPension ? (numPension ?? 0) : (numEmployee ?? 0) + (numEmployer ?? 0);
  const received = sharesTotal - (numTds ?? 0);
  const receivedCaption =
    mode === 'new' && sharesTotal > 0 && received >= 0 ? `Received in bank: ${formatMoney(received, { decimals: 'exact' })}.` : null;
  const newValid =
    Boolean(employerId) &&
    Boolean(creditedOn) &&
    sharesTotal > 0 &&
    !employeeError &&
    !employerError &&
    !pensionError &&
    !tdsError;
  const canSubmit = Boolean(transaction) && (mode === 'existing' ? Boolean(selected) : newValid);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'existing') {
        return unwrapAction(linkEpfWithdrawal(selectedId, transactionId!, recordTds));
      }
      if (!createdIdRef.current) {
        const created = await unwrapAction(
          createEpfWithdrawal({
            type: 'WITHDRAWAL',
            withdrawalKind: kind,
            employerId,
            creditedOn,
            employeeAmount: isPension ? 0 : (numEmployee ?? 0),
            employerAmount: isPension ? 0 : (numEmployer ?? 0),
            pensionAmount: isPension ? (numPension ?? 0) : 0,
            tdsAmount: numTds,
            note: note.trim() || undefined,
          }),
        );
        createdIdRef.current = created.id;
      }
      try {
        return await unwrapAction(linkEpfWithdrawal(createdIdRef.current, transactionId!, false));
      } catch (err) {
        throw new LinkAfterCreateError(err);
      }
    },
    onSuccess: () => {
      notify.success(mode === 'existing' ? 'EPF withdrawal linked' : 'EPF withdrawal recorded and linked');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      queryClient.invalidateQueries({ queryKey: keys.epf.all });
      invalidateInvestmentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: keys.inbox.all });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof LinkAfterCreateError) {
        // The withdrawal exists now; keep the dialog open so a retry only re-links.
        queryClient.invalidateQueries({ queryKey: keys.epf.all });
        toastError(err.original, "EPF withdrawal recorded, but couldn't link it. Try again.");
        return;
      }
      toastError(err, "Couldn't link the EPF withdrawal. Try again.");
    },
  });

  const handleSubmit = () => {
    if (!canSubmit) {
      notify.error(mode === 'existing' ? 'Pick a withdrawal to link.' : 'Check the withdrawal details.');
      return;
    }
    submitMutation.mutate();
  };

  return {
    mode,
    setMode,
    search,
    setSearch,
    options,
    loadingOptions: withdrawalsQuery.isLoading,
    optionsError: withdrawalsQuery.isError,
    selectedId,
    setSelectedId: setPickedId,
    tdsGap,
    recordTds,
    setRecordTds: setTdsChoice as (v: boolean) => void,
    employers: employers ?? [],
    receivedCaption,
    loadingEmployers: employersQuery.isLoading,
    employerId,
    setEmployerId,
    kind,
    setKind,
    creditedOn,
    setCreditedOn,
    employee,
    setEmployee,
    employer,
    setEmployer,
    pension,
    setPension,
    tdsOn,
    setTdsOn,
    tds,
    setTds,
    note,
    setNote,
    employeeError,
    employerError,
    pensionError,
    tdsError,
    submitting: submitMutation.isPending,
    canSubmit,
    handleSubmit,
  };
}

export type UseEpfWithdrawalLinkResult = ReturnType<typeof useEpfWithdrawalLink>;
