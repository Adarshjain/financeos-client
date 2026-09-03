'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import type { Page } from '@/lib/pagination';
import { keys } from '@/lib/query/keys';
import {
  CounterpartyResponse,
  CreateLendingRequest,
  LendingDirection,
} from '@/lib/types';

const PAGE_SIZE = 50;

const EMPTY_PAGE: Page<CounterpartyResponse> = {
  content: [],
  number: 0,
  size: PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  empty: true,
};

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.response.message : fallback;
}

interface UseLendingsBrowserProps {
  initialPage?: number;
}

export function useLendingsBrowser({
  initialPage = 0,
}: UseLendingsBrowserProps = {}) {
  const qc = useQueryClient();

  const [page, setPage] = useState(initialPage);
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

  const { data } = useQuery({
    queryKey: keys.lendings.counterparties({ page, size: PAGE_SIZE }),
    queryFn: async () =>
      (
        await api.GET('/api/v1/counterparties', {
          params: { query: { page, size: PAGE_SIZE, sort: [] } },
        })
      ).data! as Page<CounterpartyResponse>,
    placeholderData: keepPreviousData,
  });

  const counterpartiesPage = data ?? EMPTY_PAGE;

  const invalidateLendings = () =>
    qc.invalidateQueries({ queryKey: keys.lendings.all });

  const deleteCpMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/counterparties/{id}', { params: { path: { id } } }),
    onSuccess: invalidateLendings,
    onError: (e) =>
      toast.error(errorMessage(e, 'Failed to delete counterparty')),
  });

  const createLendingMutation = useMutation({
    mutationFn: (body: CreateLendingRequest) =>
      api.POST('/api/v1/lendings', { body }).then((r) => r.data!),
    onSuccess: () => {
      invalidateLendings();
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to create lending')),
  });

  const handlePageChange = (newPage: number) => setPage(newPage);

  const handleDeleteCp = async (cp: CounterpartyResponse) => {
    try {
      await deleteCpMutation.mutateAsync(cp.id);
      toast.success(`Deleted ${cp.name}`);
    } catch {
      // onError already surfaced the toast.
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

    try {
      await createLendingMutation.mutateAsync({
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
      toast.success('Lending recorded successfully');
      setCreateOpen(false);
      setPage(0);
    } catch {
      // onError already surfaced the toast.
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
    loading: createLendingMutation.isPending,
    filteredContent,
    handlePageChange,
    handleDeleteCp,
    handleCreateLending,
  };
}
