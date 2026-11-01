'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';

export interface UncategorizedCardProps {
  /** "Sort them" was pressed. */
  onSort?: () => void;
}

/**
 * The Uncategorized card above the Transactions list: says some transactions need a category, with "Sort them".
 * It carries no count and no groups (they load when Sort them opens). The page shows it only while something is uncategorized.
 */
export function UncategorizedCard({ onSort }: UncategorizedCardProps) {
  return (
    <Card title="Some transactions need a category">
      <div className="px-space-16 pb-space-14">
        <Button variant="primary" onClick={onSort}>
          Sort them
        </Button>
      </div>
    </Card>
  );
}
