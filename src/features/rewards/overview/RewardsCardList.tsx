'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, Card, createDataTableColumnHelper, DataTable, Text } from '@/components/ds';
import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';

import { labelLines, type OverviewCard, yearLines } from './overviewModel';

/** A press on a control inside a row must not also open the row. */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

const ch = createDataTableColumnHelper<OverviewCard>();

/** A figure over its label, so neither is cut off in a narrow column. */
function TwoLines({ main, sub }: { main: string; sub: string | null }) {
  return (
    <div className="flex flex-col min-w-0">
      <Text variant="body" truncate>
        {main}
      </Text>
      {sub ? (
        <Text variant="caption" tone="ink-3" truncate>
          {sub}
        </Text>
      ) : null}
    </div>
  );
}

const columns = ch.columns([
  ch.display({
    id: 'card',
    header: 'Card',
    meta: { size: 'fill', grow: 2, phone: 'main' },
    cell: ({ row }) => (
      <div className="flex flex-col min-w-0">
        <Text variant="body-strong" truncate>
          {row.original.name}
        </Text>
        {row.original.identity ? (
          <div className="max-desk:hidden min-w-0">
            <Text variant="caption" tone="ink-3" truncate>
              {row.original.identity}
            </Text>
          </div>
        ) : null}
      </div>
    ),
  }),
  ch.display({
    id: 'year',
    header: 'Reward year',
    meta: { size: 'lg', phone: 'hidden' },
    cell: ({ row }) => {
      const { main, sub } = yearLines(row.original.year);
      return <TwoLines main={main} sub={sub} />;
    },
  }),
  ch.display({
    id: 'capLeft',
    header: 'Cap left',
    meta: { size: 'lg', phone: 'hidden' },
    cell: ({ row }) => {
      const { main, sub } = labelLines(row.original.capLeft);
      return <TwoLines main={main} sub={sub} />;
    },
  }),
  ch.display({
    id: 'nextMilestone',
    header: 'Next milestone',
    meta: { size: 'lg', phone: 'hidden' },
    cell: ({ row }) => {
      const { main, sub } = labelLines(row.original.nextMilestone);
      return <TwoLines main={main} sub={sub} />;
    },
  }),
  ch.display({
    id: 'earned',
    header: 'Earned',
    meta: { size: 'lg', align: 'end', phone: 'amount', wrap: true },
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <Text variant="body-strong">{row.original.earned}</Text>
        {row.original.needsPointValue ? (
          <div onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={stop}>
            <Text variant="label" as="span">
              <Button asChild variant="link" size="sm">
                <Link href={row.original.setValueHref}>Set point value</Link>
              </Button>
            </Text>
          </div>
        ) : null}
      </div>
    ),
  }),
]);

/** One row per card, highest first. A press opens the card's rewards page; "Set point value" opens its rules. */
export function RewardsCardList({ cards }: { cards: OverviewCard[] }) {
  const router = useRouter();
  return (
    <Card>
      <DataTable
        columns={columns}
        data={cards}
        getRowId={(card) => card.id}
        onRowSelect={(card) => router.push(card.href)}
        leading={(card) => <BankLogo bankId={card.bankId} name={card.name} />}
        phoneSub={(card) => card.subtitle}
      />
    </Card>
  );
}
