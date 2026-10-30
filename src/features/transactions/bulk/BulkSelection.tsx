'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Icon } from '@/components/ds/Icon/Icon';
import { SelectionBar } from '@/components/ds/SelectionBar/SelectionBar';
import type { Transaction } from '@/lib/transaction.types';

import { approveHint, isApprovable, mergeHint, selectionSummary } from './bulkModel';

export interface BulkSelectRowProps {
  /** Rows on the open page: "Select all 50" selects these and no others (owner 14b). */
  pageCount: number;
  onSelectAll: () => void;
  onCancel: () => void;
}

/** "Select all {n}" and Cancel above the list while rows are selected; desktop only (the phone bar has them). */
export function BulkSelectRow({ pageCount, onSelectAll, onCancel }: BulkSelectRowProps) {
  return (
    <div className="hidden justify-end gap-space-8 desk:flex">
      <Button variant="secondary" onClick={onSelectAll}>{`Select all ${pageCount}`}</Button>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

export interface BulkBarProps {
  /** The selected rows, in full. */
  selected: Transaction[];
  pageCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onLink: () => void;
  onMerge: () => void;
  onApprove: () => void;
  onDelete: () => void;
}

/** The bar over the list: how many, how much, and Link · Merge · Approve · Delete. One hint per action. */
export function BulkBar({ selected, pageCount, onSelectAll, onClear, onLink, onMerge, onApprove, onDelete }: BulkBarProps) {
  const flagged = selected.filter(isApprovable).length;
  return (
    <SelectionBar
      className="fixed inset-x-0 bottom-0 desk:bottom-safe-12"
      count={selected.length}
      summary={selectionSummary(selected)}
      onClear={onClear}
      onSelectAll={selected.length < pageCount ? onSelectAll : undefined}
      selectAllLabel={`Select all ${pageCount}`}
      actions={[
        { id: 'link', label: 'Link', icon: <Icon name="link" size="lg" />, onSelect: onLink },
        {
          id: 'merge',
          label: 'Merge',
          icon: <Icon name="merge" size="lg" />,
          hint: mergeHint(selected.length),
          disabled: selected.length !== 2,
          onSelect: onMerge,
        },
        {
          id: 'approve',
          label: 'Approve',
          icon: <Icon name="check" size="lg" />,
          count: flagged > 0 ? flagged : undefined,
          hint: approveHint(selected),
          disabled: flagged === 0,
          onSelect: onApprove,
        },
        { id: 'delete', label: 'Delete', icon: <Icon name="delete" size="lg" />, tone: 'danger', onSelect: onDelete },
      ]}
    />
  );
}
