'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Card,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterChip,
  Pager,
  StatusWords,
  Text,
} from '@/components/ds';

import { type LineRow, PAGE_SIZES, rewardsHref, type RewardsQuery, type RuleChip } from './rewardsModel';

const ch = createDataTableColumnHelper<LineRow>();

const columns = ch.columns([
  ch.accessor('date', {
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ getValue }) => (
      <Text variant="body" tone="ink-3" as="span">
        {getValue()}
      </Text>
    ),
  }),
  ch.accessor('description', {
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', phone: 'main' },
    cell: ({ row }) => (
      <>
        {row.original.description}
        {row.original.holder ? (
          <Text variant="body" tone="ink-3" as="span">
            {' '}
            · {row.original.holder}
          </Text>
        ) : null}
      </>
    ),
  }),
  ch.accessor('basis', {
    id: 'basis',
    header: 'Basis (₹)',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
  }),
  ch.accessor('rule', {
    id: 'rule',
    header: 'Rule',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ getValue }) => (
      <Text variant="body" tone="ink-3" as="span">
        {getValue()}
      </Text>
    ),
  }),
  ch.accessor('earned', {
    id: 'earned',
    header: 'Earned',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
  }),
  ch.display({
    id: 'why',
    header: 'Why',
    meta: { size: 'md', phone: 'status' },
    cell: ({ row }) => <StatusWords items={[row.original.why]} />,
  }),
]);

export interface EarningLinesProps {
  /** The tab's own URL, without params. */
  basePath: string;
  subtitle: string;
  rows: LineRow[];
  total: number;
  chips: RuleChip[];
  query: RewardsQuery;
}

/** The Earning lines card: rule chips (`?rule=`), and the lines with a server-side pager (`?page=`, `?size=`). */
export function EarningLines({ basePath, subtitle, rows, total, chips, query }: EarningLinesProps) {
  const router = useRouter();
  const go = (next: Partial<RewardsQuery>) => router.push(rewardsHref(basePath, { ...query, ...next }));

  return (
    <Card title="Earning lines" subtitle={subtitle}>
      {chips.length > 1 ? (
        <div className="flex gap-space-8 overflow-x-auto px-space-16 pb-space-12">
          <FilterChip selected={!query.ruleId} onSelectedChange={() => go({ ruleId: undefined, page: 0 })}>
            All rules
          </FilterChip>
          {chips.map((chip) => (
            <FilterChip
              key={chip.id}
              selected={query.ruleId === chip.id}
              onSelectedChange={() => go({ ruleId: chip.id, page: 0 })}
            >
              {chip.label}
            </FilterChip>
          ))}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        phoneSub={(r) => `${r.date} · ₹${r.basis} · ${r.rule}`}
        empty={<EmptyState compact title="No earning lines" description="Nothing matches this rule in this reward year." />}
        pager={
          <Pager
            page={query.page}
            size={query.size}
            totalElements={total}
            unit="lines"
            sizeOptions={[...PAGE_SIZES]}
            onPageChange={(page) => go({ page })}
            onSizeChange={(size) => go({ size, page: 0 })}
          />
        }
      />
    </Card>
  );
}
