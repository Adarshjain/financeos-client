'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Pager } from '@/components/ds/Pager/Pager';
import { Select } from '@/components/ds/Select/Select';
import { StatusWords } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';

import { RewardLineDialog } from './RewardLineDialog';
import { type LineRow, PAGE_SIZES, rewardsHref, type RewardsQuery, type RuleChip } from './rewardsModel';

const ALL_RULES = 'all';

/** The rule, unless the Why column already says the same thing ("No rule"): the reason shows once per row. */
const ruleOnce = (r: LineRow) => (r.rule === r.why.label ? '' : r.rule);

const ch = createDataTableColumnHelper<LineRow>();

const columns = ch.columns([
  ch.accessor('date', {
    id: 'date',
    header: 'Date',
    meta: { size: 'date', phone: 'hidden' },
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
    // The rule sits under the description, so the half-width card has room for every column.
    cell: ({ row }) => (
      <div className="flex flex-col min-w-0">
        <Text variant="body" truncate>
          {row.original.description}
          {row.original.holder ? (
            <Text variant="body" tone="ink-3" as="span">
              {' '}
              · {row.original.holder}
            </Text>
          ) : null}
        </Text>
        <div className="max-desk:hidden min-w-0">
          <Text variant="caption" tone="ink-3" truncate>
            {ruleOnce(row.original)}
          </Text>
        </div>
      </div>
    ),
  }),
  ch.accessor('basis', {
    id: 'basis',
    header: 'Basis (₹)',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
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

/** The Transactions card: a rule dropdown in its header (`?rule=`), and the earning lines with a server-side pager (`?page=`, `?size=`). */
export function EarningLines({ basePath, subtitle, rows, total, chips, query }: EarningLinesProps) {
  const router = useRouter();
  const go = (next: Partial<RewardsQuery>) => router.push(rewardsHref(basePath, { ...query, ...next }));
  // The line dialog opens from state, not the address.
  const [open, setOpen] = useState<LineRow | null>(null);

  const ruleOptions = [{ value: ALL_RULES, label: 'All rules' }, ...chips.map((c) => ({ value: c.id, label: c.label }))];
  const chosen = ruleOptions.find((o) => o.value === (query.ruleId ?? ALL_RULES));
  // One choice among the rules, in the card's header; with a single rule there is nothing to choose.
  const ruleFilter =
    chips.length > 1 ? (
      <Select
        value={query.ruleId ?? ALL_RULES}
        options={ruleOptions}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value;
          go({ ruleId: next === ALL_RULES ? undefined : next, page: 0 });
        }}
        trigger={
          <FilterChip hasDropdown changed={Boolean(query.ruleId)} onReset={() => go({ ruleId: undefined, page: 0 })}>
            {chosen?.label ?? 'All rules'}
          </FilterChip>
        }
      />
    ) : undefined;

  return (
    <Card title="Transactions" subtitle={subtitle} action={ruleFilter}>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        onRowSelect={setOpen}
        phoneSub={(r) => [r.date, r.basisLabel, ruleOnce(r)].filter(Boolean).join(' · ')}
        empty={<EmptyState compact title="No earning lines match" description="Nothing matches this rule in this period." />}
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
      {open ? <RewardLineDialog detail={open.detail} onClose={() => setOpen(null)} /> : null}
    </Card>
  );
}
