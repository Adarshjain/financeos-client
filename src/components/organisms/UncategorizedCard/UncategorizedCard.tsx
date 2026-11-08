'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Text } from '@/components/ds/Text/Text';

export interface UncategorizedCardProps {
  /** "Sort them" was pressed. */
  onSort?: () => void;
  /** The pointer went down on "Sort them": the page starts loading before the press completes. */
  onSortPress?: () => void;
  /** The sort dialog's code is still loading after the press. */
  loading?: boolean;
}

/**
 * The Uncategorized line above the Transactions list: says some transactions need a category, with a "Sort them" link on the same line
 * (it wraps on phone). It carries no count and no groups (they load when Sort them opens). The page shows it only while something is uncategorized.
 */
export function UncategorizedCard({ onSort, onSortPress, loading }: UncategorizedCardProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-space-6">
      <Text variant="label" tone="ink-2" as="span">
        Some transactions need a category
      </Text>
      <Button variant="link" loading={loading} onClick={onSort} onPointerDown={onSortPress}>
        Sort them
      </Button>
    </div>
  );
}
