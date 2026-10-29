'use client';

import React from 'react';

import {
  Button,
  FilterBar,
  type FilterBarSearch,
  FilterChip,
  Popover,
  Select,
  type SelectGroup,
  type SelectOption,
} from '@/components/ds';
import { AccountPicker } from '@/components/organisms';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { AccountType } from '@/lib/types';

import {
  activeFilterCount,
  amountLabel,
  ANY,
  categoryOptions,
  FILTER_ACCOUNT_TYPES,
  filterAccounts,
  periodLabel,
  REASON_OPTIONS,
  reviewLabel,
  SORT_OPTIONS,
  sourceLabel,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from './filterOptionsModel';
import {
  draftFromQuery,
  type FiltersDraft,
  queryFromDraft,
} from './filtersDraftModel';
import { type PeriodDraft, PeriodEditor } from './PeriodEditor';
import {
  clearedQuery,
  isAllTime,
  REASON_PARAMS,
  type SortId,
  type TransactionsQuery,
  type TypeFilter,
} from './transactionsUrl';

type Change = Partial<TransactionsQuery>;

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** A dropdown chip that picks several values; the list is written once, when the dropdown closes. */
function MultiChip({
  label,
  value,
  options,
  groups,
  accountPicker,
  searchPlaceholder,
  disabled,
  className,
  changedLabel,
  onReset,
  onCommit,
}: {
  label: string;
  /** What the chip says once something is picked ("Groceries", "3 categories"). */
  changedLabel?: string;
  onReset?: () => void;
  value: string[];
  options?: SelectOption[];
  groups?: SelectGroup[];
  /** Lists accounts with the AccountPicker (grouped by type, with bank logos) instead of `options` / `groups`. */
  accountPicker?: {
    accounts: readonly Account[];
    types: readonly AccountType[];
  };
  /** Gives the dropdown a search field; short lists leave it out. */
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  onCommit: (value: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[] | null>(null);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    if (draft && !sameList(draft, value)) onCommit(draft);
    setDraft(null);
  };
  const chip = (
    <FilterChip
      size="md"
      className="shrink-0"
      hasDropdown
      disabled={disabled}
      changed={value.length > 0}
      onReset={onReset}
    >
      {value.length > 0 ? (changedLabel ?? label) : label}
    </FilterChip>
  );
  const shared = {
    className,
    searchPlaceholder,
    value: draft ?? value,
    onValueChange: (next: string | string[]) => setDraft(next as string[]),
    open,
    onOpenChange: handleOpenChange,
    trigger: chip,
  };
  if (accountPicker) {
    return (
      <AccountPicker
        multiple
        {...shared}
        accounts={accountPicker.accounts}
        types={accountPicker.types}
        onValueChange={(next) => setDraft(next)}
      />
    );
  }
  return (
    <Select
      multiple
      searchable={searchPlaceholder !== undefined}
      {...shared}
      options={options}
      groups={groups}
    />
  );
}

/** A dropdown chip that picks one value. */
export function ChoiceChip({
  label,
  value,
  options,
  selected,
  className,
  searchPlaceholder,
  onReset,
  onCommit,
}: {
  label: React.ReactNode;
  value: string;
  options: SelectOption[];
  selected: boolean;
  className?: string;
  /** Gives the dropdown a search field with this placeholder. */
  searchPlaceholder?: string;
  /** The × of a changed chip: back to its default. */
  onReset?: () => void;
  onCommit: (value: string) => void;
}) {
  return (
    <Select
      className={className}
      searchable={searchPlaceholder !== undefined}
      searchPlaceholder={searchPlaceholder}
      options={options}
      value={value}
      onValueChange={(next) => onCommit(next as string)}
      trigger={
        <FilterChip
          size="md"
          className="shrink-0"
          hasDropdown
          changed={selected}
          onReset={onReset}
        >
          {label}
        </FilterChip>
      }
    />
  );
}

/** The Period chip: opens a dropdown with the period editor; "Apply" writes the period, closing any other way drops it. */
function PeriodChip({
  query,
  today,
  onChange,
}: {
  query: TransactionsQuery;
  today: string;
  onChange: (next: Change) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<FiltersDraft>(() =>
    draftFromQuery(query)
  );
  const allTime = isAllTime(query.period);
  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(draftFromQuery(query));
    setOpen(next);
  };
  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      contentClassName="min-w-container-xs"
      trigger={
        <FilterChip
          size="md"
          className="shrink-0"
          hasDropdown
          changed={!allTime}
          onReset={() =>
            onChange({ period: { kind: 'preset', id: 'all_time' } })
          }
        >
          {allTime ? 'Period' : periodLabel(query.period)}
        </FilterChip>
      }
    >
      <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-12">
        <PeriodEditor
          draft={draft}
          today={today}
          onChange={(patch: Partial<PeriodDraft>) =>
            setDraft((d) => ({ ...d, ...patch }))
          }
        />
        <Button
          variant="primary"
          onClick={() => {
            setOpen(false);
            onChange({ period: queryFromDraft(query, draft).period });
          }}
        >
          Apply
        </Button>
      </div>
    </Popover>
  );
}

export interface FilterChipsProps {
  query: TransactionsQuery;
  /** Today, YYYY-MM-DD, for the period's date fields. */
  today: string;
  accounts: Account[] | null;
  categories: Category[] | null;
  onChange: (next: Change) => void;
  onOpenFilters: () => void;
  /** The search field: the row's first item, so the search and the chips share one sideways scroller. */
  search?: FilterBarSearch;
}

// Phone shows only Period, Account and "All filters"; the rest is desktop-only (the dialog holds every filter).
const DESK_ONLY = 'max-desk:hidden';

/**
 * The row under the tabs: the search, then period, the dropdown filters, the Status chip, "+ More" and the sort. Amount and Reason show as chips only once set ("+ More" opens them), so the row fits with "Reset filters".
 * On phone only Period, Account and "All filters" show; "All filters" carries the number of active filters.
 */
export function FilterChips({
  query,
  today,
  accounts,
  categories,
  onChange,
  onOpenFilters,
  search,
}: FilterChipsProps) {
  const typeLabel =
    TYPE_OPTIONS.find((o) => o.value === query.type)?.label ?? '';
  const reasonParam = query.reason
    ? (Object.keys(REASON_PARAMS).find(
        (k) => REASON_PARAMS[k] === query.reason
      ) ?? ANY)
    : ANY;
  const reasonText =
    REASON_OPTIONS.find((o) => o.value === reasonParam)?.label ?? '';
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === query.sort)?.label ?? '';

  const statusValue = [
    ...(query.monitoring ? ['monitoring'] : []),
    ...(query.review === 'NEEDS_REVIEW' ? ['review'] : []),
    ...(query.upToStatement ? ['statement'] : []),
  ];
  const statusLabel =
    statusValue.length === 1
      ? (STATUS_OPTIONS.find((o) => o.value === statusValue[0])?.label ??
        'Status')
      : `${statusValue.length} selected`;
  const activeCount = activeFilterCount(query);
  const accountList = accounts ?? [];
  const accountsLabel =
    query.accounts.length === 1
      ? (accountList.find((a) => a.id === query.accounts[0])?.name ??
        '1 account')
      : `${query.accounts.length} accounts`;
  const categoriesLabel =
    query.categories.length === 1
      ? query.categories[0]
      : `${query.categories.length} categories`;
  const resetAll = () =>
    onChange({ ...clearedQuery(query), q: query.q, page: 0 });

  return (
    <FilterBar
      size="md"
      search={search}
      changed={activeCount > 0}
      onReset={resetAll}
    >
      <PeriodChip query={query} today={today} onChange={onChange} />
      <MultiChip
        label="Account"
        changedLabel={accountsLabel}
        value={query.accounts}
        accountPicker={{
          accounts: filterAccounts(query.accounts, accountList),
          types: FILTER_ACCOUNT_TYPES,
        }}
        searchPlaceholder="Search accounts"
        disabled={accounts === null}
        onReset={() => onChange({ accounts: [] })}
        onCommit={(accountIds) => onChange({ accounts: accountIds })}
      />
      <FilterChip
        size="md"
        className="shrink-0 desk:hidden"
        selected={activeCount > 0}
        count={activeCount > 0 ? activeCount : undefined}
        onClick={onOpenFilters}
      >
        All filters
      </FilterChip>
      <MultiChip
        label="Category"
        changedLabel={categoriesLabel}
        value={query.categories}
        options={categoryOptions(categories ?? [])}
        searchPlaceholder="Search categories"
        className={DESK_ONLY}
        disabled={categories === null}
        onReset={() => onChange({ categories: [] })}
        onCommit={(names) =>
          onChange({
            categories: names,
            ...(names.length > 0 ? { uncategorized: false } : {}),
          })
        }
      />
      {query.uncategorized ? (
        <FilterChip
          size="md"
          className="shrink-0"
          changed
          onReset={() => onChange({ uncategorized: false })}
          onClick={onOpenFilters}
        >
          Uncategorized
        </FilterChip>
      ) : null}
      <ChoiceChip
        label={query.type === 'all' ? 'Type' : typeLabel}
        value={query.type}
        options={TYPE_OPTIONS}
        selected={query.type !== 'all'}
        className={DESK_ONLY}
        onReset={() => onChange({ type: 'all' })}
        onCommit={(type) => onChange({ type: type as TypeFilter })}
      />
      {query.amount !== null ? (
        <FilterChip
          size="md"
          className={`shrink-0 ${DESK_ONLY}`}
          changed
          onReset={() => onChange({ amount: null })}
          onClick={onOpenFilters}
        >
          {query.amount ? amountLabel(query.amount) : 'Amount'}
        </FilterChip>
      ) : null}
      {query.reason !== null ? (
        <ChoiceChip
          label={query.reason ? reasonText : 'Reason'}
          value={reasonParam}
          options={REASON_OPTIONS}
          selected={query.reason !== null}
          className={DESK_ONLY}
          onReset={() => onChange({ reason: null })}
          onCommit={(param) =>
            onChange({ reason: param === ANY ? null : REASON_PARAMS[param] })
          }
        />
      ) : null}
      <MultiChip
        label="Status"
        changedLabel={statusLabel}
        value={statusValue}
        options={STATUS_OPTIONS}
        className={DESK_ONLY}
        onReset={() =>
          onChange({ monitoring: false, review: null, upToStatement: false })
        }
        onCommit={(picked) =>
          onChange({
            monitoring: picked.includes('monitoring'),
            review: picked.includes('review') ? 'NEEDS_REVIEW' : null,
            upToStatement: picked.includes('statement'),
          })
        }
      />
      {query.review && query.review !== 'NEEDS_REVIEW' ? (
        <FilterChip
          size="md"
          className={`shrink-0 ${DESK_ONLY}`}
          changed
          onReset={() => onChange({ review: null })}
          onClick={onOpenFilters}
        >
          {reviewLabel(query.review)}
        </FilterChip>
      ) : null}
      {query.source ? (
        <FilterChip
          size="md"
          className={`shrink-0 ${DESK_ONLY}`}
          changed
          onReset={() => onChange({ source: null })}
          onClick={onOpenFilters}
        >
          {sourceLabel(query.source)}
        </FilterChip>
      ) : null}
      {query.excluded ? (
        <FilterChip
          size="md"
          className={`shrink-0 ${DESK_ONLY}`}
          changed
          onReset={() => onChange({ excluded: false })}
          onClick={onOpenFilters}
        >
          Excluded only
        </FilterChip>
      ) : null}
      <FilterChip
        size="md"
        variant="dashed"
        className={`shrink-0 ${DESK_ONLY}`}
        onClick={onOpenFilters}
      >
        + More
      </FilterChip>
      <ChoiceChip
        label={sortLabel}
        value={query.sort}
        options={SORT_OPTIONS}
        selected={false}
        className={`${DESK_ONLY} ml-auto`}
        onCommit={(sort) => onChange({ sort: sort as SortId })}
      />
    </FilterBar>
  );
}
