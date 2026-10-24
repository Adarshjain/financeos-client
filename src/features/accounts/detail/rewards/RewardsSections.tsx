import React from 'react';

import { Badge, Card, ListRow, ProgressBar, Text } from '@/components/ds';
import { appHref } from '@/features/shell/routes';

import { HeaderLink } from '../overview/HeaderLink';
import type { CardholderRow, CompletedMilestones, MilestoneModel, RuleExtras, RuleLine } from './rewardsModel';

export function MilestoneCard({ model }: { model: MilestoneModel }) {
  return (
    <Card
      title={model.title}
      subtitle={model.subtitle}
      action={model.status ? <Badge tone={model.status.tone}>{model.status.label}</Badge> : undefined}
    >
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-6">
        <div className="flex items-baseline justify-between gap-space-12">
          <Text variant="body-strong">{model.figure.done}</Text>
          <Text variant="body" tone="ink-3">
            {model.figure.of}
          </Text>
        </div>
        <ProgressBar value={model.pct} />
        <Text variant="caption" tone="ink-3" as="div">
          {model.caption}
        </Text>
      </div>
    </Card>
  );
}

/** The finished milestones: each with the day it was credited, and what they paid in all. */
export function CompletedMilestonesCard({ completed }: { completed: CompletedMilestones }) {
  return (
    <Card title={`Completed · ${completed.count}`} subtitle={completed.paid ? `${completed.paid} paid` : undefined}>
      {completed.rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.title}
          subtitle={row.subtitle}
          trailing={<Text variant="body-strong">{row.payout}</Text>}
        />
      ))}
    </Card>
  );
}

/** Earnings split by cardholder; the transactions with no card are Unattributed. */
export function CardholdersCard({ rows, subtitle }: { rows: CardholderRow[]; subtitle: string }) {
  return (
    <Card title="By cardholder" subtitle={subtitle}>
      {rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.title}
          subtitle={row.subtitle}
          trailing={<Text variant="body-strong">{row.earned}</Text>}
        />
      ))}
    </Card>
  );
}

export function RulesCard({
  accountId,
  rules,
  extras,
}: {
  accountId: string;
  rules: RuleLine[];
  extras: Record<string, RuleExtras>;
}) {
  return (
    <Card
      title="Rules on this account"
      subtitle="First match wins"
      action={
        <HeaderLink href={appHref(`/rewards/rules?account=${accountId}`)} chevron>
          Manage
        </HeaderLink>
      }
    >
      {rules.map((rule) => {
        const { bars, note } = extras[rule.id] ?? { bars: [], note: null };
        return (
          <ListRow
            key={rule.id}
            title={rule.title}
            subtitle={rule.description || undefined}
            trailing={<Text variant="body-strong">{rule.earned}</Text>}
          >
            {bars.length > 0 || note ? (
              <div className="flex flex-col gap-space-6 mt-space-6">
                {bars.map((bar) => (
                  <ProgressBar key={bar.key} value={bar.pct} tone={bar.tone} label={bar.label} />
                ))}
                {note ? (
                  <Text variant="caption" tone="ink-3" as="div">
                    {note}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </ListRow>
        );
      })}
    </Card>
  );
}
