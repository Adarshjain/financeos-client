'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAddLendingForm } from '@/components/lendings/useAddLendingForm';
import { api } from '@/lib/api/client';
import type { Page } from '@/lib/pagination';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { CounterpartyResponse } from '@/lib/types';

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



interface UseLendingsBrowserProps {
  initialPage?: number;
}

export function useLendingsBrowser({
  initialPage = 0,
}: UseLendingsBrowserProps = {}) {
  const qc = useQueryClient();

  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState('');
  // The create dialog's form; a new entry returns the list to its first page.
  const form = useAddLendingForm({ onCreated: () => setPage(0) });

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

  const invalidateLendings = () => invalidateLendingQueries(qc);

  const deleteCpMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/counterparties/{id}', { params: { path: { id } } }),
    onSuccess: invalidateLendings,
    onError: (e) =>
      toastError(e, 'Failed to delete counterparty'),
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
    createOpen: form.open,
    setCreateOpen: form.setOpen,
    party: form.party,
    setParty: form.setParty,
    entryType: form.entryType,
    setEntryType: form.setEntryType,
    amount: form.amount,
    setAmount: form.setAmount,
    entryDate: form.entryDate,
    setEntryDate: form.setEntryDate,
    expectedReturnDate: form.expectedReturnDate,
    setExpectedReturnDate: form.setExpectedReturnDate,
    notes: form.notes,
    setNotes: form.setNotes,
    selectedTx: form.selectedTx,
    onSelectTx: form.onSelectTx,
    onClearTx: form.onClearTx,
    loading: form.loading,
    filteredContent,
    handlePageChange,
    handleDeleteCp,
    handleCreateLending: form.handleCreateLending,
  };
}
