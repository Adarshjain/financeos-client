'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';

export interface UncategorizedRow {
  id: string;
  description: string;
  /** "3 Oct · ₹7,430" */
  detail: string;
}

export interface UncategorizedCardProps {
  /** Every transaction with no category. */
  count: number;
  /** The latest few. */
  rows: UncategorizedRow[];
  /** Transactions filtered to those with no category. */
  reviewHref: string;
  onTag: (id: string) => void;
}

/** Transactions with no category: the latest few, each with Tag, and a link to review them all. */
export function UncategorizedCard({ count, rows, reviewHref, onTag }: UncategorizedCardProps) {
  return (
    <Card
      title={`Uncategorized · ${count}`}
      subtitle="Transactions with no category"
      action={
        <Text variant="label" as="span">
          <Button variant="link" size="sm" asChild>
            <Link href={reviewHref}>
              Review <Icon name="chevron-right" size="xs" />
            </Link>
          </Button>
        </Text>
      }
    >
      {rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.description}
          subtitle={row.detail}
          trailing={
            <Button variant="secondary" size="sm" onClick={() => onTag(row.id)}>
              Tag
            </Button>
          }
        />
      ))}
    </Card>
  );
}
