'use client';

import React from 'react';

import { Button, Skeleton, Text } from '@/components/ds';
import {
  TransactionPicker,
  type TransactionPickerItem,
} from '@/components/organisms';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import type { Transaction } from '@/lib/transaction.types';

import {
  pickerEmptyHint,
  pickerListItem,
  type PickerSummaryLike,
  sharedNote,
} from './pickerModel';
import {
  type PickerTransaction,
  useTransactionPicker,
} from './useTransactionPicker';

export interface TransactionPickerFieldProps {
  label?: string;
  placeholder?: string;
  value: PickerSummaryLike | null;
  onSelect: (t: Transaction) => void;
  onClear: () => void;
  direction?: 'lent' | 'borrowed';
  /** Overrides the direction-derived type filter; `null` turns it off. */
  type?: 'DEBIT' | 'CREDIT' | null;
  /** Loan links are exclusive: hide rows that carry any obligation ref. */
  excludeAnyObligationRef?: boolean;
  shareableKind?: 'LENDING' | 'DIVIDEND';
  /** Replaces the direction's hint under an empty list. */
  ruleHint?: string;
  suggestAmount?: number | null;
  suggestDate?: string | null;
  excludeIds?: string[];
  /** Extra rule a row must pass to be offered (keep the function stable, e.g. `useCallback`). */
  accept?: (t: PickerTransaction) => boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * An always-open, searchable list of bank transactions (the TransactionPicker organism). The search is answered
 * by the server (debounced), rows are filtered and ordered by the picker rules (exact amount first, then nearest
 * date), and the Pager asks for another page. The picked transaction stays at the top of the list; Remove clears it.
 */
export function TransactionPickerField({
  label = 'Transaction (optional)',
  placeholder = 'Search by description or amount',
  value,
  onSelect,
  onClear,
  direction,
  type,
  excludeAnyObligationRef = false,
  shareableKind = 'LENDING',
  ruleHint,
  suggestAmount,
  suggestDate,
  excludeIds,
  accept,
  disabled,
  error,
}: TransactionPickerFieldProps) {
  const { data: accounts = [] } = useAccounts();
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    pending,
    candidates,
    page,
    setPage,
    pageSize,
    totalElements,
  } = useTransactionPicker({
    direction,
    type,
    suggestAmount,
    suggestDate,
    excludeIds: value ? [...(excludeIds ?? []), value.id] : excludeIds,
    excludeAnyObligationRef,
    shareableKind,
    accept,
    active: !disabled,
  });

  // A caller that fixes the type (direction or `type`, even `null`) owns it; the debit/credit filter is only for open lists.
  const typeFixed =
    type !== undefined ? type !== null : direction !== undefined;

  const items = React.useMemo<TransactionPickerItem[]>(() => {
    const accountOf = (id: string, named?: string | null) => {
      const found = accounts.find((a) => a.id === id) as
        | { name: string; last4?: string }
        | undefined;
      return { name: named || found?.name || 'Unknown', last4: found?.last4 };
    };
    const rows: TransactionPickerItem[] = [];
    if (value)
      rows.push({
        ...pickerListItem(value, accountOf(value.accountId, value.accountName)),
        disabled,
      });
    if (!disabled) {
      for (const t of candidates) {
        rows.push(
          pickerListItem(
            t,
            accountOf(t.accountId),
            sharedNote(
              t.obligationRefs?.length ?? 0,
              shareableKind,
              excludeAnyObligationRef
            )
          )
        );
      }
    }
    return rows;
  }, [
    value,
    candidates,
    accounts,
    disabled,
    shareableKind,
    excludeAnyObligationRef,
  ]);

  const hint = pickerEmptyHint(ruleHint, direction);
  const emptyCopy = hint
    ? `No matching transactions. ${hint}`
    : 'No matching transactions';

  if (disabled && !value) {
    return (
      <div className="flex flex-col gap-space-4">
        <Text as="div" variant="label" tone="ink-3">
          {label}
        </Text>
        {error ? (
          <Text as="div" variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}
      </div>
    );
  }

  // The pinned selection keeps the list non-empty, so a new search's loading and empty states are drawn here.
  const pinned = !!value && !disabled;

  return (
    <div className="flex flex-col gap-space-4">
      <TransactionPicker
        label={label}
        searchPlaceholder={placeholder}
        items={items}
        value={value?.id ?? null}
        onValueChange={(next) => {
          if (typeof next !== 'string' || next === value?.id) return;
          const picked = candidates.find((t) => t.id === next);
          if (picked) onSelect(picked as Transaction);
        }}
        query={search}
        onQueryChange={setSearch}
        loading={pending}
        filter={typeFilter}
        onFilterChange={typeFixed ? undefined : setTypeFilter}
        page={page}
        pageSize={pageSize}
        totalElements={totalElements}
        onPageChange={setPage}
        emptyLabel={emptyCopy}
        error={error}
      />
      {pinned && pending && candidates.length === 0 ? (
        <Skeleton width="60%" height={14} data-testid="picker-pending" />
      ) : null}
      {pinned && !pending && candidates.length === 0 ? (
        <Text as="div" variant="body" tone="ink-3">
          {emptyCopy}
        </Text>
      ) : null}
      {value && !disabled ? (
        <div className="flex justify-end">
          <Button type="button" variant="link" size="sm" onClick={onClear}>
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
