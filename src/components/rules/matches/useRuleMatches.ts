'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobStatusPolling } from '@/components/jobs/useJobStatusPolling';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type {
  ApplyRuleResult,
  CategoryRule,
  PagedRuleMatches,
} from '@/lib/rules.types';

const PAGE_SIZE = 20;

interface UseRuleMatchesProps {
  rule: CategoryRule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function useRuleMatches({
  rule,
  open,
  onOpenChange,
}: UseRuleMatchesProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [page, setPage] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useJobStatusPolling<ApplyRuleResult>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED' && job.result) {
      toast.success(
        `Rule applied to ${job.result.appliedCount} transaction${
          job.result.appliedCount === 1 ? '' : 's'
        }`
      );
      setSelectedIds(new Set());
      setAllSelected(false);
      queryClient.invalidateQueries({ queryKey: keys.rules.all });
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      onOpenChange(false);
    } else if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Failed to apply rule.');
    } else if (job.status === 'CANCELLED') {
      toast.info('Rule apply job was cancelled.');
    }
    setActiveJobId(null);
    setApplying(false);
  });

  // No reset-on-open effect: `RuleMatchesDialog` is only ever rendered by its
  // parent while `open` is true (`{matchesRule && <RuleMatchesDialog ... />}`
  // in RulesBrowser), so a fresh rule always means a fresh mount — the
  // `useState` initializers above already are the "reset" values.

  const matchesQuery = useQuery({
    queryKey: keys.rules.preview({
      merchantKey: rule.merchantKey,
      matchType: rule.matchType,
      page,
      size: PAGE_SIZE,
    }),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/rules/preview-matches', {
        params: { query: { page, size: PAGE_SIZE, sort: [] } },
        body: { merchantKey: rule.merchantKey, matchType: rule.matchType },
      });
      return data as PagedRuleMatches;
    },
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const matches = matchesQuery.data ?? null;
  const loading = matchesQuery.isLoading;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const rows = useMemo(() => matches?.content ?? [], [matches]);
  const total = matches?.totalElements ?? 0;
  const pageIds = useMemo(() => rows.map((t) => t.id), [rows]);
  const pageAllChecked =
    pageIds.length > 0 &&
    pageIds.every((id) => allSelected || selectedIds.has(id));
  const pageSomeChecked = pageIds.some(
    (id) => allSelected || selectedIds.has(id)
  );
  const selectedCount = allSelected ? total : selectedIds.size;

  const toggleRow = (id: string, checked: boolean) => {
    if (allSelected) {
      setAllSelected(false);
      setSelectedIds(new Set(pageIds.filter((pid) => pid !== id)));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    setAllSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const handleApply = async () => {
    if (selectedCount === 0) return;
    setApplying(true);
    try {
      const { data } = await api.POST('/api/v1/rules/{id}/apply', {
        params: { path: { id: rule.id } },
        body: allSelected ? { all: true } : { transactionIds: Array.from(selectedIds) },
      });
      const jobId = data?.jobId;
      if (jobId) {
        setActiveJobId(jobId);
        emitJobStarted(jobId);
        toast.info('Rule apply job started in background.');
      } else {
        setApplying(false);
      }
    } catch (err) {
      toast.error(
        'Failed to apply rule: ' + (err instanceof ApiError ? err.response.message : (err as Error).message)
      );
      setApplying(false);
    }
  };

  const clearSelection = () => {
    setAllSelected(false);
    setSelectedIds(new Set());
  };

  const selectAllMatches = () => {
    setAllSelected(true);
    setSelectedIds(new Set());
  };

  return {
    matches,
    loading,
    applying,
    rows,
    total,
    pageIds,
    pageAllChecked,
    pageSomeChecked,
    selectedCount,
    allSelected,
    selectedIds,
    handlePageChange,
    toggleRow,
    togglePage,
    handleApply,
    clearSelection,
    selectAllMatches,
  };
}
