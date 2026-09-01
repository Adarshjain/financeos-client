'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  batchDeleteTransactions,
  batchReviewTransactions,
  searchTransactions,
} from '@/actions/transactions';
import { batchFailureLabel } from '@/components/transactions/catalog';
import { Account } from '@/lib/account.types';
import { FilterClause } from '@/lib/reports.types';
import { PagedTransaction, ReviewReason } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

export function useReviewBrowser(accounts: Account[]) {
  const selectableAccounts = useMemo(
    () => accounts.filter((a) => a.type !== AccountType.BROKER),
    [accounts]
  );

  const [appliedAccountIds, setAppliedAccountIds] = useState<string[]>(
    selectableAccounts.map((a) => a.id)
  );
  const [appliedOnlyUpToLastStatement, setAppliedOnlyUpToLastStatement] = useState(true);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [pagedData, setPagedData] = useState<PagedTransaction | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [activeReasonFilter, setActiveReasonFilter] = useState<string>('ALL');
  const runIdRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('date,desc');
  const [hiddenCount, setHiddenCount] = useState(0);

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

  const selectedTxns = useMemo(() => {
    if (!pagedData || selectedIds.length !== 2) return [];
    return pagedData.content.filter((t) => selectedIds.includes(t.id));
  }, [pagedData, selectedIds]);

  const presentReasons = useMemo(() => {
    const txns = pagedData?.content.filter((t) => selectedIds.includes(t.id)) || [];
    return Array.from(
      new Set(txns.flatMap((t) => t.reviewReasons || []))
    ) as ReviewReason[];
  }, [pagedData, selectedIds]);

  useEffect(() => {
    if (isApproveDialogOpen) {
      setReasonsToApprove(presentReasons);
    }
  }, [isApproveDialogOpen, presentReasons]);

  const fetchTransactions = useCallback(
    async (currentPage: number, runId: number) => {
      if (appliedAccountIds.length === 0) {
        if (runId === runIdRef.current) {
          setPagedData({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size,
            number: 0,
            first: true,
            last: true,
            empty: true,
          });
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const filters: FilterClause[] = [
          { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
        ];

        if (activeReasonFilter !== 'ALL') {
          filters.push({
            field: 'reviewReason',
            operator: 'is',
            value: activeReasonFilter,
          });
        }

        if (appliedAccountIds.length < selectableAccounts.length) {
          filters.push({
            field: 'accountId',
            operator: 'in',
            value: appliedAccountIds,
          });
        }

        if (appliedOnlyUpToLastStatement) {
          filters.push({
            field: 'coveredByStatement',
            operator: 'is',
            value: true,
          });
        }

        const res = await searchTransactions(
          {
            filters,
            search: debouncedSearch || null,
          },
          currentPage,
          size,
          sortBy
        );

        if (runId !== runIdRef.current) return;

        if (res.success) {
          setPagedData(res.data);
          if (
            res.data.content.length === 0 &&
            res.data.totalElements > 0 &&
            currentPage > 0
          ) {
            setPage(currentPage - 1);
            return;
          }
          const visibleIds = new Set(res.data.content.map((t) => t.id));
          setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));

          let unfilteredTotal = res.data.totalElements;
          if (appliedOnlyUpToLastStatement) {
            const unfilteredFilters: FilterClause[] = [
              { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
            ];

            if (activeReasonFilter !== 'ALL') {
              unfilteredFilters.push({
                field: 'reviewReason',
                operator: 'is',
                value: activeReasonFilter,
              });
            }

            if (appliedAccountIds.length < selectableAccounts.length) {
              unfilteredFilters.push({
                field: 'accountId',
                operator: 'in',
                value: appliedAccountIds,
              });
            }

            const unfilteredRes = await searchTransactions(
              {
                filters: unfilteredFilters,
                search: debouncedSearch || null,
              },
              0,
              1,
              sortBy
            );

            if (runId !== runIdRef.current) return;

            if (unfilteredRes.success) {
              unfilteredTotal = unfilteredRes.data.totalElements;
            }
          }
          setHiddenCount(Math.max(0, unfilteredTotal - res.data.totalElements));
        } else {
          toast.error(res.error.message);
        }
      } catch {
        toast.error('Failed to load transactions');
      } finally {
        if (runId === runIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      selectableAccounts.length,
      appliedAccountIds,
      appliedOnlyUpToLastStatement,
      activeReasonFilter,
      size,
      debouncedSearch,
      sortBy,
    ]
  );

  useEffect(() => {
    const runId = ++runIdRef.current;
    const timer = setTimeout(() => {
      fetchTransactions(page, runId);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, activeReasonFilter, fetchTransactions]);

  const handleReload = () => {
    const runId = ++runIdRef.current;
    fetchTransactions(page, runId);
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
    if (!pagedData) return;
    if (checked === true) {
      const pageIds = pagedData.content.map((t) => t.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIds = pagedData.content.map((t) => t.id);
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleBatchApprove = async () => {
    setBatchActionLoading(true);
    try {
      const res = await batchReviewTransactions(
        selectedIds,
        'MANUALLY_REVIEWED',
        reasonsToApprove
      );
      if (res.success) {
        const { succeededIds, skippedIds, failures } = res.data;

        const mappedFailures = failures.map((f) => {
          const txn = pagedData?.content.find((t) => t.id === f.id);
          const desc = txn
            ? txn.description || txn.sourcedDescription
            : `Transaction ID: ${f.id}`;
          return { description: desc, reason: batchFailureLabel(f.reason) };
        });

        const mappedSkips = skippedIds.map((id) => {
          const txn = pagedData?.content.find((t) => t.id === id);
          return txn
            ? txn.description || txn.sourcedDescription
            : `Transaction ID: ${id}`;
        });

        if (failures.length > 0 || skippedIds.length > 0) {
          setSummaryData({
            succeededCount: succeededIds.length,
            skippedCount: skippedIds.length,
            failures: mappedFailures,
            skips: mappedSkips,
          });
        } else {
          toast.success(
            `Successfully approved ${succeededIds.length} transaction(s)!`
          );
        }
        setSelectedIds([]);
        handleReload();
        setIsApproveDialogOpen(false);
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('An error occurred during batch approval.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setBatchActionLoading(true);
    try {
      const res = await batchDeleteTransactions(selectedIds);
      if (res.success) {
        const { succeededIds, failures } = res.data;

        const mappedFailures = failures.map((f) => {
          const txn = pagedData?.content.find((t) => t.id === f.id);
          const desc = txn
            ? txn.description || txn.sourcedDescription
            : `Transaction ID: ${f.id}`;
          return { description: desc, reason: batchFailureLabel(f.reason) };
        });

        if (failures.length > 0) {
          setSummaryData({
            succeededCount: succeededIds.length,
            skippedCount: 0,
            failures: mappedFailures,
            skips: [],
          });
        } else {
          toast.success(
            `Successfully deleted ${succeededIds.length} transaction(s)!`
          );
        }
        setSelectedIds([]);
        handleReload();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('An error occurred during batch deletion.');
    } finally {
      setBatchActionLoading(false);
    }
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
    batchActionLoading,
    activeReasonFilter,
    setActiveReasonFilter,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    hiddenCount,
    isApproveDialogOpen,
    setIsApproveDialogOpen,
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
    handleBatchApprove,
    handleBatchDelete,
  };
}
