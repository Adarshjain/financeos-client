import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Menu } from '@/components/ds/Menu/Menu';
import { Text } from '@/components/ds/Text/Text';

import type { NpsAccountCard, NpsAllocationLine, NpsFyLine, NpsTier } from './npsModel';
import { tierLabel } from './npsModel';

function Line({ label, value, conceal, tone, subtitle }: { label: string; value: string; conceal?: boolean; tone?: 'danger'; subtitle?: string }) {
  return (
    <ListRow
      title={label}
      subtitle={subtitle}
      trailing={
        <Text variant="body-strong" tone={tone} as="span">
          {conceal ? <Conceal>{value}</Conceal> : value}
        </Text>
      }
    />
  );
}

/** The account: PRAN, sector, record keeper, choice and the emails switch. Edit opens it. */
export function NpsAccountCardView({ card, onEdit, onStatements }: { card: NpsAccountCard; onEdit: () => void; onStatements: () => void }) {
  return (
    <Card
      title="Account"
      action={
        <span className="flex items-center gap-space-8">
          <Text variant="label" as="span">
            <Button variant="link" size="sm" onClick={onEdit}>
              Edit
            </Button>
          </Text>
          <Menu
            align="end"
            trigger={
              <Button variant="ghost" size="sm" iconOnly aria-label="Account options">
                <Icon name="more" size="sm" />
              </Button>
            }
          >
            <Menu.Item onSelect={onStatements}>Statements</Menu.Item>
          </Menu>
        </span>
      }
    >
      {card.lines.map((l) => (
        <Line key={l.label} label={l.label} value={l.value} tone={l.tone} subtitle={l.subtitle} />
      ))}
    </Card>
  );
}

/** What went in this financial year, yours and the employer's per tier. */
export function NpsThisFyCard({ lines }: { lines: NpsFyLine[] }) {
  return (
    <Card title="This FY" subtitle="Since 1 Apr">
      {lines.length === 0 ? <EmptyState compact description="No contributions yet" /> : null}
      {lines.map((l) => (
        <Line key={l.label} label={l.label} value={l.value} conceal />
      ))}
    </Card>
  );
}

/** Each tier's asset classes, now against target. */
export function NpsAllocationCard({ allocation }: { allocation: { tier: NpsTier; lines: NpsAllocationLine[] }[] }) {
  return (
    <>
      {allocation.map((a) => (
        <Card key={a.tier} title="Allocation" subtitle={`${tierLabel(a.tier)} · now vs target`}>
          {a.lines.length === 0 ? <EmptyState compact description="No holdings yet" /> : null}
          {a.lines.map((l) => (
            <Line key={l.label} label={l.label} value={l.value} />
          ))}
        </Card>
      ))}
    </>
  );
}
