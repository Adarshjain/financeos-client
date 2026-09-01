'use client';

import { TablePagination } from '@/components/reports/views/TablePagination';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CategoryRule } from '@/lib/rules.types';

import { RuleMatchesTable } from './matches/RuleMatchesTable';
import { useRuleMatches } from './matches/useRuleMatches';

interface RuleMatchesDialogProps {
  rule: CategoryRule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Runs the rule's pattern against the user's transactions and lists every match
 * (excluding manually reviewed ones) with checkboxes. Applying gives the selected
 * transactions the rule's categories and links them to the rule.
 */
export function RuleMatchesDialog({
  rule,
  open,
  onOpenChange,
}: RuleMatchesDialogProps) {
  const {
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
  } = useRuleMatches({
    rule,
    open,
    onOpenChange,
  });

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
            Transactions whose sourced description matches this rule. Manually
            reviewed transactions are excluded. Applying sets the rule&apos;s
            categories and keeps them in sync with future edits to the rule.
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
                  onClick={clearSelection}
                >
                  Clear selection
                </button>
              ) : (
                total > pageIds.length && (
                  <button
                    type="button"
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    onClick={selectAllMatches}
                  >
                    Select all {total} matches
                  </button>
                )
              )}
            </div>
          )}

          {/* Match list */}
          <RuleMatchesTable
            loading={loading}
            rows={rows}
            rule={rule}
            allSelected={allSelected}
            selectedIds={selectedIds}
            pageAllChecked={pageAllChecked}
            pageSomeChecked={pageSomeChecked}
            onToggleRow={toggleRow}
            onTogglePage={togglePage}
          />

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
              : `Apply rule${
                  selectedCount > 0 ? ` to ${selectedCount}` : ''
                }`,
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
