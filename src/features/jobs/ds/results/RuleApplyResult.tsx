'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';

import { Button, createDataTableColumnHelper, DataTable, Text } from '@/components/ds';
import { dayMonth } from '@/features/jobs/format';
import { MATCH_TYPE_META } from '@/lib/rules.matchTypes';
import type { MatchType } from '@/lib/rules.types';
import type { RuleApplyResult as RuleApplyData } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

import { ResultSection } from './ResultSection';

type Txn = NonNullable<RuleApplyData['transactions']>[number];

const ch = createDataTableColumnHelper<Txn>();
const columns = [
  ch.display({
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {dayMonth(row.original.date)}
      </Text>
    ),
  }),
  ch.display({
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', phone: 'main' },
    cell: ({ row }) => (
      <Text variant="body" truncate>
        {row.original.description || '—'}
      </Text>
    ),
  }),
  ch.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body" tone={row.original.type === 'CREDIT' ? 'positive' : 'ink'}>
        {row.original.type === 'CREDIT' ? '+' : ''}
        {formatCurrency(row.original.amount)}
      </Text>
    ),
  }),
];

/** Rule apply result: which rule, what it sets, how many it touched, why the rest were left alone. */
export function RuleApplyResult({ result }: { result: RuleApplyData }) {
  const applied = result.appliedCount ?? 0;
  const transactions = useMemo(() => result.transactions ?? [], [result.transactions]);
  const more = applied - transactions.length;
  const matchChip = result.matchType
    ? (MATCH_TYPE_META[result.matchType as MatchType]?.chip ?? result.matchType)
    : null;
  const left = [
    result.skippedManuallyReviewed ? `${result.skippedManuallyReviewed} reviewed by you (left unchanged)` : null,
    result.skippedNoLongerMatching ? `${result.skippedNoLongerMatching} don't match the pattern` : null,
    result.notFound ? `${result.notFound} no longer exist` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-space-8" data-testid="rule-apply-result">
      <Text variant="body-strong" as="p">
        Applied to {applied}
        {result.requested !== undefined ? ` of ${result.requested}` : ''} transaction{applied === 1 ? '' : 's'}
        {result.allMatches !== undefined ? (result.allMatches ? ' (all matching)' : ' (picked by you)') : ''}
      </Text>

      {result.ruleName ? (
        <Text variant="body" tone="ink-2" as="p">
          Rule{' '}
          <Button asChild variant="link">
            <Link href="/rules">{result.ruleName}</Link>
          </Button>
          {matchChip && result.pattern ? ` · ${matchChip} "${result.pattern}"` : ''}
          {result.categories && result.categories.length > 0 ? ` → ${result.categories.join(', ')}` : ''}
        </Text>
      ) : null}

      {left.length > 0 ? (
        <Text variant="body" tone="ink-2" as="p">
          Not applied: {left.join(' · ')}
        </Text>
      ) : null}

      <ResultSection title="Transactions updated" count={transactions.length}>
        <DataTable
          columns={columns}
          data={transactions}
          getRowId={(t) => t.id}
          phoneSub={(t) => dayMonth(t.date)}
          stickyHeader={false}
        />
        {more > 0 ? (
          <Text variant="caption" tone="ink-3" as="p">
            …and {more} more
          </Text>
        ) : null}
      </ResultSection>
    </div>
  );
}
