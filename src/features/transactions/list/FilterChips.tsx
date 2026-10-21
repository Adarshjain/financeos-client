'use client';

import React from 'react';

import { FilterChip, Select, type SelectGroup, type SelectOption } from '@/components/ds';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';

import {
  accountGroups,
  amountLabel,
  ANY,
  categoryOptions,
  periodLabel,
  REASON_OPTIONS,
  reviewLabel,
  SORT_OPTIONS,
  sourceLabel,
  TYPE_OPTIONS,
} from './filterOptions';
import { isAllTime, REASON_PARAMS, type SortId, type TransactionsQuery, type TypeFilter } from './transactionsUrl';

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
  searchPlaceholder,
  disabled,
  onCommit,
}: {
  label: string;
  value: string[];
  options?: SelectOption[];
  groups?: SelectGroup[];
  searchPlaceholder: string;
  disabled?: boolean;
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
  return (
    <Select
      multiple
      searchable
      searchPlaceholder={searchPlaceholder}
      options={options}
      groups={groups}
      value={draft ?? value}
      onValueChange={(next) => setDraft(next as string[])}
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <FilterChip hasDropdown disabled={disabled} selected={value.length > 0} count={value.length > 0 ? value.length : undefined}>
          {label}
        </FilterChip>
      }
    />
  );
}

/** A dropdown chip that picks one value. */
function ChoiceChip({
  label,
  value,
  options,
  selected,
  onCommit,
}: {
  label: React.ReactNode;
  value: string;
  options: SelectOption[];
  selected: boolean;
  onCommit: (value: string) => void;
}) {
  return (
    <Select
      options={options}
      value={value}
      onValueChange={(next) => onCommit(next as string)}
      trigger={
        <FilterChip hasDropdown selected={selected}>
          {label}
        </FilterChip>
      }
    />
  );
}

export interface FilterChipsProps {
  query: TransactionsQuery;
  accounts: Account[] | null;
  categories: Category[] | null;
  /** Everything that needs review; null while unknown. */
  needsReviewCount: number | null;
  onChange: (next: Change) => void;
  onOpenFilters: () => void;
}

/** The chips under the search: period, the dropdown filters, the toggles, "+ More" and the sort. */
export function FilterChips({ query, accounts, categories, needsReviewCount, onChange, onOpenFilters }: FilterChipsProps) {
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === query.type)?.label ?? '';
  const reasonParam = query.reason ? (Object.keys(REASON_PARAMS).find((k) => REASON_PARAMS[k] === query.reason) ?? ANY) : ANY;
  const reasonText = REASON_OPTIONS.find((o) => o.value === reasonParam)?.label ?? '';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === query.sort)?.label ?? '';
  const allTime = isAllTime(query.period);

  return (
    <div className="flex gap-space-8 overflow-x-auto -mx-space-16 px-space-16 desk:mx-0 desk:px-0 desk:flex-1 desk:min-w-0 desk:flex-wrap desk:overflow-visible">
      <FilterChip
        selected={!allTime}
        removable={!allTime}
        onRemove={allTime ? undefined : () => onChange({ period: { kind: 'preset', id: 'all_time' } })}
        onClick={onOpenFilters}
      >
        {periodLabel(query.period)}
      </FilterChip>
      <MultiChip
        label="Account"
        value={query.accounts}
        groups={accountGroups(accounts ?? [], query.accounts)}
        searchPlaceholder="Search accounts"
        disabled={accounts === null}
        onCommit={(accountIds) => onChange({ accounts: accountIds })}
      />
      <MultiChip
        label="Category"
        value={query.categories}
        options={categoryOptions(categories ?? [])}
        searchPlaceholder="Search categories"
        disabled={categories === null}
        onCommit={(names) => onChange({ categories: names })}
      />
      <ChoiceChip
        label={query.type === 'all' ? 'Type' : `Type · ${typeLabel}`}
        value={query.type}
        options={TYPE_OPTIONS}
        selected={query.type !== 'all'}
        onCommit={(type) => onChange({ type: type as TypeFilter })}
      />
      <FilterChip
        selected={query.amount !== null}
        removable={query.amount !== null}
        onRemove={query.amount === null ? undefined : () => onChange({ amount: null })}
        onClick={onOpenFilters}
      >
        {query.amount ? amountLabel(query.amount) : 'Amount'}
      </FilterChip>
      <FilterChip selected={query.monitoring} onSelectedChange={(on) => onChange({ monitoring: on })}>
        Monitoring
      </FilterChip>
      <FilterChip
        tone="warning"
        selected={query.review === 'NEEDS_REVIEW'}
        onSelectedChange={(on) => onChange({ review: on ? 'NEEDS_REVIEW' : null })}
      >
        {needsReviewCount === null ? 'Needs review' : `Needs review · ${needsReviewCount}`}
      </FilterChip>
      <ChoiceChip
        label={query.reason ? `Reason · ${reasonText}` : 'Reason'}
        value={reasonParam}
        options={REASON_OPTIONS}
        selected={query.reason !== null}
        onCommit={(param) => onChange({ reason: param === ANY ? null : REASON_PARAMS[param] })}
      />
      <FilterChip selected={query.upToStatement} onSelectedChange={(on) => onChange({ upToStatement: on })}>
        Up to statement
      </FilterChip>
      {query.review && query.review !== 'NEEDS_REVIEW' ? (
        <FilterChip selected removable onRemove={() => onChange({ review: null })} onClick={onOpenFilters}>
          {`Review · ${reviewLabel(query.review)}`}
        </FilterChip>
      ) : null}
      {query.source ? (
        <FilterChip selected removable onRemove={() => onChange({ source: null })} onClick={onOpenFilters}>
          {`Source · ${sourceLabel(query.source)}`}
        </FilterChip>
      ) : null}
      {query.excluded ? (
        <FilterChip selected removable onRemove={() => onChange({ excluded: false })} onClick={onOpenFilters}>
          Excluded only
        </FilterChip>
      ) : null}
      <FilterChip variant="dashed" onClick={onOpenFilters}>
        + More
      </FilterChip>
      <ChoiceChip
        label={sortLabel}
        value={query.sort}
        options={SORT_OPTIONS}
        selected={false}
        onCommit={(sort) => onChange({ sort: sort as SortId })}
      />
    </div>
  );
}
