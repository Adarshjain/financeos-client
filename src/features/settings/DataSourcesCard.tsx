'use client';

import Link from 'next/link';
import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { dataSourcesSections } from '@/features/data-sources/dataSourcesSections';
import { useDataSourceIssues } from '@/lib/query/hooks/useDataSourceIssues';

/**
 * The Data sources card: a row for each section. Connections shows how many items need attention, Sync health how
 * many imports failed; both come from the shell counts and are hidden at zero.
 */
export function DataSourcesCard() {
  const { connections, failedJobs } = useDataSourceIssues();
  return (
    <Card title="Data sources">
      {dataSourcesSections.map((s) => (
        <ListRow
          key={s.id}
          asChild
          borderTop
          chevron
          title={s.label}
          trailing={
            s.id === 'connections' && connections > 0 ? (
              <Badge tone="warning" size="sm">{connections} needs attention</Badge>
            ) : s.id === 'sync' && failedJobs > 0 ? (
              <Badge tone="warning" size="sm">{failedJobs} failed</Badge>
            ) : undefined
          }
        >
          <Link href={s.href} prefetch={false} />
        </ListRow>
      ))}
    </Card>
  );
}
