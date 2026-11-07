'use client';

import Link from 'next/link';
import React, { Suspense, use } from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';

import { dataSourcesSections } from './dataSourcesSections';

/** How many Gmail items need attention, as a promise so the page renders at once; undefined when the request failed. */
export interface DataSourcesValues {
  attentionCount: Promise<number | undefined>;
}

function AttentionValue({ promise }: { promise: Promise<number | undefined> }) {
  const count = use(promise);
  return count ? <Badge tone="warning" size="sm">{count} needs attention</Badge> : null;
}

/** The main Data sources page: one card with a row for each section. */
export function DataSourcesMain({ values }: { values: DataSourcesValues }) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card>
        {dataSourcesSections.map((s) => (
          <ListRow
            key={s.id}
            asChild
            borderTop
            chevron
            title={s.label}
            trailing={
              s.id === 'connections' ? <Suspense fallback={null}><AttentionValue promise={values.attentionCount} /></Suspense> : undefined
            }
          >
            <Link href={s.href} prefetch={false} />
          </ListRow>
        ))}
      </Card>
    </div>
  );
}
