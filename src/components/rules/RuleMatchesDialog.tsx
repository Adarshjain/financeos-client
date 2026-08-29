'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { applyRule, previewRuleMatches } from '@/actions/rules';
import { emitJobStarted } from '@/components/jobs/jobsBus';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useJobPolling } from '@/hooks/useJobPolling';
import type { ApplyRuleResult, CategoryRule, PagedRuleMatches } from '@/lib/rules.types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface RuleMatchesDialogProps {
  rule: CategoryRule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 20;

/**
 * Runs the rule's pattern against the user's transactions and lists every match
 * (excluding manually reviewed ones) with checkboxes. Applying gives the selected
 * transactions the rule's categories and links them to the rule.
 */
export function RuleMatchesDialog({ rule, open, onOpenChange }: RuleMatchesDialogProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<PagedRuleMatches | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // When true, apply targets every match server-side (not just the checked ids).
  const [allSelected, setAllSelected] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useJobPolling<ApplyRuleResult>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED' && job.result) {
      toast.success(
        `Rule applied to ${job.result.appliedCount} transaction${job.result.appliedCount === 1 ? '' : 's'}`,
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

  const loadPage = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    try {
      const res = await previewRuleMatches(
        { merchantKey: rule.merchantKey, matchType: rule.matchType },
        { page: pageToLoad, size: PAGE_SIZE },
      );
      if (res.success) {
        setMatches(res.data);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [rule.merchantKey, rule.matchType]);

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
  const pageAllChecked = pageIds.length > 0 && pageIds.every((id) => allSelected || selectedIds.has(id));
  const pageSomeChecked = pageIds.some((id) => allSelected || selectedIds.has(id));
  const selectedCount = allSelected ? total : selectedIds.size;

  const toggleRow = (id: string, checked: boolean) => {
    if (allSelected) {
      // Unchecking one row drops out of select-all mode: keep everything on this
      // page except the unchecked row (other pages' selections can't be known).
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
        allSelected ? { all: true } : { transactionIds: Array.from(selectedIds) },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            Matching transactions
            <span className="ml-2 text-sm font-normal text-slate-400">
              {rule.displayName || rule.merchantKey}
            </span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Transactions whose sourced description matches this rule. Manually reviewed
            transactions are excluded. Applying sets the rule&apos;s categories and keeps
            them in sync with future edits to the rule.
          </p>

          {/* Select-all banner */}
          {matches && total > 0 && (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {total} match{total === 1 ? '' : 'es'}
                {selectedCount > 0 && ` · ${selectedCount} selected`}
              </span>
              {allSelected ? (
                <button
                  type="button"
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  onClick={() => {
                    setAllSelected(false);
                    setSelectedIds(new Set());
                  }}
                >
                  Clear selection
                </button>
              ) : (
                total > pageIds.length && (
                  <button
                    type="button"
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    onClick={() => {
                      setAllSelected(true);
                      setSelectedIds(new Set());
                    }}
                  >
                    Select all {total} matches
                  </button>
                )
              )}
            </div>
          )}

          {/* Match list */}
          <div className="flex-1 overflow-y-auto min-h-[120px] rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Finding matches…</div>
            ) : rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                No transactions match this rule&apos;s pattern.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500">
                  <tr className="text-left">
                    <th className="p-2 w-8">
                      <Checkbox
                        checked={pageAllChecked ? true : pageSomeChecked ? 'indeterminate' : false}
                        onCheckedChange={(checked) => togglePage(checked === true)}
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th className="p-2 whitespace-nowrap">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right whitespace-nowrap">Amount</th>
                    <th className="p-2">Current categories</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((txn) => {
                    const checked = allSelected || selectedIds.has(txn.id);
                    return (
                      <tr
                        key={txn.id}
                        className="border-t border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                      >
                        <td className="p-2 align-top">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleRow(txn.id, value === true)}
                            aria-label="Select transaction"
                          />
                        </td>
                        <td className="p-2 align-top whitespace-nowrap tabular-nums text-slate-500">
                          {formatDate(txn.date)}
                        </td>
                        <td className="p-2 align-top text-slate-700 dark:text-slate-300 break-all">
                          {txn.sourcedDescription}
                          {txn.appliedRuleId === rule.id && (
                            <span className="ml-1.5 text-2xs text-slate-400">(already this rule)</span>
                          )}
                        </td>
                        <td
                          className={cn(
                            'p-2 align-top text-right tabular-nums whitespace-nowrap font-medium',
                            txn.type === 'CREDIT'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300',
                          )}
                        >
                          {txn.type === 'DEBIT' ? '-' : ''}
                          {formatCurrency(txn.amount)}
                        </td>
                        <td className="p-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            {txn.categories.length === 0 ? (
                              <span className="text-slate-400 italic">Uncategorized</span>
                            ) : (
                              txn.categories.map((c) => (
                                <Badge
                                  key={c.id}
                                  variant="outline"
                                  className="rounded-full px-2 py-0 text-2xs border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                                >
                                  {c.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {matches && matches.totalPages > 1 && (
            <TablePagination
              page={{
                number: matches.number,
                size: matches.size,
                totalElements: matches.totalElements,
                totalPages: matches.totalPages,
              }}
              loading={loading}
              onPageChange={handlePageChange}
              unit="transaction"
              className="w-full px-1"
            />
          )}
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: applying
              ? 'Applying…'
              : `Apply rule${selectedCount > 0 ? ` to ${selectedCount}` : ''}`,
            onClick: handleApply,
            disabled: applying || selectedCount === 0,
          }}
          secondaryAction={{
            label: 'Close',
            onClick: () => onOpenChange(false),
            disabled: applying,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
