'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';

import {
  Dialog,
  FilterChip,
  ListRow,
  Reveal,
  SectionHeader,
  Select,
  Switch,
  TextField,
} from '@/components/ds';
import { AccountPicker } from '@/components/organisms';
import type { Account } from '@/lib/account.types';
import { watchSession } from '@/lib/authExpiry';
import type { Category } from '@/lib/categories.types';
import { pluralize } from '@/lib/format';
import { keys } from '@/lib/query/keys';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

import {
  AMOUNT_OP_OPTIONS,
  amountLabel,
  categoryOptions,
  FILTER_ACCOUNT_TYPES,
  filterAccounts,
  periodLabel,
  REASON_OPTIONS,
  reasonLabel,
  REVIEW_OPTIONS,
  reviewLabel,
  SORT_ORDER_OPTIONS,
  SOURCE_OPTIONS,
  sourceLabel,
  TYPE_OPTIONS,
} from './filterOptionsModel';
import {
  changedFilters,
  draftFromQuery,
  type FiltersDraft,
  type FilterSection,
  queryFromDraft,
} from './filtersDraftModel';
import { PeriodEditor } from './PeriodEditor';
import { loadMatchingCount } from './transactionsActions';
import {
  type AmountOp,
  clearedQuery,
  type SortId,
  type TransactionsQuery,
  type TypeFilter,
} from './transactionsUrl';

/** "Show 182 transactions": how many the dialog's draft matches, asked once the fields settle. */
function useMatchingCount(draftQuery: TransactionsQuery): number | undefined {
  const settled = useDebouncedValue(
    JSON.stringify({ ...draftQuery, page: 0 }),
    SEARCH_DEBOUNCE_MS
  );
  const { data } = useQuery({
    queryKey: [...keys.transactions.lists(), 'count', settled],
    queryFn: async () => {
      const result = await watchSession(
        loadMatchingCount(JSON.parse(settled) as TransactionsQuery)
      );
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    placeholderData: keepPreviousData,
  });
  return data;
}

export interface FiltersDialogProps {
  /** The list's query the dialog opens on. */
  query: TransactionsQuery;
  /** Today, YYYY-MM-DD, for the date fields. */
  today: string;
  /** Null when they could not be loaded: their fields are then off. */
  accounts: Account[] | null;
  categories: Category[] | null;
  /** "Show": the query to open. */
  onApply: (query: TransactionsQuery) => void;
  onClose: () => void;
}

/**
 * The Filters dialog: every filter the chip row has (period, account, category, type, amount, review status,
 * reason, monitoring, up to statement, import source, excluded only) and the sort. It edits a draft; nothing
 * reaches the address until "Show". Cancel, ×, the backdrop and a swipe down all drop the draft. Opening and
 * closing it is page state, never a URL.
 */
export function FiltersDialog({
  query,
  today,
  accounts,
  categories,
  onApply,
  onClose,
}: FiltersDialogProps) {
  const formId = React.useId();
  const [base, setBase] = React.useState(query);
  const [draft, setDraft] = React.useState<FiltersDraft>(() =>
    draftFromQuery(query)
  );
  const set = (patch: Partial<FiltersDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const showFrom = draft.amountOp !== 'less_than';
  const showTo = draft.amountOp !== 'greater_than';

  const draftQuery = queryFromDraft(base, draft);
  const count = useMatchingCount(draftQuery);

  const accountList = accounts ?? [];
  const changed = changedFilters(draft, {
    period: periodLabel(draftQuery.period),
    accounts:
      draft.accounts.length === 1
        ? (accountList.find((a) => a.id === draft.accounts[0])?.name ?? '1 account')
        : `${draft.accounts.length} accounts`,
    categories:
      draft.categories.length === 1
        ? draft.categories[0]
        : `${draft.categories.length} categories`,
    type: TYPE_OPTIONS.find((o) => o.value === draft.type)?.label ?? '',
    amount: draftQuery.amount ? amountLabel(draftQuery.amount) : '',
    review: draftQuery.review ? reviewLabel(draftQuery.review) : '',
    reason: draftQuery.reason ? reasonLabel(draftQuery.reason) : '',
    source: draftQuery.source ? sourceLabel(draftQuery.source) : '',
  });
  const changedSections = new Set<FilterSection>(changed.map((c) => c.section));
  const dot = (section: FilterSection, label: string) => (
    <span className="inline-flex items-center gap-space-8">
      {label}
      {changedSections.has(section) ? (
        <span
          data-testid={`changed-${section}`}
          className="h-space-8 w-space-8 rounded-ds-pill bg-brand"
        />
      ) : null}
    </span>
  );

  const clearAll = () => {
    const cleared = { ...clearedQuery(base), q: base.q };
    setBase(cleared);
    setDraft(draftFromQuery(cleared));
  };

  const showLabel =
    count === undefined
      ? 'Show results'
      : `Show ${count} ${pluralize(count, 'result', 'results')}`;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title="Filters"
        description="Every filter combines with the others."
        tertiary={{ label: 'Reset to defaults', onSelect: clearAll }}
        primary={{ label: showLabel, type: 'submit', form: formId }}
      >
        <Dialog.Body className="p-0 gap-0 desk:gap-0">
          <form
            id={formId}
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              onApply(draftQuery);
            }}
          >
            {changed.length > 0 ? (
              <div
                data-testid="changed-filters"
                className="flex flex-wrap gap-space-8 px-space-16 desk:px-space-20 py-space-12"
              >
                {changed.map((c) => (
                  <FilterChip
                    key={c.id}
                    size="md"
                    changed
                    onReset={() => set(c.reset)}
                  >
                    {c.label}
                  </FilterChip>
                ))}
              </div>
            ) : null}
            <SectionHeader borderTop={changed.length > 0}>
              {dot('date', 'Date')}
            </SectionHeader>
            <div className="px-space-16 desk:px-space-20 py-space-12">
              <PeriodEditor draft={draft} today={today} onChange={set} />
            </div>

            <SectionHeader>{dot('accountCategory', 'Account and category')}</SectionHeader>
            <div className="flex flex-col gap-space-8 desk:gap-space-12 px-space-16 desk:px-space-20 py-space-12">
              <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                <AccountPicker
                  multiple
                  label="Account"
                  placeholder="Any account"
                  disabled={accounts === null}
                  accounts={filterAccounts(draft.accounts, accounts ?? [])}
                  types={FILTER_ACCOUNT_TYPES}
                  value={draft.accounts}
                  onValueChange={(accountIds) => set({ accounts: accountIds })}
                />
                <Select
                  label="Type"
                  options={TYPE_OPTIONS}
                  value={draft.type}
                  onValueChange={(type) => set({ type: type as TypeFilter })}
                />
              </div>
              <Select
                multiple
                searchable
                searchPlaceholder="Search categories"
                label="Category"
                placeholder="Any category"
                disabled={categories === null}
                options={categoryOptions(categories ?? [])}
                value={draft.categories}
                onValueChange={(names) =>
                  set({ categories: names as string[] })
                }
              />
            </div>

            <SectionHeader>{dot('amount', 'Amount')}</SectionHeader>
            <div className="flex flex-col gap-space-8 desk:gap-space-12 px-space-16 desk:px-space-20 py-space-12">
              <Select
                label="Condition"
                options={AMOUNT_OP_OPTIONS}
                value={draft.amountOp}
                onValueChange={(op) => {
                  const amountOp = op as AmountOp;
                  // A field the condition does not use is emptied, so a stale value is never applied.
                  set({
                    amountOp,
                    ...(amountOp === 'greater_than' ? { amountTo: '' } : {}),
                    ...(amountOp === 'less_than' ? { amountFrom: '' } : {}),
                  });
                }}
              />
              <div className="flex -mx-space-6">
                <Reveal
                  axis="x"
                  open={showFrom}
                  className={showFrom ? 'grow basis-0' : 'grow-0 basis-0'}
                >
                  <div className="px-space-6">
                    <TextField
                      label="From"
                      prefix="₹"
                      inputMode="decimal"
                      value={draft.amountFrom}
                      onValueChange={(amountFrom) => set({ amountFrom })}
                    />
                  </div>
                </Reveal>
                <Reveal
                  axis="x"
                  open={showTo}
                  className={showTo ? 'grow basis-0' : 'grow-0 basis-0'}
                >
                  <div className="px-space-6">
                    <TextField
                      label="To"
                      prefix="₹"
                      inputMode="decimal"
                      value={draft.amountTo}
                      onValueChange={(amountTo) => set({ amountTo })}
                    />
                  </div>
                </Reveal>
              </div>
            </div>

            <SectionHeader>{dot('status', 'Status and source')}</SectionHeader>
            <div className="flex flex-col gap-space-8 desk:gap-space-12 px-space-16 desk:px-space-20 py-space-12">
              <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                <Select
                  label="Review status"
                  options={REVIEW_OPTIONS}
                  value={draft.review}
                  onValueChange={(review) => set({ review: review as string })}
                />
                <Select
                  label="Review reason"
                  options={REASON_OPTIONS}
                  value={draft.reason}
                  onValueChange={(reason) => set({ reason: reason as string })}
                />
              </div>
              <Select
                label="Import source"
                options={SOURCE_OPTIONS}
                value={draft.source}
                onValueChange={(source) => set({ source: source as string })}
              />
              <ListRow
                borderTop={false}
                className="px-0"
                title="Monitoring"
                subtitle="Show only transactions under monitoring"
                trailing={
                  <Switch
                    aria-label="Monitoring"
                    checked={draft.monitoring}
                    onCheckedChange={(monitoring) => set({ monitoring })}
                  />
                }
              />
              <ListRow
                borderTop={false}
                className="px-0"
                title="Up to statement"
                subtitle="Show only rows a statement covers"
                trailing={
                  <Switch
                    aria-label="Up to statement"
                    checked={draft.upToStatement}
                    onCheckedChange={(upToStatement) => set({ upToStatement })}
                  />
                }
              />
              <ListRow
                borderTop={false}
                className="px-0"
                title="Excluded transactions only"
                subtitle="Show only rows left out of totals"
                trailing={
                  <Switch
                    aria-label="Excluded transactions only"
                    checked={draft.excluded}
                    onCheckedChange={(excluded) => set({ excluded })}
                  />
                }
              />
            </div>

            <SectionHeader>Sort</SectionHeader>
            <div className="flex flex-col gap-space-8 desk:gap-space-12 px-space-16 desk:px-space-20 py-space-12">
              <Select
                label="Order"
                options={SORT_ORDER_OPTIONS}
                value={draft.sort}
                onValueChange={(sort) => set({ sort: sort as SortId })}
              />
            </div>
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
