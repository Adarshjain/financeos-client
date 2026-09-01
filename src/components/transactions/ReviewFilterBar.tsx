'use client';

import {
  Check,
  ChevronDown,
  FileCheck,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { REVIEW_REASON_META, REVIEW_REASONS } from '@/components/transactions/catalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RemovableBadge } from '@/components/ui/removable-badge';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

interface ReviewFilterBarProps {
  accounts: Account[];
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

const REASON_OPTIONS: { label: string; shortLabel: string; value: string }[] = [
  { label: 'All Reasons', shortLabel: 'All', value: 'ALL' },
  ...REVIEW_REASONS.map((reason) => ({
    label: REVIEW_REASON_META[reason].label,
    shortLabel: REVIEW_REASON_META[reason].shortLabel,
    value: reason as string,
  })),
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'date,desc' },
  { label: 'Oldest First', value: 'date,asc' },
  { label: 'Highest Amount', value: 'amount,desc' },
  { label: 'Lowest Amount', value: 'amount,asc' },
];

export function ReviewFilterBar({
  accounts,
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Investment (broker) accounts don't post manual transactions here; keep
  // them out of the picker unless one is already selected via an existing filter.
  const selectableAccounts = useMemo(
    () => accounts.filter((a) => a.type !== AccountType.BROKER || appliedAccountIds.includes(a.id)),
    [accounts, appliedAccountIds],
  );

  const isAllAccountsSelected = appliedAccountIds.length === selectableAccounts.length;

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
        // Inlined rather than referencing `handleSelectAllAccounts`: that
        // identity changes every render, so depending on it made the memo's
        // inferred and declared deps disagree — which cost this whole component
        // React Compiler optimisation, and left `onAccountIdsChange` captured
        // stale since it was never listed.
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
    activeBadges.length > 0 || search.trim() !== '' || !isAllAccountsSelected || !onlyUpToLastStatement;

  const activeSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort';

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
        <div className="inline-flex flex-wrap items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full">
          {REASON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onReasonFilterChange(opt.value)}
              className={cn(
                'px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
                activeReasonFilter === opt.value
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              {opt.value === 'ALL' ? 'All' : opt.shortLabel}
            </button>
          ))}
        </div>

        {/* Account Multi-Select Popover Pill */}
        <Popover open={accountOpen} onOpenChange={setAccountOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={!isAllAccountsSelected ? 'filter-active' : 'filter'}
              size="pill"
              className="gap-1"
            >
              <Wallet className="h-3 w-3 opacity-70" />
              <span>
                {isAllAccountsSelected
                  ? 'Accounts'
                  : appliedAccountIds.length === 1
                  ? accounts.find((a) => a.id === appliedAccountIds[0])?.name || '1 Account'
                  : `Accounts (${appliedAccountIds.length})`}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0 rounded-2xl shadow-xl overflow-hidden">
            <Command>
              <CommandInput placeholder="Search accounts..." className="h-9 text-xs" />
              <CommandList className="max-h-56 p-1">
                <CommandEmpty className="py-4 text-xs text-center text-slate-500">No account found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={handleSelectAllAccounts}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border-b border-slate-100 dark:border-slate-800 mb-1"
                  >
                    <span>Select All Accounts</span>
                    {isAllAccountsSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </CommandItem>
                  {selectableAccounts.map((acc) => {
                    const isSelected = appliedAccountIds.includes(acc.id);
                    const lastStatementDate =
                      'lastStatementDate' in acc && acc.lastStatementDate
                        ? formatDate((acc as any).lastStatementDate)
                        : null;
                    return (
                      <CommandItem
                        key={acc.id}
                        onSelect={() => handleAccountToggle(acc.id)}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer touch-manipulation"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isSelected} className="pointer-events-none rounded-md" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{acc.name}</span>
                          {acc.closedOn && (
                            <span className="text-2xs text-rose-500 font-semibold">(Closed)</span>
                          )}
                        </div>
                        {lastStatementDate && (
                          <span className="text-2xs text-slate-400">Cutoff: {lastStatementDate}</span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="filter"
              size="pill"
              className="gap-1"
            >
              <span>{activeSortLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1 rounded-2xl shadow-xl">
            <div className="text-xs font-semibold text-slate-400 px-3 py-1">Sort Order</div>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSortByChange(opt.value);
                  setSortOpen(false);
                }}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors flex items-center justify-between',
                  sortBy === opt.value
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <span>{opt.label}</span>
                {sortBy === opt.value && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
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
