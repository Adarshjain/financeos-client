'use client';

import { FileCheck, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RemovableBadge } from '@/components/ui/removable-badge';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

import { REASON_OPTIONS } from './review-filter-bar/constants';
import { ReviewAccountMultiSelect } from './review-filter-bar/ReviewAccountMultiSelect';
import { ReviewReasonSegmentControl } from './review-filter-bar/ReviewReasonSegmentControl';
import { ReviewSortPopover } from './review-filter-bar/ReviewSortPopover';

interface ReviewFilterBarProps {
  appliedAccountIds: string[];
  onAccountIdsChange: (ids: string[]) => void;
  onlyUpToLastStatement: boolean;
  onOnlyUpToLastStatementChange: (val: boolean) => void;
  activeReasonFilter: string;
  onReasonFilterChange: (reason: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

export function ReviewFilterBar({
  appliedAccountIds,
  onAccountIdsChange,
  onlyUpToLastStatement,
  onOnlyUpToLastStatementChange,
  activeReasonFilter,
  onReasonFilterChange,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
}: ReviewFilterBarProps) {
  const { data: accounts = [] } = useAccounts();
  // Investment (broker) accounts don't post manual transactions here; keep
  // them out of the picker unless one is already selected via an existing filter.
  const selectableAccounts = useMemo(
    () =>
      accounts.filter(
        (a) => a.type !== AccountType.BROKER || appliedAccountIds.includes(a.id)
      ),
    [accounts, appliedAccountIds]
  );

  const isAllAccountsSelected =
    appliedAccountIds.length === selectableAccounts.length;

  const handleAccountToggle = (id: string) => {
    if (appliedAccountIds.includes(id)) {
      const next = appliedAccountIds.filter((item) => item !== id);
      onAccountIdsChange(next);
    } else {
      onAccountIdsChange([...appliedAccountIds, id]);
    }
  };

  const handleSelectAllAccounts = () => {
    onAccountIdsChange(selectableAccounts.map((a) => a.id));
  };

  const handleResetFilters = () => {
    onAccountIdsChange(selectableAccounts.map((a) => a.id));
    onOnlyUpToLastStatementChange(true);
    onReasonFilterChange('ALL');
    onSearchChange('');
  };

  // Compute active badge items
  const activeBadges = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];

    if (activeReasonFilter !== 'ALL') {
      const opt = REASON_OPTIONS.find((r) => r.value === activeReasonFilter);
      list.push({
        key: 'reason',
        label: `Reason: ${opt?.label || activeReasonFilter}`,
        onRemove: () => onReasonFilterChange('ALL'),
      });
    }

    if (!isAllAccountsSelected && appliedAccountIds.length > 0) {
      const names = appliedAccountIds
        .map((id) => accounts.find((a) => a.id === id)?.name || id)
        .join(', ');
      list.push({
        key: 'account',
        label: `Accounts: ${names}`,
        onRemove: () => onAccountIdsChange(selectableAccounts.map((a) => a.id)),
      });
    }

    if (!onlyUpToLastStatement) {
      list.push({
        key: 'cutoff',
        label: 'Statement Cutoff: Off',
        onRemove: () => onOnlyUpToLastStatementChange(true),
      });
    }

    return list;
  }, [
    activeReasonFilter,
    isAllAccountsSelected,
    appliedAccountIds,
    onlyUpToLastStatement,
    accounts,
    selectableAccounts,
    onAccountIdsChange,
    onReasonFilterChange,
    onOnlyUpToLastStatementChange,
  ]);

  const hasActiveFilters =
    activeBadges.length > 0 ||
    search.trim() !== '' ||
    !isAllAccountsSelected ||
    !onlyUpToLastStatement;

  return (
    <div>
      {/* Top Search Bar */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <Input
          placeholder="Search by description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 h-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus-visible:ring-emerald-500 focus-visible:border-transparent shadow-xs transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Quick Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 pt-2">
        {/* Reason Segment Control Pill */}
        <ReviewReasonSegmentControl
          activeReasonFilter={activeReasonFilter}
          onReasonFilterChange={onReasonFilterChange}
        />

        {/* Account Multi-Select Popover Pill */}
        <ReviewAccountMultiSelect
          accounts={accounts}
          selectableAccounts={selectableAccounts}
          appliedAccountIds={appliedAccountIds}
          isAllAccountsSelected={isAllAccountsSelected}
          onAccountToggle={handleAccountToggle}
          onSelectAllAccounts={handleSelectAllAccounts}
        />

        {/* Statement Cutoff Quick Toggle Pill */}
        <Button
          variant={onlyUpToLastStatement ? 'filter-active' : 'filter'}
          size="pill"
          onClick={() => onOnlyUpToLastStatementChange(!onlyUpToLastStatement)}
        >
          <FileCheck className="h-3 w-3 opacity-70" />
          <span>Up to Statement</span>
        </Button>

        {/* Sort Popover Pill */}
        <ReviewSortPopover sortBy={sortBy} onSortByChange={onSortByChange} />
      </div>

      {/* Active Filters Badge Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-0">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            Active:
          </span>

          {search.trim() !== '' && (
            <RemovableBadge
              variant="secondary"
              label={`Search: "${search}"`}
              removeLabel="Clear search"
              onRemove={() => onSearchChange('')}
              className="h-6 gap-1 px-2.5 text-2xs font-medium rounded-full bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors touch-manipulation"
            />
          )}

          {activeBadges.map((badge) => (
            <RemovableBadge
              key={badge.key}
              variant="secondary"
              label={badge.label}
              onRemove={badge.onRemove}
              className="h-6 gap-1 px-2.5 text-2xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800 transition-colors touch-manipulation"
            />
          ))}

          <Button
            variant="ghost-destructive"
            size="micro"
            onClick={handleResetFilters}
            className="font-semibold rounded-full ml-auto touch-manipulation"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
