'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { Select } from '@/components/ds/Select/Select';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { appHref } from '@/features/shell/routes';
import type { ImportRecordResponse } from '@/lib/api/types';

import {
  type ImportRow,
  importRow,
  IMPORTS_SIZE_OPTIONS,
  type ImportsUrl,
  importsUrl,
  KIND_OPTIONS,
} from './importsModel';

// Select values are non-empty; '' (every kind) travels as this sentinel.
const ALL = '__all__';
const toValue = (v: string) => (v === '' ? ALL : v);
const fromValue = (v: string) => (v === ALL ? '' : v);

export interface ImportsScreenProps extends ImportsUrl {
  rows: ImportRecordResponse[];
  totalElements: number;
  totalPages: number;
}

function Row({ row }: { row: ImportRow }) {
  const trailing = (
    <div className="flex flex-col items-end gap-space-4">
      <Text variant="label" tone="ink-3">{row.date}</Text>
      {row.status ? <StatusWord tone={row.status.tone}>{row.status.label}</StatusWord> : null}
    </div>
  );
  return row.href ? (
    <ListRow asChild borderTop wrap title={row.title} subtitle={row.detail} trailing={trailing}>
      <Link href={row.href} prefetch={false} />
    </ListRow>
  ) : (
    <ListRow borderTop wrap title={row.title} subtitle={row.detail} trailing={trailing} />
  );
}

/** Data sources → Imports: what was imported and held, newest first, with a kind filter and the Pager above and below. */
export function ImportsScreen({ rows, totalElements, totalPages, page, size, kind }: ImportsScreenProps) {
  const router = useRouter();
  const go = (href: string) => router.push(href, { scroll: false });
  const kindLabel = KIND_OPTIONS.find((o) => o.value === kind)?.label ?? 'Kind';

  const pager = (borderPosition: 'top' | 'bottom') => (
    <Pager
      page={page}
      size={size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="imports"
      sizeOptions={IMPORTS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      borderPosition={borderPosition}
      onPageChange={(p) => go(importsUrl({ kind, size }, p))}
      onSizeChange={(s) => go(importsUrl({ kind, size: s }))}
    />
  );

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar changed={kind !== ''} onReset={() => go(importsUrl({ kind: '', size }))}>
        <Select
          value={toValue(kind)}
          options={KIND_OPTIONS.map((o) => ({ value: toValue(o.value), label: o.label }))}
          onValueChange={(v) => go(importsUrl({ kind: fromValue(v as string) as ImportsUrl['kind'], size }))}
          trigger={
            <FilterChip className="shrink-0" hasDropdown changed={kind !== ''} onReset={() => go(importsUrl({ kind: '', size }))}>
              {kind ? kindLabel : 'Kind'}
            </FilterChip>
          }
        />
      </FilterBar>
      <Card>
        {rows.length === 0 ? (
          kind ? (
            <EmptyState
              compact
              title="No imports match"
              action={{ label: 'Clear filters', variant: 'link', href: importsUrl({ kind: '', size }) }}
            />
          ) : (
            <EmptyState compact title="No imports yet" action={{ label: 'Import a file', variant: 'link', href: appHref('/import') }} />
          )
        ) : (
          <>
            {pager('bottom')}
            {rows.map((r) => (
              <Row key={r.id} row={importRow(r)} />
            ))}
            {pager('top')}
          </>
        )}
      </Card>
    </div>
  );
}
