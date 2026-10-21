'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';

import {
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  ListRow,
  SectionHeader,
  SegmentedControl,
  Select,
  Switch,
  TextField,
} from '@/components/ds';
import { keys } from '@/lib/query/keys';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

import {
  AMOUNT_OP_OPTIONS,
  PERIOD_OPTIONS,
  REVIEW_OPTIONS,
  SORT_ORDER_OPTIONS,
  SOURCE_OPTIONS,
} from './filterOptions';
import { draftFromQuery, type FiltersDraft, type PeriodMode, queryFromDraft } from './filtersDraft';
import { loadMatchingCount } from './transactionsActions';
import { type AmountOp, clearedQuery, type PeriodPresetId, type SortId, type TransactionsQuery } from './transactionsUrl';

const PERIOD_MODES = [
  { value: 'preset', label: 'Preset' },
  { value: 'date', label: 'Single date' },
  { value: 'range', label: 'Range' },
];

export const COUNT_DEBOUNCE_MS = 300;

/** "Show 182 transactions": how many the dialog's draft matches, asked once the fields settle. */
function useMatchingCount(draftQuery: TransactionsQuery): number | undefined {
  const settled = useDebouncedValue(JSON.stringify({ ...draftQuery, page: 0 }), COUNT_DEBOUNCE_MS);
  const { data } = useQuery({
    queryKey: [...keys.transactions.lists(), 'count', settled],
    queryFn: async () => {
      const result = await loadMatchingCount(JSON.parse(settled) as TransactionsQuery);
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
  /** "Show": the query to open. */
  onApply: (query: TransactionsQuery) => void;
  onClose: () => void;
}

/**
 * The Filters dialog: period, amount, review status, import source, excluded only and sort. It edits a
 * draft; nothing reaches the address until "Show". Opening and closing it is page state, never a URL.
 */
export function FiltersDialog({ query, today, onApply, onClose }: FiltersDialogProps) {
  const [base, setBase] = React.useState(query);
  const [draft, setDraft] = React.useState<FiltersDraft>(() => draftFromQuery(query));
  const set = (patch: Partial<FiltersDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const draftQuery = queryFromDraft(base, draft);
  const count = useMatchingCount(draftQuery);

  const clearAll = () => {
    const cleared = clearedQuery(base);
    setBase(cleared);
    setDraft(draftFromQuery(cleared));
  };

  const showLabel =
    count === undefined ? 'Show transactions' : `Show ${count} ${count === 1 ? 'transaction' : 'transactions'}`;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="md"
        title="Filters"
        description="Every filter combines with the others"
        secondary={{ label: 'Clear all', onSelect: clearAll }}
        primary={{ label: showLabel, onSelect: () => onApply(draftQuery) }}
      >
        <DialogBody className="p-0 gap-0">
          <SectionHeader borderTop={false}>Date</SectionHeader>
          <div className="flex flex-col gap-space-12 px-space-16 desk:px-space-20 py-space-12">
            <SegmentedControl
              aria-label="Date"
              options={PERIOD_MODES}
              value={draft.periodMode}
              onValueChange={(mode) => set({ periodMode: mode as PeriodMode })}
            />
            {draft.periodMode === 'preset' ? (
              <Select
                label="Preset"
                options={PERIOD_OPTIONS}
                value={draft.preset}
                onValueChange={(preset) => set({ preset: preset as PeriodPresetId })}
              />
            ) : null}
            {draft.periodMode === 'date' ? (
              <DateField label="Date" today={today} value={draft.date} onValueChange={(date) => set({ date: date as string })} />
            ) : null}
            {draft.periodMode === 'range' ? (
              <DateField
                range
                label="Range"
                today={today}
                value={{ start: draft.from, end: draft.to }}
                onValueChange={(range) => {
                  if (typeof range === 'object') set({ from: range.start ?? '', to: range.end ?? '' });
                }}
              />
            ) : null}
          </div>

          <SectionHeader>Amount</SectionHeader>
          <div className="flex flex-col gap-space-12 px-space-16 desk:px-space-20 py-space-12">
            <Select
              label="Condition"
              options={AMOUNT_OP_OPTIONS}
              value={draft.amountOp}
              onValueChange={(op) => set({ amountOp: op as AmountOp })}
            />
            <div className="grid grid-cols-2 gap-space-12">
              <TextField
                label="From"
                prefix="₹"
                inputMode="decimal"
                disabled={draft.amountOp === 'less_than'}
                value={draft.amountFrom}
                onValueChange={(amountFrom) => set({ amountFrom })}
              />
              <TextField
                label="To"
                prefix="₹"
                inputMode="decimal"
                disabled={draft.amountOp === 'greater_than'}
                value={draft.amountTo}
                onValueChange={(amountTo) => set({ amountTo })}
              />
            </div>
          </div>

          <SectionHeader>Status and source</SectionHeader>
          <div className="flex flex-col gap-space-12 px-space-16 desk:px-space-20 py-space-12">
            <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12">
              <Select
                label="Review status"
                options={REVIEW_OPTIONS}
                value={draft.review}
                onValueChange={(review) => set({ review: review as string })}
              />
              <Select
                label="Import source"
                options={SOURCE_OPTIONS}
                value={draft.source}
                onValueChange={(source) => set({ source: source as string })}
              />
            </div>
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
          <div className="flex flex-col gap-space-12 px-space-16 desk:px-space-20 py-space-12">
            <Select
              label="Order"
              options={SORT_ORDER_OPTIONS}
              value={draft.sort}
              onValueChange={(sort) => set({ sort: sort as SortId })}
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
