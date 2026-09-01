'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  createLendingAction,
  deleteCounterpartyAction,
  fetchCounterpartiesAction,
} from '@/actions/lendings';
import { Page } from '@/lib/pagination';
import { CounterpartyResponse, LendingDirection } from '@/lib/types';

interface UseLendingsBrowserProps {
  initialCounterparties: Page<CounterpartyResponse>;
}

export function useLendingsBrowser({
  initialCounterparties,
}: UseLendingsBrowserProps) {
  const [counterpartiesPage, setCounterpartiesPage] =
    useState<Page<CounterpartyResponse>>(initialCounterparties);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [selectedCpId, setSelectedCpId] = useState<string>('new');
  const [newCpName, setNewCpName] = useState('');
  const [direction, setDirection] = useState<LendingDirection>('lent');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [txId, setTxId] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePageChange = async (newPage: number) => {
    const res = await fetchCounterpartiesAction(
      newPage,
      counterpartiesPage.size
    );
    if (res.success) {
      setCounterpartiesPage(res.data);
    } else {
      toast.error(res.error.message);
    }
  };

  const handleDeleteCp = async (cp: CounterpartyResponse) => {
    const res = await deleteCounterpartyAction(cp.id);
    if (res.success) {
      toast.success(`Deleted ${cp.name}`);
      const cpRes = await fetchCounterpartiesAction(
        counterpartiesPage.number,
        counterpartiesPage.size
      );
      if (cpRes.success) setCounterpartiesPage(cpRes.data);
    } else {
      toast.error(res.error.message);
    }
  };

  const handleCreateLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCpId === 'new' && !newCpName.trim()) {
      toast.error('Person name is required');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const res = await createLendingAction({
        counterpartyId: selectedCpId !== 'new' ? selectedCpId : undefined,
        newCounterpartyName:
          selectedCpId === 'new' ? newCpName.trim() : undefined,
        direction,
        amount: Number(amount),
        entryDate,
        expectedReturnDate: expectedReturnDate || undefined,
        transactionId: txId.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success('Lending recorded successfully');
        setCreateOpen(false);
        const cpRes = await fetchCounterpartiesAction(
          0,
          counterpartiesPage.size
        );
        if (cpRes.success) setCounterpartiesPage(cpRes.data);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return counterpartiesPage.content;
    return counterpartiesPage.content.filter(
      (cp) =>
        cp.name.toLowerCase().includes(q) ||
        (cp.notes && cp.notes.toLowerCase().includes(q))
    );
  }, [counterpartiesPage.content, search]);

  return {
    counterpartiesPage,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    selectedCpId,
    setSelectedCpId,
    newCpName,
    setNewCpName,
    direction,
    setDirection,
    amount,
    setAmount,
    entryDate,
    setEntryDate,
    expectedReturnDate,
    setExpectedReturnDate,
    notes,
    setNotes,
    txId,
    setTxId,
    loading,
    filteredContent,
    handlePageChange,
    handleDeleteCp,
    handleCreateLending,
  };
}
