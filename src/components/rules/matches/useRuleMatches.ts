'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { applyRule, previewRuleMatches } from '@/actions/rules';
import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobPolling } from '@/hooks/useJobPolling';
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
  const router = useRouter();
  const [matches, setMatches] = useState<PagedRuleMatches | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useJobPolling<ApplyRuleResult>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED' && job.result) {
      toast.success(
        `Rule applied to ${job.result.appliedCount} transaction${
          job.result.appliedCount === 1 ? '' : 's'
        }`
      );
      setSelectedIds(new Set());
      setAllSelected(false);
      router.refresh();
      onOpenChange(false);
    } else if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Failed to apply rule.');
    } else if (job.status === 'CANCELLED') {
      toast.info('Rule apply job was cancelled.');
    }
    setActiveJobId(null);
    setApplying(false);
  });

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      try {
        const res = await previewRuleMatches(
          { merchantKey: rule.merchantKey, matchType: rule.matchType },
          { page: pageToLoad, size: PAGE_SIZE }
        );
        if (res.success) {
          setMatches(res.data);
        } else {
          toast.error(res.error.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [rule.merchantKey, rule.matchType]
  );

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setAllSelected(false);
      void loadPage(0);
    } else {
      setMatches(null);
    }
  }, [open, loadPage]);

  const handlePageChange = (newPage: number) => {
    void loadPage(newPage);
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
      const res = await applyRule(
        rule.id,
        allSelected
          ? { all: true }
          : { transactionIds: Array.from(selectedIds) }
      );
      if (res.success && res.data?.jobId) {
        const jobId = res.data.jobId;
        setActiveJobId(jobId);
        emitJobStarted(jobId);
        toast.info('Rule apply job started in background.');
      } else if (!res.success) {
        toast.error(res.error.message);
        setApplying(false);
      }
    } catch (err) {
      toast.error('Failed to apply rule: ' + (err as Error).message);
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
