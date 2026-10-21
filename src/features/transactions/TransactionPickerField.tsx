'use client';

import React from 'react';

import { Button, Select, type SelectOption } from '@/components/ds';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import type { Transaction } from '@/lib/transaction.types';
import { getAccountName } from '@/lib/utils';

import { pickerEmptyHint, pickerRowLabel, type PickerSummaryLike, sharedNote } from './pickerModel';
import { useTransactionPicker } from './useTransactionPicker';

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
  disabled?: boolean;
  error?: string;
}

/**
 * A field that opens a searchable list of bank transactions. The search is answered by the server (debounced),
 * rows are filtered and ordered by the picker rules (exact amount first, then nearest date), and "Show more"
 * asks for the next page. The picked transaction stays in the field; Remove clears it.
 */
export function TransactionPickerField({
  label = 'Transaction (optional)',
  placeholder = 'Search your debits',
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
  disabled,
  error,
}: TransactionPickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const { data: accounts = [] } = useAccounts();
  const { search, setSearch, pending, candidates, hasMore, loadMore } = useTransactionPicker({
    direction,
    type,
    suggestAmount,
    suggestDate,
    excludeIds: value ? [...(excludeIds ?? []), value.id] : excludeIds,
    excludeAnyObligationRef,
    shareableKind,
    active: open && !disabled,
  });

  const options = React.useMemo<SelectOption[]>(() => {
    const rows: SelectOption[] = [];
    if (value) {
      const name = value.accountName || getAccountName(accounts, value.accountId);
      rows.push({ value: value.id, label: pickerRowLabel(value, name) });
    }
    for (const t of candidates) {
      rows.push({
        value: t.id,
        label: pickerRowLabel(t, getAccountName(accounts, t.accountId)),
        description: sharedNote(t.obligationRefs?.length ?? 0, shareableKind, excludeAnyObligationRef) ?? undefined,
      });
    }
    if (rows.length === (value ? 1 : 0)) {
      rows.push({
        value: '__empty',
        label: pending ? 'Searching…' : 'No matching transactions',
        description: pending ? undefined : pickerEmptyHint(ruleHint, direction),
        disabled: true,
      });
    }
    return rows;
  }, [value, candidates, accounts, pending, ruleHint, direction, shareableKind, excludeAnyObligationRef]);

  return (
    <div className="flex flex-col gap-space-4">
      <Select
        label={label}
        placeholder={placeholder}
        searchable
        searchPlaceholder="Search by description or amount"
        filter="none"
        options={options}
        value={value?.id ?? ''}
        disabled={disabled}
        error={error}
        open={open}
        onOpenChange={setOpen}
        searchValue={search}
        onSearchChange={setSearch}
        action={hasMore ? { label: 'Show more', onSelect: loadMore } : undefined}
        onValueChange={(next) => {
          if (typeof next !== 'string' || next === value?.id) return;
          const picked = candidates.find((t) => t.id === next);
          if (picked) onSelect(picked as Transaction);
        }}
      />
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
