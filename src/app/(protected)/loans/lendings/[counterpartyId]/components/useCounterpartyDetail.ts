'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  createLendingAction,
  deleteCounterpartyAction,
  deleteLendingAction,
  fetchLendingsAction,
  updateCounterpartyAction,
  updateLendingAction,
} from '@/actions/lendings';
import {
  CounterpartyResponse,
  LendingDirection,
  LendingResponse,
} from '@/lib/types';

import { LendingEntryWithBalance } from './CounterpartyLedgerTable';

interface UseCounterpartyDetailProps {
  initialCounterparty: CounterpartyResponse;
  initialLendings: LendingResponse[];
}

export function useCounterpartyDetail({
  initialCounterparty,
  initialLendings,
}: UseCounterpartyDetailProps) {
  const router = useRouter();

  const [cp, setCp] = useState<CounterpartyResponse>(initialCounterparty);
  const [lendings, setLendings] = useState<LendingResponse[]>(initialLendings);

  // Edit Counterparty Details State
  const [editCpOpen, setEditCpOpen] = useState(false);
  const [cpName, setCpName] = useState(cp.name);
  const [cpNotes, setCpNotes] = useState(cp.notes ?? '');
  const [submittingCp, setSubmittingCp] = useState(false);

  // Add Entry State
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [addDir, setAddDir] = useState<LendingDirection>('lent');
  const [addAmount, setAddAmount] = useState('');
  const [addEntryDate, setAddEntryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [addExpDate, setAddExpDate] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [submittingAddEntry, setSubmittingAddEntry] = useState(false);

  // Edit Entry State
  const [editLendingOpen, setEditLendingOpen] = useState(false);
  const [editingLending, setEditingLending] = useState<LendingResponse | null>(null);
  const [lendingDir, setLendingDir] = useState<LendingDirection>('lent');
  const [lendingAmount, setLendingAmount] = useState('');
  const [lendingDate, setLendingDate] = useState('');
  const [lendingExpDate, setLendingExpDate] = useState('');
  const [lendingNotes, setLendingNotes] = useState('');
  const [submittingEditLending, setSubmittingEditLending] = useState(false);

  const refreshData = async () => {
    const res = await fetchLendingsAction(cp.id, 0, 200);
    if (res.success) {
      setLendings(res.data.content);
      let lent = 0;
      let borrowed = 0;

      for (const l of res.data.content) {
        if (l.direction === 'lent') lent += l.amount;
        else if (l.direction === 'borrowed') borrowed += l.amount;
      }
      setCp((prev) => ({
        ...prev,
        totalLent: lent,
        totalBorrowed: borrowed,
        netPosition: lent - borrowed,
        entryCount: res.data.content.length,
      }));
    }
  };

  // Sort entries ASCENDING by date for running balance calculation
  const sortedEntries = useMemo(() => {
    return [...lendings].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  }, [lendings]);

  // Compute running cumulative balance for each entry down the table
  const entriesWithRunningBalance: LendingEntryWithBalance[] = useMemo(() => {
    let runningNet = 0;
    return sortedEntries.map((entry) => {
      if (entry.direction === 'lent') {
        runningNet += entry.amount;
      } else {
        runningNet -= entry.amount;
      }
      return {
        ...entry,
        runningBalance: runningNet,
      };
    });
  }, [sortedEntries]);

  const handleUpdateCp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSubmittingCp(true);
    try {
      const res = await updateCounterpartyAction(cp.id, {
        name: cpName.trim(),
        notes: cpNotes.trim() || undefined,
      });
      if (res.success) {
        toast.success('Person details updated');
        setCp(res.data);
        setEditCpOpen(false);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingCp(false);
    }
  };

  const handleDeleteCp = async () => {
    const res = await deleteCounterpartyAction(cp.id);
    if (res.success) {
      toast.success('Person deleted');
      router.push('/loans/lendings');
    } else {
      toast.error(res.error.message);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setSubmittingAddEntry(true);
    try {
      const res = await createLendingAction({
        counterpartyId: cp.id,
        direction: addDir,
        amount: Number(addAmount),
        entryDate: addEntryDate,
        expectedReturnDate: addExpDate || undefined,
        notes: addNotes.trim() || undefined,
      });
      if (res.success) {
        toast.success('Entry added');
        setAddEntryOpen(false);
        setAddAmount('');
        setAddNotes('');
        setAddExpDate('');
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingAddEntry(false);
    }
  };

  const handleDeleteLending = async (lendingId: string) => {
    const res = await deleteLendingAction(lendingId, cp.id);
    if (res.success) {
      toast.success('Entry deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleOpenEditLending = (lending: LendingResponse) => {
    setEditingLending(lending);
    setLendingDir(lending.direction);
    setLendingAmount(String(lending.amount));
    setLendingDate(lending.entryDate);
    setLendingExpDate(lending.expectedReturnDate ?? '');
    setLendingNotes(lending.notes ?? '');
    setEditLendingOpen(true);
  };

  const handleUpdateLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLending) return;
    setSubmittingEditLending(true);
    try {
      const res = await updateLendingAction(
        editingLending.id,
        {
          direction: lendingDir,
          amount: lendingAmount ? Number(lendingAmount) : undefined,
          entryDate: lendingDate || undefined,
          expectedReturnDate: lendingExpDate || undefined,
          notes: lendingNotes.trim() || undefined,
        },
        cp.id
      );
      if (res.success) {
        toast.success('Entry updated');
        setEditLendingOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingEditLending(false);
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
    submittingCp,
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
    submittingAddEntry,
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
    submittingEditLending,
    handleUpdateCp,
    handleDeleteCp,
    handleAddEntry,
    handleDeleteLending,
    handleOpenEditLending,
    handleUpdateLending,
  };
}
