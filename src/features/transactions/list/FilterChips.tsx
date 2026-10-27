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
  TYPE_OPTIONS,
} from './filterOptions';
import {
  draftFromQuery,
  type FiltersDraft,
  queryFromDraft,
} from './filtersDraft';
import { type PeriodDraft, PeriodEditor } from './PeriodEditor';
import {
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
  onCommit,
}: {
  label: string;
  value: string[];
  options?: SelectOption[];
  groups?: SelectGroup[];
  /** Lists accounts with the AccountPicker (grouped by type, with bank logos) instead of `options` / `groups`. */
  accountPicker?: {
    accounts: readonly Account[];
    types: readonly AccountType[];
  };
  searchPlaceholder: string;
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
      selected={value.length > 0}
      count={value.length > 0 ? value.length : undefined}
    >
      {label}
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
    <Select multiple searchable {...shared} options={options} groups={groups} />
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
  onCommit,
}: {
  label: React.ReactNode;
  value: string;
  options: SelectOption[];
  selected: boolean;
  className?: string;
  /** Gives the dropdown a search field with this placeholder. */
  searchPlaceholder?: string;
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
          selected={selected}
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
          selected={!allTime}
          removable={!allTime}
          onRemove={
            allTime
              ? undefined
              : () => onChange({ period: { kind: 'preset', id: 'all_time' } })
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
 * The row under the tabs: the search, then period, the dropdown filters, the toggles, "+ More" and the sort.
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

  const activeCount = activeFilterCount(query);

  return (
    <FilterBar
      search={search}
    >
      <PeriodChip query={query} today={today} onChange={onChange} />
      <MultiChip
        label="Account"
        value={query.accounts}
        accountPicker={{
          accounts: filterAccounts(query.accounts, accounts ?? []),
          types: FILTER_ACCOUNT_TYPES,
        }}
        searchPlaceholder="Search accounts"
        disabled={accounts === null}
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
        value={query.categories}
        options={categoryOptions(categories ?? [])}
        searchPlaceholder="Search categories"
        className={DESK_ONLY}
        disabled={categories === null}
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
          selected
          removable
          onRemove={() => onChange({ uncategorized: false })}
          onClick={onOpenFilters}
        >
          Uncategorized
        </FilterChip>
      ) : null}
      <ChoiceChip
        label={query.type === 'all' ? 'Type' : `Type · ${typeLabel}`}
        value={query.type}
        options={TYPE_OPTIONS}
        selected={query.type !== 'all'}
        className={DESK_ONLY}
        onCommit={(type) => onChange({ type: type as TypeFilter })}
      />
      <FilterChip
        size="md"
        className={`shrink-0 ${DESK_ONLY}`}
        selected={query.amount !== null}
        removable={query.amount !== null}
        onRemove={
          query.amount === null ? undefined : () => onChange({ amount: null })
        }
        onClick={onOpenFilters}
      >
        {query.amount ? amountLabel(query.amount) : 'Amount'}
      </FilterChip>
      <FilterChip
        size="md"
        className={`shrink-0 ${DESK_ONLY}`}
        selected={query.monitoring}
        onSelectedChange={(on) => onChange({ monitoring: on })}
      >
        Monitoring
      </FilterChip>
      <FilterChip
        size="md"
        className={`shrink-0 ${DESK_ONLY}`}
        tone="warning"
        selected={query.review === 'NEEDS_REVIEW'}
        onSelectedChange={(on) =>
          onChange({ review: on ? 'NEEDS_REVIEW' : null })
        }
      >
        Needs review
      </FilterChip>
      <ChoiceChip
        label={query.reason ? `Reason · ${reasonText}` : 'Reason'}
        value={reasonParam}
        options={REASON_OPTIONS}
        selected={query.reason !== null}
        className={DESK_ONLY}
        onCommit={(param) =>
          onChange({ reason: param === ANY ? null : REASON_PARAMS[param] })
        }
      />
      <FilterChip
        size="md"
        className={`shrink-0 ${DESK_ONLY}`}
        selected={query.upToStatement}
        onSelectedChange={(on) => onChange({ upToStatement: on })}
      >
        Up to statement
      </FilterChip>
      {query.review && query.review !== 'NEEDS_REVIEW' ? (
        <FilterChip
          size="md"
          className={`shrink-0 ${DESK_ONLY}`}
          selected
          removable
          onRemove={() => onChange({ review: null })}
          onClick={onOpenFilters}
        >
          {`Review · ${reviewLabel(query.review)}`}
        </FilterChip>
      ) : null}
      {query.source ? (
        <FilterChip
          size="md"
          className={`shrink-0 ${DESK_ONLY}`}
          selected
          removable
          onRemove={() => onChange({ source: null })}
          onClick={onOpenFilters}
        >
          {`Source · ${sourceLabel(query.source)}`}
        </FilterChip>
      ) : null}
      {query.excluded ? (
        <FilterChip
          size="md"
          className={`shrink-0 ${DESK_ONLY}`}
          selected
          removable
          onRemove={() => onChange({ excluded: false })}
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
        className={DESK_ONLY}
        onCommit={(sort) => onChange({ sort: sort as SortId })}
      />
    </FilterBar>
  );
}
