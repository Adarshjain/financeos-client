'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type { Page } from '@/lib/pagination';
import { keys } from '@/lib/query/keys';
import {
  CounterpartyResponse,
  LendingDirection,
  LendingResponse,
} from '@/lib/types';

import { LendingEntryWithBalance } from './CounterpartyLedgerTable';
import { useCounterpartyMutations } from './useCounterpartyMutations';

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

  // Edit Counterparty Details State
  const [editCpOpen, setEditCpOpen] = useState(false);
  const [cpName, setCpName] = useState(cp?.name ?? '');
  const [cpNotes, setCpNotes] = useState(cp?.notes ?? '');

  // Add Entry State
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [addDir, setAddDir] = useState<LendingDirection>('lent');
  const [addAmount, setAddAmount] = useState('');
  const [addEntryDate, setAddEntryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [addExpDate, setAddExpDate] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Edit Entry State
  const [editLendingOpen, setEditLendingOpen] = useState(false);
  const [editingLendingId, setEditingLendingId] = useState<string | null>(null);
  const [lendingDir, setLendingDir] = useState<LendingDirection>('lent');
  const [lendingAmount, setLendingAmount] = useState('');
  const [lendingDate, setLendingDate] = useState('');
  const [lendingExpDate, setLendingExpDate] = useState('');
  const [lendingNotes, setLendingNotes] = useState('');

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

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    try {
      await mutations.createLending.mutateAsync({
        counterpartyId,
        direction: addDir,
        amount: Number(addAmount),
        entryDate: addEntryDate,
        expectedReturnDate: addExpDate || undefined,
        notes: addNotes.trim() || undefined,
      });
      toast.success('Entry added');
      setAddEntryOpen(false);
      setAddAmount('');
      setAddNotes('');
      setAddExpDate('');
    } catch {
      // onError already surfaced the toast.
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

  const handleOpenEditLending = (lending: LendingResponse) => {
    setEditingLendingId(lending.id);
    setLendingDir(lending.direction);
    setLendingAmount(String(lending.amount));
    setLendingDate(lending.entryDate);
    setLendingExpDate(lending.expectedReturnDate ?? '');
    setLendingNotes(lending.notes ?? '');
    setEditLendingOpen(true);
  };

  const handleUpdateLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLendingId) return;
    try {
      await mutations.updateLending.mutateAsync({
        id: editingLendingId,
        body: {
          direction: lendingDir,
          amount: lendingAmount ? Number(lendingAmount) : undefined,
          entryDate: lendingDate || undefined,
          expectedReturnDate: lendingExpDate || undefined,
          notes: lendingNotes.trim() || undefined,
        },
      });
      toast.success('Entry updated');
      setEditLendingOpen(false);
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
    addEntryOpen,
    setAddEntryOpen,
    addDir,
    setAddDir,
    addAmount,
    setAddAmount,
    addEntryDate,
    setAddEntryDate,
    addExpDate,
    setAddExpDate,
    addNotes,
    setAddNotes,
    submittingAddEntry: mutations.createLending.isPending,
    editLendingOpen,
    setEditLendingOpen,
    lendingDir,
    setLendingDir,
    lendingAmount,
    setLendingAmount,
    lendingDate,
    setLendingDate,
    lendingExpDate,
    setLendingExpDate,
    lendingNotes,
    setLendingNotes,
    submittingEditLending: mutations.updateLending.isPending,
    handleUpdateCp,
    handleDeleteCp,
    handleAddEntry,
    handleDeleteLending,
    handleOpenEditLending,
    handleUpdateLending,
  };
}

export { COUNTERPARTIES_PAGE_SIZE, LENDINGS_PAGE_SIZE };
