'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Text } from '@/components/ds/Text/Text';

export interface UncategorizedCardProps {
  /** "Sort them" was pressed. */
  onSort?: () => void;
}

/**
 * The Uncategorized line above the Transactions list: says some transactions need a category, with a "Sort them" link on the same line
 * (it wraps on phone). It carries no count and no groups (they load when Sort them opens). The page shows it only while something is uncategorized.
 */
export function UncategorizedCard({ onSort }: UncategorizedCardProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-space-6">
      <Text variant="body" tone="ink-2" as="span">
        Some transactions need a category
      </Text>
      <Button variant="link" onClick={onSort}>
        Sort them
      </Button>
    </div>
  );
}
