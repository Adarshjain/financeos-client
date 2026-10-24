'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, Card, ListRow, Text } from '@/components/ds';

import type { OverviewCard } from './overviewModel';

/** A press on a control inside a row must not also open the row. */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** One row per card, highest first. A tap opens the card's rewards page; "Set point value" opens its rules. */
export function RewardsCardList({ cards }: { cards: OverviewCard[] }) {
  const router = useRouter();
  return (
    <Card>
      {cards.map((card) => (
        <ListRow
          key={card.id}
          title={card.name}
          subtitle={card.subtitle}
          chevron
          clickable
          onClick={() => router.push(card.href)}
          trailing={
            <div className="flex flex-col items-end">
              <Text variant="body-strong">{card.earned}</Text>
              {card.needsPointValue ? (
                <div onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={stop}>
                  <Text variant="label" as="span">
                    <Button asChild variant="link" size="sm">
                      <Link href={card.setValueHref}>Set point value</Link>
                    </Button>
                  </Text>
                </div>
              ) : null}
            </div>
          }
        />
      ))}
    </Card>
  );
}
