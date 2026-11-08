'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { GRID_GAP } from '@/components/ds/gridGap';
import { Hero } from '@/components/ds/Hero/Hero';
import { KpiTile } from '@/components/ds/KpiTile/KpiTile';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { Text } from '@/components/ds/Text/Text';
import { useAppRouter } from '@/lib/useAppRouter';

import { type OverviewCardModel, overviewHero, overviewShare } from './overviewModel';

const ch = createDataTableColumnHelper<OverviewCardModel>();

function Caption({ children, tone = 'ink-3' }: { children: React.ReactNode; tone?: 'ink-3' | 'positive' | 'danger' }) {
  return (
    <Text variant="caption" tone={tone}>
      {children}
    </Text>
  );
}

/** A table cell for the products that have data; the empty and failed rows draw their own. */
function productCell(render: (card: Extract<OverviewCardModel, { kind: 'product' }>, all: OverviewCardModel[]) => React.ReactNode, all: () => OverviewCardModel[]) {
  return ({ row }: { row: { original: OverviewCardModel } }) => (row.original.kind === 'product' ? render(row.original, all()) : null);
}

function RetryLink() {
  const router = useAppRouter();
  return (
    <Button variant="link" size="sm" onClick={() => router.refresh()}>
      Retry
    </Button>
  );
}

function useColumns(cards: OverviewCardModel[]) {
  return React.useMemo(() => {
    const all = () => cards;
    return [
      ch.display({
        id: 'product',
        header: 'Product',
        meta: { size: 'fill', grow: 2 },
        cell: ({ row }) => {
          const c = row.original;
          const sub =
            c.kind === 'product'
              ? c.inNetWorth
                ? c.subtitle
                : `${c.subtitle} · Not in net worth`
              : c.kind === 'empty'
                ? c.line
                : "Couldn't load";
          return (
            <div className="flex flex-col min-w-0">
              <Text variant="body-strong" truncate>
                {c.title}
              </Text>
              {sub ? (
                <Text variant="caption" tone="ink-3" truncate>
                  {sub}
                </Text>
              ) : null}
            </div>
          );
        },
      }),
      ch.display({
        id: 'value',
        header: 'Value',
        meta: { size: 'md', align: 'end', wrap: true },
        cell: ({ row }) => {
          const c = row.original;
          if (c.kind === 'empty') {
            return (
              <Text variant="label" as="span">
                <Button variant="link" size="sm" asChild>
                  <Link href={c.action.href}>{c.action.label}</Link>
                </Button>
              </Text>
            );
          }
          if (c.kind === 'error') {
            return (
              <Text variant="label" as="span">
                <RetryLink />
              </Text>
            );
          }
          return (
            <div className="flex flex-col items-end">
              <Text variant="body-strong">
                <Conceal whole>{c.valueText}</Conceal>
              </Text>
              {c.dayMove ? (
                <Caption tone={c.dayMove.tone ?? 'ink-3'}>
                  <Conceal>{c.dayMove.text}</Conceal>
                </Caption>
              ) : null}
            </div>
          );
        },
      }),
      ch.display({
        id: 'gain',
        header: 'Gain',
        meta: { size: 'lg', align: 'end', wrap: true },
        cell: productCell(
          (c) =>
            c.gain ? (
              <div className="flex flex-col items-end">
                <Text variant="body" tone={c.gain.tone}>
                  <Conceal>{c.gain.text}</Conceal>
                </Text>
                {c.gain.caption ? <Caption>{c.gain.caption}</Caption> : null}
              </div>
            ) : null,
          all,
        ),
      }),
      ch.display({
        id: 'share',
        header: 'Share',
        meta: { size: 'sm', align: 'end' },
        cell: productCell((c, cards) => <Text variant="body">{overviewShare(cards, c)}</Text>, all),
      }),
      ch.display({
        id: 'updated',
        header: 'Updated',
        meta: { size: 'md', align: 'end', wrap: true },
        cell: productCell((c) => (c.updated ? <Caption>{c.updated}</Caption> : null), all),
      }),
    ];
  }, [cards]);
}

/** The hero of the landing: the total, the net-worth figure when a child's account is in it, and the split bar. */
function OverviewHero({ cards }: { cards: OverviewCardModel[] }) {
  const hero = overviewHero(cards);
  return (
    <Hero
      label="Total value"
      value={<Conceal>{hero.totalText}</Conceal>}
      change={hero.without ? { text: hero.without } : undefined}
      figures={hero.netWorthText ? [{ label: 'In your net worth', value: <Conceal>{hero.netWorthText}</Conceal> }] : []}
    >
      {hero.segments.length > 0 ? (
        <div className="flex flex-col gap-space-8 desk:gap-space-12">
          <ProgressBar segments={hero.segments.map((s) => ({ value: s.value, label: s.label, color: s.color }))} />
          <ProgressBar.Legend items={hero.segments.map((s) => ({ label: s.label, color: s.color }))} />
        </div>
      ) : null}
    </Hero>
  );
}

/** Desktop: one row per product; a row with data opens the product. */
function OverviewTable({ cards }: { cards: OverviewCardModel[] }) {
  const router = useAppRouter();
  const columns = useColumns(cards);
  return (
    <div className="hidden desk:block">
      <Card title="Your investments">
        <DataTable
          columns={columns}
          data={cards}
          getRowId={(c) => c.id}
          onRowSelect={(c) => {
            if (c.kind === 'product') router.push(c.href);
          }}
          rowState={(c) => (c.kind === 'product' ? undefined : { pressable: false })}
        />
      </Card>
    </div>
  );
}

function OverviewTile({ card }: { card: OverviewCardModel }) {
  const router = useAppRouter();
  if (card.kind === 'error') {
    return <KpiTile label={card.title} error={`Couldn't load ${card.what}`} action={{ label: 'Retry', onSelect: () => router.refresh() }} />;
  }
  if (card.kind === 'empty') {
    return (
      <Card>
        <div className="p-space-12">
          <KpiTile
            variant="plain"
            label={card.title}
            context={
              <>
                <Text variant="caption" tone="ink-3" as="p">
                  {card.line}
                </Text>
                <Button variant="link" size="sm" asChild>
                  <Link href={card.action.href}>{card.action.label}</Link>
                </Button>
              </>
            }
          />
        </div>
      </Card>
    );
  }
  const { delta } = card;
  return (
    <Card asChild interactive>
      <Link href={card.href} data-testid={`overview-${card.id}`}>
        <div className="p-space-12">
          <KpiTile
            variant="plain"
            label={card.title}
            value={card.valueText}
            delta={delta ? { value: delta.text, direction: delta.tone === 'positive' ? 'good' : delta.tone === 'danger' ? 'bad' : 'neutral' } : undefined}
            context={
              <Text variant="label" tone="ink-3" as="div" truncate>
                {card.subtitle}
              </Text>
            }
          />
        </div>
      </Link>
    </Card>
  );
}

/** Phone: a two-column grid of tiles, one per product. */
function OverviewTiles({ cards }: { cards: OverviewCardModel[] }) {
  return (
    <div className={`grid grid-cols-2 desk:hidden ${GRID_GAP}`}>
      {cards.map((card) => (
        <OverviewTile key={card.id} card={card} />
      ))}
    </div>
  );
}

/** The Investments landing: the total and its split, then every product: a table on desktop, tiles on phone. Each opens its page. */
export function InvestmentsOverview({ cards }: { cards: OverviewCardModel[] }) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <OverviewHero cards={cards} />
      <OverviewTable cards={cards} />
      <OverviewTiles cards={cards} />
    </div>
  );
}

/** The landing while it loads: the hero, then a skeleton table on desktop and skeleton tiles on phone. */
export function InvestmentsOverviewSkeleton() {
  const columns = useColumns([]);
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label change />
      <div className="hidden desk:block">
        <Card title="Your investments">
          <DataTable columns={columns} data={[]} getRowId={(c) => c.id} loading skeletonRows={3} />
        </Card>
      </div>
      <div className={`grid grid-cols-2 desk:hidden ${GRID_GAP}`}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="p-space-12">
              <KpiTile variant="plain" loading />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
