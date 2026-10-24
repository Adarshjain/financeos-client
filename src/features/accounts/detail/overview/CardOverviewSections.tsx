import React from 'react';

import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ListField,
  ListRow,
  ProgressBar,
  Text,
} from '@/components/ds';
import { appHref } from '@/features/shell/routes';

import { accountHref } from '../accountTabsModel';
import type { BillRowModel } from '../billsHistoryModel';
import type {
  CardholdersModel,
  ConnectionsModel,
  LimitCycleModel,
  RewardsModel,
} from './cardOverviewModel';
import { HeaderLink } from './HeaderLink';

function Stat({
  label,
  value,
  caption,
  meter,
}: {
  label: string;
  value: string;
  caption: React.ReactNode;
  meter?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-space-4">
      <Text variant="label" tone="ink-3" as="div">
        {label}
      </Text>
      <Text variant="figure" as="div">
        {value}
      </Text>
      {meter}
      {caption ? (
        <Text variant="caption" tone="ink-3" as="div">
          {caption}
        </Text>
      ) : null}
    </div>
  );
}

export function LimitCycleCard({ model }: { model: LimitCycleModel }) {
  return (
    <Card
      title="Limit & cycle"
      subtitle={model.subtitle ?? undefined}
      action={model.anchored ? <Badge tone="success">Anchored to statement</Badge> : undefined}
    >
      <div className="px-space-16 pt-space-4 pb-space-16 grid grid-cols-2 desk:grid-cols-3 gap-space-16">
        <Stat
          label="Used"
          value={model.used.value}
          meter={
            model.used.pct != null ? (
              <ProgressBar value={Math.min(100, model.used.pct)} tone={model.used.tone} />
            ) : undefined
          }
          caption={model.used.caption}
        />
        <Stat label="This cycle" value={model.cycle.value} caption={model.cycle.caption} />
        <Stat label="Current bill" value={model.bill.value} caption={model.bill.caption} />
      </div>
      {model.ownLimit ? <ListField label="Own limit" value={model.ownLimit} /> : null}
      {model.pool ? (
        <ListField
          label={model.pool.label}
          value={
            <span className="flex flex-col items-end">
              <span>{model.pool.value}</span>
              <Text variant="caption" tone="ink-3">
                {model.pool.sub}
              </Text>
            </span>
          }
        />
      ) : null}
    </Card>
  );
}

export function BillsCard({ accountId, rows }: { accountId: string; rows: BillRowModel[] }) {
  return (
    <Card
      title="Bills"
      subtitle="The statement is the bill"
      action={
        <HeaderLink href={`${accountHref(accountId)}/statements`} chevron>
          All
        </HeaderLink>
      }
    >
      {rows.length === 0 ? (
        <EmptyState compact description="No bills yet" />
      ) : null}
      {rows.map((row) => (
        <ListRow
          key={row.key}
          title={row.title}
          subtitle={row.caption ?? undefined}
          trailing={
            <>
              {row.badge ? <Badge tone={row.badge.tone}>{row.badge.label}</Badge> : null}
              {row.amount ? (
                <Text variant="body-strong" tone={row.muted ? 'ink-3' : 'ink'} fraction="small">
                  {row.amount}
                </Text>
              ) : null}
            </>
          }
        />
      ))}
    </Card>
  );
}

export function RewardsCard({ accountId, model }: { accountId: string; model: RewardsModel }) {
  return (
    <Card
      title="Rewards"
      subtitle={model.subtitle}
      action={
        <HeaderLink href={appHref(`/rewards/rules?account=${accountId}`)} chevron>
          Rules
        </HeaderLink>
      }
    >
      <ListField label="Earned" value={model.earned} />
      {model.rules.map((rule) => (
        <ListField key={rule.id} label={rule.label} value={rule.value} />
      ))}
      {model.milestones.map((m) => (
        <ListRow
          key={m.id}
          title={m.label}
          trailing={<Text variant="body-strong">{m.pct}%</Text>}
          subtitle={
            <>
              <ProgressBar value={m.pct} />
              <Text variant="caption" tone="ink-3" as="div">
                {m.caption}
              </Text>
            </>
          }
        />
      ))}
    </Card>
  );
}

export function CardholdersCard({
  accountId,
  model,
}: {
  accountId: string;
  model: CardholdersModel;
}) {
  return (
    <Card
      title="Cardholders"
      subtitle={model.subtitle}
      action={
        <HeaderLink href={`${accountHref(accountId)}/cards?add=cardholder`}>Add</HeaderLink>
      }
    >
      {model.rows.map((row) => (
        <ListRow
          key={row.id}
          leading={<Avatar variant="circle" initials={row.initials} />}
          title={
            <span className="flex items-center gap-space-6">
              <span>{row.name}</span>
              <Badge tone="neutral">{row.role}</Badge>
            </span>
          }
          subtitle={
            <>
              {row.caption}
              {row.limitLine ? (
                <Text variant="caption" tone={row.limitLine.tone} as="div">
                  {row.limitLine.text}
                </Text>
              ) : null}
            </>
          }
        />
      ))}
    </Card>
  );
}

export function ConnectionsCard({ model }: { model: ConnectionsModel }) {
  return (
    <Card title="Connections" subtitle="How transactions arrive">
      <ListField label="Statements" value={model.statements} />
      <ListField label="Gmail alerts" value={model.gmail} />
    </Card>
  );
}
