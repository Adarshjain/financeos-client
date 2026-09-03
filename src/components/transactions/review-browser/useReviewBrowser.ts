'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Account } from '@/lib/account.types';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { FilterClause } from '@/lib/reports.types';
import { ReviewReason } from '@/lib/transaction.types';

import {
  buildReviewFilters,
  computeHiddenCount,
  getPresentReasons,
  getSelectableAccounts,
  getSelectedTxns,
  mapBatchFailures,
  mapBatchSkips,
  togglePageSelection,
} from './reviewBrowser.helpers';

export function useReviewBrowser(accounts: Account[]) {
  const queryClient = useQueryClient();
  const selectableAccounts = useMemo(
    () => getSelectableAccounts(accounts),
    [accounts]
  );

  const [appliedAccountIds, setAppliedAccountIds] = useState<string[]>(
    selectableAccounts.map((a) => a.id)
  );
  const [appliedOnlyUpToLastStatement, setAppliedOnlyUpToLastStatement] = useState(true);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeReasonFilter, setActiveReasonFilter] = useState<string>('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('date,desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [reasonsToApprove, setReasonsToApprove] = useState<ReviewReason[]>([]);
  const [summaryData, setSummaryData] = useState<{
    succeededCount: number;
    skippedCount: number;
    failures: { description: string; reason: string }[];
    skips: string[];
  } | null>(null);

  const filters: FilterClause[] = useMemo(
    () =>
      buildReviewFilters({
        activeReasonFilter,
        appliedAccountIds,
        selectableAccountsCount: selectableAccounts.length,
        appliedOnlyUpToLastStatement,
      }),
    [activeReasonFilter, appliedAccountIds, appliedOnlyUpToLastStatement, selectableAccounts.length]
  );

  const searchParams = {
    filters,
    search: debouncedSearch || undefined,
    page,
    size,
    sort: sortBy,
    accountsSelected: appliedAccountIds.length,
  };

  const { data: pagedData = null, isLoading: loading } = useQuery({
    queryKey: keys.transactions.search(searchParams),
    queryFn: async () => {
      if (searchParams.accountsSelected === 0) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: searchParams.size,
          number: 0,
          first: true,
          last: true,
          empty: true,
        };
      }
      const { data } = await api.POST('/api/v1/transactions/search', {
        body: {
          filters: searchParams.filters,
          search: searchParams.search,
        },
        params: {
          query: {
            page: searchParams.page,
            size: searchParams.size,
            sort: [searchParams.sort],
          },
        },
      });
      return data ?? null;
    },
    placeholderData: keepPreviousData,
  });

  // Query unfiltered count when appliedOnlyUpToLastStatement is true
  const { data: unfilteredPagedData } = useQuery({
    queryKey: keys.transactions.search({
      filters: filters.filter((f) => f.field !== 'coveredByStatement'),
      search: debouncedSearch || undefined,
      page: 0,
      size: 1,
      sort: sortBy,
    }),
    queryFn: async () => {
      const unfilteredFilters = filters.filter((f) => f.field !== 'coveredByStatement');
      const { data } = await api.POST('/api/v1/transactions/search', {
        body: {
          filters: unfilteredFilters,
          search: debouncedSearch || undefined,
        },
        params: {
          query: { page: 0, size: 1, sort: [sortBy] },
        },
      });
      return data ?? null;
    },
    enabled: appliedOnlyUpToLastStatement && appliedAccountIds.length > 0,
  });

  const hiddenCount = useMemo(
    () => computeHiddenCount(appliedOnlyUpToLastStatement, pagedData, unfilteredPagedData),
    [appliedOnlyUpToLastStatement, pagedData, unfilteredPagedData]
  );

  const selectedTxns = useMemo(
    () => getSelectedTxns(pagedData, selectedIds),
    [pagedData, selectedIds]
  );

  const presentReasons = useMemo(
    () => getPresentReasons(pagedData, selectedIds),
    [pagedData, selectedIds]
  );

  const handleSetIsApproveDialogOpen = (open: boolean) => {
    if (open) {
      setReasonsToApprove(presentReasons);
    }
    setIsApproveDialogOpen(open);
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: selectedIds,
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: reasonsToApprove as ('UNRECONCILED' | 'CATEGORY_UNVERIFIED' | 'DUPLICATE_SUSPECT')[],
        },
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      const { succeededIds = [], skippedIds = [], failures = [] } = data;

      const mappedFailures = mapBatchFailures(failures, pagedData);
      const mappedSkips = mapBatchSkips(skippedIds, pagedData);

      if (mappedFailures.length > 0 || mappedSkips.length > 0) {
        setSummaryData({
          succeededCount: succeededIds.length,
          skippedCount: skippedIds.length,
          failures: mappedFailures,
          skips: mappedSkips,
        });
      } else {
        toast.success(`Successfully approved ${succeededIds.length} transaction(s)!`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      setIsApproveDialogOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.response.message : 'An error occurred during batch approval.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/batch-delete', {
        body: {
          transactionIds: selectedIds,
        },
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      const { succeededIds = [], failures = [] } = data;

      const mappedFailures = mapBatchFailures(failures, pagedData);

      if (mappedFailures.length > 0) {
        setSummaryData({
          succeededCount: succeededIds.length,
          skippedCount: 0,
          failures: mappedFailures,
          skips: [],
        });
      } else {
        toast.success(`Successfully deleted ${succeededIds.length} transaction(s)!`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.response.message : 'An error occurred during batch deletion.');
    },
  });

  const handleReload = () => {
    queryClient.invalidateQueries({ queryKey: keys.transactions.all });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllPage = (checked: boolean | 'indeterminate') => {
    setSelectedIds(togglePageSelection(checked, pagedData, selectedIds));
  };

  return {
    selectableAccounts,
    appliedAccountIds,
    setAppliedAccountIds,
    appliedOnlyUpToLastStatement,
    setAppliedOnlyUpToLastStatement,
    page,
    setPage,
    size,
    setSize,
    loading,
    pagedData,
    selectedIds,
    setSelectedIds,
    batchActionLoading: approveMutation.isPending || deleteMutation.isPending,
    activeReasonFilter,
    setActiveReasonFilter,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    hiddenCount,
    isApproveDialogOpen,
    setIsApproveDialogOpen: handleSetIsApproveDialogOpen,
    isMergeDialogOpen,
    setIsMergeDialogOpen,
    reasonsToApprove,
    setReasonsToApprove,
    summaryData,
    setSummaryData,
    selectedTxns,
    presentReasons,
    handleReload,
    handlePageChange,
    toggleSelect,
    handleSelectAllPage,
    handleBatchApprove: () => approveMutation.mutate(),
    handleBatchDelete: () => deleteMutation.mutate(),
  };
}
