'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type { Page } from '@/lib/pagination';
import { keys } from '@/lib/query/keys';
import { CounterpartyResponse, LendingResponse } from '@/lib/types';

import { LendingEntryWithBalance } from './CounterpartyLedgerTable';
import { useAddLendingEntry } from './useAddLendingEntry';
import { useCounterpartyMutations } from './useCounterpartyMutations';
import { useEditLendingEntry } from './useEditLendingEntry';

const COUNTERPARTIES_PAGE_SIZE = 100;
const LENDINGS_PAGE_SIZE = 200;
const EMPTY_LENDINGS: LendingResponse[] = [];

interface UseCounterpartyDetailProps {
  counterpartyId: string;
}

export function useCounterpartyDetail({
  counterpartyId,
}: UseCounterpartyDetailProps) {
  const router = useRouter();

  const { data: counterpartiesPage } = useQuery({
    queryKey: keys.lendings.counterparties({
      page: 0,
      size: COUNTERPARTIES_PAGE_SIZE,
    }),
    queryFn: async () =>
      (
        await api.GET('/api/v1/counterparties', {
          params: {
            query: { page: 0, size: COUNTERPARTIES_PAGE_SIZE, sort: [] },
          },
        })
      ).data! as Page<CounterpartyResponse>,
  });
  const cp = counterpartiesPage?.content.find((c) => c.id === counterpartyId);

  const { data: lendingsPage } = useQuery({
    queryKey: keys.lendings.list({
      counterpartyId,
      page: 0,
      size: LENDINGS_PAGE_SIZE,
    }),
    queryFn: async () =>
      (
        await api.GET('/api/v1/lendings', {
          params: {
            query: {
              counterpartyId,
              page: 0,
              size: LENDINGS_PAGE_SIZE,
              sort: [],
            },
          },
        })
      ).data! as Page<LendingResponse>,
    enabled: Boolean(counterpartyId),
  });
  const lendings = lendingsPage?.content ?? EMPTY_LENDINGS;

  const mutations = useCounterpartyMutations(counterpartyId);
  const addEntry = useAddLendingEntry(counterpartyId, mutations.createLending);
  const editEntry = useEditLendingEntry(mutations);

  // Edit Counterparty Details State
  const [editCpOpen, setEditCpOpen] = useState(false);
  const [cpName, setCpName] = useState(cp?.name ?? '');
  const [cpNotes, setCpNotes] = useState(cp?.notes ?? '');

  // Sort entries ASCENDING by date for running balance calculation
  const sortedEntries = useMemo(() => {
    return [...lendings].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  }, [lendings]);

  // Compute running cumulative balance for each entry down the table
  const entriesWithRunningBalance: LendingEntryWithBalance[] = useMemo(() => {
    return sortedEntries.reduce<LendingEntryWithBalance[]>((acc, entry) => {
      const prevBalance =
        acc.length > 0 ? acc[acc.length - 1].runningBalance : 0;
      const runningBalance =
        entry.direction === 'lent'
          ? prevBalance + entry.amount
          : prevBalance - entry.amount;
      acc.push({ ...entry, runningBalance });
      return acc;
    }, []);
  }, [sortedEntries]);

  const handleUpdateCp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      await mutations.updateCp.mutateAsync({
        name: cpName.trim(),
        notes: cpNotes.trim() || undefined,
      });
      toast.success('Person details updated');
      setEditCpOpen(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  const handleDeleteCp = async () => {
    try {
      await mutations.deleteCp.mutateAsync();
      toast.success('Person deleted');
      router.push('/loans/lendings');
    } catch {
      // onError already surfaced the toast; ConfirmationDialog still closes.
    }
  };

  const handleDeleteLending = async (lendingId: string) => {
    try {
      await mutations.deleteLending.mutateAsync(lendingId);
      toast.success('Entry deleted');
    } catch {
      // onError already surfaced the toast.
    }
  };

  return {
    cp,
    entriesWithRunningBalance,
    editCpOpen,
    setEditCpOpen,
    cpName,
    setCpName,
    cpNotes,
    setCpNotes,
    submittingCp: mutations.updateCp.isPending,
    ...addEntry,
    ...editEntry,
    handleUpdateCp,
    handleDeleteCp,
    handleDeleteLending,
  };
}

export { COUNTERPARTIES_PAGE_SIZE, LENDINGS_PAGE_SIZE };
